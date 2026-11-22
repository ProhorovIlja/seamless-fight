import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';
import {evaluateHuntTrainingGoal} from '../public/hunt-training-goals.mjs';

const cmd=(act='',x=0)=>({act,x,y:0,guard:false});
function simulate(s,inputs={},until=81){
 for(let tick=1;tick<=until;tick++)
  assert.equal(s.append(inputs[tick]??cmd()),true);
 return s;
}

test('a real quickstep intercepting an otherwise hitting firearm shot earns the dodge only on overlap',()=>{
 for(const weapons of [
  ['mournweave','mournweave'],['thornwake','thornwake'],
  ['mournweave','thornwake'],['thornwake','mournweave']
 ]){
  const s=simulate(huntPracticeSession({drill:'dodge-shot',weapons}),
   {62:cmd('step',-1)},81);
  const events=s.eventHistory(200);
  assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='shot'));
  assert(events.some(e=>e.kind==='action'&&e.actor===0&&e.move==='step'));
  assert(events.some(e=>e.kind==='whiff'&&e.actor===1&&e.move==='shot'));
  assert.equal(s.inspect().p[0].hp,100);
  assert.equal(s.goal().successes,1,
   'real source overlap during i-frames must count as a firearm dodge');
  const capture=s.save();
  const restored=huntPracticeSession({drill:'dodge-shot',weapons});
  assert(restored.load(capture));
  assert.equal(restored.goal().successes,s.goal().successes,
   'rewindable verified replay must rebuild the same causal training evidence');
 }
});

test('a gun whiff plus quickstep alone no longer proves an evasion',()=>{
 const misleading=[
  {tick:56,kind:'action',actor:1,move:'shot'},
  {tick:62,kind:'action',actor:0,move:'step',distance:140},
  {tick:65,kind:'whiff',actor:1,move:'shot',distance:170}
 ];
 assert.equal(evaluateHuntTrainingGoal('dodge-shot',misleading).successes,0,
  'unverified apparent proximity and a button press cannot earn a dodge');
 const outOfRange=misleading.map(e=>e.kind==='whiff'?
  {...e,distance:300,confirmedDodgeEvade:false}:e);
 assert.equal(evaluateHuntTrainingGoal('dodge-shot',outOfRange).successes,0,
  'a gun can miss because of distance or facing, without being evaded');
 const legitimate=misleading.map(e=>e.kind==='whiff'?
  {...e,confirmedDodgeEvade:true}:e);
 assert.equal(evaluateHuntTrainingGoal('dodge-shot',legitimate).successes,1,
  'a proven source projection still completes the training objective');
});

test('an early or late quickstep that is not protecting the hitbox receives no credit',()=>{
 const passive=simulate(huntPracticeSession({drill:'dodge-shot'}),{},81);
 assert.equal(passive.goal().successes,0);
 for(const tick of [53,74]){
  const s=simulate(huntPracticeSession({drill:'dodge-shot'}),
   {[tick]:cmd('step',-1)},81);
  assert.equal(s.goal().successes,0,
   'quickstep input outside the source bullet i-frames is not a dodge');
 }
});
