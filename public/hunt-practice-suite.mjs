// Seamless Fight — offline Hunt v3 practice engine for future native parity.
// Not online, not an AI model, not a paid/released Windows feature.
// All combat comes from the exact versioned deterministic Hunt rules.
import {
 HUNT_RULESET,HUNT_HZ,huntInput,huntMatch,huntStep,
 huntInspector,huntFrameTable,canonicalHuntInput,huntCanAct
} from './side-hunt-lab.mjs';
import {createHuntReplay,loadHuntReplay} from './side-hunt-replay.mjs';
import {analyzeHuntReplay} from './hunt-match-analytics.mjs';

export const HUNT_PRACTICE_SCHEMA='sf-hunt-practice/1';
export const HUNT_DUMMY_SLOTS=8,HUNT_DUMMY_MAX_FRAMES=600;
export const HUNT_PRACTICE_HISTORY=720;
export const HUNT_PRACTICE_INPUT_HISTORY=120;
export const HUNT_DUMMY_LIBRARY_SCHEMA='sf-hunt-dummy-library/1';
export const HUNT_PRACTICE_DRILLS=Object.freeze([
 Object.freeze({id:'free',label:'Free Practice',spacing:450,action:'',startAt:0}),
 Object.freeze({id:'parry-heavy',label:'Counter Heavy Windup',spacing:106,action:'heavy',startAt:55}),
 Object.freeze({id:'parry-heal',label:'Counter Vial Healing',spacing:106,action:'heal',startAt:55}),
 Object.freeze({id:'parry-blood',label:'Counter Blood Rounds',spacing:106,action:'blood',startAt:55}),
 Object.freeze({id:'escape-stun',label:'Hitstun Quickstep Escape',spacing:100,action:'light',startAt:55}),
 Object.freeze({id:'dodge-shot',label:'Evade Firearm Shot',spacing:140,action:'shot',startAt:55})
]);
const clone=x=>structuredClone(x);
const neutral=()=>huntInput();
const opposite=input=>({...input,x:-input.x});
const MAX_FRAMES=7200;
function validateSlot(slot){
 if(!Number.isInteger(slot)||slot<0||slot>=HUNT_DUMMY_SLOTS)
  throw RangeError('Dummy slot must be 0..7');
}
function rngNext(x){return (Math.imul(1664525,x)+1013904223)>>>0;}

