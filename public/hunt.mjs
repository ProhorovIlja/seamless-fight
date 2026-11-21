// Playable OFFLINE Hunt v3 browser practice — uses the exact authoritative
// research 60Hz rules, not the older online/side/1 combat or simulated rankings.
// Display FPS is independent of deterministic input, physics and replay ticks.
import {HUNT_HZ,HUNT_RULESET,HUNT_W,HUNT_FLOOR,huntInput}
 from './side-hunt-lab.mjs';
import {huntPracticeSession,HUNT_PRACTICE_DRILLS} from './hunt-practice-suite.mjs';
import {HUNT_TRAINING_GOALS} from './hunt-training-goals.mjs';
import {huntPublicHud,huntActionName} from './hunt-identity.mjs';
import {huntDeviceProfile,createHuntInputAdapter,HUNT_DEVICE_LAYOUTS,HUNT_BINDABLE,
 validateHuntDeviceProfile,rebindHuntDeviceProfile}
 from './hunt-input-device.mjs';
import {huntKeyboardToken,huntMouseToken,huntBrowserGamepadTokens,selectHuntStandardGamepad,HUNT_STANDARD_BUTTONS}
 from './hunt-browser-input.mjs';
import {drawHuntArena} from './hunt-render.mjs';

const $=id=>document.getElementById(id);
const TICK_MS=1000/HUNT_HZ,MAX_TICKS_PER_RENDER=8,REPLAY_MAX_BYTES=3*1024*1024;
const MAX_DUMMY_LIBRARY_BYTES=512*1024;
const browserLayouts=new Set(['keyboard-mouse','gamepad','fightstick','leverless','fightpad']);
const BINDINGS_KEY='sf-hunt-practice.browser-bindings.v2';
const ACTION_LABELS=Object.freeze({
 left:'Move Left',right:'Move Right',jump:'Jump',down:'Down (SOCD only)',
 light:'Light Strike',heavy:'Heavy Strike',charge:'Charged Strike',
 trick:'Transform Weapon',shot:'Firearm',step:'Dodge (directional quickstep / neutral backstep)',visceral:'Visceral',
 heal:'Heal',blood:'Create Blood Rounds',feint:'Feint',sync:'Follow-up'
});
const PAD_AXIS_TOKENS=['left-x-','left-x+','left-y-','left-y+',
 'right-x-','right-x+','right-y-','right-y+'];
const KEYBOARD_TOKENS=[
 ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(x=>'key:Key'+x),
 ...'0123456789'.split('').map(x=>'key:Digit'+x),
 ...['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','ShiftLeft',
 'ShiftRight',
 'Backquote','Minus','Equal','BracketLeft','BracketRight','Semicolon',
 'Quote','Comma','Period','Slash','Backslash'].map(x=>'key:'+x),
 ...Array.from({length:5},(_,i)=>'mouse:'+i)
];
const PAD_TOKENS=[...HUNT_STANDARD_BUTTONS,...PAD_AXIS_TOKENS].map(x=>'pad:'+x);
const profiles=Object.fromEntries([...browserLayouts].map(x=>[x,huntDeviceProfile(x)]));
try{
 const raw=localStorage.getItem(BINDINGS_KEY);
 if(raw&&raw.length<=32000){
  const previous=JSON.parse(raw);
  for(const name of browserLayouts)if(previous?.[name]){
   validateHuntDeviceProfile(previous[name]);
   if(previous[name].layout===name)profiles[name]=previous[name];
  }
 }
}catch{ /* Invalid local settings are ignored, never interpreted as code. */ }
function persistBindings(){
 try{localStorage.setItem(BINDINGS_KEY,JSON.stringify(profiles));}catch{}
}
function availableTokens(){
 return layout==='keyboard-mouse'?KEYBOARD_TOKENS:PAD_TOKENS;
}
function refreshBindingEditor(){
 const chosen=$('rebind-action'),token=$('rebind-token');
 const action=chosen.value||HUNT_BINDABLE[0];
 token.replaceChildren();
 for(const physical of availableTokens()){
  const entry=document.createElement('option');
  entry.value=physical;entry.textContent=physical.replace(':',' · ');
  token.append(entry);
 }
 token.value=profiles[layout].binds[action][0];
 $('active-bindings').textContent=HUNT_BINDABLE.map(key=>
  ACTION_LABELS[key]+': '+profiles[layout].binds[key].join(' / ')).join('\n');
 $('input-guide').textContent=HUNT_BINDABLE.map(key=>
  ACTION_LABELS[key]+': '+profiles[layout].binds[key].join(' / ')).join(' · ');
}

