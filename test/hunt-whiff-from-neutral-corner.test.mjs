import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntFullWhiffTrial,huntFullWhiffMatrix
} from '../scripts/hunt-whiff-from-neutral.mjs';
import {HUNT_WEAPONS,HUNT_FORMS} from '../public/side-hunt-lab.mjs';

test('an R2 actually begun at a left wall and a mirrored right wall has the SAME delayed punish outcomes',()=>{
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const attackerForm of HUNT_FORMS)
   for(const attackerHeavy of ['Heavy','Charged'])
    for(const defenderSlot of [0,1])
     for(const responseDelay of [0,5,20])
      for(const answer of ['light','shot','step']){
       const config={attackerWeapon,attackerForm,attackerHeavy,
        defenderSlot,responseDelay,answer};
       const left=huntFullWhiffTrial({...config,arenaSide:'left'});
       const right=huntFullWhiffTrial({...config,arenaSide:'right'});
       for(const key of ['category','distance','attackerStartedR2',
        'realR2Whiff','originalR2Hit','whiffTick','answerRequestedTick',
        'attackerStartedTrick','trickTick','realWhiffRecoveryPunish',
        'nextTrickStartupInterrupt','gunParry','gunChip',
        'defenderMeleeHit','attackerMeleeHit',
        'attackerHp','defenderHp','cornerEscapes'])
        assert.deepEqual(left[key],right[key],
         'wall orientation bias '+key+' '+JSON.stringify(config));
       assert.equal(left.realR2Whiff,true);
       assert.equal(right.realR2Whiff,true);
       assert.equal(left.cornerEscapes,0,
        'one quickstep from outside an authentic R2 reach cannot teleport past a rival');
      }
});

test('simulated footsies matrix can isolate genuine wall whiffs and does not fabricate crossing',()=>{
 const rows=huntFullWhiffMatrix({
  arenaSides:['left','right'],gaps:[32],approaches:['hold'],
  answers:['light','shot','step'],delays:[0,12]
 });
 assert.equal(rows.length,2*2*2*2*2*2*3*2);
 assert(rows.every(r=>r.realR2Whiff&&r.attackerStartedR2));
 assert(rows.every(r=>r.cornerEscapes===0));
 assert(rows.every(r=>r.answerRequestedTick===r.whiffTick+1+r.responseDelay));
 assert.equal(new Set(rows.map(x=>x.arenaSide)).size,2);
});

test('prematurely walking into a telegraphed R2 is a dangerous spacing mistake, NOT rewarded as a whiff',()=>{
 let unsafe=0,protected=0;
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const attackerForm of HUNT_FORMS)
   for(const attackerHeavy of ['Heavy','Charged'])
    for(const arenaSide of ['left','right']){
     const r=huntFullWhiffTrial({
      attackerWeapon,attackerForm,attackerHeavy,arenaSide,
      approach:'precommitWalk',initialGap:32,answer:'light',responseDelay:12
     });
     assert.equal(r.attackerStartedR2,true);
     if(r.originalR2Hit){
      unsafe++;
      assert.equal(r.realR2Whiff,false);
      assert.equal(r.answerRequestedTick,null);
      assert.equal(r.category,'R2HitNoWhiff');
     }else if(r.realR2Whiff){
      protected++;
      assert.equal(r.answerRequestedTick,r.whiffTick+13);
     }else{
      assert.fail('only real R2 contact or real R2 whiff may define this trial');
     }
    }
 assert(unsafe>0,
  'one or more early approach reads must expose the defender to a real R2 hit');
 assert.equal(unsafe+protected,16);
});
