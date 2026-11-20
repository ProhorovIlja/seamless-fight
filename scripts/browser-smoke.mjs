import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const origin='http://127.0.0.1:18771', url=origin+'/fight/';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'18771',PUBLIC_ORIGIN:origin},stdio:'inherit'});
let browser;
const errors=[];
async function until(fn,label){
 for(let i=0;i<160;i++){if(await fn())return;await sleep(50);}
 throw Error('Timed out: '+label);
}
try{
 await until(async()=>{try{return (await fetch(url+'health')).ok;}catch{return false;}},'server health');
 browser=await chromium.launch();
 const host=await browser.newPage(), guest=await browser.newPage(), viewer=await browser.newPage({deviceScaleFactor:2});
 for(const page of [host,guest,viewer]){
   page.on('pageerror',err=>errors.push(err.message));
   page.on('response',res=>{if(res.url().startsWith(url)&&res.status()>=400)errors.push(res.status()+' '+res.url());});
 }
 const status=(page,pattern)=>until(async()=>pattern.test(await page.locator('#status').textContent()),String(pattern));
 let snapshot;
 host.on('websocket',ws=>ws.on('framereceived',frame=>{const m=JSON.parse(frame.payload);if(m.t==='state')snapshot=m.s;}));
 await host.addInitScript(()=>{
   const pad={connected:true,index:0,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
   window.testPad=pad;
   Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
 });
 await host.goto(url);
 assert(await host.locator('.duel-crest').evaluate(img=>img.complete&&img.naturalWidth>0));
 await host.locator('#input-settings summary').click();
 await host.locator('#bind-cut').click();
 await host.keyboard.press('k');
 assert.match(await host.locator('#bind-cut').textContent(),/Cut: K/);
 assert.match(await host.locator('#bind-hew').textContent(),/Heavy: J/);
 await host.reload();
 assert.match(await host.locator('#key-guide').textContent(),/K Cut/);
 await host.locator('#input-settings summary').click();
 await host.locator('#move-up').click();
 await host.keyboard.press('U');
 assert.match(await host.locator('#move-up').textContent(),/Up: U/);
 await host.locator('#reset-keys').click();
 await host.locator('#pad-shot').selectOption('2');
 assert.equal(await host.locator('#pad-cut').inputValue(),'5');
 await host.locator('#pad-stick').selectOption('right');
 assert.deepEqual(await host.evaluate(()=>{const a=JSON.parse(localStorage.getItem('seamless-fight.settings.v1'));return [a.pad.shot,a.pad.cut,a.stick];}),[2,5,'right']);
 await host.locator('#pad-stick').selectOption('left');
 await host.locator('#mouse-0').selectOption('shot');
 assert.equal(await host.evaluate(()=>JSON.parse(localStorage.getItem('seamless-fight.settings.v1')).mouse[0]),'shot');
 assert.match(await host.locator('#key-guide').textContent(),/J Cut/);
 assert(await host.locator('#gallery').isHidden());
 await host.locator('summary').filter({hasText:'Sound mix'}).click();
 await host.locator('#music').fill('31');
 await host.locator('#voice').fill('27');
 await host.locator('#centerCues').check();
 await host.locator('#rangeAudio').check();
 await host.locator('#rangeVolume').fill('40');
 assert.deepEqual(await host.evaluate(()=>{const {centerCues,rangeAudio,rangeVolume}=JSON.parse(localStorage.getItem('seamless-fight.settings.v1'));return [centerCues,rangeAudio,rangeVolume];}),[true,true,40]);
 assert.equal(await host.evaluate(()=>JSON.parse(localStorage.getItem('seamless-fight.settings.v1')).music),31);
 await host.locator('#sound').click();
 await until(async()=>await host.locator('#sound').getAttribute('aria-pressed')==='true','user-enabled Web Audio');
 await host.locator('#sound').click();
 await until(async()=>await host.locator('#sound').getAttribute('aria-pressed')==='false','muted Web Audio');
 await host.locator('summary').filter({hasText:'Duel lab'}).click();
 await host.locator('#combat-analysis summary').click();
 await host.locator('#spacing').selectOption('far');
 await host.locator('#replay').click();
 await until(async()=>/Cinder Heavy missed/.test(await host.locator('#exchange-log').textContent()),'lab detects a heavy that fell short');
 await host.locator('#combat-analysis summary').click();
 await host.locator('#record').click();
 await host.keyboard.down('ArrowLeft');
 await sleep(300);
 await host.keyboard.up('ArrowLeft');
 await host.keyboard.press('r');
 await status(host,/Recording saved/);
 assert.equal(await host.locator('#script').inputValue(),'custom');
 await host.keyboard.press('t');
 await status(host,/Respond to Cinder/);
 assert(await host.locator('#lab-meter').isVisible());
 const seek=host.locator('#seek');
 await until(async()=>Number(await seek.getAttribute('max'))>=10,'recorded attempt ticks');
 await seek.evaluate(el=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await status(host,/Paused at tick 5/);
 await host.locator('#takeover').click();
 await status(host,/Takeover/);
 await until(async()=>Number(await seek.inputValue())>5,'live takeover advances from the rewind point');
 await host.locator('#wardrobe summary').click();
 await host.locator('#dye').selectOption('oxblood');
 await host.locator('#sigil').selectOption('moon');
 await host.locator('#arena-select').selectOption('cistern');
 await host.locator('#online').click();
 await until(async()=>/Drowned Cistern/.test(await host.locator('#arena-title').textContent()),'host arena accepted');
 await status(host,/Waiting for an opponent/);
 const invite=await host.locator('#invite').inputValue();
 assert.equal(new URL(invite).origin,origin);
 // Preserve WebSocket message order while injecting asymmetric delay and jitter.
 const impairment={up:0,down:0};
 function delayedForward(destination,base,dir){
   const jitter=[0,17,7,23,11], queue=new Set();
   let i=0,last=0;
   const clear=()=>{for(const id of queue)clearTimeout(id);queue.clear();};
   const forward=message=>{
     const now=performance.now(), due=Math.max(last,now+base+jitter[i++%jitter.length]);
     last=due;
     const id=setTimeout(()=>{queue.delete(id);impairment[dir]++;destination.send(message);},Math.ceil(due-now));
     queue.add(id);
   };
   return {forward,clear};
 }
 await guest.routeWebSocket('**/fight/socket',client=>{
   const upstream=client.connectToServer();
   const up=delayedForward(upstream,55,'up'),down=delayedForward(client,26,'down');
   client.onMessage(up.forward);upstream.onMessage(down.forward);
   // onClose overrides forwarding, so explicitly close the other side.
   client.onClose((code,reason)=>{up.clear();down.clear();void upstream.close({code:code===1006?undefined:code,reason}).catch(()=>{});});
   upstream.onClose((code,reason)=>{up.clear();down.clear();void client.close({code:code===1006?undefined:code,reason}).catch(()=>{});});
 });
 await guest.goto(invite);
 await status(host,/Online duel/);
 await status(guest,/Online duel/);
 assert.equal(await guest.locator('#arena').getAttribute('aria-label'),'The Drowned Cistern duel arena');
 await until(()=>snapshot?.ready===0,'round live');
 await guest.locator('#diagnostics summary').click();
 await until(async()=>/RTT median [0-9.]+ ms/.test(await guest.locator('#diagnostic-values').textContent()),'guest RTT measured');
 await until(async()=>/Input acknowledgment p95 [0-9.]+ ms/.test(await guest.locator('#diagnostic-values').textContent()),'guest input acknowledgment measured');
 await until(async()=>/Remote footwork buffer target [0-9.]+ ms/.test(await guest.locator('#diagnostic-values').textContent()),'neutral footwork buffer is populated');
 const report=await guest.locator('#diagnostic-values').textContent();
 assert(Number(report.match(/RTT median ([0-9.]+)/)[1])>=65,report);
 assert.match(report,/Remote footwork buffer target [0-9.]+ ms/);
 console.log('Impaired guest: '+report);
 // Trigger combat from the impaired seat and verify exactly one ammo use.
 await guest.locator('#diagnostics summary').click();
 await guest.evaluate(()=>document.activeElement.blur());
 await guest.keyboard.press('l');
 await until(()=>snapshot?.p[1].ammo===2,'delayed guest pistol was applied');
 const shotTick=snapshot.tick;
 await until(()=>snapshot?.tick>shotTick+35,'guest pistol recovery completed');
 assert.equal(snapshot.p[1].ammo,2);
 const x=snapshot.p[0].x;
 await host.keyboard.down('ArrowRight');
 try{await until(()=>snapshot?.p[0].x>x+12,'authoritative movement from browser keyboard');}
 finally{await host.keyboard.up('ArrowRight');}
 const guestX=snapshot.p[1].x;
 await guest.keyboard.down('ArrowLeft');
 try{await until(()=>snapshot?.p[1].x<guestX-12,'authoritative guest movement through asymmetric delay');}
 finally{await guest.keyboard.up('ArrowLeft');}
 await host.bringToFront();
 await until(()=>host.evaluate(()=>document.hasFocus()),'controller tab focused');
 // Allow a neutral poll to arm the gamepad after refocusing.
 await host.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const padY=snapshot.p[0].y;
 await host.evaluate(()=>{window.testPad.axes[1]=-.9;});
 try{await until(()=>snapshot?.p[0].y<padY-12,'authoritative gamepad movement');}
 finally{await host.evaluate(()=>{window.testPad.axes[1]=0;});}
 await host.evaluate(()=>{window.testPad.buttons[2].pressed=true;});
 try{
   await until(()=>snapshot?.p[0].ammo===2,'controller pistol edge');
   const first=snapshot.tick;
   await until(()=>snapshot?.tick>first+38,'held controller action does not repeat');
   assert.equal(snapshot.p[0].ammo,2);
 }finally{await host.evaluate(()=>{window.testPad.buttons[2].pressed=false;});}
 await host.locator('#arena').click({position:{x:30,y:30}});
 await until(()=>snapshot?.p[0].ammo===1,'bound mouse click fires through authoritative input path');
 assert(impairment.up>1&&impairment.down>1);
 await host.locator('#gallery-toggle').click();
 await until(async()=>Boolean(await host.locator('#watch-link').inputValue()),'watch link issued');
 const watchUrl=new URL(await host.locator('#watch-link').inputValue());
 assert.equal(watchUrl.origin,origin);assert(!watchUrl.searchParams.has('room'));
 await viewer.goto(watchUrl.href);
 await status(viewer,/Spectating live/);
 assert.match(await viewer.locator('#arena-title').textContent(),/Drowned Cistern/);
 assert(await viewer.locator('#gallery').isHidden());
 assert.equal(await viewer.locator('#arena').evaluate(el=>el.width),1920);assert(await viewer.locator('#rematch').isHidden());
 await host.locator('#gallery-toggle').click();
 await status(viewer,/host closed the gallery/);
 await host.bringToFront();
 await host.evaluate(()=>document.activeElement.blur());
 const trainStart=snapshot.tick;
 await host.keyboard.down('a');
 try{await until(()=>snapshot.tick>=trainStart+42,'collect sustained movement for ghost training');}
 finally{await host.keyboard.up('a');}
 await host.locator('#match-review summary').click();
 await host.locator('#capture').click();
 await until(async()=>await host.locator('#review-open').isEnabled(),'authoritative replay captured');
 const downloadEvent=host.waitForEvent('download');
 await host.locator('#review-save').click();
 const download=await downloadEvent;
 assert.equal(download.suggestedFilename(),'seamless-fight-replay.json');
 const savedReplay=await download.path();
 const {readFile}=await import('node:fs/promises');
 assert.deepEqual(JSON.parse(await readFile(savedReplay,'utf8')).outfits[0],{dye:'oxblood',sigil:'moon'});
 await guest.close();
 await status(host,/Opponent disconnected/);
 await host.locator('#review-file').setInputFiles(savedReplay);
 await until(async()=>/Replay file loaded/.test(await host.locator('#review-info').textContent()),'replay file imported');
 await host.locator('#ghost-auto').check();
 assert.equal(await host.evaluate(()=>JSON.parse(localStorage.getItem('seamless-fight.settings.v1')).ghostAuto),true);
 await host.locator('#ghost-learn').click();
 await until(async()=>/Ghost updated/.test(await host.locator('#ghost-status').textContent()),'ghost learned from captured online fighter');
 assert(await host.locator('#ghost-option').isEnabled());
 assert.match(await host.locator('#ghost-stats').textContent(),/1 captured fighters/);
 const ghostEvent=host.waitForEvent('download');
 await host.locator('#ghost-export').click();
 const ghostDownload=await ghostEvent;
 assert.equal(ghostDownload.suggestedFilename(),'seamless-fight-ghost.json');
 const ghostFile=await ghostDownload.path();
 const originalGhost=await host.evaluate(()=>JSON.parse(localStorage.getItem('seamless-fight.ghost.v1')));
 await host.locator('#ghost-clear').click();
 assert(await host.locator('#ghost-option').isDisabled());
 await host.locator('#ghost-import').setInputFiles(ghostFile);
 await until(async()=>/Ghost imported/.test(await host.locator('#ghost-status').textContent()),'portable ghost reimported');
 assert.deepEqual(await host.evaluate(()=>JSON.parse(localStorage.getItem('seamless-fight.ghost.v1'))),originalGhost);
 await host.locator('#ghost-learn').click();
 await until(async()=>/already in the ghost/.test(await host.locator('#ghost-status').textContent()),'duplicate imported fighter rejected');

 await host.locator('#review-open').click();
 await status(host,/Match review/);
 assert.match(await host.locator('#arena-title').textContent(),/Drowned Cistern/);
 await host.locator('#review-step').click();
 assert.match(await host.locator('#review-tick').textContent(),/^Tick 1 /);
 await host.locator('#review-veil').click();
 await until(async()=>!/^Tick 1 /.test(await host.locator('#review-tick').textContent()),'match takeover advances');
 await host.locator('#combat-analysis summary').click();
 await host.locator('#review-event').selectOption('120');
 assert.match(await host.locator('#review-tick').textContent(),/^Tick 120 /);
 await until(async()=>/120/.test(await host.locator('#inputs-0').textContent()),'inspector rebuilt input history after seek');
 assert.equal(await host.locator('#phase-0').textContent(),'Ready');
 await host.locator('#review-back').click();
 assert.match(await host.locator('#review-tick').textContent(),/^Tick 119 /);
 await host.locator('#review-lead').click();
 assert.match(await host.locator('#review-tick').textContent(),/^Tick 108 /);
 await host.locator('#review-event').selectOption('120');
 await host.locator('#review-speed').selectOption('4');
 await host.locator('#review-cinder').click();
 assert(await host.locator('#review-speed').isDisabled());
 await until(async()=>/^Tick 12[0-9] |^Tick 1[3-9][0-9] |^Tick [2-9][0-9]{2,} /.test(await host.locator('#review-tick').textContent()),'takeover runs with slow playback disabled');
 await host.locator('#arena').screenshot({path:'artifacts/duel-cistern-review.png'});
 await host.locator('#practice').click();
 await host.locator('#arena-select').selectOption('lantern');
 await until(async()=>/Lantern Court/.test(await host.locator('#arena-title').textContent()),'Lantern Court selected');
 await host.locator('#ghost-exhibition').check();
 await status(host,/Exhibition · Normal AI vs trained ghost/);
 assert(await host.locator('#rematch').isHidden());
 await until(async()=>/74 seconds/.test(await host.locator('#round-score').textContent()),'ghost and bot exhibition round');
 await host.locator('#capture').click();
 const exhibitDownload=host.waitForEvent('download');
 await host.locator('#review-save').click();
 const exhibitFile=await exhibitDownload;
 const exhibit=JSON.parse(await readFile(await exhibitFile.path(),'utf8'));
 assert(exhibit.tape.length>=260,'exhibition tape includes live round');
 assert([...exhibit.tape.slice(240)].some((symbol,i)=>i%2===0&&symbol!=='Y'),'Veil bot moves');
 assert([...exhibit.tape.slice(240)].some((symbol,i)=>i%2===1&&symbol!=='Y'),'Cinder ghost moves');
 await host.locator('#ghost-exhibition').uncheck();
 await host.locator('#drill').selectOption('ghost');
 await status(host,/Practice · Trained ghost/);
 assert.equal(await host.evaluate(()=>JSON.parse(localStorage.getItem('seamless-fight.ghost.v1')).sources.length),1);
 await host.locator('#ghost-learn').click();
 await until(async()=>/Auto-learning is enabled/.test(await host.locator('#ghost-status').textContent()),'manual practice training suppressed when auto learning enabled');
 await host.locator('#ghost-auto').uncheck();
 await host.locator('#drill').selectOption('lesson');
 assert.match(await host.locator('#lesson-title').textContent(),/Move across/);
 await until(async()=>/74 seconds/.test(await host.locator('#round-score').textContent()),'lesson round running');
 await host.bringToFront();
 await host.keyboard.down('d');
 try{await until(async()=>/Make a light cut/.test(await host.locator('#lesson-title').textContent()),'lesson credits simulated movement');}
 finally{await host.keyboard.up('d');}
 await host.keyboard.press('j');
 await until(async()=>/Quickstep/.test(await host.locator('#lesson-title').textContent()),'lesson credits accepted cut');
 await host.locator('#drill').selectOption('pressure');
 assert.equal(await host.locator('#lesson').isVisible(),false);
 await until(async()=>/Pressure fighter/.test(await host.locator('#status').textContent()),'pressure sparring selected');
 await until(async()=>/74 seconds/.test(await host.locator('#round-score').textContent()),'practice round running');
 await host.locator('#capture').click();
 assert.match(await host.locator('#review-info').textContent(),/Partial match captured/);
 await host.locator('#review-open').click();
 assert(await host.locator('#review-controls').isVisible());
 await host.locator('#arena').screenshot({path:'artifacts/duel-lantern-practice.png'});
 const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce',hasTouch:true,isMobile:true});
 await phone.goto(url);
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await phone.locator('#readable-score').isVisible());
 assert(await phone.locator('#arena').evaluate(el=>Math.abs(el.width-el.clientWidth*2)<=2&&el.width<960));
 assert.match(await phone.locator('#fighter-score-0').textContent(),/100 HP/);
 await phone.locator('#input-settings summary').click();
 await phone.locator('#captions').check();
 await phone.locator('#practice').click();
 await until(async()=>await phone.locator('#touch-controls').isVisible(),'coarse pointer controls visible');
 await until(async()=>/74 seconds/.test(await phone.locator('#round-score').textContent()),'mobile round is live');
 await phone.locator('[data-action=shot]').tap();
 await until(async()=>/Veil: Pistol fired/.test(await phone.locator('#cue-caption').textContent()),'authoritative shot caption without audio');
 assert.match(await phone.locator('#fighter-score-0').textContent(),/2 shots/);
 await phone.screenshot({path:'artifacts/duel-mobile-reduced-motion.png'});
 // Exercise the optional host-site art path without redistributing the private export.
 const themed=await browser.newPage();
 const art='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#d9b878"/></svg>';
 const requested=new Set();
 await themed.route(url,async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:(await response.text()).replace('data-site-art="off"','data-site-art="on"')});
 });
 await themed.route(origin+'/art/**',async route=>{
   requested.add(new URL(route.request().url()).pathname);
   if(/(?:icon-lantern|fog)\.webp$/.test(route.request().url()))return route.fulfill({status:404,body:''});
   await route.fulfill({contentType:'image/svg+xml',body:art});
 });
 await themed.route(origin+'/_next/static/media/**',route=>route.fulfill({status:404,body:''}));
 await themed.goto(url);
 await until(async()=>/\/art\/icon-blades.webp$/.test(await themed.locator('.duel-crest').getAttribute('src')),'site crest decoded');
 await until(async()=>await themed.locator('html').getAttribute('data-divider-ready')==='true','site divider decoded');
 await until(async()=>await themed.locator('html').getAttribute('data-site-sky')==='ready','site layers baked despite missing fog');
 for(const layer of ['skyline-near','skyline-far','moon','fog','icon-vial','icon-bell','icon-skull'])assert(requested.has('/art/'+layer+'.webp'));
 assert.equal(await host.locator('html').getAttribute('data-site-sky'),null);
 assert.match(await themed.locator('.arena-badge img').getAttribute('src'),/\.\/art\/lantern\.svg$/);
 assert.equal(await host.locator('html').getAttribute('data-site-art'),'off');
 await themed.screenshot({path:'artifacts/duel-seamless-hunt-theme.png'});
 const q1=await browser.newPage(),q2=await browser.newPage();
 for(const page of [q1,q2]){page.on('pageerror',err=>errors.push(err.message));await page.goto(url);}
 await q1.locator('.queue-filters summary').click();
 await q1.locator('#queue-rtt').selectOption('180');
 assert.equal(await q1.locator('#queue-format').inputValue(),'casual');
 await q1.locator('#queue-format').selectOption('set-preview');
 assert.equal(await q1.locator('#queue-start').textContent(),'Find competitive set');
 await q1.locator('#queue-format').selectOption('casual');
 await q1.locator('#queue-start').click();
 await until(async()=>/Keep practicing/.test(await q1.locator('#queue-status').textContent()),'queue active during practice');
 assert(await q1.locator('#arena-select').isDisabled());
 assert(await q1.locator('#queue-rtt').isDisabled());
 assert(await q1.locator('#queue-format').isDisabled());
 assert(await q1.locator('#drill').isDisabled());
 await until(async()=>/74 seconds/.test(await q1.locator('#round-score').textContent()),'practice simulation continues while queued');
 await q1.locator('#queue-stop').click();
 assert.match(await q1.locator('#queue-status').textContent(),/cancelled/);
 assert(await q1.locator('#arena-select').isEnabled());
 assert.equal(await q1.locator('#queue-rtt').inputValue(),'180');
 assert(await q1.locator('#queue-format').isEnabled());
 assert(await q1.locator('#drill').isEnabled());
 await q1.locator('#queue-start').click();
 await until(async()=>/Keep practicing/.test(await q1.locator('#queue-status').textContent()),'requeued after cancel');
 await q2.locator('#queue-start').click();
 await Promise.all([status(q1,/Online duel/),status(q2,/Online duel/)]);
 assert.match(await q1.locator('#queue-status').textContent(),/At pairing · Your server ping \d+ ms · Opponent server ping \d+ ms/);
 assert(await q1.locator('#invite').isHidden());
 assert(await q2.locator('#queue-stop').isHidden());
 const c1=await browser.newPage(),c2=await browser.newPage();
 for(const page of [c1,c2]){
   page.on('pageerror',err=>errors.push(err.message));
   await page.goto(url);
   await page.locator('#queue-format').selectOption('set-preview');
   assert.equal(await page.locator('#queue-start').textContent(),'Find competitive set');
 }
 await c1.locator('#queue-start').click();
 await until(async()=>/Keep practicing/.test(await c1.locator('#queue-status').textContent()),'competitive queue started from practice');
 await c2.locator('#queue-start').click();
 await Promise.all([status(c1,/Competitive BO3/),status(c2,/Competitive BO3/)]);
 assert(await c1.locator('#set-panel').isVisible());
 assert(await c2.locator('#set-panel').isVisible());
 assert.match(await c1.locator('#set-title').textContent(),/0 – 0 games/);
 assert.match(await c1.locator('#online').textContent(),/Create player room/);
 assert.match(await c1.locator('#set-status').textContent(),/unranked rules preview/);
 assert(await c1.locator('#set-replay-controls').isHidden());
 assert(await c1.locator('#rematch').isHidden());
 assert(await c2.locator('#rematch').isHidden());
 assert(await c1.locator('#queue-stop').isHidden());
 assert.deepEqual(errors,[]);
 console.log('Chromium passed: training, browser invites, asymmetric delayed movement, read-only gallery, 2x canvas and disconnect.');
}finally{try{await browser?.close();}finally{server.kill();}}
