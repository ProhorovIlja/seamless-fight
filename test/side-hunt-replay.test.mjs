import {test} from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntStep,huntInput,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
import {
 HUNT_CAPTURE_SCHEMA,createHuntReplay,loadHuntReplay,huntReplayFingerprint
} from '../public/side-hunt-replay.mjs';

const cmd=(act='',x=0,y=0)=>({act,x,y,guard:false});
const scripted=t=>[0,1].map(slot=>{
 const tick=t+slot*7;
 return cmd(tick%89===4?'shot':tick%91===6?'light':tick%111===33?'blood':
  tick%103===25?'heal':tick%113===48?'charge':tick%73===14?'trick':'',
  tick%39<20?1:-1,tick%65===12?-1:0);
});
test('Hunt replay preserves 60 Hz v3 inputs and exact seekable health/resources',()=>{
 const initial=huntMatch({weapons:['thornwake','mournweave']});initial.ready=0;
 const r=createHuntReplay({initialState:initial,checkpointEvery:13,maxFrames:350});
 const sim=structuredClone(initial),expect=new Map([[0,structuredClone(initial)]]);
 for(let i=0;i<310;i++){
  const inputs=scripted(i);
  r.append(inputs);
  huntStep(sim,inputs);
  if(i%23===0)expect.set(sim.tick,structuredClone(sim));
 }
 assert.deepEqual(r.getState(),sim);
 assert.equal(r.stats().frames,310);
 assert.equal(r.getState().rules,HUNT_RULESET);
 assert.equal(r.stats().fingerprint,huntReplayFingerprint(sim));
 for(const [tick,state] of expect)assert.deepEqual(r.stateAt(tick),state);
 assert.throws(()=>r.stateAt(311),/outside/);
});
test('replay takeover forks an independent timeline including blood-bullet and visceral state',()=>{
 const original=huntMatch();original.ready=0;
 original.p[0].hp=70;
 const r=createHuntReplay({initialState:original,checkpointEvery:11,maxFrames:200});
 for(let i=0;i<115;i++)r.append(scripted(i));
 const snapshot=r.getState();
 const branch=r.fork(63);
 for(let j=0;j<40;j++)branch.append([cmd(j===0?'blood':''),cmd('')]);
 assert.equal(branch.stats().startTick,63);
 assert.equal(branch.stats().endTick,103);
 assert.deepEqual(r.getState(),snapshot);
 assert.notDeepEqual(branch.getState(),r.stateAt(103));
});
test('versioned export/import detects incompatible and modified tapes without account information',()=>{
 const state=huntMatch();state.ready=0;
 const r=createHuntReplay({initialState:state,maxFrames:180});
 for(let i=0;i<120;i++)r.append(scripted(i));
 const cap=JSON.parse(JSON.stringify(r.capture()));
 assert.equal(cap.schema,HUNT_CAPTURE_SCHEMA);
 assert.equal(cap.rules,'sf-hunt-lab/3');
 assert(!JSON.stringify(cap).includes('email'));
 const read=loadHuntReplay(cap);
 assert.deepEqual(read.getState(),r.getState());
 assert.throws(()=>loadHuntReplay({...cap,rules:'sf-trick-lab/3'}),/Invalid|incompatible/);
 assert.throws(()=>loadHuntReplay({...cap,rules:'sf-hunt-lab/2'}),/Invalid|incompatible/,
  'legacy Hunt tapes cannot silently inherit new aerial/parry rules');
 const changed=structuredClone(cap);
 changed.startState.p[0].hp=42; // Guaranteed semantic divergence, not an ignored early input.
 assert.throws(()=>loadHuntReplay(changed),/diverged|integrity/i);
});
