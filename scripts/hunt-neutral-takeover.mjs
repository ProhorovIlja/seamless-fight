// Seamless Fight — offline no-block footsies, exact replay takeover.
// Replays are source-authored 60Hz inputs, never opponent-identity data.
// No live opponent oracle, scoring shortcut, ranked service or new moves.
import {huntInput,huntStep} from '../public/side-hunt-lab.mjs';
import {
 loadHuntReplay,huntReplayFingerprint
} from '../public/side-hunt-replay.mjs';

const need=(ok,why)=>{if(!ok)throw TypeError(why);};
export const HUNT_TAKEOVER_ANSWERS=Object.freeze(['light','shot','step']);
export function huntRecordedNeutralTakeover(
 recorded,{answer='light',responseDelay=0}={}
){
 need(recorded&&recorded.replayCapture&&
  Number.isSafeInteger(recorded.whiffTick)&&
  Number.isSafeInteger(recorded.defenderSlot)&&
  Number.isSafeInteger(recorded.answerRequestedTick),
  'A complete recorded neutral trial with genuine whiff is required');
 need(HUNT_TAKEOVER_ANSWERS.includes(answer),'Unsupported no-guard answer');
 need(Number.isInteger(responseDelay)&&responseDelay>=0&&
  responseDelay<=40,'Reaction input delay must be 0..40 frames');
 const initial=loadHuntReplay(recorded.replayCapture);
 const original=recorded.replayCapture;
 const tick=recorded.whiffTick;
 const d=recorded.defenderSlot;
 need((d===0||d===1)&&tick>0&&tick<original.frames.length,
  'Valid real whiff tick and fighter slot required');
 // Independently reconstruct BEFORE branching. Metadata alone MUST NOT
 // fabricate an "opponent missed" event.
 const pre=structuredClone(original.startState),sourceEvidence=[];
 for(let i=0;i<tick;i++)huntStep(pre,original.frames[i],sourceEvidence);
 const genuineMiss=sourceEvidence.find(e=>e.kind==='whiff'&&
  e.actor===1-d&&e.move===recorded.attackerForm+recorded.attackerHeavy);
 need(genuineMiss?.tick===tick,
  'The verified input tape has no actual whiff at the asserted frame');
 const branch=initial.fork(tick);
 const state=structuredClone(branch.getState());
 const events=[];
 const newTick=tick+1+responseDelay;
 for(let i=tick;i<original.frames.length;i++){
  const pair=structuredClone(original.frames[i]);
  const now=i+1;
  // Strip precisely the previously recorded user command while retaining
  // that frame's legitimate walk/spacing policy. Never edit rival inputs.
  if(now===recorded.answerRequestedTick){
   pair[d].act='';
   pair[d].x=recorded.approach==='hold'?0:state.p[d].dir;
  }
  if(now===newTick){
   pair[d].act=answer;
   pair[d].x=answer==='step'?state.p[d].dir:pair[d].x;
  }
  huntStep(state,pair,events);
  branch.append(pair);
 }
 const capture=branch.capture();
 if(capture.fingerprint!==huntReplayFingerprint(state))
  throw Error('Branched real-input replay diverged');
 return Object.freeze({
  mode:'offline-unrated-replay-takeover',rules:original.rules,
  startTick:tick,originalEndTick:original.finalTick,
  originalFingerprint:original.fingerprint,
  replayFingerprint:capture.fingerprint,
  originalAnswer:recorded.answer,answer,
  originalResponseDelay:recorded.responseDelay,responseDelay,
  attemptedAtTick:newTick,
  sourceWhiffTick:tick,
  originalReplayUnaffected:initial.stats().fingerprint===original.fingerprint,
  attackerHit:events.some(e=>e.kind==='hit'&&e.actor===1-d&&e.target===d),
  defenderHit:events.some(e=>e.kind==='hit'&&e.actor===d&&e.target===1-d),
  gunParry:events.some(e=>e.kind==='gunParry'&&e.actor===d&&e.target===1-d),
  actualWhiffRecoveryHit:events.some(e=>e.kind==='hit'&&e.actor===d&&
   e.punishedRecovery===true&&
   e.punishedMove===recorded.attackerForm+recorded.attackerHeavy),
  actualTrickStartupInterrupt:events.some(e=>e.kind==='hit'&&
   e.actor===d&&e.hitDuringStartup===true&&
   ['unfurl','refold'].includes(e.interruptedMove)),
  cornerEscape:events.some(e=>e.kind==='cornerEscape'&&e.actor===d),
  sourceEvents:Object.freeze(events.map(e=>Object.freeze({...e}))),
  replayCapture:capture
 });
}
