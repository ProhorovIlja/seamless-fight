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
 await host.goto(url);
 await host.locator('#input-settings summary').click();
 await host.locator('#bind-cut').click();
 await host.keyboard.press('k');
 assert.match(await host.locator('#bind-cut').textContent(),/Cut: K/);
 assert.match(await host.locator('#bind-hew').textContent(),/Heavy: J/);
 await host.reload();
 assert.match(await host.locator('#key-guide').textContent(),/K Cut/);
 await host.locator('#input-settings summary').click();
 await host.locator('#reset-keys').click();
 assert.match(await host.locator('#key-guide').textContent(),/J Cut/);
 assert(await host.locator('#gallery').isHidden());
 await host.locator('#sound').click();
 await until(async()=>await host.locator('#sound').getAttribute('aria-pressed')==='true','user-enabled Web Audio');
 await host.locator('#sound').click();
 await until(async()=>await host.locator('#sound').getAttribute('aria-pressed')==='false','muted Web Audio');
 await host.locator('summary').filter({hasText:'Duel lab'}).click();
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
 await host.locator('#online').click();
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
 await until(()=>snapshot?.ready===0,'round live');
 const x=snapshot.p[0].x;
 await host.keyboard.down('ArrowRight');
 try{await until(()=>snapshot?.p[0].x>x+12,'authoritative movement from browser keyboard');}
 finally{await host.keyboard.up('ArrowRight');}
 const guestX=snapshot.p[1].x;
 await guest.keyboard.down('ArrowLeft');
 try{await until(()=>snapshot?.p[1].x<guestX-12,'authoritative guest movement through asymmetric delay');}
 finally{await guest.keyboard.up('ArrowLeft');}
 assert(impairment.up>1&&impairment.down>1);
 await host.locator('#gallery-toggle').click();
 await until(async()=>Boolean(await host.locator('#watch-link').inputValue()),'watch link issued');
 const watchUrl=new URL(await host.locator('#watch-link').inputValue());
 assert.equal(watchUrl.origin,origin);assert(!watchUrl.searchParams.has('room'));
 await viewer.goto(watchUrl.href);
 await status(viewer,/Spectating live/);
 assert(await viewer.locator('#gallery').isHidden());
 assert.equal(await viewer.locator('#arena').evaluate(el=>el.width),1920);assert(await viewer.locator('#rematch').isHidden());
 await host.locator('#gallery-toggle').click();
 await status(viewer,/host closed the gallery/);
 await host.locator('#match-review summary').click();
 await host.locator('#capture').click();
 await until(async()=>await host.locator('#review-open').isEnabled(),'authoritative replay captured');
 const downloadEvent=host.waitForEvent('download');
 await host.locator('#review-save').click();
 const download=await downloadEvent;
 assert.equal(download.suggestedFilename(),'seamless-fight-replay.json');
 const savedReplay=await download.path();
 await guest.close();
 await status(host,/Opponent disconnected/);
 await host.locator('#review-file').setInputFiles(savedReplay);
 await until(async()=>/Replay file loaded/.test(await host.locator('#review-info').textContent()),'replay file imported');
 await host.locator('#review-open').click();
 await status(host,/Online match review/);
 await host.locator('#review-step').click();
 assert.match(await host.locator('#review-tick').textContent(),/^Tick 1 /);
 await host.locator('#review-veil').click();
 await until(async()=>!/^Tick 1 /.test(await host.locator('#review-tick').textContent()),'match takeover advances');
 await host.locator('#review-event').selectOption('120');
 assert.match(await host.locator('#review-tick').textContent(),/^Tick 120 /);
 assert.deepEqual(errors,[]);
 console.log('Chromium passed: training, browser invites, asymmetric delayed movement, read-only gallery, 2x canvas and disconnect.');
}finally{try{await browser?.close();}finally{server.kill();}}
