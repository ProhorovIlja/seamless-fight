import {SIDE_HZ,SIDE_RULESET,SIDE_MOVES,sideInput,sideMatch,sideStep,SIDE_FLOOR} from './side-engine.mjs';
import {createSideBot} from './side-ai.mjs';
import {createSideReview,packSideTick,SIDE_TAPE_LIMIT} from './side-replay.mjs';
import {sideReadout} from './side-inspector.mjs';
import {createSideTransport,SIDE_INVITE_PATTERN} from './side-online-client.mjs';
import {SIDE_STAGES,paintSideStage,paintSideWeather,paintSideFighter,drawSideTraining,drawSideHUD,drawSideImpact} from './side-art.mjs';
import {createAudio} from './audio.mjs';
import {DEFAULT_KEYS,DEFAULT_MOVE,DEFAULT_PAD,STORAGE_KEY,allowed,settings,samplePad} from './controls.mjs';
import {outfit} from './wardrobe.mjs';

const $=id=>document.getElementById(id);
const canvas=$('fight-canvas'),g=canvas.getContext('2d');
const STORAGE='seamless-fight.side.settings.v1';
const original=(()=>{try{return settings(JSON.parse(localStorage.getItem(STORAGE_KEY)));}catch{return settings();}})();
const validatedCode=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Enter|ShiftLeft|ShiftRight)$/.test(code);
let stored={};try{stored=JSON.parse(localStorage.getItem(STORAGE))||{};}catch{}
let sidePrefs={stage:Object.hasOwn(SIDE_STAGES,stored.stage)?stored.stage:'reliquary',
 level:['easy','normal','hard','dummy'].includes(stored.level)?stored.level:'normal',
 boxes:stored.boxes===true,reduce:stored.reduce===true,contrast:stored.contrast===true,
 keys:{...original.keys},move:{...original.move},guard:'KeyO'};
function validateBindings(candidate){
 const keys={...sidePrefs.keys,...candidate?.keys},move={...sidePrefs.move,...candidate?.move},guard=candidate?.guard??sidePrefs.guard;
 const codes=[...Object.values(keys),...Object.values(move),guard];
 if(!codes.every(validatedCode)||new Set(codes).size!==codes.length)return false;
 if(['KeyR','KeyT','Escape'].some(v=>codes.includes(v)))return false;
 sidePrefs.keys=keys;sidePrefs.move=move;sidePrefs.guard=guard;return true;
}
validateBindings(stored);
const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(sidePrefs));}catch{}};
$('stage-select').value=sidePrefs.stage;$('opponent').value=sidePrefs.level;
$('show-boxes').checked=sidePrefs.boxes;$('reduce-motion').checked=sidePrefs.reduce;
$('high-contrast').checked=sidePrefs.contrast;
const reduced=()=>sidePrefs.reduce||matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene=sidePrefs.stage,stageCanvas=null,sceneMap=new Map(),mode='idle',priorFrame=performance.now(),acc=0;
let s=sideMatch(),bot=createSideBot(sidePrefs.level==='dummy'?'easy':sidePrefs.level);
let tape=[],capture=null,review=null,cursor=0,reviewPlaying=false;
const effects=[],MAX_EFFECTS=10;
let audioOn=false,queued='',priorPad=null,padQueued='',padMove={x:0,y:0,guard:false};
let inspectorAt=0;const renderIntervals=[];
let onlineSlot=-1,onlineCode='',onlineLooks=null,onlineTick=-1;
const held=new Set(),touchHeld=new Set();
const sound=createAudio();
function setStatus(message){$('fight-status').textContent=message;}
function setReplayStatus(message){$('replay-status').textContent=message;}
function setStage(next){
 scene=Object.hasOwn(SIDE_STAGES,next)?next:'reliquary';
 if(!sceneMap.has(scene)){
  const off=document.createElement('canvas');off.width=960;off.height=540;
  paintSideStage(off.getContext('2d'),scene);sceneMap.set(scene,off);
 }
 stageCanvas=sceneMap.get(scene);
 $('stage-title').textContent=SIDE_STAGES[scene].toUpperCase();
 sound.setArena(scene);
 sidePrefs.stage=scene;persist();
}
setStage(sidePrefs.stage);
$('stage-select').onchange=()=>{
 if(mode==='live'||mode==='paused')restart();
 setStage($('stage-select').value);
};
$('opponent').onchange=()=>{sidePrefs.level=$('opponent').value;persist();if(mode==='live'||mode==='paused')restart();};
for(const [id,key]of [['show-boxes','boxes'],['reduce-motion','reduce'],['high-contrast','contrast']]){
 $(id).onchange=()=>{sidePrefs[key]=$(id).checked;persist();};
}
function resize(){
 const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 const width=Math.max(320,Math.min(1920,Math.round(canvas.clientWidth*dpr))),height=Math.round(width*540/960);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;g.setTransform(width/960,0,0,height/540,0,0);}
}
resize();addEventListener('resize',resize);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(canvas);
function clearHeld(){held.clear();touchHeld.clear();queued='';padQueued='';priorPad=null;padMove={x:0,y:0,guard:false};}
function controlsActive(){return mode==='live'||mode==='takeover'||mode==='online';}
let listening=null;
const bindings=[['Left','left'],['Right','right'],['Jump','up'],['Crouch','down'],
 ['Cut','cut'],['Heavy','hew'],['Pistol','shot'],['Quickstep','step'],['Feint','feint'],['Guard','guard']];
