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

test('a completed source feint only rewards ACTIVE spacing with ammunition conserved, never passive waiting',()=>{
 for(const weapons of [
  ['mournweave','mournweave'],
  ['thornwake','mournweave'],
  ['mournweave','thornwake'],
  ['thornwake','thornwake']
 ]){
  const read=huntPracticeSession({drill:'parry-feint-read',weapons});
  assert(read.setMode('loop',1));
  for(let tick=1;tick<=90;tick++)
   assert(read.append(cmd('',tick>=65&&tick<=75?-1:0)));
  const score=read.goal();
  assert.equal(score.attempts,1);
  assert.equal(score.successes,1,
   'source-proven completed feint plus real back-foot spacing and saved bullet');
  assert.equal(score.completed,true);
  assert.equal(read.inspect().p[0].ammo,7);
  assert(read.eventHistory(400).some(e=>e.kind==='action'&&
   e.actor===1&&e.move==='feint'));
  assert.equal(read.eventHistory(400).some(e=>e.kind==='gunParry'),false);

  const passive=huntPracticeSession({drill:'parry-feint-read',weapons});
  assert(passive.setMode('loop',1));
  play(passive,0,90);
  assert.equal(passive.goal().attempts,1);
  assert.equal(passive.goal().successes,0,
   'standing still as the dummy feints is not demonstrated footwork');

  const advance=huntPracticeSession({drill:'parry-feint-read',weapons});
  assert(advance.setMode('loop',1));
  for(let tick=1;tick<=90;tick++)
   assert(advance.append(cmd('',tick>=65&&tick<=75?1:0)));
  assert.equal(advance.goal().successes,0,
   'moving toward the opponent is not creating safe distance');
 }
});

test('feint read does not earn credit for shot-spending, fabricated expiry or no real footwork',()=>{
 const s=huntPracticeSession({drill:'parry-feint-read'});
 assert(s.setMode('loop',1));
 for(let tick=1;tick<=90;tick++)
  assert(s.append(cmd(tick===62?'shot':'',tick>=65&&tick<=75?-1:0)));
 assert.equal(s.goal().successes,0,
  'wasting a bullet into the fake windup cannot earn a feint read');
 const real=[
  {tick:56,kind:'action',actor:1,move:'foldedHeavy',distance:106,playerX:425},
  {tick:63,kind:'action',actor:1,move:'feint',distance:106,playerX:425},
  {tick:75,kind:'feintReadWindowClosed',actor:1,move:'feint',
   sourceStateVerified:true,distance:145,playerX:390}
 ];
 const earned=evaluateHuntTrainingGoal('parry-feint-read',real);
 assert.equal(earned.successes,1,'correct source-projection evidence can be scored');
 for(const altered of [
  {...real[2],sourceStateVerified:false},
  {...real[2],playerX:424},
  {...real[2],distance:108},
  {...real[2],tick:62},
  {...real[2],move:'foldedHeavy'}
 ]){
  assert.equal(evaluateHuntTrainingGoal('parry-feint-read',
   [...real.slice(0,2),altered]).successes,0);
 }
 assert.equal(evaluateHuntTrainingGoal('parry-feint-read',[
  ...real.slice(0,2),{tick:66,kind:'action',actor:0,move:'shot'},real[2]
 ]).successes,0);
});

test('feint read survives verified replay import, then loses credit when rewound before the response',()=>{
 const original=huntPracticeSession({drill:'parry-feint-read',seed:2});
 assert(original.setMode('loop',1));
 for(let tick=1;tick<=90;tick++)
  assert(original.append(cmd('',tick>=65&&tick<=75?-1:0)));
 assert.equal(original.goal().successes,1);
 const exported=original.save();
 const restored=huntPracticeSession({drill:'parry-feint-read',seed:1});
 assert(restored.load(exported));
 assert.equal(restored.goal().successes,1);
 assert(restored.rewind(30));
 assert.equal(restored.goal().successes,0);
 for(let tick=61;tick<=90;tick++)assert(restored.step(cmd()));
 assert.equal(restored.goal().successes,0,
  'replaying passive inputs after takeover must not preserve old read credit');
});
