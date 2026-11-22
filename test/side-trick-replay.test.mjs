import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trickMatch,trickStep,trickInput} from '../public/side-trick-lab.mjs';
import {TRICK_CAPTURE_SCHEMA,createTrickReplay,loadTrickReplay} from '../public/side-trick-replay.mjs';

const cmd=(act='',x=0,y=0,guard=false)=>({x,y,act,guard});
function scripted(t){
 const move=(t,slot)=>{
  const act=t%73===(slot?13:9)?'light':t%97===(slot?17:21)?'trick':
   t%103===(slot?4:7)?'heavy':t%67===(slot?37:19)?'shot':'';
  return cmd(act,t%89<(slot?46:37)?-1:1,t%112===29?-1:0,t%41>=32&&t%41<35);
 };
 return [move(t,0),move(t,1)];
}
test('offline trick-tape checkpoint seek matches exact 240-frame reference, including both loadouts',()=>{
 const start=trickMatch({weapons:['thornwake','mournweave']});start.ready=0;
 const replay=createTrickReplay({initialState:start,checkpointEvery:19,maxFrames:400});
 const reference=structuredClone(start),witnesses=new Map([[0,structuredClone(start)]]);
 const wanted=new Set([1,18,19,20,57,91,124,175,239,240]);
 for(let tick=0;tick<240;tick++){
  const pair=scripted(tick);
  replay.append(pair);
  trickStep(reference,pair);
  if(wanted.has(tick+1))witnesses.set(tick+1,structuredClone(reference));
 }
 assert.deepEqual(replay.getState(),reference);
 for(const [tick,state]of witnesses)
  assert.deepEqual(replay.stateAt(tick),state,'checkpoint-derived seek at tick '+tick);
 assert.equal(replay.stats().frames,240);
 assert(replay.stats().checkpoints>10);
 assert.throws(()=>replay.stateAt(241),/outside/);
 assert.throws(()=>replay.stateAt(-1),/outside/);
});
test('forking historical replay is a real independently mutable practice takeover',()=>{
 const first=trickMatch();first.ready=0;
 const tape=createTrickReplay({initialState:first,checkpointEvery:13,maxFrames:400});
 for(let i=0;i<230;i++)tape.append(scripted(i));
 const original=tape.getState();
 const branch=tape.fork(112);
 const forkedState=branch.getState();
 assert.equal(branch.stats().startTick,112);
 for(let j=0;j<80;j++)branch.append([cmd('',-1),cmd('',1)]);
 assert.equal(branch.stats().endTick,192);
 assert.notDeepEqual(branch.getState(),tape.stateAt(192));
 assert.deepEqual(tape.getState(),original,'takeover must never rewrite source recording');
 assert.deepEqual(branch.stateAt(112),forkedState);
 assert.equal(tape.stats().frames,230);
});
test('versioned local capture reload reproduces unchanged state and refuses edited packets',()=>{
 const initial=trickMatch({weapons:['mournweave','thornwake']});initial.ready=0;
 const tape=createTrickReplay({initialState:initial,maxFrames:300});
 for(let i=0;i<160;i++)tape.append(scripted(i));
 const json=JSON.parse(JSON.stringify(tape.capture()));
 assert.equal(json.schema,TRICK_CAPTURE_SCHEMA);
 assert.equal(json.rules,'sf-trick-lab/3');
 assert(!('playerId' in json)&&!('voice' in json)&&!('email' in json));
 const read=loadTrickReplay(json,{checkpointEvery:11});
 assert.deepEqual(read.getState(),tape.getState());
 assert.equal(read.stats().fingerprint,tape.stats().fingerprint);
 json.startState.p[0].hp=42;
 assert.throws(()=>loadTrickReplay(json),/integrity|diverged/i);
 assert.throws(()=>loadTrickReplay({...json,rules:'seamless-side\/1'}),/Invalid|incompatible/);
 assert.throws(()=>loadTrickReplay({...json,rules:'sf-trick-lab/2'}),/Invalid|incompatible/,
  'v2 tapes must not silently be interpreted under v3 pursuit costs and timing');
});
test('input and memory limits reject malformed operations without mutating confirmed history',()=>{
 const source=trickMatch();
 const r=createTrickReplay({initialState:source,maxFrames:3,checkpointEvery:1});
 assert.throws(()=>r.append([{},{} ,{}]),/Two inputs/);
 assert.throws(()=>r.append([{act:'stun'},{}]),/Invalid/);
 assert.equal(r.stats().frames,0);
 for(let i=0;i<3;i++)r.append([trickInput(),trickInput()]);
 const final=r.getState();
 assert.throws(()=>r.append([trickInput(),trickInput()]),/limit/);
 assert.deepEqual(r.getState(),final);
 final.p[0].hp=-100;
 assert.notDeepEqual(r.getState(),final,'state accessor must return copies');
 assert.throws(()=>createTrickReplay({maxFrames:7201}),/1..7200/);
 assert.throws(()=>createTrickReplay({checkpointEvery:121}),/1..120/);
});
