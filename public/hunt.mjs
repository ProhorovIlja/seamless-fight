// Playable OFFLINE Hunt v3 browser practice — uses the exact authoritative
// research 60Hz rules, not the older online/side/1 combat or simulated rankings.
// Display FPS is independent of deterministic input, physics and replay ticks.
import {HUNT_HZ,HUNT_RULESET,HUNT_W,HUNT_FLOOR,huntInput}
 from './side-hunt-lab.mjs';
import {huntPracticeSession} from './hunt-practice-suite.mjs';
import {huntPublicHud,huntActionName} from './hunt-identity.mjs';
import {huntDeviceProfile,createHuntInputAdapter,HUNT_DEVICE_LAYOUTS}
 from './hunt-input-device.mjs';
import {huntKeyboardToken,huntMouseToken,huntBrowserGamepadTokens}
 from './hunt-browser-input.mjs';
import {drawHuntArena} from './hunt-render.mjs';

const $=id=>document.getElementById(id);
const TICK_MS=1000/HUNT_HZ,MAX_TICKS_PER_RENDER=8,REPLAY_MAX_BYTES=3*1024*1024;
const browserLayouts=new Set(['keyboard-mouse','gamepad','fightstick','leverless','fightpad']);
const canvas=$('arena'),ctx=canvas.getContext('2d');
if(!ctx)throw Error('Hunt v3 practice requires a canvas-rendering browser.');
const downKeys=new Set(),downMouse=new Set();
let practice=huntPracticeSession(),before=practice.inspect(),after=practice.inspect();
let adapter=createHuntInputAdapter(huntDeviceProfile('keyboard-mouse'));
let layout='keyboard-mouse',boxes=false,last=0,acc=0,lastDraw=0,lastHud=0;
let drawCount=0,drawWindow=0,lastFrame=huntInput(),lastEventTick=-1;
let message='Practice is running. No online opponents or rankings.';
let calloutUntil=0,calloutText='',selectedGamepadIndex=-1,lastPadLabel='';
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

