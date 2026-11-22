import test from 'node:test';
import assert from 'node:assert/strict';
import {huntCornerPolicyMatrix,huntCornerPolicyScenario,HUNT_CORNER_POLICIES,
 HUNT_CORNER_STAMINA,HUNT_CORNER_POLICY_SCHEMA}
 from '../scripts/hunt-corner-policy-matrix.mjs';

const data=huntCornerPolicyMatrix();
test('seven genuine defender strategies × four weapon pairs × two walls × four stamina levels',()=>{
 assert.equal(data.schema,HUNT_CORNER_POLICY_SCHEMA);
 assert.equal(data.rules,'sf-hunt-lab/3');
 assert.equal(data.simulationHz,60);
 assert.equal(data.notHumanAI,true);
 assert.equal(data.notBalanceCertified,true);
 assert.equal(data.cases.length,224);
 assert.deepEqual(HUNT_CORNER_STAMINA,[0,10,30,100]);
 assert.equal(HUNT_CORNER_POLICIES.length,7);
 assert.equal(new Set(data.cases.map(x=>[
  x.defenderWeapon,x.attackerWeapon,x.wall,x.initialStamina,x.policy].join(':'))).size,224);
 for(const x of data.cases){
  assert.equal(x.fixedOpponent,'repeat-folded-heavy');
  assert(x.finalTick>=1&&x.finalTick<=220);
  assert(x.defenderHP>=0&&x.defenderHP<=100);
  assert(x.attackerHP>=0&&x.attackerHP<=100);
  assert(x.defenderStamina>=0&&x.defenderStamina<=100);
  assert(x.actionableAfterDamage>=x.neutralAfterDamage);
  assert(x.confirmedCornerCrossings<=x.actualDodgeStarts);
  assert.equal(x.defeated,x.defenderHP===0);
 }
 assert.throws(()=>huntCornerPolicyScenario('mournweave','thornwake','ceiling',30,'dodge-on-stun'),/Unsupported/);
 assert.throws(()=>huntCornerPolicyScenario('mournweave','thornwake','left',30,'block'),/Unsupported/);
});

test('no-block corner defense is a decision; passive loss does not equal forced hitstun lock',()=>{
 const passive=data.cases.filter(x=>x.policy==='passive');
 const retreat=data.cases.filter(x=>x.policy==='retreat');
 assert.equal(passive.length,32);
 assert.equal(retreat.length,32);
 // Both script policies keep sitting at the wall against repeated R2.
 // Repeated neutral windows are measured even when the player eventually loses.
 assert(passive.every(x=>x.actionableAfterDamage>0));
 assert(retreat.every(x=>x.actionableAfterDamage>0));
 assert(passive.every(x=>x.confirmedCornerCrossings===0&&x.successfulGunParries===0));
 const steppers=data.cases.filter(x=>x.policy==='dodge-on-stun'&&x.initialStamina>=30);
 assert.equal(steppers.length,16);
 assert(steppers.every(x=>x.confirmedCornerCrossings>0),'funded through-steps physically cross opponent');
 assert(steppers.every(x=>x.actionableAfterDamage>0));
 const pokes=data.cases.filter(x=>x.policy==='counterpoke');
 assert(pokes.some(x=>x.meleeHitsGiven>0),'source light contact provides a grounded alternative');
});

test('a predictably timed firearm counter succeeds, but delayed firearm response can fail',()=>{
 const early=data.cases.filter(x=>x.policy==='early-parry'&&x.initialStamina>=30);
 const late=data.cases.filter(x=>x.policy==='late-parry'&&x.initialStamina>=30);
 assert.equal(early.length,16);assert.equal(late.length,16);
 assert(early.every(x=>x.successfulGunParries>=1));
 assert(late.some(x=>x.successfulGunParries===0&&x.actualShotsStarted>0),
  'shooting during enemy windup does not automatically grant a parry');
 assert(data.summary.every(s=>s.scenarios===32));
});