export function huntFrameMeter(state,slot=0){
 const p=huntInspector(state,slot);
 const data=p.action?huntFrameTable(p.weapon).find(x=>x.name===p.action):null;
 const frames=data?{
  startup:data.startup,active:data.active,recovery:data.recovery,
  total:data.totalFrames,age:p.age,phase:p.phase,
  remaining:Math.max(0,data.totalFrames-p.age),
  activeWindow:[data.startup,data.startup+data.active]
 }:{startup:0,active:0,recovery:0,total:0,age:0,phase:p.phase,
  remaining:0,activeWindow:[0,0]};
 return Object.freeze({slot,weapon:p.weapon,form:p.form,move:p.action,
  frames,health:p.health,stamina:p.stamina,ammo:p.ammo,bloodAmmo:p.bloodAmmo,
  vials:p.vials,focus:p.focus,visceralWindow:p.visceralWindow,
  firearmCounterWindowOpen:p.firearmCounterWindowOpen,
  groundedHitstunEscapeReady:p.groundedHitstunEscapeReady});
}
export function huntPracticeSession({weapons,seed=1,drill='free'}={}){
 const scenario=HUNT_PRACTICE_DRILLS.find(x=>x.id===drill);
 if(!scenario)throw TypeError('Unknown source-based 1v1 training drill');
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)
  throw TypeError('Practice replay seed must be a 32-bit unsigned integer');
 const start=huntMatch(weapons?{weapons}:{});
 start.ready=0;
 if(drill!=='free'){
  start.p[0].x=480-scenario.spacing/2;
  start.p[1].x=480+scenario.spacing/2;
  if(drill==='parry-heal')start.p[1].hp=60;
 }
 let replay=createHuntReplay({initialState:start,maxFrames:MAX_FRAMES,checkpointEvery:30});
 let state=clone(start),paused=false,mode='passive',activeSlot=0;
 let recordingSlot=-1,playStart=0,selectedSlot=0,randomState=seed>>>0;
 let reversalArmed=false,reversalPlaying=false;
 const tapes=Array.from({length:HUNT_DUMMY_SLOTS},()=>[]);
 if(drill!=='free'){
  const tape=Array.from({length:150},neutral);
  // Every dummy action below is legal normal gameplay input, with no synthetic
  // stagger or parry state forced on either fighter during the match.
  // Tape is mirrored when played from slot 1 just like user recordings.
  tape[scenario.startAt]=canonicalHuntInput({act:scenario.action});
  tapes[0]=tape;
  mode='loop';
 }
 let history=[],events=[];
 function inspect(){return clone(state);}
 function record(slot){validateSlot(slot);recordingSlot=slot;mode='passive';tapes[slot]=[];return true;}
 function recordInput(input){
  if(recordingSlot<0)return false;
  const pair=canonicalHuntInput(input);
  if(tapes[recordingSlot].length>=HUNT_DUMMY_MAX_FRAMES){recordingSlot=-1;return false;}
  tapes[recordingSlot].push(pair);
  if(tapes[recordingSlot].length>=HUNT_DUMMY_MAX_FRAMES)recordingSlot=-1;
  return true;
 }
 function finish(){const n=recordingSlot<0?0:tapes[recordingSlot].length;recordingSlot=-1;return n;}
 function saveDummyLibrary(){
  return Object.freeze({schema:HUNT_DUMMY_LIBRARY_SCHEMA,rules:HUNT_RULESET,
   language:'en',tapes:clone(tapes)});
 }
 function loadDummyLibrary(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    payload.schema!==HUNT_DUMMY_LIBRARY_SCHEMA||payload.rules!==HUNT_RULESET||
    payload.language!=='en'||!Array.isArray(payload.tapes)||
    payload.tapes.length!==HUNT_DUMMY_SLOTS)
   throw TypeError('Invalid or incompatible English Hunt v3 dummy library');
  // Validate every single action before mutating any existing recording.
  const safe=payload.tapes.map((tape,i)=>{
   if(!Array.isArray(tape)||tape.length>HUNT_DUMMY_MAX_FRAMES)
    throw RangeError('Dummy slot '+(i+1)+' exceeds 600 frames');
   return tape.map(canonicalHuntInput);
  });
  for(let i=0;i<HUNT_DUMMY_SLOTS;i++)tapes[i]=safe[i];
  recordingSlot=-1;mode='passive';selectedSlot=0;activeSlot=0;
  reversalArmed=false;reversalPlaying=false;playStart=state.tick;
  return true;
 }
 function setMode(next,slot=0){
  if(!['passive','loop','random','reversal'].includes(next))throw TypeError('Unsupported dummy mode');
  validateSlot(slot);
  if(next!=='passive'&&!tapes.some(t=>t.length))return false;
  if(next==='loop'&&!tapes[slot].length)return false;
  mode=next;selectedSlot=slot;activeSlot=slot;playStart=state.tick;recordingSlot=-1;
  reversalArmed=false;reversalPlaying=false;
  return true;
 }
 function chooseRandom(){
  const nonempty=tapes.map((x,i)=>x.length?i:-1).filter(x=>x!==-1);
  if(!nonempty.length)return -1;
  randomState=rngNext(randomState);
  return nonempty[randomState%nonempty.length];
 }
 function dummyInput(){
  if(mode==='passive')return neutral();
  if(mode==='reversal'){
   const p=state.p[1];
   // A reversal is not a periodic free bot attack: arm only after taking a hit.
   if(p.act==='stun'||p.act==='stagger'){
    reversalArmed=true;reversalPlaying=false;return neutral();
   }
   if(!reversalArmed||!huntCanAct(p))return neutral();
   const tape=tapes[selectedSlot];
   if(!tape?.length)return neutral();
   if(!reversalPlaying){playStart=state.tick;reversalPlaying=true;}
   const position=state.tick-playStart;
   if(position>=tape.length){
    reversalArmed=false;reversalPlaying=false;return neutral();
   }
   return opposite(tape[position]);
  }
  if(mode==='random'&&state.tick===playStart)activeSlot=chooseRandom();
  const tape=tapes[mode==='loop'?selectedSlot:activeSlot];
  if(!tape?.length)return neutral();
  const age=state.tick-playStart;
  if(mode==='random'&&age>0&&age%tape.length===0){
   activeSlot=chooseRandom();playStart=state.tick;
   return opposite(tapes[activeSlot][0]);
  }
  return opposite(tape[age%tape.length]);
 }
 function append(playerInput=neutral(),force=false){
  if(paused&&!force)return false;
  if(state.over||replay.stats().frames>=MAX_FRAMES)return false;
  const left=canonicalHuntInput(playerInput);
  const right=dummyInput();
  const tickEvents=[];
  // Dummy tape is prepared from player commands, but never from post-tick positions.
  replay.append([left,right]);
  huntStep(state,[left,right],tickEvents);
  if(recordingSlot>=0)recordInput(left);
  history.push({tick:state.tick,input:[left,right],events:tickEvents});
  if(history.length>HUNT_PRACTICE_HISTORY)history.shift();
  events.push(...tickEvents);
  if(events.length>400)events=events.slice(-400);
  return true;
 }
 function pause(){paused=true;}
 function resume(){paused=false;}
 function step(input=neutral()){
  return append(input,true);
 }
 function rewind(frames){
  if(!Number.isInteger(frames)||frames<1||frames>HUNT_PRACTICE_HISTORY)
   throw RangeError('Rewind must be 1..720 frames');
  const tick=state.tick-frames;
  if(tick<start.tick||!history.some(x=>x.tick===tick+1))return false;
  replay=replay.fork(tick);state=replay.getState();
  history=history.filter(x=>x.tick<=tick);
  events=history.flatMap(x=>x.events);
  paused=true;mode='passive';recordingSlot=-1;playStart=state.tick;
  reversalArmed=false;reversalPlaying=false;
  return true;
 }
 function restart(){
  replay=createHuntReplay({initialState:start,maxFrames:MAX_FRAMES,checkpointEvery:30});
  state=clone(start);history=[];events=[];playStart=0;
  paused=true;mode='passive';recordingSlot=-1;
  reversalArmed=false;reversalPlaying=false;
 }
 function save(){return replay.capture();}
 function inputHistory(limit=HUNT_PRACTICE_INPUT_HISTORY){
  if(!Number.isInteger(limit)||limit<1||limit>HUNT_PRACTICE_INPUT_HISTORY)
   throw RangeError('Input history limit must be 1..120');
  return clone(history.slice(-limit).map(({tick,input})=>({tick,input})));
 }
 function eventHistory(limit=100){
  if(!Number.isInteger(limit)||limit<1||limit>400)throw RangeError('Event limit must be 1..400');
  return clone(events.slice(-limit));
 }
 function frame(slot=0){return huntFrameMeter(state,slot);}
 function stats(){return Object.freeze({schema:HUNT_PRACTICE_SCHEMA,rules:HUNT_RULESET,
  drill,simulationHz:HUNT_HZ,tick:state.tick,paused,mode,selectedSlot,activeSlot,
  dummyFrames:tapes.map(t=>t.length),historyFrames:history.length,
  recordedFrames:replay.stats().frames});}
 function load(capture){
  const imported=loadHuntReplay(capture);
  if(imported.getState().rules!==HUNT_RULESET)throw TypeError('Different Hunt rules');
  // Imported playback is already integrity-checked, but the generic replay
  // loader conservatively sizes maxFrames to the imported tape length. Rebuild
  // it as a writable practice timeline so frame advance/takeover can continue.
  const writable=createHuntReplay({initialState:capture.startState,
   maxFrames:MAX_FRAMES,checkpointEvery:30});
  for(const inputs of capture.frames)writable.append(inputs);
  replay=writable;state=replay.getState();history=[];events=[];paused=true;
  mode='passive';recordingSlot=-1;playStart=state.tick;
  return true;
 }
 return Object.freeze({inspect,record,recordInput,finish,setMode,append,step,
  pause,resume,rewind,restart,save,load,frame,stats,
  saveDummyLibrary,loadDummyLibrary,
  metrics:()=>analyzeHuntReplay(replay.capture()),inputHistory,eventHistory,
  slotData:i=>{validateSlot(i);return clone(tapes[i]);},
  frameTable:weapon=>huntFrameTable(weapon)});
}