const status=text=>{$('status').textContent=text;message=text;};
function clearInput(){
 downKeys.clear();downMouse.clear();adapter.reset();lastFrame=huntInput();
}
function choosePad(){
 const pads=typeof navigator.getGamepads==='function'?navigator.getGamepads():[];
 const connected=[...pads].filter(p=>p?.connected===true&&p.mapping==='standard');
 const selected=connected.find(p=>p.index===selectedGamepadIndex)||connected[0];
 if(selected)selectedGamepadIndex=selected.index;
 else selectedGamepadIndex=-1;
 const label=selected?
  'Mapped controller: '+String(selected.id).slice(0,100)+' · gamepad index '+selected.index+
  ' · 60Hz input sampling.':
  'No standard-mapped gamepad / arcade / leverless device detected. The fighter receives neutral input.';
 // Never mutate the DOM 60 times/s for an unchanged controller connection.
 if(label!==lastPadLabel){$('input-device').textContent=label;lastPadLabel=label;}
 return selected;
}
function sampleInput(){
 if(layout==='keyboard-mouse')
  return adapter.sample({down:[...downKeys,...downMouse],connected:true});
 const controller=choosePad();
 return adapter.sample(huntBrowserGamepadTokens(controller));
}
function reset(keepWeapons=true){
 const first=keepWeapons?$('my-weapon').value:'mournweave';
 const second=keepWeapons?$('dummy-weapon').value:'mournweave';
 practice=huntPracticeSession({weapons:[first,second]});
 before=practice.inspect();after=practice.inspect();
 clearInput();lastEventTick=-1;acc=0;
 updateHud();
 return practice;
}
function updateButtons(){
 const data=practice.stats();
 $('pause').textContent=data.paused?'Resume':'Pause';
 $('step').disabled=!data.paused||practice.inspect().over;
 $('rewind').disabled=data.tick<60;
 $('record-frames').textContent='Slot '+(Number($('dummy-slot').value)+1)+
  ': '+data.dummyFrames[Number($('dummy-slot').value)]+
  ' / 600 frames · '+data.mode+' dummy'+(data.paused?' · paused':'');
}
function showMeter(slot){
 const d=practice.frame(slot),f=d.frames;
 const label=d.move||'Neutral';
 $('meter-'+slot).textContent=
  label+' · '+f.phase+' · '+f.age+' / '+f.total+'F\n'+
  f.startup+' startup / '+f.active+' active / '+f.recovery+' recovery\n'+
  f.remaining+'F remaining · '+d.form+' · '+d.weapon+'\n'+
  'Visceral window '+d.visceralWindow+'F · Pursuit '+d.focus;
}
function updateHud(){
 const s=practice.inspect();after=s;
 $('tick').textContent='TICK '+String(s.tick).padStart(6,'0');
 $('round').textContent=String(s.round);
 $('timer').textContent=String(Math.ceil(s.clock/HUNT_HZ));
 for(let i=0;i<2;i++){
  const f=huntPublicHud(s,i);
  $('p'+i+'-name').textContent=f.name.toUpperCase();
  $('p'+i+'-weapon').textContent=f.weapon.toUpperCase()+' · '+f.form.toUpperCase();
  $('p'+i+'-health').style.width=Math.max(0,Math.min(100,f.health))+'%';
  $('p'+i+'-stamina').style.width=Math.max(0,Math.min(100,f.stamina))+'%';
  $('p'+i+'-resources').textContent=f.ammo+' Silver · '+f.bloodAmmo+
   ' Crimson · '+f.vials+' Vials · Pursuit '+f.focus;
  showMeter(i);
 }
 $('input-readout').textContent=
  'X '+lastFrame.x+' · Y '+lastFrame.y+' · '+huntActionName(lastFrame.act);
 const history=practice.inputHistory(14);
 $('inputs').textContent=history.length?history.map(item=>
  String(item.tick).padStart(5,'0')+
  '  P1 '+(item.input[0].act||'—').padEnd(9,' ')+
  ' ('+item.input[0].x+','+item.input[0].y+')'+
  '  P2 '+(item.input[1].act||'—')).reverse().join('\n'):'No inputs recorded.';
 const events=practice.eventHistory(8);
 const ol=$('events');ol.replaceChildren();
 if(!events.length){const item=document.createElement('li');item.textContent='No confirmed combat events.';ol.append(item);}
 else for(const ev of events.slice().reverse()){
  const item=document.createElement('li');
  item.textContent=String(ev.tick).padStart(5,'0')+' · '+
   (Number.isInteger(ev.actor)?'Hunter '+(ev.actor+1)+' · ':'')+
   String(ev.kind)+
   (ev.move?' · '+ev.move:'')+
   (Number.isFinite(ev.damage)?' · '+ev.damage+' damage':'');
  ol.append(item);
 }
 updateButtons();
}
function inspectEvents(time){
 const s=practice.inspect();
 if(s.tick===lastEventTick)return;
 lastEventTick=s.tick;
 const recent=practice.eventHistory(6).filter(e=>e.tick>=s.tick-1);
 for(const ev of recent){
  if(ev.kind==='gunParry')calloutText='FIREARM COUNTER';
  if(ev.kind==='visceral')calloutText='RENDING STRIKE';
  if(ev.kind==='rearStagger')calloutText='REAR STAGGER';
  if(ev.kind==='round')calloutText=ev.winner===-1?'ROUND DRAW':
    ev.over?'DUEL CONCLUDED':'ROUND CONCLUDED';
  if(['gunParry','visceral','rearStagger','round'].includes(ev.kind))calloutUntil=time+950;
 }
 if(s.over){calloutText='DUEL CONCLUDED · UNRATED';calloutUntil=time+1500;}
}
function applyCaps(){
 const raw=Number($('display-cap').value);
 return Number.isFinite(raw)&&raw>=0?raw:0;
}
function render(time){
 const cap=applyCaps();
 if(cap&&time-lastDraw<1000/cap-.5)return;
 const alpha=practice.stats().paused?1:Math.min(1,acc/TICK_MS);
 drawHuntArena(ctx,after,{previous:before,alpha,showBoxes:boxes,time,reduceMotion});
 $('callout').textContent=time<calloutUntil?calloutText:'';
 $('callout').classList.toggle('active',time<calloutUntil);
 lastDraw=time;
 drawCount++;
 if(time-drawWindow>1000){
  $('render-fps').textContent='DISPLAY FPS '+Math.round(drawCount*1000/Math.max(1,time-drawWindow));
  drawCount=0;drawWindow=time;
 }
}
function simulateFrame(now){
 lastFrame=sampleInput();
 before=practice.inspect();
 if(practice.append(lastFrame)){
  after=practice.inspect();
  inspectEvents(now);
 }else if(practice.inspect().over){
  practice.pause();
 }
}
function animate(now){
 requestAnimationFrame(animate);
 if(!last){last=now;drawWindow=now;lastHud=now;updateHud();}
 const dt=Math.max(0,Math.min(240,now-last));
 last=now;
 if(document.hidden)return;
 if(!practice.stats().paused){
  acc+=dt;let tickCount=0;
  while(acc>=TICK_MS&&tickCount<MAX_TICKS_PER_RENDER){
   simulateFrame(now);acc-=TICK_MS;tickCount++;
  }
  if(tickCount===MAX_TICKS_PER_RENDER&&acc>=TICK_MS){
   acc=0;status('Local rendering fell behind 60Hz; wall-clock time was discarded, not combat state.');
  }
 }else acc=0;
 if(now-lastHud>=100||practice.stats().paused&&now-lastHud>250){
  updateHud();lastHud=now;
 }
 render(now);
}
function setControlFamily(){
 const next=$('input-family').value;
 if(!browserLayouts.has(next)||!HUNT_DEVICE_LAYOUTS.includes(next))return;
 layout=next;adapter=createHuntInputAdapter(huntDeviceProfile(next));lastPadLabel='';
 clearInput();status('Input profile: '+next+'. SOCD neutral; real controller support depends on hardware mapping.');
 if(next==='keyboard-mouse'){
  $('input-device').textContent='Keyboard and mouse active.';
  $('input-guide').textContent='A/D move · Space jump · S crouch · Left click light · Right click heavy · H charge · Q transform · E firearm · Shift dodge · F visceral · R heal · B blood rounds · T feint · G follow-up';
 }else{
  choosePad();
  $('input-guide').textContent='D-pad/left stick move · Face buttons attack · shoulder/trigger inputs transform, fire and evade. The '+next+' layout is bound by the actual Hunt input profile. No macros or automatic actions.';
 }
}
function isEditing(target){
 return Boolean(target?.closest?.('input,select,textarea,button,[contenteditable=true]'));
}
window.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||isEditing(event.target))return;
 const token=huntKeyboardToken(event.code);
 if(!token)return;
 const binds=huntDeviceProfile('keyboard-mouse').binds;
 if(Object.values(binds).some(a=>a.includes(token))){
  downKeys.add(token);event.preventDefault();
 }
});
window.addEventListener('keyup',event=>{
 const token=huntKeyboardToken(event.code);
 if(token)downKeys.delete(token);
});
canvas.addEventListener('pointerdown',()=>{$('canvas-wrap').focus();});
canvas.addEventListener('mousedown',event=>{
 if(layout!=='keyboard-mouse')return;
 const token=huntMouseToken(event.button);
 if(token){downMouse.add(token);event.preventDefault();}
});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('mouseup',event=>{
 const token=huntMouseToken(event.button);if(token)downMouse.delete(token);
});
function stopOnLostFocus(){
 clearInput();practice.pause();acc=0;last=0;
 status('Practice paused on focus loss. Resume manually to keep 60Hz inputs consistent.');
 updateHud();
}
window.addEventListener('blur',stopOnLostFocus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopOnLostFocus();});
window.addEventListener('gamepaddisconnected',()=>{if(layout!=='keyboard-mouse'){adapter.reset();selectedGamepadIndex=-1;choosePad();}});
window.addEventListener('gamepadconnected',()=>{if(layout!=='keyboard-mouse')choosePad();});
$('pause').addEventListener('click',()=>{
 if(practice.stats().paused){practice.resume();acc=0;last=0;status('Offline Hunt v3 practice resumed.');}
 else{practice.pause();status('Practice paused at an exact 60Hz simulation tick.');}
 updateButtons();
});
$('step').addEventListener('click',()=>{
 practice.pause();
 lastFrame=sampleInput();before=practice.inspect();
 if(practice.step(lastFrame)){after=practice.inspect();inspectEvents(performance.now());status('Advanced one authoritative 60Hz Hunt v3 frame.');}
 else status('Frame advance unavailable; match ended or replay capacity reached.');
 updateHud();
});
$('rewind').addEventListener('click',()=>{
 if(practice.rewind(60)){before=practice.inspect();after=practice.inspect();clearInput();acc=0;last=0;
  status('Rewound exactly 60 frames. Resume to take over the new timeline.');}
 else status('At least 60 recorded source frames are required for rewind.');
 updateHud();
});
$('restart').addEventListener('click',()=>{reset();status('Hunt v3 practice restarted with two original 1v1 weapons.');});
for(const id of ['my-weapon','dummy-weapon'])$(id).addEventListener('change',()=>{
 reset();status('Weapon selection applied. Previous local timeline cleared.');
});
$('toggle-boxes').addEventListener('click',()=>{
 boxes=!boxes;$('toggle-boxes').setAttribute('aria-pressed',String(boxes));
 $('toggle-boxes').textContent=boxes?'Hide Hitboxes':'Show Hitboxes';
});
$('record').addEventListener('click',()=>{
 const slot=Number($('dummy-slot').value);practice.record(slot);practice.resume();
 $('dummy-mode').value='passive';status('Recording real Hunt inputs to dummy slot '+(slot+1)+' · maximum 600 frames.');
 updateButtons();
});
$('stop-record').addEventListener('click',()=>{
 const slot=Number($('dummy-slot').value);
 practice.finish();const count=practice.stats().dummyFrames[slot];
 status('Dummy slot '+(slot+1)+' contains '+count+' input frames.');
 updateButtons();
});
$('dummy-slot').addEventListener('change',()=>{updateButtons();});
$('dummy-mode').addEventListener('change',()=>{
 const mode=$('dummy-mode').value,slot=Number($('dummy-slot').value);
 try{
  if(!practice.setMode(mode,slot)){
   $('dummy-mode').value='passive';practice.setMode('passive',slot);
   status('Record an input tape in a dummy slot before selecting loop, random or reversal.');
  }else status('Training dummy: '+mode+'. Opposite player commands are mirrored on playback.');
 }catch(err){status('Dummy mode unavailable: '+err.message);}
 updateButtons();
});
$('input-family').addEventListener('change',setControlFamily);
$('export').addEventListener('click',()=>{
 try{
  const capture=practice.save();
  const blob=new Blob([JSON.stringify(capture)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='seamless-fight-hunt-v3-'+capture.startState.tick+'-'+practice.stats().tick+'.json';
  link.style.display='none';document.body.append(link);link.click();link.remove();
  URL.revokeObjectURL(url);
  status('Exported offline Hunt v3 input replay. This is not a certified ranked result.');
 }catch(err){status('Replay export failed: '+err.message);}
});
$('import').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>REPLAY_MAX_BYTES)throw RangeError('Replay file exceeds 3 MiB safety limit');
  const capture=JSON.parse(await file.text());
  practice.load(capture);
  clearInput();before=practice.inspect();after=practice.inspect();acc=0;last=0;
  status('Versioned Hunt replay imported and verified. Paused for frame-step or takeover.');
  updateHud();
 }catch(err){status('Replay rejected: '+String(err.message).slice(0,110));}
 finally{event.target.value='';}
});
$('metrics').addEventListener('click',()=>{
 try{
  const data=practice.metrics(),a=data.players[0];
  $('accuracy').textContent=a.firearmAccuracy===null?'—':a.firearmAccuracy+'%';
  $('parries').textContent=String(a.firearmParries);
  $('melee').textContent=String(a.meleeHits);
  $('damage').textContent=String(a.damageFromConfirmedEvents);
  $('escapes').textContent=String(a.dodgeEscapes);
  $('rally').textContent=String(a.rallyHealthReclaimed);
  status('Analyzed '+data.observedFrames+' verified local simulation frames · UNRATED 1v1.');
 }catch(err){status('Local analysis failed: '+err.message);}
});
setControlFamily();updateHud();
requestAnimationFrame(animate);
