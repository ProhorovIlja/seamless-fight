// Offline Hunt combat replay, seek and takeover. No server trust, no player data.
// Same pure rules as the separately versioned sf-hunt-lab/1 simulator.
import {HUNT_RULESET,huntMatch,huntStep,canonicalHuntInput} from './side-hunt-lab.mjs';

export const HUNT_CAPTURE_SCHEMA='sf-hunt-replay/1';
const copy=x=>structuredClone(x);
const MAX_FRAMES=7200;
const MAX_CAPTURE_BYTES=2000000;
const stableString=value=>JSON.stringify(value);
export function huntReplayFingerprint(state){
 if(state?.rules!==HUNT_RULESET)throw TypeError('Wrong hunt-combat ruleset');
 const value=stableString(state);
 let h=2166136261>>>0;
 for(let k=0;k<value.length;k++)h=Math.imul(h^value.charCodeAt(k),16777619)>>>0;
 return h.toString(16).padStart(8,'0'); // Debug-only, NOT security/anti-cheat.
}
export function createHuntReplay({
 initialState=huntMatch(),checkpointEvery=30,maxFrames=1800
}={}){
 if(initialState?.rules!==HUNT_RULESET||!Number.isSafeInteger(initialState.tick)||
    initialState.tick<0||!Array.isArray(initialState.p)||initialState.p.length!==2)
  throw TypeError('Invalid exact-version initial game state');
 if(!Number.isInteger(checkpointEvery)||checkpointEvery<1||checkpointEvery>120)
  throw RangeError('Checkpoint interval must be 1..120 ticks');
 if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>MAX_FRAMES)
  throw RangeError('Replay frame limit must be 1..7200');
 const startTick=initialState.tick;
 const base=copy(initialState);
 let current=copy(initialState);
 const frames=[],checkpoints=new Map([[startTick,copy(base)]]);
 function append(inputs){
  if(frames.length>=maxFrames)throw RangeError('Replay frame limit exhausted');
  if(!Array.isArray(inputs)||inputs.length!==2)throw TypeError('Two inputs required');
  const pair=inputs.map(canonicalHuntInput);
  // Canonical input validation happens before any state mutation.
  huntStep(current,pair);
  frames.push(pair);
  if(frames.length%checkpointEvery===0)checkpoints.set(current.tick,copy(current));
  return {tick:current.tick,fingerprint:huntReplayFingerprint(current)};
 }
 function at(tick){
  if(!Number.isSafeInteger(tick)||tick<startTick||tick>current.tick)
   throw RangeError('Replay tick outside available timeline');
  const checkpointTick=startTick+
   Math.floor((tick-startTick)/checkpointEvery)*checkpointEvery;
  const saved=checkpoints.get(checkpointTick);
  if(!saved)throw Error('Replay checkpoint missing');
  const restored=copy(saved);
  for(let i=checkpointTick-startTick;i<tick-startTick;i++)huntStep(restored,frames[i]);
  return restored;
 }
 function fork(tick){
  // Replay takeover returns an independent new timeline at the chosen tick.
  // Original input tape and future are never mutated by practicing a branch.
  return createHuntReplay({initialState:at(tick),checkpointEvery,maxFrames});
 }
 function exportCapture(){
  return {schema:HUNT_CAPTURE_SCHEMA,rules:HUNT_RULESET,startState:copy(base),
   frames:copy(frames),finalTick:current.tick,
   fingerprint:huntReplayFingerprint(current)};
 }
 return Object.freeze({
  append,getState:()=>copy(current),stateAt:at,fork,
  capture:exportCapture,
  stats:()=>Object.freeze({startTick,endTick:current.tick,
   frames:frames.length,checkpoints:checkpoints.size,
   fingerprint:huntReplayFingerprint(current)})
 });
}
export function loadHuntReplay(capture,{checkpointEvery=30}={}){
 if(!capture||capture.schema!==HUNT_CAPTURE_SCHEMA||
    capture.rules!==HUNT_RULESET||!Array.isArray(capture.frames)||
    capture.frames.length>MAX_FRAMES)throw TypeError('Invalid or incompatible replay');
 if(new TextEncoder().encode(JSON.stringify(capture)).length>MAX_CAPTURE_BYTES)
  throw RangeError('Offline replay exceeds maximum import bytes');
 const replay=createHuntReplay({initialState:capture.startState,checkpointEvery,
  maxFrames:Math.max(1,capture.frames.length)});
 for(const pair of capture.frames)replay.append(pair);
 if(replay.stats().endTick!==capture.finalTick||
  replay.stats().fingerprint!==capture.fingerprint)
  throw Error('Replay diverged or integrity fingerprint mismatched');
 return replay;
}
