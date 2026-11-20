import {W,H,HZ,match,step,blank,moves} from './engine.mjs';
import {HISTORY_LIMIT,playable,reconcile} from './prediction.mjs';
import {trainingInput} from './tactics.mjs';
import {MAX_TAPE,TIMELINE,phase,makeLab,practiceTick,writeTape,tapeInput,preset,restoreDrill} from './lab.mjs';
import {createAudio,soundChanges} from './audio.mjs';
import {RULESET,MAX_TICKS,createReview} from './replay.mjs';
const $=id=>document.getElementById(id), canvas=$('arena'), g=canvas.getContext('2d');
function resizeCanvas(){
 const scale=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 const width=Math.round(W*scale), height=Math.round(H*scale);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 g.setTransform(width/W,0,0,height/H,0,0);
}
resizeCanvas();addEventListener('resize',resizeCanvas);
const bg=document.createElement('canvas');bg.width=W;bg.height=H;
const b=bg.getContext('2d'), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed=42731;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const sky=b.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#221923');sky.addColorStop(.42,'#352c3b');sky.addColorStop(1,'#12161c');b.fillStyle=sky;b.fillRect(0,0,W,H);
b.fillStyle='#a69183';b.beginPath();b.arc(714,59,33,0,Math.PI*2);b.fill();
for(let layer=0;layer<2;layer++)for(let x=-10;x<W;x+=20+rand()*38){const y=28+rand()*102,w=12+rand()*30;b.fillStyle=layer?'#201c27':'#3c303d';b.fillRect(x,y,w,145);b.beginPath();b.moveTo(x-5,y);b.lineTo(x+w/2,y-12-rand()*35);b.lineTo(x+w+5,y);b.fill();}
b.fillStyle='#191b24';b.fillRect(30,87,900,420);
for(let y=87,row=0;y<506;y+=15,row++)for(let x=31+(row%2)*15;x<925;x+=31){
 const v=32+Math.floor(rand()*15), w=Math.min(28,929-x);
 b.fillStyle='rgb('+v+','+(v-2)+','+(v+4)+')';b.fillRect(x,y,w,12);
 b.fillStyle='#b6a0a21b';b.fillRect(x+1,y,w-2,1);
 for(let j=0;j<4;j++){b.fillStyle=j%2?'#d2b1ac17':'#09090e50';b.fillRect(x+rand()*(w-2),y+2+rand()*8,1+rand(),1);}
}
b.strokeStyle='#65564d';b.lineWidth=2;b.strokeRect(41,87,878,418);b.strokeStyle='#967b634f';b.strokeRect(58,96,W-116,H-151);
for(let i=0;i<7;i++){b.beginPath();b.ellipse(480,325,67+i*11,46+i*8,0,0,Math.PI*2);b.stroke();}
for(const x of [81,230,730,879]){const p=b.createRadialGradient(x,156,0,x,156,110);p.addColorStop(0,'#eb9a5264');p.addColorStop(1,'#e9753800');b.fillStyle=p;b.fillRect(x-110,46,220,220);b.fillStyle='#0f1017';b.fillRect(x-2,153,4,50);b.fillStyle='#ffce87';b.fillRect(x-4,149,8,12);}
const vignette=b.createRadialGradient(480,280,150,480,280,540);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#07050cb9');b.fillStyle=vignette;b.fillRect(0,0,W,H);