function getCode(which){return which==='guard'?sidePrefs.guard:Object.hasOwn(sidePrefs.move,which)?sidePrefs.move[which]:sidePrefs.keys[which];}
function setCode(which,value){
 if(!validatedCode(value)||['KeyR','KeyT'].includes(value)){return false;}
 const codes=bindings.filter(([,key])=>key!==which).map(([,key])=>getCode(key));
 if(codes.includes(value))return false;
 if(which==='guard')sidePrefs.guard=value;
 else if(Object.hasOwn(sidePrefs.move,which))sidePrefs.move[which]=value;
 else sidePrefs.keys[which]=value;
 persist();return true;
}
function drawBindings(){
 $('bindings').replaceChildren();
 for(const [label,key]of bindings){
  const button=document.createElement('button');
  button.type='button';button.dataset.bind=key;
  button.textContent=label+' · '+getCode(key).replace('Key','').replace('Digit','');
  button.classList.toggle('waiting',key===listening);
  button.onclick=()=>{listening=key;drawBindings();$('bind-message').textContent='Press the new keyboard key for '+label+' (Escape to cancel).';clearHeld();};
  $('bindings').append(button);
 }
}
drawBindings();
$('bindings-reset').onclick=()=>{
 sidePrefs.keys={...DEFAULT_KEYS};sidePrefs.move={...DEFAULT_MOVE};sidePrefs.guard='KeyO';
 listening=null;clearHeld();persist();drawBindings();$('bind-message').textContent='Side-view bindings restored.';
};
document.addEventListener('keydown',e=>{
 if(listening){
  e.preventDefault();
  const which=listening;listening=null;
  if(e.code==='Escape')$('bind-message').textContent='Binding cancelled.';
  else $('bind-message').textContent=setCode(which,e.code)?'Updated '+which+'.':'Key unavailable or already assigned. Choose another.';
  drawBindings();return;
 }
 // Combat must remain responsive after clicking Begin or a display toggle;
 // editable fields and file/range controls retain their keyboard ownership.
 if(e.target?.closest?.('select,textarea,input[type=text],input[type=file],input[type=range]'))return;
 const used=[...Object.values(sidePrefs.keys),...Object.values(sidePrefs.move),sidePrefs.guard,'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code);
 if(used)e.preventDefault();
 if(!controlsActive())return;
 if(!e.repeat){
  const act=Object.keys(sidePrefs.keys).find(k=>sidePrefs.keys[k]===e.code);
  if(act)queued=act;
 }
 held.add(e.code);
});
document.addEventListener('keyup',e=>held.delete(e.code));
addEventListener('blur',clearHeld);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearHeld();if(mode==='live')pause();}});
function usePad(){
 const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected&&p.mapping==='standard');
 if(!pad){priorPad=null;padMove={x:0,y:0,guard:false};return;}
 const sampled=samplePad(pad,priorPad,original.deadzone/100,original.pad,original.stick);
 priorPad=sampled.next;padMove={x:sampled.x,y:sampled.y,guard:Boolean(pad.buttons[6]?.pressed)};
 if(sampled.act)padQueued=sampled.act;
}
for(const button of document.querySelectorAll('#touch button')){
 const pressed=()=>{button.classList.add('held');if(button.dataset.act)queued=button.dataset.act;else touchHeld.add(button.dataset.held);};
 const released=()=>{button.classList.remove('held');if(button.dataset.held)touchHeld.delete(button.dataset.held);};
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);pressed();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,released);
}
const touchQuery=matchMedia('(pointer:coarse)');
function updateTouch(){$('touch').hidden=!touchQuery.matches;}
updateTouch();touchQuery.addEventListener?.('change',updateTouch);
function sample(){
 const active=controlsActive(),has=c=>held.has(c);
 const left=has(sidePrefs.move.left)||has('ArrowLeft')||touchHeld.has('left');
 const right=has(sidePrefs.move.right)||has('ArrowRight')||touchHeld.has('right');
 const jump=has(sidePrefs.move.up)||has('ArrowUp')||touchHeld.has('jump');
 const crouch=has(sidePrefs.move.down)||has('ArrowDown')||touchHeld.has('crouch');
 const x=Number(right)-Number(left),y=Number(crouch)-Number(jump);
 const act=queued||padQueued;queued='';padQueued='';
 const guard=has(sidePrefs.guard)||touchHeld.has('guard')||padMove.guard;
 return active?{x:x||padMove.x,y:y||padMove.y,act,guard}:sideInput();
}
const soundEvent=(name,x)=>{if(audioOn)sound.play(name,x);};
function effectsFrom(events){
 for(const e of events){
  if(['hit','parry','block'].includes(e.kind)){
   effects.push({e,life:1});if(effects.length>MAX_EFFECTS)effects.shift();
   const name=e.kind==='parry'?'interrupt':e.kind==='hit'?'hit':'cock';soundEvent(name,e.x);
   $('fight-caption').textContent=e.kind==='parry'?'Perfect deflect':e.kind==='block'?'Guarded '+e.damage+' chip':e.move+' hit · '+e.damage+' damage';
  }else if(e.kind==='round'){
   soundEvent('bell',480);
   $('fight-caption').textContent=e.winner===-1?'Round drawn':(e.winner?'Cinder':'Veil')+(e.over?' wins the bout':' takes the round');
   if(e.over){setStatus('Bout finished. Review or save the recorded inputs.');}
  }
 }
}
function updateButtons(){
 const replayReady=Boolean(capture||tape.length);
 $('record-save').disabled=!replayReady;
 $('review').disabled=!replayReady;
 $('takeover').disabled=!review||mode!=='review';
 $('resume').disabled=!review||mode!=='review';
 $('replay-seek').disabled=!review||mode!=='review';
 $('frame-back').disabled=!review||mode!=='review';
 $('frame-next').disabled=!review||mode!=='review';
 $('pause').disabled=mode==='idle'||mode==='review'||mode==='online'||mode==='connecting';
 $('pause').textContent=mode==='paused'?'Resume':'Pause';
 $('stage-mode').textContent=mode==='online'?'AUTHORITATIVE PRIVATE 1V1':mode==='connecting'?'JOINING ROOM':mode==='review'?'REPLAY / TAKEOVER':mode==='takeover'?'REPLAY TAKEOVER':mode==='paused'?'PAUSED':mode==='live'?'LOCAL DUEL · 60 HZ':'SIDE-VIEW LAB · OFFLINE';
}
function restart(){
 sideTransport.close();resetOnlineButtons();clearHeld();s=sideMatch();bot=createSideBot(sidePrefs.level==='dummy'?'easy':sidePrefs.level);
 tape=[];capture=null;review=null;cursor=0;reviewPlaying=false;effects.length=0;
 mode='live';setStatus(sidePrefs.level==='dummy'?'Practice vs still target':'Sparring vs '+sidePrefs.level+' AI · first to two round wins.');
 $('fight-caption').textContent='';setReplayStatus('Recording local input frames.');updateButtons();
}
$('begin').onclick=restart;$('restart').onclick=restart;
function pause(){
 if(mode==='live'){mode='paused';clearHeld();setStatus('Paused · the simulation and round clock are frozen.');}
 else if(mode==='paused'){mode='live';setStatus('Sparring resumed.');}
 else if(mode==='takeover'){mode='review';reviewPlaying=false;clearHeld();}
 updateButtons();
}
$('pause').onclick=pause;
$('audio').onclick=async()=>{
 if(audioOn){sound.mute();audioOn=false;}
 else{audioOn=await sound.enable();if(audioOn){sound.setArena(scene);sound.mix(.68,.13,.19,.3);}}
 $('audio').textContent=audioOn?'Mute sound':'Enable sound';
 $('audio').setAttribute('aria-pressed',String(audioOn));
};
function currentRecording(){
 if(capture)return capture;
 if(tape.length===0)return null;
 return {rules:SIDE_RULESET,stage:scene,tape:tape.join('')};
}
$('record-save').onclick=()=>{
 const data=currentRecording();if(!data)return;
 const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='seamless-fight-side-replay.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 setReplayStatus('Replay saved locally; no upload or account ID.');
};
function loadReview(data){
 sideTransport.close();resetOnlineButtons();
 const view=createSideReview(data);
 capture={rules:SIDE_RULESET,stage:Object.hasOwn(SIDE_STAGES,data.stage)?data.stage:'reliquary',tape:data.tape};
 setStage(capture.stage);$('stage-select').value=capture.stage;
 review=view;cursor=0;s=view.at(0);mode='review';reviewPlaying=false;clearHeld();
 $('replay-seek').max=view.total;$('replay-seek').value=0;
 $('replay-frame').textContent='0 / '+view.total;
 setStatus('Replay loaded · drag the timeline or step individual simulation frames.');
 setReplayStatus('Replay stored in this tab only. Use Take over Veil to branch the future input stream.');
 updateButtons();
}
$('review').onclick=()=>{
 try{const data=currentRecording();if(!data)return;loadReview(data);}catch(e){setReplayStatus(e.message);}
};
$('import-replay').onchange=async()=>{
 const file=$('import-replay').files?.[0];if(!file)return;
 if(file.size>145000){setReplayStatus('Replay file exceeds 145 KB cap.');return;}
 try{const data=JSON.parse(await file.text());loadReview(data);}
 catch(err){setReplayStatus('Replay rejected: '+err.message);}
 finally{$('import-replay').value='';}
};
function seek(t){
 if(!review)return;
 cursor=Math.max(0,Math.min(review.total,Math.floor(t)));
 s=review.at(cursor);$('replay-seek').value=cursor;
 $('replay-frame').textContent=cursor+' / '+review.total;
 reviewPlaying=false;updateButtons();
}
$('replay-seek').oninput=()=>seek(Number($('replay-seek').value));
$('frame-back').onclick=()=>seek(cursor-1);
$('frame-next').onclick=()=>seek(cursor+1);
$('resume').onclick=()=>{if(mode!=='review'||!review)return;reviewPlaying=true;updateButtons();setStatus('Replaying deterministic inputs at 60 Hz.');};
$('takeover').onclick=()=>{
 if(mode!=='review'||!review||cursor>=review.total)return;
 mode='takeover';reviewPlaying=false;clearHeld();setStatus('Takeover live: you control Veil, Cinder follows the recorded tape.');
 updateButtons();
};
for(const [key,m]of Object.entries(SIDE_MOVES))if(m.damage){
 const row=$('frame-table').tBodies[0].insertRow();
 for(const value of [key==='hew'?'Heavy':key[0].toUpperCase()+key.slice(1),m.startup,m.active,m.recovery,m.reach,m.damage])
  row.insertCell().textContent=String(value);
}
function runTick(){
 if(mode==='online'){
  if(sideTransport.connected())sideTransport.input(sample());
 }else if(mode==='live'){
  if(s.over)return; // Do not append inputs after a completed match.
  const own=sample(),enemy=sidePrefs.level==='dummy'?sideInput():bot(s),pair=[own,enemy],events=[];
  if(tape.length<SIDE_TAPE_LIMIT){tape.push(packSideTick(pair));if(tape.length===1)updateButtons();}
  sideStep(s,pair,events);effectsFrom(events);
  if(own.act&&s.p[0].act===own.act)soundEvent(own.act==='shot'?'cock':own.act,s.p[0].x);
  if(s.over)updateButtons();
 }else if(mode==='review'&&reviewPlaying){
  if(cursor>=review.total){reviewPlaying=false;setStatus('Replay finished. Seek backward or take over before the final frame.');return;}
  const events=[];sideStep(s,review.inputs(cursor),events);effectsFrom(events);cursor++;
  $('replay-seek').value=cursor;$('replay-frame').textContent=cursor+' / '+review.total;
 }else if(mode==='takeover'){
  if(cursor>=review.total||s.over){mode='review';reviewPlaying=false;updateButtons();setStatus('Takeover reached the replay end or concluded the bout.');return;}
  const pair=[sample(),review.inputs(cursor)[1]],events=[];
  sideStep(s,pair,events);effectsFrom(events);cursor++;
  $('replay-seek').value=cursor;$('replay-frame').textContent=cursor+' / '+review.total;
 }
}
function paint(now,elapsed){
 if(elapsed>0&&elapsed<100){renderIntervals.push(elapsed);if(renderIntervals.length>120)renderIntervals.shift();}
 if(now>=inspectorAt){
  inspectorAt=now+125;
  const view=sideReadout(s);
  $('live-spacing').textContent='Center distance '+view.distance+' units · hurtbox gap '+view.gap+' units';
  for(let side=0;side<2;side++){
   $('live-phase-'+side).textContent=view.fighters[side];
   $('live-contact-'+side).textContent=view.contact[side].status;
  }
  if(renderIntervals.length){const sorted=renderIntervals.slice().sort((a,b)=>a-b),p95=sorted[Math.ceil(sorted.length*.95)-1];
   $('live-performance').textContent='Local render frame interval p95 '+p95.toFixed(1)+' ms (not input-to-photon or network latency).';}
 }
 // Read-only local smoke diagnostics. No network send or hidden enemy inputs.
 canvas.dataset.tick=String(s.tick);
 canvas.dataset.veilX=String(Math.round(s.p[0].x));
 canvas.dataset.veilY=String(Math.round(s.p[0].y));
 canvas.dataset.veilHp=String(Math.round(s.p[0].hp));
 canvas.dataset.cinderHp=String(Math.round(s.p[1].hp));
 canvas.dataset.mode=mode;
 g.drawImage(stageCanvas,0,0);
 paintSideWeather(g,now,scene,reduced());
 const appearance=[outfit({dye:'ash',sigil:'lantern'}),outfit({dye:'oxblood',sigil:'thorn'})];
 for(let i=0;i<2;i++)paintSideFighter(g,s.p[i],appearance[i],now,reduced(),sidePrefs.contrast);
 if(sidePrefs.boxes)drawSideTraining(g,s);
 for(const item of effects)drawSideImpact(g,item.e,item.life,reduced());
 drawSideHUD(g,s,mode==='online'?onlineSlot:0);
 if(s.ready>0||s.over||s.end){
  const label=s.over?(s.winner===-1?'DUEL DRAWN':s.winner===0?'VEIL PREVAILS':'CINDER PREVAILS'):
   s.end?'ROUND COMPLETE':'ROUND '+s.round+' · '+Math.ceil(s.ready/SIDE_HZ);
  g.save();g.textAlign='center';g.font='bold 19px Georgia';g.fillStyle='#eddbbd';
  g.fillText(label,480,126);g.restore();
 }
 if(mode==='idle'){
  g.save();g.fillStyle='#10151ee7';g.fillRect(269,270,422,56);
  g.strokeStyle='#d9b87894';g.strokeRect(269.5,270.5,421,55);
  g.textAlign='center';g.fillStyle='#f1e1c4';g.font='23px Georgia';
  g.fillText('BEGIN YOUR HUNT',480,304);g.restore();
 }
 for(const item of effects)item.life=Math.max(0,item.life-elapsed/260);
 for(let i=effects.length-1;i>=0;i--)if(effects[i].life<=0)effects.splice(i,1);
}
function animate(now){
 const elapsed=Math.max(0,Math.min(100,now-priorFrame));priorFrame=now;
 usePad();
 if(!document.hidden){
  if(mode==='live'||mode==='takeover'||mode==='review'&&reviewPlaying){
   acc+=elapsed;let budget=5;
   while(acc>=1000/SIDE_HZ&&budget-->0){acc-=1000/SIDE_HZ;runTick();}
   if(acc>100)acc=0;
  }
  paint(now,elapsed);
 }
 requestAnimationFrame(animate);
}
updateButtons();requestAnimationFrame(animate);
