import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntFullWhiffTrial,huntFullWhiffMatrix,
 HUNT_FULL_WHIFF_DELAYS,HUNT_FULL_WHIFF_ANSWERS,
 HUNT_FULL_WHIFF_APPROACHES
} from '../scripts/hunt-whiff-from-neutral.mjs';
import {
 HUNT_WEAPONS,HUNT_FORMS,HUNT_HZ,huntMoveSpec
} from '../public/side-hunt-lab.mjs';

test('a no-block footsies whiff must arise from a real R2 action and ALL of its startup/active frames',()=>{
 const all=huntFullWhiffMatrix();
 assert.equal(all.length,2*2*2*2*2*2*3*4);
 assert.deepEqual(HUNT_FULL_WHIFF_DELAYS,[0,5,12,20]);
 assert.deepEqual(HUNT_FULL_WHIFF_ANSWERS,['light','shot','step']);
 assert.deepEqual(HUNT_FULL_WHIFF_APPROACHES,
  ['hold','postWhiffWalk','precommitWalk']);
 for(const r of all){
  assert.equal(r.attackerStartedR2,true);
  assert.equal(r.realR2Whiff,true,
   'source event must prove the original R2 actually whiffed from full lifecycle');
  assert.equal(r.originalR2Hit,false);
  assert.equal(r.rules,'sf-hunt-lab/3');
  assert.equal(r.hz,HUNT_HZ);
  assert.equal(r.answerRequestedTick,r.whiffTick+1+r.responseDelay,
   'input arrives AFTER the real emitted whiff, never via premonition');
  const spec=huntMoveSpec({
   weapon:r.attackerWeapon,act:r.attackerForm+r.attackerHeavy
  });
  assert.equal(r.distance,spec.reach+48);
  assert.equal(r.whiffTick,spec.startup+spec.active,
   'observed whiff tick must be physical startup + active, not a seeded age');
  assert.equal(Object.hasOwn(r,'sourceEvents'),false,
   'aggregated matrix is a projection of authenticated source event streams');
 }
});

test('both-player-slot mirror identity survives full heavy startup, genuine whiff, and delayed counterplay',()=>{
 const all=huntFullWhiffMatrix();
 const perSlot=2*3*4;
 for(let i=0;i<all.length;i+=2*perSlot)
  for(let j=0;j<perSlot;j++){
   const a=all[i+j],b=all[i+perSlot+j];
   assert.equal(a.defenderSlot,0);
   assert.equal(b.defenderSlot,1);
   for(const k of ['category','distance','whiffTick','answerRequestedTick',
    'realR2Whiff','originalR2Hit','attackerStartedTrick','trickTick',
    'realWhiffRecoveryPunish','nextTrickStartupInterrupt','gunParry',
    'gunChip','defenderMeleeHit','attackerMeleeHit',
    'attackerHp','defenderHp','cornerEscapes'])
    assert.deepEqual(a[k],b[k],
     'incorrect source slot ordering for '+k+' '+JSON.stringify(a));
  }
});

test('walking directly into a real R2 can be punished before any fake whiff state exists',()=>{
 let hitFromBadSpacing=0;
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const attackerForm of HUNT_FORMS)
   for(const attackerHeavy of ['Heavy','Charged'])
    for(const defenderSlot of [0,1]){
     const r=huntFullWhiffTrial({
      attackerWeapon,attackerForm,attackerHeavy,defenderSlot,
      initialGap:-25,approach:'hold',answer:'light',responseDelay:5
     });
     assert.equal(r.attackerStartedR2,true);
     assert.equal(r.originalR2Hit,true,
      'ordinary attack must connect when defender is genuinely inside R2 range');
     assert.equal(r.realR2Whiff,false,
      'hit R2 cannot also magically produce missed-swing training evidence');
     assert.equal(r.answerRequestedTick,null,
      'no reactive script can be triggered by a whiff that did not occur');
     assert.equal(r.category,'R2HitNoWhiff');
     hitFromBadSpacing++;
    }
 assert.equal(hitFromBadSpacing,16);
});

test('full original whiff is an actual event; gun shot, R1 and step do not magically score a punish',()=>{
 for(const answer of ['light','shot','step']){
  const r=huntFullWhiffTrial({
   attackerWeapon:'thornwake',defenderWeapon:'mournweave',
   attackerForm:'unfurled',attackerHeavy:'Charged',
   approach:'hold',answer,responseDelay:20
  });
  assert.equal(r.realR2Whiff,true);
  assert(r.sourceEvents.some(e=>e.kind==='action'&&
   e.move==='unfurledCharged'));
  assert(r.sourceEvents.some(e=>e.kind==='whiff'&&
   e.move==='unfurledCharged'));
  assert.equal(r.answerRequestedTick,r.whiffTick+21);
  if(r.realWhiffRecoveryPunish){
   assert(r.sourceEvents.some(e=>e.kind==='hit'&&
    e.punishedRecovery===true&&
    e.punishedMove==='unfurledCharged'));
  }
  if(r.nextTrickStartupInterrupt){
   assert(r.sourceEvents.some(e=>e.kind==='hit'&&
    e.hitDuringStartup===true&&
    ['unfurl','refold'].includes(e.interruptedMove)));
  }
  if(r.gunParry){
   assert.equal(answer,'shot');
   assert(r.sourceEvents.some(e=>e.kind==='gunParry'));
  }
  if(answer==='step'){
   assert.equal(r.gunParry,false);
   assert.equal(r.defenderMeleeHit,false);
  }
 }
});

test('isolated study rejects block, grab, air-step and invalid experimental coordinates',()=>{
 const wrong=[
  {answer:'block'},{answer:'grab'},{answer:'airStep'},
  {approach:'guard'},{defenderSlot:2},{initialGap:Infinity},
  {initialGap:-41},{frames:40},{responseDelay:-1},
  {attackerForm:'crouch'},{arenaSide:'outside'},
  {attackerHeavy:'Low'},{defenderWeapon:'bloodborne'}
 ];
 for(const overrides of wrong)
  assert.throws(()=>huntFullWhiffTrial(overrides),TypeError);
 assert.throws(()=>huntFullWhiffMatrix({delays:[-1]}),TypeError);
 assert.throws(()=>huntFullWhiffMatrix({approaches:['teleport']}),TypeError);
 assert.throws(()=>huntFullWhiffMatrix({arenaSides:['above']}),TypeError);
});