const status=t=>{$('status').textContent=t;};
let s=match(), prev=null, at=0, mode='', ws, slot=0, action='', vote=false, ping=0, lastSound=null;
const audio=createAudio(), flashes=[0,0];
let watching=false, watchLink=null;
let seq=0,pending=[],predicted=null,correction={x:0,y:0};
function sendInput(input){
 if(watching||ws?.readyState!==1||ws.bufferedAmount>=2048)return;
 const cmd={...input,seq:++seq};ws.send(JSON.stringify({t:'input',...cmd}));
 if(mode==='online'&&playable(s)){
   pending.push(cmd);if(pending.length>HISTORY_LIMIT)pending.shift();
   ({p:predicted}=reconcile(s,slot,pending,0));
 }
}
const pressed=new Set(), keys={KeyJ:'cut',KeyK:'hew',KeyL:'shot',KeyI:'feint',Space:'step'};
const moveKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
function read(){const on=(a,b)=>Number(pressed.has(a)||pressed.has(b));const i={x:on('KeyD','ArrowRight')-on('KeyA','ArrowLeft'),y:on('KeyS','ArrowDown')-on('KeyW','ArrowUp'),act:action};action='';return i;}
function flush(){pressed.clear();action='';sendInput(blank());}
addEventListener('blur',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
addEventListener('keydown',e=>{if(e.target.matches?.('input,button,select')||!mode||watching)return;if(moveKeys.includes(e.code)||keys[e.code])e.preventDefault();if(!e.repeat&&keys[e.code])action=keys[e.code];pressed.add(e.code);});
addEventListener('keyup',e=>pressed.delete(e.code));
let labKind='',labTick=0,labHold=false,labNote='',tape=[],saved=[],trace=[],attempt=[],spacing='edge';
let capture=null, review=null, reviewTick=0, replayPlaying=false, forkSlot=-1, saveUrl='';
const reviewInfo=msg=>{$('review-info').textContent=msg;};
function leave(){const c=ws;ws=null;c?.close();flush();s=match();prev=null;review=null;replayPlaying=false;forkSlot=-1;$('capture').disabled=true;$('review-controls').hidden=true;watching=false;ping=0;$('gallery').hidden=true;setGallery(null);seq=0;pending=[];predicted=null;correction={x:0,y:0};slot=0;vote=false;lastSound=null;flashes.fill(0);labKind='';trace=[];$('lab-meter').hidden=$('takeover-controls').hidden=true;$('copy').hidden=$('invite').hidden=$('rematch').hidden=true;}
function practice(){leave();mode='practice';status('Practice · '+$('drill').selectedOptions[0].textContent+' · first to two round wins.');document.activeElement?.blur();}
function startLab(kind, recording=[]){
 leave();mode='lab';labKind=kind;labTick=0;labHold=false;labNote='';tape=recording;attempt=[];spacing=$('spacing').value;s=makeLab(spacing);
 $('lab-meter').hidden=false;
 $('takeover-controls').hidden=kind==='record';syncScrub();
 status(kind==='record'?'Recording Cinder. Press R or Stop to save (6 seconds max).':'Respond to Cinder. Press T or Replay to reset the same setup.');
 document.activeElement?.blur();
}
function syncScrub(){
 const seek=$('seek');seek.max=attempt.length;seek.value=labTick;
 $('seek-label').textContent='Tick '+labTick+' / '+attempt.length;
 $('takeover').disabled=!labHold||s.end>0||s.over;
}
function seekLab(){
 if(mode!=='lab'||labKind!=='play')return;
 labHold=true;flush();
 const frame=restoreDrill(spacing,tape,attempt,Number($('seek').value));
 s=frame.state;trace=frame.trace;labTick=frame.tick;labNote='';lastSound=null;flashes.fill(0);
 syncScrub();status('Paused at tick '+labTick+'. Take over to try a different response.');
}
$('seek').oninput=seekLab;
$('takeover').onclick=()=>{
 if(mode!=='lab'||labKind!=='play'||!labHold||s.end||s.over)return;
 attempt.length=labTick;labHold=false;flush();syncScrub();document.activeElement?.blur();
 status('Takeover · playing as Veil against the same Cinder inputs.');
};
function stopLab(){
 if(mode!=='lab'||labHold)return;
 labHold=true;
 if(labKind==='record'){
   if(tape.length){saved=tape.slice();$('script').value='custom';$('custom').disabled=false;status('Recording saved. Press T or Replay to practice it.');}
   else status('No ticks recorded. Press Record to try again.');
 }else{syncScrub();status('Drill paused. Scrub and take over, or replay from the start.');}
}
function replayLab(){
 const choice=$('script').value, sequence=choice==='custom'?saved:preset(choice);
 if(sequence.length)startLab('play',sequence);
}
function labStep(){
 if(labHold)return;
 const input=read(), recording=labKind==='record';
 const keep=recording?writeTape(tape,input):true;
 if(!recording)attempt[labTick]=input;
 const before=s.p.map(p=>p.hp);
 practiceTick(s,recording?[blank(),input]:[input,tapeInput(tape,labTick)]);
 if(s.p.some((p,i)=>p.hp<before[i]))labNote=s.p.map((p,i)=>before[i]-p.hp).map((hp,i)=>hp?(i?'Cinder':'Veil')+' −'+hp+' HP':'').filter(Boolean).join(' · ');
 trace.push(s.p.map(phase));if(trace.length>TIMELINE)trace.shift();
 labTick++;
 if(!recording)syncScrub();
 if(!keep||s.end||s.over||(!recording&&labTick>=tape.length+60))stopLab();
}
$('record').onclick=()=>startLab('record');$('stop').onclick=stopLab;$('replay').onclick=replayLab;
addEventListener('keydown',e=>{
 if(e.repeat||e.target.matches?.('input,button,select,textarea')||mode!=='lab')return;
 if(e.code==='KeyT'){e.preventDefault();replayLab();}
 if(e.code==='KeyR'&&labKind==='record'){e.preventDefault();stopLab();}
});
function setGallery(code){
 watchLink=code;$('gallery-toggle').textContent=code?'Close gallery':'Open gallery';
 $('gallery-toggle').setAttribute('aria-expanded',String(Boolean(code)));
 const link=new URL('./',location.href);if(code)link.searchParams.set('watch',code);
 $('watch-link').value=code?link.href:'';$('watch-link').hidden=$('watch-copy').hidden=!code;
}
$('gallery-toggle').onclick=()=>{if(ws?.readyState===1)ws.send(JSON.stringify({t:'gallery',open:!watchLink}));};
$('watch-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('watch-link').value);status('Watch link copied.');}catch{$('watch-link').focus();$('watch-link').select();}};
function online(code,watch=false){
 leave();watching=watch;mode='connecting';status('Connecting to Lantern Court…');
 const url=new URL('./socket',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
 const c=ws=new WebSocket(url);
 c.onopen=()=>c.send(JSON.stringify({t:watch?'watch':'hello',code}));
 c.onmessage=e=>{
   if(c!==ws)return;const m=JSON.parse(e.data);
   if(m.t==='room'){
     slot=m.slot;$('gallery').hidden=slot!==0;const invite=new URL('./',location.href);invite.searchParams.set('room',m.code);$('invite').value=invite.href;$('copy').hidden=$('invite').hidden=false;status(slot?'Opponent found.':'Waiting for an opponent. Share the invite link.');
   }
   if(m.t==='replay'){try{loadCapture(m);}catch(e){reviewInfo(e.message);}return;}
   if(m.t==='gallery')setGallery(m.code);
   if(m.t==='watching'){slot=-1;mode='spectate';status('Spectating · waiting for both fighters.');}
   if(m.t==='state'&&watching){
     prev=m.s.tick>s.tick&&m.s.round===s.round&&m.s.ready<=s.ready?s:null;
     if(s.tick===0)status('Spectating live · read-only.');
     at=performance.now();s=m.s;feedback(s);return;
   }
   if(m.t==='state'){prev=m.s.tick>=s.tick&&m.s.round===s.round?s:null;at=performance.now();if(mode!=='online')status('Online duel · first to two round wins.');if(!m.s.over){vote=false;$('rematch').textContent='Rematch';}const old=predicted;
     const continuous=mode==='online'&&playable(s)&&playable(m.s)&&m.s.round===s.round&&m.s.tick>s.tick;
     mode='online';s=m.s;$('capture').disabled=false;feedback(s);
     const next=reconcile(s,slot,continuous?pending:[],m.ack);pending=next.pending;predicted=next.p;
     const dx=old?old.x+correction.x-predicted.x:0,dy=old?old.y+correction.y-predicted.y:0;
     correction=continuous&&!predicted.act&&Math.hypot(dx,dy)<28?{x:dx,y:dy}:{x:0,y:0};
   }
   if(m.t==='pong')ping=Math.round(performance.now()-m.id);
   if(m.t==='vote'&&m.slot!==slot)$('rematch').textContent='Accept rematch';
   if(m.t==='error'){leave();mode='';status(m.message);}
 };
 c.onclose=()=>{if(c===ws){leave();mode='';status('Connection closed. Create a new room.');}};
 document.activeElement?.blur();
}
$('practice').onclick=practice;$('drill').onchange=()=>{if(mode==='practice')practice();};$('online').onclick=()=>online(null);
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('invite').value);status('Invite copied.');}catch{$('invite').focus();$('invite').select();}};
$('rematch').onclick=()=>{document.activeElement?.blur();if(mode==='practice')practice();else if(ws?.readyState===1&&!vote){vote=true;$('rematch').textContent='Waiting for opponent';ws.send('{"t":"rematch"}');}};
let soundOn=false,soundBusy=false;
function mix(){audio.mix(Number($('sfx').value)/100,Number($('ambience').value)/100);}
$('sfx').oninput=mix;$('ambience').oninput=mix;
$('sound').onclick=async()=>{
 if(soundBusy)return;
 const btn=$('sound');
 soundBusy=true;
 try{
   if(soundOn){audio.mute();soundOn=false;}
   else{soundOn=await audio.enable();if(!soundOn)status('Audio unavailable in this browser.');}
   mix();btn.textContent=soundOn?'Sound on':'Sound off';btn.setAttribute('aria-pressed',String(soundOn));
 }finally{soundBusy=false;}
};
function feedback(state){
 for(const cue of soundChanges(lastSound,state)){
   audio.play(cue.name,cue.x);
   if(cue.index!==undefined)flashes[cue.index]=1;
 }
 lastSound={tick:state.tick,round:state.round,ready:state.ready,p:state.p.map(({hp,act,age})=>({hp,act,age}))};
}
function loadCapture(data){
 const clip={rules:data.rules,tape:data.tape}, view=createReview(clip);
 capture=view;
 if(saveUrl)URL.revokeObjectURL(saveUrl);
 saveUrl=URL.createObjectURL(new Blob([JSON.stringify(clip)],{type:'application/json'}));
 $('review-save').href=saveUrl;$('review-save').hidden=false;$('review-open').disabled=false;
 reviewInfo(view.complete?'Completed match captured.':'Partial match captured · '+view.total+' ticks.');
}
$('capture').onclick=()=>{
 if(mode!=='online'||ws?.readyState!==1)return;
 ws.send('{"t":"replay"}');
};
$('review-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try{
   if(file.size>MAX_TICKS*2+512)throw Error('Replay file is too large.');
   loadCapture(JSON.parse(await file.text()));
 }catch(err){reviewInfo('Could not open replay: '+err.message);}
};
function syncReview(){
 $('review-seek').value=reviewTick;$('review-tick').textContent='Tick '+reviewTick+' / '+review.total;
 $('review-play').textContent=replayPlaying?'Pause':'Play';
 $('review-play').disabled=reviewTick>=review.total;
 $('review-step').disabled=replayPlaying||reviewTick>=review.total;
 for(const id of ['review-veil','review-cinder'])$(id).disabled=replayPlaying||s.over||reviewTick>=review.total;
}
function seekReview(t){
 s=review.at(t);reviewTick=t;replayPlaying=false;forkSlot=-1;
 lastSound=null;flashes.fill(0);flush();syncReview();
 reviewInfo('Reviewing original duel.');
}
$('review-open').onclick=()=>{
 if(!capture)return;
 if((mode==='online'||mode==='connecting'||mode==='spectate')&&!window.confirm('Leave the current room and open the replay?'))return;
 leave();mode='review';review=capture;
 $('review-seek').max=review.total;$('review-controls').hidden=false;seekReview(0);
 status('Online match review · seek, step, or take over either fighter.');
};
$('review-seek').oninput=()=>seekReview(Number($('review-seek').value));
$('review-play').onclick=()=>{
 if(forkSlot>=0){const t=reviewTick;seekReview(t);}
 replayPlaying=!replayPlaying;syncReview();
};
$('review-step').onclick=()=>seekReview(Math.min(review.total,reviewTick+1));
for(const [id,i] of [['review-veil',0],['review-cinder',1]])$(id).onclick=()=>{
 seekReview(reviewTick);forkSlot=i;replayPlaying=true;document.activeElement?.blur();syncReview();
 reviewInfo('Takeover as '+(i?'Cinder':'Veil')+' · opponent follows recorded inputs.');
};
function reviewStep(){
 if(!replayPlaying)return;
 const inputs=review.inputs(reviewTick);
 if(forkSlot>=0)inputs[forkSlot]=read();
 step(s,inputs);reviewTick++;feedback(s);
 if(s.over||reviewTick>=review.total){replayPlaying=false;reviewInfo(forkSlot>=0?'Takeover finished. Seek to retry.':'End of capture.');}
 syncReview();
}
const params=new URLSearchParams(location.search), watch=params.get('watch'), invite=params.get('room');
if(watch&&/^[\w-]{12}$/.test(watch))online(watch,true);else if(invite&&/^[\w-]{12}$/.test(invite))online(invite);
setInterval(()=>{if(ws?.readyState===1)ws.send(JSON.stringify({t:'ping',id:performance.now()}));},2000);
for(const [label,id] of [['Cut','cut'],['Hew','hew'],['Pistol','shot'],['Quickstep','step'],['Feint recovery','feint']]){
 const row=$('frames').insertRow();for(const value of [label,...moves[id].slice(0,4)])row.insertCell().textContent=value;
}
$('frames').lastElementChild.lastElementChild.textContent='8 extra';
let prevFrame=performance.now(),acc=0;
function drawFighter(p,i,x,y,time){
 const color=i?'#e39774':'#8fc8c0', f=Math.atan2(p.fy,p.fx), m=moves[p.act], active=m&&p.age>=m[0]&&p.age<m[0]+m[1];
 g.save();g.translate(x,y);
 g.fillStyle='#09090dcc';g.beginPath();g.ellipse(0,8,26,12,0,0,Math.PI*2);g.fill();
 g.rotate(f);
 if(p.act==='step'&&active)g.globalAlpha=.56;
 if(m&&m[5]&&p.age<m[0]+m[1]){
   g.beginPath();g.moveTo(0,0);const arc=Math.acos(p.act==='shot'?.88:.45);g.arc(0,0,m[4],-arc,arc);g.closePath();g.fillStyle=active?color+'6b':color+'15';g.fill();g.strokeStyle=active?color:color+'68';g.lineWidth=active?2:1;g.stroke();
 }
 const stride=reduced?0:Math.sin(time/55)*Math.min(4,Math.hypot(p.vx,p.vy));
 g.fillStyle='#12131a';g.fillRect(-12+stride,-12,15,8);g.fillRect(-12-stride,5,15,8);
 g.fillStyle='#312d3a';g.beginPath();g.moveTo(9,-13);g.lineTo(-7,-18);g.lineTo(-23,-15);g.lineTo(-19,15);g.lineTo(-7,18);g.lineTo(9,12);g.closePath();g.fill();
 g.strokeStyle=color;g.lineWidth=2;g.stroke();
 g.fillStyle='#12141b';g.beginPath();g.ellipse(3,0,11,10,0,0,Math.PI*2);g.fill();
 g.fillStyle=color;g.fillRect(8,-5,3,10);
 const melee=p.act==='cut'||p.act==='hew';
 let sweep=.42;
 if(melee){const arc=Math.acos(.45);sweep=p.age<m[0]?-arc*p.age/m[0]:active?-arc+2*arc*Math.min(1,(p.age-m[0]+1)/m[1]):arc*(1-Math.min(1,(p.age-m[0]-m[1])/m[2]));}
 else if(p.act==='feint')sweep=-.9*(1-p.age/m[2]);
 else if(p.act==='shot')sweep=0;
 const reach=p.act==='hew'?36:29, hx=7,hy=10, tx=hx+Math.cos(sweep)*reach,ty=hy+Math.sin(sweep)*reach;
 g.strokeStyle='#0b0c12';g.lineWidth=6;g.beginPath();g.moveTo(hx,hy);g.lineTo(tx,ty);g.stroke();
 g.strokeStyle=p.act==='stun'?'#ffe7a8':active?'#fff0cf':'#c5b9a9';g.lineWidth=p.act==='shot'?4:2;g.stroke();
 g.fillStyle='#a58258';g.fillRect(hx-4,hy-3,7,6);
 if(p.act==='feint'){g.strokeStyle='#e6ba78';g.lineWidth=1.5;g.beginPath();g.arc(0,0,23,-1.3,1.3);g.stroke();}
 if(p.act==='shot'&&active){g.fillStyle='#ffe6a0';g.beginPath();g.arc(tx,ty,5,0,Math.PI*2);g.fill();}
 g.restore();
}
function bar(x,y,w,v,color){g.fillStyle='#171420';g.fillRect(x,y,w,8);g.fillStyle=color;g.fillRect(x,y,w*Math.max(0,v)/100,8);}
function render(now){
 const elapsed=Math.min(100,now-prevFrame);prevFrame=now;acc+=elapsed;
 let budget=5;
 while(acc>=1000/HZ&&budget-->0){acc-=1000/HZ;if(mode==='practice'){step(s,[read(),trainingInput(s,$('drill').value)]);feedback(s);}else if(mode==='review')reviewStep();else if(mode==='lab'){labStep();if(lastSound?.tick!==s.tick)feedback(s);}else if(mode==='online'&&ws?.readyState===1&&ws.bufferedAmount<2048)sendInput(read());}
 if(acc>100)acc=0;
 for(let i=0;i<2;i++)flashes[i]=Math.max(0,flashes[i]-elapsed/220);
 g.drawImage(bg,0,0);
 if(!reduced){for(let i=0;i<27;i++){const x=(i*157+now*.013)%W,y=153+(i*71)%335;g.fillStyle=i%3?'#e3d6dc1d':'#e7a16082';g.fillRect(x,y,2,2);}}
 const blend=(mode==='online'||mode==='spectate')&&prev?Math.min(1,(now-at)/50):1;
 const decay=Math.exp(-elapsed/43);correction.x*=decay;correction.y*=decay;
 const poses=s.p.map((p,i)=>({p,i,x:prev?prev.p[i].x+(p.x-prev.p[i].x)*blend:p.x,y:prev?prev.p[i].y+(p.y-prev.p[i].y)*blend:p.y})).map(o=>mode==='online'&&o.i===slot&&predicted?{...o,x:predicted.x+correction.x,y:predicted.y+correction.y}:o).sort((a,b)=>a.y-b.y);
 for(const {p,i,x,y} of poses){
   drawFighter(p,i,x,y,now);
   if(flashes[i]>0){
     g.save();g.globalAlpha=reduced?.6:flashes[i]*.85;g.strokeStyle='#ffd5a0';g.lineWidth=2;
     g.beginPath();g.ellipse(x,y+5,28+(reduced?0:(1-flashes[i])*17),17,0,0,Math.PI*2);g.stroke();g.restore();
   }
 }
 for(let i=0;i<2;i++){const p=s.p[i],x=i?674:36,c=i?'#e39774':'#8fc8c0';g.fillStyle=c;g.font='15px system-ui';g.textAlign='left';g.fillText((i?'CINDER':'VEIL')+' · '+s.score[i]+'   /   '+p.ammo+' SHOTS'+(i===(mode==='review'?forkSlot:mode==='lab'&&labKind==='record'?1:slot)&&mode?'   /   YOU':''),x,27);bar(x,35,250,p.hp,c);bar(x,47,250,p.st,'#d1aa60');}
 g.textAlign='center';g.fillStyle='#eee1c8';g.font='24px Georgia';g.fillText(String(Math.ceil(s.clock/HZ)),480,38);
 if(mode==='lab'){
   const palette=['#434454','#dbad66','#ed7869','#9b87be','#78cdb8','#e8dfaf'];
   for(let j=0;j<trace.length;j++)for(let i=0;i<2;i++){g.fillStyle=palette[trace[j][i]];g.fillRect(287+(TIMELINE-trace.length+j)*4,498+i*10,3,7);}
   g.font='13px system-ui';g.fillStyle='#f3dfbc';g.fillText((labKind==='record'?'REC ':'DRILL ')+labTick+(labKind==='record'?'/'+MAX_TAPE:'')+(labNote?'  ·  '+labNote:''),480,478);
 }
 if(mode==='spectate'){g.font='13px system-ui';g.fillText('SPECTATING',480,59);}
 if(mode==='online'){g.font='13px system-ui';g.fillText(ping?ping+' ms RTT':'ONLINE',480,59);}
 let msg='';
 if(mode==='connecting')msg='Waiting for challenger';
 else if(mode==='spectate'&&s.tick===0)msg='Waiting for fighters';
 else if(mode&&mode!=='lab'&&mode!=='review'){if(s.over)msg=watching?(s.winner===0?'Veil wins':'Cinder wins'):s.winner===slot?'Victory':'Defeat';else if(s.end)msg=s.winner<0?'Draw':watching?(s.winner===0?'Veil takes the round':'Cinder takes the round'):s.winner===slot?'Round won':'Round lost';else if(s.ready)msg='Round '+s.round+'  /  '+Math.ceil(s.ready/HZ);}
 if(msg){g.fillStyle='#13101bd4';g.fillRect(250,222,460,76);g.fillStyle='#f5ddaf';g.font='36px Georgia';g.fillText(msg,480,270);}
 $('rematch').hidden=watching||mode==='review'||!s.over;
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
