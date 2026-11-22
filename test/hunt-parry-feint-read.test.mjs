import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntPracticeSession,HUNT_PRACTICE_DRILLS
} from '../public/hunt-practice-suite.mjs';
import {evaluateHuntTrainingGoal} from '../public/hunt-training-goals.mjs';

const cmd=(act='',x=0)=>({act,x,y:0,guard:false});
function play(session,shotTick,frames=88){
 for(let tick=1;tick<=frames;tick++)
  assert.equal(session.append(cmd(tick===shotTick?'shot':'')),true);
 return session;
}

test('English-only heavy-versus-feint read exposes two physically real dummy recordings',()=>{
 const drill=HUNT_PRACTICE_DRILLS.find(x=>x.id==='parry-feint-read');
 assert(drill);
 assert.equal(drill.label,'Defense: Parry Heavy, Do Not Shoot Feint');
 const s=huntPracticeSession({drill:'parry-feint-read',seed:1});
 assert.equal(s.stats().mode,'random');
 assert.equal(s.stats().simulationHz,60);
 assert.equal(s.goal().category,'Reads & Footsies');
 assert.equal(s.goal().language,'en');
 assert.equal(s.slotData(0)[55].act,'heavy');
 assert.equal(s.slotData(1)[55].act,'heavy');
 assert.equal(s.slotData(1)[62].act,'feint');
 assert(s.slotData(0).every(x=>x.guard===false));
 assert.equal(s.setMode('loop',0),true);
});

test('gun bullet must genuinely interrupt a committed R2, never an authored feint',()=>{
 for(const weapons of [
  ['mournweave','mournweave'],
  ['thornwake','mournweave'],
  ['mournweave','thornwake'],
  ['thornwake','thornwake']
 ]){
  const committed=huntPracticeSession({drill:'parry-feint-read',weapons});
  assert(committed.setMode('loop',0));
  play(committed,62);
  const parries=committed.eventHistory(400).filter(e=>
   e.kind==='gunParry'&&e.actor===0&&e.target===1);
  assert.equal(parries.length,1);
  assert.equal(parries[0].interruptedMove,'foldedHeavy');
  assert(parries[0].interruptedAge>0);
  assert.equal(committed.goal().attempts,1);
  assert.equal(committed.goal().successes,1);
  assert.equal(committed.goal().completed,true);
  const fake=huntPracticeSession({drill:'parry-feint-read',weapons});
  assert(fake.setMode('loop',1));
  play(fake,62);
  const events=fake.eventHistory(400);
  assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='feint'));
  assert.equal(events.some(e=>e.kind==='gunParry'&&e.actor===0),false);
  assert.equal(fake.goal().attempts,1);
  assert.equal(fake.goal().successes,0);
  assert.equal(fake.goal().completed,false);
 }
});

test('two seeded random dummy choices are deterministic and do not force favorable read outcomes',()=>{
 const a=play(huntPracticeSession({drill:'parry-feint-read',seed:1}),62);
 const b=play(huntPracticeSession({drill:'parry-feint-read',seed:2}),62);
 assert.equal(a.stats().activeSlot,0);
 assert.equal(b.stats().activeSlot,1);
 assert.equal(a.goal().successes,1);
 assert.equal(b.goal().successes,0);
 const bTwin=play(huntPracticeSession({drill:'parry-feint-read',seed:2}),62);
 assert.deepEqual(bTwin.eventHistory(400),b.eventHistory(400));
 assert.equal(bTwin.goal().successes,b.goal().successes);
});

test('branching/replay import must recalculate causal parry credit from real recorded inputs',()=>{
 const original=play(huntPracticeSession({drill:'parry-feint-read',seed:1}),62);
 assert.equal(original.goal().successes,1);
 const capture=original.save();
 const imported=huntPracticeSession({drill:'parry-feint-read',seed:2});
 assert(imported.load(capture));
 assert.equal(imported.goal().successes,1);
 assert.equal(imported.stats().paused,true);
 assert(imported.rewind(30));
 assert.equal(imported.goal().successes,0);
 for(let i=0;i<30;i++)assert(imported.step(cmd()));
 assert.equal(imported.goal().successes,0);
});

test('a historical committed heavy followed by a different gun parry cannot earn this read',()=>{
 const e=[
  {tick:11,kind:'action',actor:1,move:'foldedHeavy'},
  {tick:19,kind:'action',actor:1,move:'feint'},
  {tick:29,kind:'action',actor:1,move:'foldedLight'},
  {tick:33,kind:'gunParry',actor:0,target:1,
   interruptedMove:'foldedLight',interruptedAge:4}
 ];
 const result=evaluateHuntTrainingGoal('parry-feint-read',e);
 assert.equal(result.attempts,1);
 assert.equal(result.successes,0);
});