const canvas=$('arena'),ctx=canvas.getContext('2d');
if(!ctx)throw Error('Hunt v3 practice requires a canvas-rendering browser.');
const downKeys=new Set(),downMouse=new Set();
let practice=huntPracticeSession(),before=practice.inspect(),after=practice.inspect();
let adapter=createHuntInputAdapter(huntDeviceProfile('keyboard-mouse'));
let layout='keyboard-mouse',boxes=false,last=0,acc=0,lastDraw=0,lastHud=0;
let drawCount=0,drawWindow=0,lastFrame=huntInput(),lastEventTick=-1;
let message='Practice is running. No online opponents or rankings.';
let calloutUntil=0,calloutText='',controllerLock=null,lastPadLabel='';
let controllerSignature=null,nextPadRefresh=0;
const frameSamples=[];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

const status=text=>{$('status').textContent=text;message=text;};
function clearInput(){
 downKeys.clear();downMouse.clear();adapter.reset();lastFrame=huntInput();
}
function browserPads(){
 try{return typeof navigator.getGamepads==='function'?
   Array.from(navigator.getGamepads()||[]):[];}
 catch{return [];}
}
function refreshControllerPicker(){
 const detected=browserPads().filter(p=>p?.connected===true&&
  p.mapping==='standard'&&Number.isSafeInteger(p.index));
 const signature=detected.map(p=>p.index+':'+String(p.id).slice(0,100)).join('|');
 if(signature===controllerSignature)return;
 controllerSignature=signature;
 const picker=$('controller-select');
 picker.replaceChildren();
 const automatic=document.createElement('option');
 automatic.value='auto';automatic.textContent='Automatic · first mapped controller';
 picker.append(automatic);
 for(const gamepad of detected){
  const entry=document.createElement('option');
  entry.value=String(gamepad.index);
  entry.textContent=String(gamepad.id).slice(0,72)+' · #'+gamepad.index;
  picker.append(entry);
 }
 if(controllerLock!==null&&!detected.some(x=>x.index===controllerLock)){
  const disconnected=document.createElement('option');
  disconnected.value=String(controllerLock);
  disconnected.disabled=true;
  disconnected.textContent='Disconnected controller #'+controllerLock+' · no input';
  picker.append(disconnected);
 }
 picker.value=controllerLock===null?'auto':String(controllerLock);
}
function choosePad(){
 const now=performance.now();
 if(now>=nextPadRefresh){
  refreshControllerPicker();nextPadRefresh=now+500;
 }
 const selected=selectHuntStandardGamepad(browserPads(),controllerLock);
 const label=selected?
  'Mapped controller: '+String(selected.id).slice(0,100)+' · index '+selected.index+
  (controllerLock===null?' · automatic selection':' · locked controller')+
  ' · exact 60Hz input sampling.':
  controllerLock!==null?
   'Selected controller #'+controllerLock+' disconnected or unmapped. Fighter input is neutral; no pad failover.':
   'No standard-mapped gamepad, arcade or leverless device detected. Fighter input is neutral.';
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
 practice=huntPracticeSession({weapons:[first,second],drill:$('drill').value});
 // Built-in source drills always use recording slot one. Show that slot
 // explicitly instead of leaving the UI focused on an empty user slot.
 if(practice.stats().drill!=='free')$('dummy-slot').value='0';
 $('dummy-mode').value=practice.stats().mode;
 const selected=HUNT_PRACTICE_DRILLS.find(x=>x.id===practice.stats().drill);
 const objective=HUNT_TRAINING_GOALS[selected.id];
 $('drill-help').textContent=selected.id==='free'?
  'Free Practice starts at neutral spacing. Record the dummy or select a source-based training scenario.':
  objective.category+' · '+selected.spacing+'-unit starting distance. '+(
   selected.id==='timing-read'?
    'Two deterministic normal-input tapes alternate heavy commitment and real feint.':
    selected.id==='anti-air'?
    'The dummy jumps once using real directional inputs; counter without a universal air dash.':
    ['hit-confirm','transform-pressure','blood-economy'].includes(selected.id)?
    'Practice your own attacks and resources against a non-cheating passive opponent.':
    'The dummy starts a real source action at tick '+(selected.startAt+1)+'.'
  )+' No scripted successes.';
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
 $('review-attempt').disabled=data.drill==='free'||data.tick===0;
 if($('dummy-mode').value!==data.mode)$('dummy-mode').value=data.mode;
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
  'Visceral window '+d.visceralWindow+'F · Pursuit '+d.focus+'\n'+
  (d.firearmCounterWindowOpen?'GUN COUNTER VULNERABLE · TIMED WINDOW OPEN':
   'Gun counter window: closed')+'\n'+
  (d.groundedHitstunEscapeReady?'HITSTUN DODGE READY · COST 25 STAMINA':'Hitstun dodge: not yet ready')+'\n'+
  (d.quickstepIframes?'DODGE I-FRAMES · CONTACT INVULNERABLE':
   d.quickstepVulnerableTail?'DODGE VULNERABLE TAIL · I-FRAMES ENDED':
   d.quickstepRecoveryPunishable?
    'DODGE RECOVERY · '+d.quickstepRemainingRecovery+'F REMAINING · PUNISHABLE':
    'Dodge: no active quickstep window');
 $('meter-'+slot).parentElement.classList.toggle('counter-open',d.firearmCounterWindowOpen);
 $('meter-'+slot).parentElement.classList.toggle('escape-open',d.groundedHitstunEscapeReady);
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
 const goal=practice.goal();
 $('goal-description').textContent=goal.goal;
 $('goal-category').textContent=goal.category.toUpperCase();
 $('goal-progress').textContent=goal.successes+' confirmed · '+goal.attempts+' observed';
 $('goal-feedback').textContent=goal.status;
 $('goal-timing').textContent=goal.lastIntervalFrames===null?
  'No confirmed source interval yet.':
  'Scenario trigger to outcome: '+goal.lastIntervalFrames+'F ('+
  Math.round(goal.lastIntervalFrames*1000/HUNT_HZ)+' ms simulated) · best '+
  goal.bestIntervalFrames+'F · '+goal.intervalSamples+' measured';
 $('goal-progress').classList.toggle('completed',goal.completed);
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
   (Number.isFinite(ev.damage)?' · '+ev.damage+' damage':'')+
   (ev.kind==='hit'&&ev.punishedRecovery===true?
    ' · Recovery Punish · '+ev.remainingRecovery+'F left':'')+
   (ev.kind==='hit'&&ev.punishedDodgeRecovery===true?
    ' · Dodge Punish · '+ev.dodgeRecoveryFrames+'F left':'')+
   (ev.kind==='hit'&&ev.hitDuringStartup===true?
    ' · Counter-Hit · '+ev.remainingStartup+'F before active':'');
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
  // Based on the actual target recovery frame at impact, never on guesswork.
  if(ev.kind==='hit'&&ev.punishedRecovery===true)
   calloutText='RECOVERY PUNISH · '+ev.remainingRecovery+'F LEFT';
  if(ev.kind==='hit'&&ev.punishedDodgeRecovery===true)
   calloutText='DODGE PUNISH · '+ev.dodgeRecoveryFrames+'F LEFT';
  if(ev.kind==='hit'&&ev.hitDuringStartup===true)
   calloutText='COUNTER-HIT · '+ev.remainingStartup+'F BEFORE ACTIVE';
  if(ev.kind==='round')calloutText=ev.winner===-1?'ROUND DRAW':
    ev.over?'DUEL CONCLUDED':'ROUND CONCLUDED';
  if(['gunParry','visceral','rearStagger','round'].includes(ev.kind)||
     ev.kind==='hit'&&(ev.punishedRecovery===true||
      ev.punishedDodgeRecovery===true||ev.hitDuringStartup===true))calloutUntil=time+950;
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
 if(lastDraw){
  const elapsed=time-lastDraw;
  if(elapsed>0&&elapsed<250){
   frameSamples.push(elapsed);
   if(frameSamples.length>120)frameSamples.shift();
  }
 }
 lastDraw=time;
 drawCount++;
 if(time-drawWindow>1000){
  $('render-fps').textContent='DISPLAY FPS '+Math.round(drawCount*1000/Math.max(1,time-drawWindow));
  if(frameSamples.length>=5){
   const sorted=frameSamples.slice().sort((a,b)=>a-b);
   const median=sorted[Math.floor(sorted.length/2)];
   const p95=sorted[Math.ceil(sorted.length*.95)-1];
   $('frame-pace').textContent='FRAME '+median.toFixed(1)+'ms · P95 '+p95.toFixed(1)+'ms';
  }
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
 layout=next;adapter=createHuntInputAdapter(profiles[next]);lastPadLabel='';
 clearInput();status('Input profile: '+next+'. SOCD neutral; real controller support depends on hardware mapping.');
 if(next==='keyboard-mouse')$('input-device').textContent='Keyboard and mouse active.';
 else choosePad();
 refreshBindingEditor();
}
function isEditing(target){
 return Boolean(target?.closest?.('input,select,textarea,button,[contenteditable=true]'));
}
window.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||isEditing(event.target))return;
 const token=huntKeyboardToken(event.code);
 if(!token)return;
 const binds=profiles['keyboard-mouse'].binds;
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
$('controller-select').addEventListener('change',()=>{
 const selection=$('controller-select').value;
 controllerLock=selection==='auto'?null:Number(selection);
 clearInput();lastPadLabel='';
 refreshControllerPicker();choosePad();
 status(controllerLock===null?
  'Controller selection automatic; only one mapped pad is sampled at a time.':
  'Controller #'+controllerLock+' locked for the local fighter. Disconnect does not hand input to another pad.');
});
window.addEventListener('gamepaddisconnected',()=>{
 adapter.reset();lastPadLabel='';controllerSignature=null;
 refreshControllerPicker();if(layout!=='keyboard-mouse')choosePad();
});
window.addEventListener('gamepadconnected',()=>{
 controllerSignature=null;refreshControllerPicker();if(layout!=='keyboard-mouse')choosePad();
});
$('pause').addEventListener('click',()=>{
 if(practice.stats().paused){practice.resume();acc=0;last=0;status('Offline Hunt v3 practice resumed.');}
 else{practice.pause();status('Practice paused at an exact 60Hz simulation tick.');}
 // Immediately flush the authoritative tick to the displayed frame meter:
 // otherwise a 100ms-throttled HUD can show a stale tick at pause time.
 updateHud();
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
$('review-attempt').addEventListener('click',()=>{
 const r=practice.reviewLastAttempt();
 if(r){
  before=practice.inspect();after=practice.inspect();
  clearInput();acc=0;last=0;
  $('dummy-mode').value='takeover';
  status('Source review: rewound to tick '+r.rewoundTo+
   ' before opportunity '+r.attemptTick+
   '. Resume or advance frames to try new actions against the original opponent tape.');
 }else status('No source-valid training opportunity is available within the recent 720 frames.');
 updateHud();
});
$('restart').addEventListener('click',()=>{reset();status('Hunt v3 practice restarted with two original 1v1 weapons.');});
for(const id of ['my-weapon','dummy-weapon','drill'])$(id).addEventListener('change',()=>{
 reset();status('Hunt v3 training scenario and original weapons applied. Previous local timeline cleared.');
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
for(const action of HUNT_BINDABLE){
 const option=document.createElement('option');
 option.value=action;option.textContent=ACTION_LABELS[action];
 $('rebind-action').append(option);
}
$('rebind-action').addEventListener('change',refreshBindingEditor);
$('apply-binding').addEventListener('click',()=>{
 const action=$('rebind-action').value,token=$('rebind-token').value;
 try{
  profiles[layout]=rebindHuntDeviceProfile(profiles[layout],action,[token]);
  adapter=createHuntInputAdapter(profiles[layout]);clearInput();
  persistBindings();refreshBindingEditor();
  $('binding-message').textContent=ACTION_LABELS[action]+' bound to '+token+' for '+layout+'.';
 }catch(err){
  $('binding-message').textContent=
   'Binding rejected: '+String(err.message).slice(0,105)+
   '. Choose a free key or restore defaults.';
 }
});
$('reset-bindings').addEventListener('click',()=>{
 profiles[layout]=huntDeviceProfile(layout);
 adapter=createHuntInputAdapter(profiles[layout]);clearInput();
 persistBindings();refreshBindingEditor();
 $('binding-message').textContent='Default bindings restored for '+layout+'.';
});
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
$('export-dummy').addEventListener('click',()=>{
 try{
  const library=practice.saveDummyLibrary();
  const blob=new Blob([JSON.stringify(library)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='seamless-fight-hunt-dummy-8-slots.json';
  document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  status('Eight English Hunt v3 dummy input slots exported. No online opponent or ranked result stored.');
 }catch(err){status('Dummy export failed: '+String(err.message).slice(0,110));}
});
$('import-dummy').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>MAX_DUMMY_LIBRARY_BYTES)throw RangeError('Dummy library exceeds 512 KiB');
  const library=JSON.parse(await file.text());
  practice.loadDummyLibrary(library);
  $('dummy-mode').value='passive';updateHud();
  status('Eight dummy slots imported with exact Hunt v3 actions validated. Select a recording to play.');
 }catch(err){status('Dummy library rejected: '+String(err.message).slice(0,110));}
 finally{event.target.value='';}
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
  status('Analyzed '+data.observedFrames+' verified local simulation frames · UNRATED 1v1.'+
   ' Neutral reads: '+a.recoveryPunishes+' recovery punishes, '+
   a.dodgeRecoveryPunishes+' dodge punishes, '+
   a.startupInterrupts+' startup interrupts.');
 }catch(err){status('Local analysis failed: '+err.message);}
});
const categories=new Map();
for(const drill of HUNT_PRACTICE_DRILLS){
 const category=HUNT_TRAINING_GOALS[drill.id]?.category||'Open Practice';
 if(!categories.has(category)){
  const group=document.createElement('optgroup');
  group.label=category;
  categories.set(category,group);
  $('drill').append(group);
 }
 const option=document.createElement('option');
 option.value=drill.id;option.textContent=drill.label;
 categories.get(category).append(option);
}
$('drill').querySelector('option[value="free"]').remove();
$('drill').value='free';
refreshControllerPicker();setControlFamily();updateHud();
requestAnimationFrame(animate);
