// Experimental input-prediction/rollback coordinator for seamless-side/1.
// Pure client-side research. Not wired to public/ranked multiplayer.
import {sideMatch,sideInput,sideStep,SIDE_RULESET} from './side-engine.mjs';

const ACTIONS=new Set(['','cut','hew','shot','step','feint']);
const FIGHTER_FIELDS=['x','y','vx','vy','dir','hp','st','ammo','act','age',
 'spent','crouch','jumpHeld','guardAge','regen','combo'];
const clone=value=>structuredClone(value);
const same=(a,b)=>a.x===b.x&&a.y===b.y&&a.act===b.act&&a.guard===b.guard;

export function canonicalSideInput(value){
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new TypeError('Input must be an object');
 const {x=0,y=0,act='',guard=false}=value;
 if(![-1,0,1].includes(x)||![-1,0,1].includes(y)||!ACTIONS.has(act)||
    typeof guard!=='boolean')
  throw new TypeError('Invalid side-view movement, action or guard input');
 return {x,y,act,guard};
}

// Stable debug fingerprint of explicit ruleset fields. NOT an anti-cheat MAC,
// network authorization token or cross-language binary canonical serializer.
export function sideStateFingerprint(state){
 if(!state||state.rules!==SIDE_RULESET)throw new TypeError('Wrong ruleset');
 const fields=[state.rules,state.tick,state.clock,state.ready,state.end,
  state.round,...state.score,state.winner,state.over];
 for(const fighter of state.p)for(const field of FIGHTER_FIELDS)fields.push(fighter[field]);
 const encoded=JSON.stringify(fields);
 if(!encoded)throw new TypeError('Unserializable combat state');
 let hash=2166136261;
 for(let i=0;i<encoded.length;i++){
  hash=Math.imul(hash^encoded.charCodeAt(i),16777619)>>>0;
 }
 return hash.toString(16).padStart(8,'0');
}

/**
 * Local slot 0 is confirmed immediately; slot 1 is predicted until a remote
 * input arrives. Tick indexes refer to the pre-step state tick, beginning at 0.
 * The client MUST pause when the earliest speculative frame exceeds the cap.
 * Rollback uses the exact deterministic sideStep, never the renderer.
 */
export function createSideRollback({initialState=sideMatch(),maxRollback=12}={}){
 if(initialState?.rules!==SIDE_RULESET||!Number.isSafeInteger(initialState.tick)||
    initialState.tick<0)throw new TypeError('Invalid side-view starting state');
 if(!Number.isInteger(maxRollback)||maxRollback<1||maxRollback>120)
  throw new RangeError('Rollback window must be 1..120 frames');
 let state=clone(initialState);
 const history=new Map(); // simulated tick -> {local,remote,confirmed}
 const checkpoints=new Map(); // state immediately before this tick
 const future=new Map(); // authenticated remote inputs awaiting simulation
 let baseRemote=sideInput(),corrections=0,resimulated=0,lastCorrection=-1;

 function predicted(tick){
  // A predicted input may hold movement, crouch and guard, but MUST NOT
  // manufacture repeated attack presses from a single remote packet.
  for(let f=tick-1;f>=state.tick-maxRollback-1&&f>=0;f--){
   const frame=history.get(f);
   if(frame?.confirmed)return {...frame.remote,act:''};
  }
  return {...baseRemote,act:''};
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
  const local=canonicalSideInput(localInput);
  const tick=state.tick;
  for(const [old,frame] of history)
   if(!frame.confirmed&&tick-old>=maxRollback)
    throw new RangeError('Prediction window exhausted; pause for remote input');
  const confirmed=future.has(tick);
  const remote=confirmed?future.get(tick):predicted(tick);
  checkpoints.set(tick,clone(state));
  history.set(tick,{local,remote,confirmed});
  future.delete(tick);
  sideStep(state,[local,remote]);
  compact();
  return {tick:state.tick,predicted:!confirmed,fingerprint:sideStateFingerprint(state)};
 }
 function confirm(tick,input){
  if(!Number.isSafeInteger(tick)||tick<initialState.tick)
   throw new RangeError('Invalid remote input tick');
  const remote=canonicalSideInput(input);
  if(tick>=state.tick){
   if(tick>state.tick+120)throw new RangeError('Remote input too far ahead');
   if(future.has(tick)&&!same(future.get(tick),remote))
    throw new Error('Conflicting confirmed remote input');
   future.set(tick,remote);
   return {rolledBack:false,framesResimulated:0,tick:state.tick};
  }
  const frame=history.get(tick);
  if(!frame)throw new RangeError('Remote input arrived outside rollback window');
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
    sideStep(state,[current.local,current.remote]);
   }
   if(state.tick!==end)throw new Error('Rollback simulation tick mismatch');
   corrections++;resimulated+=end-tick;lastCorrection=tick;
  }
  compact();
  return {rolledBack:changed,framesResimulated:changed?state.tick-tick:0,
   tick:state.tick,fingerprint:sideStateFingerprint(state)};
 }
 return Object.freeze({
  advance,confirm,
  getState:()=>clone(state),
  getStats:()=>Object.freeze({tick:state.tick,maxRollback,corrections,resimulated,
   lastCorrection,pending:[...history.values()].filter(f=>!f.confirmed).length,
   retained:history.size,future:future.size,fingerprint:sideStateFingerprint(state)})
 });
}
