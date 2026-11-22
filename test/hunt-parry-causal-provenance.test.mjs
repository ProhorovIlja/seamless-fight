import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntMatch,huntInput,huntStep,HUNT_WEAPON_SPECS,HUNT_MOVES
} from '../public/side-hunt-lab.mjs';
import {evaluateHuntTrainingGoal} from '../public/hunt-training-goals.mjs';

// The combat source, not a test-authored parry result, decides whether a
// bullet truly hits a live parry window. Mirror both P1/P2 positions.
function liveFirearmImpact({targetMove='foldedHeavy',targetWeapon='mournweave',
 shooterSlot=0}={}){
 const weapons=shooterSlot===0?['mournweave',targetWeapon]:
  [targetWeapon,'mournweave'];
 const s=huntMatch({weapons});s.ready=0;
 s.p[0].x=425;s.p[1].x=535;
 s.p[0].dir=1;s.p[1].dir=-1;
 const shooter=s.p[shooterSlot],target=s.p[1-shooterSlot];
 shooter.act='shot';shooter.age=HUNT_MOVES.shot.startup;
 shooter.spent=false;
 target.act=targetMove;
 const spec=HUNT_WEAPON_SPECS[targetWeapon][targetMove];
 target.age=Math.max(3,spec.startup-2);
 target.spent=false;
 const originalAge=target.age;
 const events=[];
 huntStep(s,[huntInput(),huntInput()],events);
 return {events,s,originalAge,shooterSlot,targetSlot:1-shooterSlot};
}
function scoringEvidence(move,parry){
 return [
  {tick:0,kind:'action',actor:1,move},
  {...parry,tick:1,actor:0,target:1}
 ];
}

test('source parry preserves the ACTUAL interrupted heavy, heal, blood or light and its hit-frame age',()=>{
 for(const targetWeapon of ['mournweave','thornwake'])
  for(const shooterSlot of [0,1])
   for(const targetMove of ['foldedHeavy','heal','blood','foldedLight']){
    const {events,s,originalAge,targetSlot}=liveFirearmImpact({
     targetMove,targetWeapon,shooterSlot
    });
    const parry=events.find(e=>e.kind==='gunParry');
    assert(parry,'source should resolve a real timed parry on '+targetMove);
    assert.equal(parry.actor,shooterSlot);
    assert.equal(parry.target,targetSlot);
    assert.equal(parry.interruptedMove,targetMove);
    assert.equal(parry.interruptedAge,originalAge);
    assert(parry.interruptedAge>=1);
    assert.equal(s.p[targetSlot].act,'stagger');
    assert(parry.opening>0);
   }
});

test('heavy-training cannot count a firearm parry of light after a recent heavy',()=>{
 const {events}=liveFirearmImpact({targetMove:'foldedLight'});
 const parry=events.find(e=>e.kind==='gunParry');
 const evidence=scoringEvidence('foldedHeavy',parry);
 const scored=evaluateHuntTrainingGoal('parry-heavy',evidence);
 assert.equal(scored.attempts,1);
 assert.equal(scored.successes,0,
  'prior heavy is not proof that the gun interrupted that heavy');
 const legitimate=evaluateHuntTrainingGoal('parry-heavy',
  scoringEvidence('foldedHeavy',liveFirearmImpact({
   targetMove:'foldedHeavy'
  }).events.find(e=>e.kind==='gunParry')));
 assert.equal(legitimate.successes,1);
});

test('healing and blood-round counter drills require a matching interrupt at impact',()=>{
 const drills=[
  ['parry-heal','heal'],['parry-blood','blood']
 ];
 for(const [drill,move] of drills){
  const validParry=liveFirearmImpact({targetMove:move}).events.find(
   e=>e.kind==='gunParry');
  const wrongParry=liveFirearmImpact({targetMove:'foldedHeavy'}).events.find(
   e=>e.kind==='gunParry');
  assert.equal(evaluateHuntTrainingGoal(drill,
   scoringEvidence(move,validParry)).successes,1);
  assert.equal(evaluateHuntTrainingGoal(drill,
   scoringEvidence(move,wrongParry)).successes,0,
   'an earlier utility action must not make a different parry count');
 }
});

test('fake or missing parry target/move/impact age cannot produce a training success',()=>{
 const authentic=liveFirearmImpact({targetMove:'foldedHeavy'}).events.find(
  e=>e.kind==='gunParry');
 const forged=[
  {...authentic,interruptedMove:undefined},
  {...authentic,interruptedMove:'foldedLight'},
  {...authentic,target:0},
  {...authentic,interruptedAge:0},
  {...authentic,interruptedAge:NaN}
 ];
 for(const e of forged)
  assert.equal(evaluateHuntTrainingGoal('parry-heavy',
   scoringEvidence('foldedHeavy',e)).successes,0);
});

test('ordinary firearm chip hit cannot be mistaken for parry provenance',()=>{
 const s=huntMatch();s.ready=0;
 s.p[0].x=425;s.p[1].x=535;
 s.p[0].act='shot';s.p[0].age=HUNT_MOVES.shot.startup;
 s.p[1].act='foldedHeavy';s.p[1].age=1;
 const events=[];
 huntStep(s,[huntInput(),huntInput()],events);
 assert(events.some(e=>e.kind==='bulletHit'));
 assert(!events.some(e=>e.kind==='gunParry'));
 assert.equal(evaluateHuntTrainingGoal('parry-heavy',[
  {tick:0,kind:'action',actor:1,move:'foldedHeavy'},
  ...events
 ]).successes,0);
});
