import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntSourceWhiffPunishes,HUNT_PUNISH_PROVENANCE_SCHEMA
} from '../public/hunt-punish-provenance.mjs';
import {huntVisibleNeutralTrial} from '../scripts/hunt-visible-neutral-policy.mjs';
import {huntCornerWhiffProvenance} from '../scripts/hunt-delayed-corner-policy-matrix.mjs';
import {huntObservedWhiffTrial} from '../scripts/hunt-observed-whiff-punish.mjs';
import {loadHuntReplay,huntReplayFingerprint} from '../public/side-hunt-replay.mjs';

test('visual neutral never labels a mere recovery-phase contact as a source-proven whiff punish',()=>{
 for(const attackerWeapon of ['mournweave','thornwake'])
  for(const defenderWeapon of ['mournweave','thornwake'])
   for(const defenderSlot of [0,1])
    for(const arenaSide of ['left','right','center'])
     for(const attackerPlan of ['light','heavy','feint'])
      for(const defenderPlan of ['counterpoke','firearm','quickstep'])
       for(const perceptionDelay of [0,8]){
        const trial=huntVisibleNeutralTrial({
         attackerWeapon,defenderWeapon,defenderSlot,arenaSide,attackerPlan,
         defenderPlan,perceptionDelay,distance:85,recordReplay:true
        });
        const actual=huntSourceWhiffPunishes(trial.sourceEvents,
         defenderSlot,1-defenderSlot);
        assert.equal(actual.schema,HUNT_PUNISH_PROVENANCE_SCHEMA);
        assert.equal(trial.confirmedWhiffPunishes,
         actual.sourceConfirmedWhiffPunishes);
        assert.equal(trial.recoveryPhaseContacts,actual.recoveryPhaseContacts);
        assert.equal(trial.unconfirmedRecoveryContacts,
         actual.unconfirmedRecoveryContacts);
        assert.equal(trial.recoveryPunish,actual.sourceConfirmedWhiffPunishes>0);
        assert.equal(trial.recoveryPhaseContact,actual.recoveryPhaseContacts>0);
        assert.equal(trial.category==='recoveryContactNoProvenWhiff',
         !trial.realGunParry&&!trial.recoveryPunish&&!trial.startupInterrupt&&
           trial.recoveryPhaseContact,
         'misclassified recovering body as whiff punish or other event');
        assert.equal(huntReplayFingerprint(loadHuntReplay(trial.replayCapture).getState()),
         trial.finalFingerprint);
        assert(!trial.sourceEvents.some(e=>['guard','block','throw'].includes(e.kind)));
       }
});

test('corner and neutral attribution use the same replay-grounded, slot-neutral rule',()=>{
 for(const arenaSide of ['left','right'])
  for(const defenderSlot of [0,1]){
   const trial=huntObservedWhiffTrial({
    attackerWeapon:'mournweave',defenderWeapon:'thornwake',
    attackerForm:'folded',defenderForm:'unfurled',
    defenderSlot,arenaSide,gap:35,approach:'hold',defenderPlan:'light'
   });
   assert(trial.realRecoveryPunish);
   const common=huntSourceWhiffPunishes(trial.sourceEvents,
    defenderSlot,1-defenderSlot);
   const corner=huntCornerWhiffProvenance(trial.sourceEvents,
    defenderSlot,1-defenderSlot);
   assert.deepEqual(common,corner);
   assert.equal(common.sourceConfirmedWhiffPunishes,1);
   assert.equal(common.recoveryPhaseContacts,1);
  }
});

test('source event history resets a missed move on new commitment, parry or round',()=>{
 const miss={tick:10,kind:'whiff',actor:1,move:'foldedHeavy'};
 const contact={tick:15,kind:'hit',actor:0,target:1,
  punishedRecovery:true,punishedMove:'foldedHeavy',remainingRecovery:6};
 const one=huntSourceWhiffPunishes([miss,contact]);
 assert.equal(one.sourceConfirmedWhiffPunishes,1);
 for(const interrupt of [
  {tick:12,kind:'action',actor:1,move:'foldedLight'},
  {tick:12,kind:'gunParry',actor:0,target:1},
  {tick:12,kind:'round',winner:-1,over:false}
 ]){
  const result=huntSourceWhiffPunishes([miss,interrupt,contact]);
  assert.equal(result.sourceConfirmedWhiffPunishes,0);
  assert.equal(result.unconfirmedRecoveryContacts,1);
 }
 assert.equal(huntSourceWhiffPunishes([miss,contact,
  {...contact,tick:16}]).sourceConfirmedWhiffPunishes,1);
 assert.throws(()=>huntSourceWhiffPunishes([],0,0),TypeError);
});
