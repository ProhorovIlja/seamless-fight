import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateHuntTrainingGoal} from '../public/hunt-training-goals.mjs';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';

const heavy={tick:5,kind:'action',actor:1,move:'foldedHeavy'};
const miss={tick:29,kind:'whiff',actor:1,move:'foldedHeavy'};
const melee={tick:31,kind:'hit',actor:0,target:1,move:'unfurledLight',
 punishedRecovery:true,punishedMove:'foldedHeavy',remainingRecovery:15};
const grade=e=>evaluateHuntTrainingGoal('timing-read',e).successes;

test('timing read recognizes ONLY a source-proven R2 whiff with same-action recovery contact',()=>{
 assert.equal(grade([heavy,miss,melee]),1);
 for(const evidence of [
  [heavy,melee],
  [heavy,miss,{...melee,punishedRecovery:false}],
  [heavy,miss,{...melee,punishedMove:'foldedLight'}],
  [heavy,miss,{...melee,remainingRecovery:0}],
  [heavy,miss,{tick:30,kind:'action',actor:1,move:'foldedLight'},melee],
  [heavy,miss,{...melee,target:0}],
  [heavy,{...miss,tick:2},melee],
  [heavy,miss,{...melee,tick:55}],
 ]){
  assert.equal(grade(evidence),0,'recovery contact needs genuine same-action miss');
 }
 assert.equal(grade([heavy,miss,melee,{...melee,tick:32}]),1,
  'one original whiff must not award two independent reads');
});

test('real R2 to authored feint can convert to melee but cannot score after re-commit',()=>{
 const feint={tick:13,kind:'action',actor:1,move:'feint'};
 const hit={tick:29,kind:'hit',actor:0,target:1,move:'foldedLight'};
 assert.equal(grade([heavy,feint,hit]),1);
 for(const evidence of [
  [feint,hit],
  [heavy,{tick:9,kind:'action',actor:1,move:'foldedLight'},feint,hit],
  [heavy,feint,{tick:20,kind:'action',actor:1,move:'foldedLight'},hit],
  [heavy,feint,{...hit,tick:34}],
  [heavy,feint,{...hit,target:0}],
  [heavy,{...feint,tick:50},{...hit,tick:54}],
 ]){
  assert.equal(grade(evidence),0,'new action or stale historical feint is not punishment');
 }
 assert.equal(grade([heavy,feint,hit,{...hit,tick:30}]),1,
  'a single feint read is one opportunity, even if a combo hits twice');
});

test('physical source-session feint-to-melee read remains playable and replay-verifiable',()=>{
 const s=huntPracticeSession({drill:'timing-read'});
 assert(s.setMode('loop',1));
 for(let tick=1;tick<=105;tick++)
  assert.equal(s.append({act:tick===72?'light':'',
   x:tick>=67&&tick<72?1:0,y:0,guard:false}),true);
 const all=s.eventHistory(200);
 assert(all.some(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy'));
 assert(all.some(e=>e.kind==='action'&&e.actor===1&&e.move==='feint'));
 assert(all.some(e=>e.kind==='hit'&&e.actor===0&&e.target===1));
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,1);
 const saved=s.save();
 const imported=huntPracticeSession({drill:'timing-read'});
 assert(imported.load(saved));
 assert.equal(imported.goal().successes,1);
 assert(imported.rewind(48));
 assert.equal(imported.goal().successes,0);
});
