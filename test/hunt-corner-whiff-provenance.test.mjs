import test from 'node:test';
import assert from 'node:assert/strict';
import {huntCornerWhiffProvenance} from '../scripts/hunt-delayed-corner-policy-matrix.mjs';
import {huntObservedWhiffTrial} from '../scripts/hunt-observed-whiff-punish.mjs';

const whiff=(move='foldedHeavy',tick=12)=>({kind:'whiff',tick,actor:1,move});
const contact=(move='foldedHeavy',tick=18)=>({
 kind:'hit',tick,actor:0,target:1,punishedRecovery:true,
 punishedMove:move,remainingRecovery:7
});

test('a corner recovery-phase hit is NOT a verified whiff punish without the missed move',()=>{
 for(const evidence of [
  [contact()],
  [whiff('foldedHeavy'),contact('foldedLight')],
  [whiff(),{kind:'action',tick:15,actor:1,move:'foldedLight'},contact()],
  [whiff(),{kind:'gunParry',tick:16,actor:0,target:1},contact()],
  [whiff(),{kind:'round',tick:16,winner:0,over:false},contact()],
  [whiff(),{...contact(),remainingRecovery:0}],
  [whiff(),{...contact(),tick:12}]
 ]){
  const result=huntCornerWhiffProvenance(evidence);
  assert.equal(result.sourceConfirmedWhiffPunishes,0);
  assert.deepEqual(result.confirmations,[]);
  assert.equal(result.recoveryPhaseContacts,1);
  assert.equal(result.unconfirmedRecoveryContacts,1);
 }
});

test('only a matching source miss followed by confirmed same-action recovery contact earns credit',()=>{
 const result=huntCornerWhiffProvenance([
  {kind:'action',tick:1,actor:1,move:'foldedHeavy'},
  whiff(),
  contact(),
  contact('foldedHeavy',19)
 ]);
 assert.equal(result.recoveryPhaseContacts,2);
 assert.equal(result.sourceConfirmedWhiffPunishes,1);
 assert.equal(result.unconfirmedRecoveryContacts,1);
 assert.deepEqual(result.confirmations,[{
  whiffTick:12,hitTick:18,move:'foldedHeavy',remainingRecovery:7
 }]);
 assert(Object.isFrozen(result));
 assert(Object.isFrozen(result.confirmations));
});

test('actual no-block source simulation proves corner whiff provenance at both walls and both P1/P2 slots',()=>{
 for(const arenaSide of ['left','right'])
  for(const defenderSlot of [0,1]){
   const scenario=huntObservedWhiffTrial({
    attackerWeapon:'mournweave',defenderWeapon:'thornwake',
    attackerForm:'folded',defenderForm:'unfurled',
    arenaSide,defenderSlot,gap:35,approach:'hold',
    defenderPlan:'light'
   });
   assert.equal(scenario.realRecoveryPunish,true);
   const result=huntCornerWhiffProvenance(
    scenario.sourceEvents,defenderSlot,1-defenderSlot);
   assert.equal(result.sourceConfirmedWhiffPunishes,1);
   assert.equal(result.recoveryPhaseContacts,1);
   assert.equal(result.unconfirmedRecoveryContacts,0);
   assert.equal(result.confirmations[0].move,'foldedHeavy');
   assert(result.confirmations[0].hitTick>result.confirmations[0].whiffTick);
  }
});

test('not enough distance, late response and whiff without hit never become genuine punish',()=>{
 for(const controls of [
  {defenderPlan:'hold',gap:35,reactionDelay:0},
  {defenderPlan:'light',gap:100,defenderForm:'folded'},
  {defenderPlan:'light',gap:35,reactionDelay:12}
 ]){
  const scenario=huntObservedWhiffTrial({
   attackerWeapon:'mournweave',defenderWeapon:'thornwake',
   attackerForm:'folded',defenderForm:'unfurled',
   arenaSide:'left',approach:'hold',...controls
  });
  assert.equal(scenario.realRecoveryPunish,false);
  assert.equal(huntCornerWhiffProvenance(scenario.sourceEvents)
   .sourceConfirmedWhiffPunishes,0);
 }
 assert.throws(()=>huntCornerWhiffProvenance(null),/Expected 1v1/);
 assert.throws(()=>huntCornerWhiffProvenance([],1,1),/Expected 1v1/);
});
