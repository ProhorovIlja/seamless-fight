import {SIDE_HZ,SIDE_RULESET,SIDE_MOVES,sideFighter,sideInput,sideMatch,sideStep,SIDE_FLOOR} from './side-engine.mjs';
import {createSideBot} from './side-ai.mjs';
import {createSideReview,packSideTick,SIDE_TAPE_LIMIT} from './side-replay.mjs';
import {sideReadout} from './side-inspector.mjs';
import {footwork} from './footwork.mjs';
import {reconcileSide,SIDE_PREDICTION_LIMIT} from './side-prediction.mjs';
import {createSideTransport,SIDE_INVITE_PATTERN} from './side-online-client.mjs';
import {SIDE_STAGES,paintSideStage,paintSideWeather,paintSideFighter,drawSideTraining,drawSideHUD,drawSideImpact} from './side-art.mjs';
import {SIDE_DEPTH_QUALITY,paintSideDepthStatic,paintSideDepthBack,paintSideDepthFront} from './side-depth.mjs';
import {sideCameraImpact,sideScoreTension,sideIsFootstep,sideWorldLens} from './side-cinema.mjs';
import {drawPaintedStage,loadPaintedStage,paintIllustratedAir} from './side-painted.mjs';
import {createAudio} from './audio.mjs';
import {applySiteTheme,bakeSiteSky} from './site-theme.mjs';
import {DEFAULT_KEYS,DEFAULT_MOVE,DEFAULT_PAD,STORAGE_KEY,allowed,settings,samplePad} from './controls.mjs';
import {outfit,dyes,sigils} from './wardrobe.mjs';

