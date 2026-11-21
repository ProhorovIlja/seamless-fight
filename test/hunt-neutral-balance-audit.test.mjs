import {test} from 'node:test';
import assert from 'node:assert/strict';
import {huntNeutralBalanceAudit,HUNT_NEUTRAL_AUDIT_SCHEMA}
 from '../scripts/hunt-neutral-balance-audit.mjs';

const result=huntNeutralBalanceAudit();

test('neutral whiff punish is a real source recovery hit, not a post-recovery connection',()=>{
 assert.equal(result.schema,HUNT_NEUTRAL_AUDIT_SCHEMA);
 assert.equal(result.rules,'sf-hunt-lab/3');
 assert.equal(result.hz,60);
 assert.equal(result.notBalanceCertified,true);
 assert.equal(result.footsies.actualPunish.whiffTick,23);
 assert.equal(result.footsies.actualPunish.contactTick,34);
 assert.equal(result.footsies.actualPunish.recoveryPunish,true);
 assert(result.footsies.actualPunish.remainingTargetRecoveryFrames>0);
 assert.equal(result.footsies.tooLate.contactTick,47);
 assert.equal(result.footsies.tooLate.recoveryPunish,false);
 assert.equal(result.footsies.tooLate.remainingTargetRecoveryFrames,0);
});
test('all 4 weapon pairings, both walls and three stamina budgets are audited',()=>{
 assert.equal(result.cornerMatrix.length,24);
 const cases=new Set();
 for(const scenario of result.cornerMatrix){
  cases.add([scenario.defenderWeapon,scenario.attackerWeapon,
   scenario.side,scenario.initialStamina].join(':'));
  assert(scenario.firstHitTick!==null,'Real committed heavy should be testable');
  assert(scenario.actualHits>=1);
  assert(scenario.neutralAfterDamageFrames>=0);
  assert(Number.isInteger(scenario.neutralAfterDamageFrames));
  assert(scenario.defenderHP>=0&&scenario.defenderHP<=100);
  assert(scenario.defenderStamina>=0&&scenario.defenderStamina<=100);
  assert(scenario.attackerStamina>=0&&scenario.attackerStamina<=100);
  assert(scenario.completedTick>=1&&scenario.completedTick<=150);
  assert.equal(scenario.exhaustedCornerZeroToDeath,
   scenario.initialStamina===0&&scenario.defenderHP===0);
 }
 assert.equal(cases.size,24);
 assert(result.riskCases.every(x=>x.initialStamina===0&&x.roundFinished));
 // These risks are reported, NOT reclassified as a finished balanced design.
 console.log('HUNT_NEUTRAL_PRESSURE_AUDIT='+JSON.stringify({
  rules:result.rules,cornerScenarios:result.cornerMatrix.length,
  zeroStaminaRoundLosses:result.riskCases.length,
  zeroStaminaNeutralOpportunityFrames:result.cornerMatrix.filter(x=>x.initialStamina===0)
   .map(x=>x.neutralAfterDamageFrames),
  successfulPaidCrosses:result.cornerMatrix.filter(x=>x.firstCrossTick!==null).length,
  neutralPunishTick:result.footsies.actualPunish.contactTick,
  tooLateTick:result.footsies.tooLate.contactTick,
  riskRequiresPlaytest:true
 }));
});
