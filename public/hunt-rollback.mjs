// Experimental bounded Hunt v3 60Hz rollback. NOT live netplay, ranked or authenticated.
// Exact Hunt v3 rules, NOT the older seamless-side/1 server protocol.
import {huntMatch,huntInput,huntStep,HUNT_RULESET,HUNT_HZ,canonicalHuntInput} from './side-hunt-lab.mjs';
import {huntReplayFingerprint} from './side-hunt-replay.mjs';

export const HUNT_ROLLBACK_SCHEMA='sf-hunt-rollback/1';
export const HUNT_ROLLBACK_EVENT_BUFFER=2048; // Bounded presentation-only confirmed source events.
const clone=value=>structuredClone(value);
const same=(a,b)=>a.x===b.x&&a.y===b.y&&a.act===b.act&&a.guard===b.guard;

/**
 * Local slot 0 is confirmed immediately; slot 1 is predicted until a remote
 * input arrives. Tick indexes refer to the pre-step state tick, beginning at 0.
 * The client MUST pause when the earliest speculative frame exceeds the cap.
 * Rollback uses the exact deterministic huntStep, never the renderer.
 */
export function createHuntRollback({initialState=huntMatch(),maxRollback=12}={}){
 if(initialState?.rules!==HUNT_RULESET||!Number.isSafeInteger(initialState.tick)||
    initialState.tick<0||!Array.isArray(initialState.p)||initialState.p.length!==2)throw new TypeError('Expected a versioned Hunt v3 two-fighter starting state');
 if(!Number.isInteger(maxRollback)||maxRollback<1||maxRollback>120)
  throw new RangeError('Rollback window must be 1..120 frames');
 let state=clone(initialState);
 const history=new Map(); // simulated tick -> {local,remote,confirmed}
 const checkpoints=new Map(); // state immediately before this tick
 const future=new Map(); // authenticated remote inputs awaiting simulation
 let baseRemote=huntInput(),corrections=0,resimulated=0,lastCorrection=-1;
 let committedThrough=initialState.tick,droppedEvents=0;
 const committedEvents=[]; // Consumers drain these; rollback must not replay SFX/UI commits.

 function predicted(tick){
  // A predicted input may hold movement, crouch and guard, but MUST NOT
  // manufacture repeated attack presses from a single remote packet.
  for(let f=tick-1;f>=state.tick-maxRollback-1&&f>=0;f--){
   const frame=history.get(f);
   if(frame?.confirmed)return {...frame.remote,act:''};
  }
  return {...baseRemote,act:''};
 }
 function commitContiguous(){
  // A later confirmed packet is NOT safely committed across an earlier hole.
  // Only emit source events from the strictly contiguous confirmed prefix.
  while(history.get(committedThrough)?.confirmed){
   const entry=history.get(committedThrough);
   for(let i=0;i<entry.events.length;i++){
    if(committedEvents.length>=HUNT_ROLLBACK_EVENT_BUFFER){
     // Presentation queue pressure is visible in diagnostics; never claim
     // an undisplayed audio/VFX event was authoritatively delivered.
     committedEvents.shift();
     droppedEvents++;
    }
    committedEvents.push({...clone(entry.events[i]),
     eventId:HUNT_RULESET+':'+committedThrough+':'+i});
   }
   committedThrough++;
  }
 }
 function drainConfirmedEvents(limit=256){
  if(!Number.isInteger(limit)||limit<1||limit>HUNT_ROLLBACK_EVENT_BUFFER)
   throw RangeError('Confirmed event drain limit must be 1..2048');
  return clone(committedEvents.splice(0,limit));
 }
 function compact(){
  const cutoff=state.tick-maxRollback;
  for(const [tick,frame] of history){
   if(tick>=cutoff)break;
   if(!frame.confirmed)throw new Error('Rollback history expired before confirmation');
   baseRemote=frame.remote;
   history.delete(tick);checkpoints.delete(tick);
  }
 }
 function advance(localInput){
  const local=canonicalHuntInput(localInput);
  const tick=state.tick;
  for(const [old,frame] of history)
   if(!frame.confirmed&&tick-old>=maxRollback)
    throw new RangeError('Prediction window exhausted; pause for remote Hunt input');
  const confirmed=future.has(tick);
  const remote=confirmed?future.get(tick):predicted(tick);
  const events=[];
  checkpoints.set(tick,clone(state));
  history.set(tick,{local,remote,confirmed,events});
  future.delete(tick);
  huntStep(state,[local,remote],events);
  commitContiguous();
  compact();
  return {tick:state.tick,predicted:!confirmed,fingerprint:huntReplayFingerprint(state)};
 }
 function confirm(tick,input){
  if(!Number.isSafeInteger(tick)||tick<initialState.tick)
   throw new RangeError('Invalid remote input tick');
  const remote=canonicalHuntInput(input);
  if(tick>=state.tick){
   if(tick>state.tick+120)throw new RangeError('Remote input too far ahead');
   if(future.has(tick)&&!same(future.get(tick),remote))
    throw new Error('Conflicting confirmed remote input');
   future.set(tick,remote);
   return {rolledBack:false,framesResimulated:0,tick:state.tick};
  }
  const frame=history.get(tick);
  if(!frame)throw new RangeError('Remote input arrived outside Hunt rollback window');
  if(frame.confirmed){
   if(!same(frame.remote,remote))throw new Error('Conflicting confirmed remote input');
   return {rolledBack:false,framesResimulated:0,tick:state.tick};
  }
  const changed=!same(frame.remote,remote);
  frame.remote=remote;frame.confirmed=true;
  if(changed){
   const end=state.tick;
   state=clone(checkpoints.get(tick));
   for(let f=tick;f<end;f++){
    const current=history.get(f);
    if(!current)throw new Error('Rollback history is incomplete');
    if(f>tick&&!current.confirmed)current.remote=predicted(f);
    checkpoints.set(f,clone(state));
    current.events=[];
    huntStep(state,[current.local,current.remote],current.events);
   }
   if(state.tick!==end)throw new Error('Rollback simulation tick mismatch');
   corrections++;resimulated+=end-tick;lastCorrection=tick;
  }
  commitContiguous();
  compact();
  return {rolledBack:changed,framesResimulated:changed?state.tick-tick:0,
   tick:state.tick,fingerprint:huntReplayFingerprint(state)};
 }
 return Object.freeze({
  advance,confirm,drainConfirmedEvents,
  getState:()=>clone(state),
  confirmedPrefixState:()=>{
   // Contiguous input-received prefix, NOT proof of authenticated identity.
   const first=[...history].find(([,frame])=>!frame.confirmed);
   return clone(first?checkpoints.get(first[0]):state);
  },
  getStats:()=>Object.freeze({schema:HUNT_ROLLBACK_SCHEMA,rules:HUNT_RULESET,
   simulationHz:HUNT_HZ,mode:'unrated-offline-1v1',tick:state.tick,maxRollback,corrections,resimulated,
   lastCorrection,confirmedThrough:committedThrough,
   queuedEvents:committedEvents.length,droppedEvents,
   pending:[...history.values()].filter(f=>!f.confirmed).length,
   retained:history.size,future:future.size,fingerprint:huntReplayFingerprint(state)})
 });
}