const $=id=>document.getElementById(id);
const canvas=$('fight-canvas'),g=canvas.getContext('2d');
const STORAGE='seamless-fight.side.settings.v1';
const original=(()=>{try{return settings(JSON.parse(localStorage.getItem(STORAGE_KEY)));}catch{return settings();}})();
const validatedCode=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Enter|ShiftLeft|ShiftRight)$/.test(code);
let stored={};try{stored=JSON.parse(localStorage.getItem(STORAGE))||{};}catch{}
let sidePrefs={stage:Object.hasOwn(SIDE_STAGES,stored.stage)?stored.stage:'reliquary',
 level:['easy','normal','hard','dummy'].includes(stored.level)?stored.level:'normal',
 boxes:stored.boxes===true,reduce:stored.reduce===true,contrast:stored.contrast===true,
 impactCamera:stored.impactCamera!==false,
 depthQuality:SIDE_DEPTH_QUALITY.includes(stored.depthQuality)?stored.depthQuality:'balanced',
 illustrated:stored.illustrated!==false,
 keys:{...original.keys},move:{...original.move},guard:'KeyO',look:outfit(stored.look||original.outfit)};
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
$('depth-quality').value=sidePrefs.depthQuality;
$('painted-stage').checked=sidePrefs.illustrated;
$('impact-camera').checked=sidePrefs.impactCamera;
$('depth-quality').onchange=()=>{sidePrefs.depthQuality=SIDE_DEPTH_QUALITY.includes($('depth-quality').value)?$('depth-quality').value:'balanced';persist();};
// Customization is an appearance-only, bounded local setting.
const preview=$('look-preview'),previewG=preview.getContext('2d');
for(const [id,table,current]of [['look-dye',dyes,sidePrefs.look.dye],['look-sigil',sigils,sidePrefs.look.sigil]]){
 const select=$(id);
 for(const [key,value]of Object.entries(table)){const option=document.createElement('option');option.value=key;option.textContent=Array.isArray(value)?value[0]:value;select.append(option);}
 select.value=current;
}
function paintLookPreview(){
 previewG.clearRect(0,0,230,225);
 const background=previewG.createLinearGradient(0,0,0,225);
 background.addColorStop(0,'#373039');background.addColorStop(1,'#0a1018');
 previewG.fillStyle=background;previewG.fillRect(0,0,230,225);
 previewG.fillStyle='#bd9b6e67';previewG.fillRect(15,202,200,2);
 const p=sideFighter(0);p.x=113;p.y=202;p.dir=1;
 paintSideFighter(previewG,p,sidePrefs.look,0,true,sidePrefs.contrast);
}
for(const id of ['look-dye','look-sigil'])$(id).onchange=()=>{
 sidePrefs.look=outfit({dye:$('look-dye').value,sigil:$('look-sigil').value});
 persist();paintLookPreview();
 $('look-note').textContent='Appearance saved locally. Competitive stats and hitboxes unchanged.';
};
paintLookPreview();
const reduced=()=>sidePrefs.reduce||matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene=sidePrefs.stage,stageCanvas=null,sceneMap=new Map(),mode='idle',priorFrame=performance.now(),acc=0;
let s=sideMatch(),bot=createSideBot(sidePrefs.level==='dummy'?'easy':sidePrefs.level);
let tape=[],capture=null,review=null,replayLooks=null,cursor=0,reviewPlaying=false;
const effects=[],MAX_EFFECTS=10;
const footstepAt=[-99,-99];let nextTensionAt=0;
let audioOn=false,queued='',priorPad=null,padQueued='',padMove={x:0,y:0,guard:false};
let inspectorAt=0;const renderIntervals=[];
let onlineSlot=-1,onlineCode='',onlineLooks=null,onlineTick=-1;
const sideFootwork=footwork();let onlinePending=[],onlineAck=0;
let onlineRtt=null,nextOnlinePingAt=0;const rttSamples=[];
const held=new Set(),touchHeld=new Set();
const sound=createAudio();
const siteAssets=applySiteTheme();let siteSkyImages=null,paintedReliquary=null;
const hasIllustratedScene=()=>scene==='reliquary'&&sidePrefs.illustrated&&Boolean(paintedReliquary);
function setStatus(message){$('fight-status').textContent=message;}
function setReplayStatus(message){$('replay-status').textContent=message;}
function setStage(next){
 scene=Object.hasOwn(SIDE_STAGES,next)?next:'reliquary';
 if(!sceneMap.has(scene)){
  const off=document.createElement('canvas');off.width=960;off.height=540;
  const ctx=off.getContext('2d');
  if(!hasIllustratedScene()||!drawPaintedStage(ctx,paintedReliquary,scene)){
   paintSideStage(ctx,scene);
   paintSideDepthStatic(ctx,scene);
   if(siteSkyImages)bakeSiteSky(ctx,siteSkyImages,960);
  }
  sceneMap.set(scene,off);
 }
 stageCanvas=sceneMap.get(scene);
 $('stage-title').textContent=SIDE_STAGES[scene].toUpperCase();
 sound.setArena(scene);
 sidePrefs.stage=scene;persist();
}
setStage(sidePrefs.stage);
loadPaintedStage('reliquary').then(image=>{
 if(!image)return;
 paintedReliquary=image;sceneMap.delete('reliquary');
 if(scene==='reliquary')setStage('reliquary');
});
$('painted-stage').onchange=()=>{
 sidePrefs.illustrated=$('painted-stage').checked;
 sceneMap.delete('reliquary');setStage(scene);persist();
};
siteAssets?.scenery.then(images=>{
 siteSkyImages=images;
 for(const [id,layer] of sceneMap){
  if(id==='reliquary'&&hasIllustratedScene())continue;
  bakeSiteSky(layer.getContext('2d'),images,960);
 }
});
$('stage-select').onchange=()=>{
 if(mode==='live'||mode==='paused')restart();
 setStage($('stage-select').value);
};
$('opponent').onchange=()=>{sidePrefs.level=$('opponent').value;persist();if(mode==='live'||mode==='paused')restart();};
for(const [id,key]of [['show-boxes','boxes'],['reduce-motion','reduce'],['impact-camera','impactCamera'],['high-contrast','contrast']]){
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
function updateTouch(){
 const visible=touchQuery.matches&&controlsActive();
 $('touch').hidden=!visible;
 if(!visible){touchHeld.clear();for(const button of document.querySelectorAll('#touch button'))button.classList.remove('held');}
}
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
  if(e.kind==='action'){
   soundEvent(e.move==='shot'?'cock':e.move,e.x);
   if(e.move==='shot')$('fight-caption').textContent=(e.actor?'Cinder':'Veil')+' · pistol readied';
  }else if(e.kind==='fire'){
   soundEvent('shot',e.x);
   effects.push({e,life:.6,at:performance.now()});if(effects.length>MAX_EFFECTS)effects.shift();
   $('fight-caption').textContent=(e.actor?'Cinder':'Veil')+' · pistol fired';
  }else if(['hit','parry','block'].includes(e.kind)){
   effects.push({e,life:1,at:performance.now()});if(effects.length>MAX_EFFECTS)effects.shift();
   const name=e.kind==='parry'?'interrupt':e.kind==='hit'?'hit':'cock';soundEvent(name,e.x);
   if(e.kind==='hit')soundEvent(e.move==='hew'?'grunt-high':'grunt-low',e.x);
   $('fight-caption').textContent=e.kind==='parry'?'Perfect deflect':e.kind==='block'?'Guarded '+e.damage+' chip':e.move+' hit · '+e.damage+' damage';
  }else if(e.kind==='round'){
   soundEvent('bell',480);
   $('fight-caption').textContent=e.winner===-1?'Round drawn':(e.winner?'Cinder':'Veil')+(e.over?' wins the bout':' takes the round');
   if(e.over){setStatus('Bout finished. Review or save the recorded inputs.');}
  }
 }
}
function sideFootstepCues(){
 if(!audioOn)return;
 for(let i=0;i<2;i++){
  const p=s.p[i];
  if(s.tick<footstepAt[i])footstepAt[i]=-99;
  if(sideIsFootstep(p)&&s.tick-footstepAt[i]>=16){soundEvent('step',p.x);footstepAt[i]=s.tick;}
 }
}
function updateButtons(){
 updateTouch();
 const replayReady=Boolean(capture||tape.length);
 $('record-save').disabled=!replayReady;
 $('review').disabled=!replayReady;
 $('takeover').disabled=!review||mode!=='review';
 $('resume').disabled=!review||mode!=='review';
 $('replay-seek').disabled=!review||mode!=='review';
 $('frame-back').disabled=!review||mode!=='review';
 $('frame-next').disabled=!review||mode!=='review';
 $('pause').disabled=mode==='idle'||mode==='review'||mode==='online'||mode==='connecting';
 $('stage-select').disabled=mode==='online'||mode==='connecting';
 $('opponent').disabled=mode==='online'||mode==='connecting';
 $('show-boxes').disabled=mode==='online'||mode==='connecting';
 $('look-dye').disabled=mode==='online'||mode==='connecting';
 $('look-sigil').disabled=mode==='online'||mode==='connecting';
 $('pause').textContent=mode==='paused'?'Resume':'Pause';
 $('stage-mode').textContent=mode==='online'?'AUTHORITATIVE PRIVATE 1V1':mode==='connecting'?'JOINING ROOM':mode==='review'?'REPLAY / TAKEOVER':mode==='takeover'?'REPLAY TAKEOVER':mode==='paused'?'PAUSED':mode==='live'?'LOCAL DUEL · 60 HZ':'SIDE-VIEW LAB · OFFLINE';
}
function restart(){
 sideTransport.close();resetOnlineButtons();clearHeld();s=sideMatch();bot=createSideBot(sidePrefs.level==='dummy'?'easy':sidePrefs.level);
 tape=[];capture=null;review=null;replayLooks=null;cursor=0;reviewPlaying=false;effects.length=0;
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
 return {rules:SIDE_RULESET,stage:scene,tape:tape.join(''),looks:[sidePrefs.look,outfit({dye:'oxblood',sigil:'thorn'})]};
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
 capture={rules:SIDE_RULESET,stage:Object.hasOwn(SIDE_STAGES,data.stage)?data.stage:'reliquary',tape:data.tape,
  looks:[outfit(data.looks?.[0]||sidePrefs.look),outfit(data.looks?.[1]||{dye:'oxblood',sigil:'thorn'})]};
 replayLooks=capture.looks;
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

function resetOnlineButtons(){
 onlineSlot=-1;onlineCode='';onlineLooks=null;onlineTick=-1;sideFootwork.clear();onlinePending=[];onlineAck=0;
 onlineRtt=null;rttSamples.length=0;nextOnlinePingAt=0;
 $('side-copy').hidden=true;$('side-rematch').hidden=true;$('side-server-replay').hidden=true;
 $('side-network').textContent='Offline';
}
const sideTransport=createSideTransport({
 room(m){
  onlineSlot=m.slot;onlineCode=m.code;onlineLooks=m.looks;
  setStage(m.stage);$('stage-select').value=scene;$('side-code').value=m.code;
  $('side-copy').hidden=false;
  $('side-network').textContent='Private room '+m.code+' · '+(m.slot===0?'host':'guest');
  setStatus(m.slot===0?'Private side-view room created. Share the invite code.':'Joined room. Awaiting both fighters.');
 },
 start(m){
  if(m.s?.rules!==SIDE_RULESET)return;
  s=m.s;onlineTick=-1;onlineAck=0;onlinePending=[];mode='online';clearHeld();effects.length=0;onlineLooks=m.looks;sideFootwork.clear();
  $('side-rematch').hidden=true;$('side-server-replay').hidden=true;
  setStatus('Server-authoritative side-view duel. Private, unrated and unranked.');
  updateButtons();
 },
 state(m){
  if(mode!=='online'||m.s?.rules!==SIDE_RULESET||
     !Number.isSafeInteger(m.s.tick)||m.s.tick<onlineTick)return;
  onlineTick=m.s.tick;s=m.s;sideFootwork.push(s,performance.now());sideFootstepCues();
  onlineAck=Number.isSafeInteger(m.ack)?m.ack:onlineAck;
  onlinePending=onlinePending.filter(i=>i.seq>onlineAck).slice(-SIDE_PREDICTION_LIMIT);
  effectsFrom(Array.isArray(m.events)?m.events:[]);
  $('side-network').textContent='Server tick '+s.tick+' · input receipt ACK '+m.ack+' · RTT median '+(onlineRtt===null?'collecting':onlineRtt.toFixed(0)+' ms')+' · room '+onlineCode;
  if(s.over){$('side-rematch').hidden=false;$('side-server-replay').hidden=false;
   setStatus('Online side-view bout finished. Request a replay or a rematch.');}
 },
 replay(m){
  try{loadReview(m);setReplayStatus('Server-applied replay loaded locally for frame review and takeover.');}
  catch(err){setReplayStatus('Replay rejected: '+err.message);}
 },
 pong(m){
  const value=performance.now()-m.id;
  if(value>=0&&value<=10000){rttSamples.push(value);if(rttSamples.length>40)rttSamples.shift();
   const ranked=rttSamples.slice().sort((a,b)=>a-b);
   onlineRtt=ranked[Math.floor((ranked.length-1)/2)];
  }
 },
 notice(m){setStatus(String(m.message||'Server notice').slice(0,180));},
 error(){setStatus('Side-view server connection failed.');},
 close(){clearHeld();resetOnlineButtons();if(mode==='online'||mode==='connecting'){mode='idle';updateButtons();setStatus('Side-view room closed. Start another private duel.');}}
});
function connectSide(code=null){
 sideTransport.close();resetOnlineButtons();clearHeld();
 review=null;capture=null;replayLooks=null;tape=[];cursor=0;effects.length=0;s=sideMatch();
 mode='connecting';setStatus('Connecting to side-view duel server…');
 $('side-network').textContent='Opening private room…';updateButtons();
 try{sideTransport.connect(code,scene,sidePrefs.look);}
 catch(err){mode='idle';setStatus('Could not open side-view room.');$('side-network').textContent=err.message;updateButtons();}
}
$('side-host').onclick=()=>connectSide();
$('side-join').onclick=()=>{
 const code=$('side-code').value.trim();
 if(!SIDE_INVITE_PATTERN.test(code)){$('side-network').textContent='Invalid 12-character invitation code.';return;}
 connectSide(code);
};
$('side-copy').onclick=async()=>{
 if(!onlineCode)return;
 const url=new URL(location.href);url.searchParams.set('room',onlineCode);
 try{await navigator.clipboard.writeText(url.href);$('side-network').textContent='Private room URL copied.';}
 catch{$('side-network').textContent='Copy code '+onlineCode+' to invite a friend.';}
};
$('side-rematch').onclick=()=>{if(s.over)sideTransport.rematch();};
$('side-server-replay').onclick=()=>{if(s.over)sideTransport.replay();};
const invited=new URLSearchParams(location.search).get('room');
if(invited&&SIDE_INVITE_PATTERN.test(invited)){$('side-code').value=invited;connectSide(invited);}
addEventListener('pagehide',()=>sideTransport.close());

for(const [key,m]of Object.entries(SIDE_MOVES))if(m.damage){
 const row=$('frame-table').tBodies[0].insertRow();
 for(const value of [key==='hew'?'Heavy':key[0].toUpperCase()+key.slice(1),m.startup,m.active,m.recovery,m.reach,m.damage])
  row.insertCell().textContent=String(value);
}
function runTick(){
 if(mode==='online'){
  if(sideTransport.connected()){
   const cmd=sample(),seq=sideTransport.input(cmd);
   if(seq!==null){onlinePending.push({...cmd,seq});if(onlinePending.length>SIDE_PREDICTION_LIMIT)onlinePending.shift();}
  }
 }else if(mode==='live'){
  if(s.over)return; // Do not append inputs after a completed match.
  const own=sample(),enemy=sidePrefs.level==='dummy'?sideInput():bot(s),pair=[own,enemy],events=[];
  if(tape.length<SIDE_TAPE_LIMIT){tape.push(packSideTick(pair));if(tape.length===1)updateButtons();}
  sideStep(s,pair,events);effectsFrom(events);sideFootstepCues();
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
  const view=mode==='online'||mode==='connecting'?null:sideReadout(s);
  $('live-spacing').textContent=view?'Center distance '+view.distance+' units · hurtbox gap '+view.gap+' units':'Training-only frame inspector · disabled for online fairness';
  for(let side=0;side<2;side++){
   $('live-phase-'+side).textContent=view?view.fighters[side]:'Offline drills and replay only';
   $('live-contact-'+side).textContent=view?view.contact[side].status:'';
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
 canvas.dataset.depthQuality=sidePrefs.depthQuality;
 const illustrated=hasIllustratedScene();
 canvas.dataset.artMode=illustrated?'illustrated':'procedural';
 if(audioOn&&now>=nextTensionAt){nextTensionAt=now+220;sound.tension(Math.round(sideScoreTension(s)*20)/20);}
 const camera=sideCameraImpact(effects,now,reduced()||!sidePrefs.impactCamera,sidePrefs.depthQuality,sidePrefs.boxes&&mode!=='online');
 const lens=sideWorldLens(s,sidePrefs.depthQuality);
 g.save();g.translate(camera.x,camera.y);
 // Identical lens for the stage, two fighters and frame-data boxes. HUD and
 // text stay in screen space. This is optical 2.5D only, not 3D movement.
 g.translate(480+lens.shift,SIDE_FLOOR);g.scale(lens.zoom,lens.zoom);g.translate(-480,-SIDE_FLOOR);
 g.drawImage(stageCanvas,0,0);
 if(illustrated)paintIllustratedAir(g,now,reduced(),sidePrefs.depthQuality);
 else{
  paintSideDepthBack(g,scene,now,s,sidePrefs.depthQuality,reduced());
  paintSideWeather(g,now,scene,reduced()||sidePrefs.depthQuality==='performance');
 }
 const appearance=mode==='online'&&Array.isArray(onlineLooks)&&onlineLooks.length===2?onlineLooks:(mode==='review'||mode==='takeover')&&replayLooks?replayLooks:[sidePrefs.look,outfit({dye:'oxblood',sigil:'thorn'})];
 const neutralFoot=mode==='online'?sideFootwork.sample(now):null;
 const ownPrediction=mode==='online'&&onlineSlot>=0?reconcileSide(s,onlineSlot,onlinePending,onlineAck):null;
 for(let i=0;i<2;i++){
  const p=s.p[i],smooth=neutralFoot?.[i];
  // Remote neutral motion is interpolated, self neutral motion is boundedly
  // predicted; committed attacks and impact decisions use immediate server state.
  const localPose=i===onlineSlot&&ownPrediction?.predicted?ownPrediction.p:null;
  const pose=localPose?{...p,x:localPose.x,y:localPose.y,vx:localPose.vx,vy:localPose.vy,crouch:localPose.crouch}:
   mode==='online'&&i!==onlineSlot&&smooth?{...p,x:smooth.x,y:smooth.y}:p;
  paintSideFighter(g,pose,appearance[i],now,reduced(),sidePrefs.contrast);
 }
 if(!illustrated)paintSideDepthFront(g,scene,now,s,sidePrefs.depthQuality,reduced());
 if(sidePrefs.boxes&&mode!=='online'&&mode!=='connecting')drawSideTraining(g,s);
 for(const item of effects)drawSideImpact(g,item.e,item.life,reduced());
 g.restore();
 if(camera.flash){g.fillStyle='rgba(233,205,160,'+camera.flash.toFixed(4)+')';g.fillRect(0,0,960,540);}
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
 if(mode==='online'&&now>=nextOnlinePingAt&&sideTransport.connected()){
  nextOnlinePingAt=now+2000;sideTransport.ping(now);
 }
 usePad();
 if(!document.hidden){
  if(mode==='live'||mode==='online'||mode==='takeover'||mode==='review'&&reviewPlaying){
   acc+=elapsed;let budget=5;
   while(acc>=1000/SIDE_HZ&&budget-->0){acc-=1000/SIDE_HZ;runTick();}
   if(acc>100)acc=0;
  }
  paint(now,elapsed);
 }
 requestAnimationFrame(animate);
}
updateButtons();requestAnimationFrame(animate);
