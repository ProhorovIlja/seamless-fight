import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_DELAYED_CORNER_SCHEMA,HUNT_OBSERVATION_DELAYS,HUNT_CORNER_RESPONSES,
 HUNT_ATTACKER_PATTERNS,HUNT_CORNER_RESOURCE_LEVELS,
 huntDelayedCornerScenario,huntDelayedCornerMatrix
} from '../scripts/hunt-delayed-corner-policy-matrix.mjs';

// The entire matrix uses the actual 60Hz fight source. No success is injected.
const report=huntDelayedCornerMatrix();
test('four attacker patterns and five no-block responses are exercised at both walls and delayed reads',()=>{
 assert.equal(report.schema,HUNT_DELAYED_CORNER_SCHEMA);
 assert.equal(report.rules,'sf-hunt-lab/3');
 assert.equal(report.simulationHz,60);
 assert.deepEqual(HUNT_OBSERVATION_DELAYS,[0,4,8]);
 assert.deepEqual(HUNT_CORNER_RESOURCE_LEVELS,[0,30,100]);
 assert.equal(HUNT_CORNER_RESPONSES.length,5);
 assert.equal(HUNT_ATTACKER_PATTERNS.length,4);
 assert.equal(report.scenarios,1440);
 assert.equal(report.cases.length,1440);
 assert.equal(report.notHumanAI,true);
 assert.equal(report.notBalanceCertified,true);
 assert.equal(report.noActualNetworkRollbackHere,true);
 assert.equal(report.defenderUsesDelayedOpponentObservation,true);
 assert(report.byDelay.every(x=>x.scenarios===480&&x.falseGuardEvents===0));
 for(const delay of report.byDelay){
  for(const category of ['punishedDodgeTailCases','punishedDodgeRecoveryCases',
   'defenderWhiffPunishCases']){
   assert(Number.isSafeInteger(delay[category]));
   assert(delay[category]>=0&&delay[category]<=delay.scenarios);
  }
  assert.equal(delay.punishedDodgeTailCases,
   report.cases.filter(x=>x.observationDelay===delay.observationDelay&&
    x.attackerPunishesDodgeTail>0).length);
  assert.equal(delay.punishedDodgeRecoveryCases,
   report.cases.filter(x=>x.observationDelay===delay.observationDelay&&
    x.attackerPunishesDodgeRecovery>0).length);
 }
 const keys=new Set();
 for(const x of report.cases){
  keys.add([x.defenderWeapon,x.attackerWeapon,x.wall,x.initialStamina,
   x.observationDelay,x.defenderPolicy,x.attackerPattern].join(':'));
  assert(x.finalTick>=1&&x.finalTick<=report.maxFrames);
  assert(x.defenderHP>=0&&x.defenderHP<=100);
  assert(x.attackerHP>=0&&x.attackerHP<=100);
  assert(x.defenderStamina>=0&&x.defenderStamina<=100);
  assert(x.attackerStamina>=0&&x.attackerStamina<=100);
  assert(x.neutralAfterDamage<=x.actionableAfterDamage);
  assert(x.confirmedDefenderCornerCrossings<=x.defenderQuicksteps);
  assert(x.confirmedDefenderGunParries<=x.defenderShots);
  for(const field of ['attackerPunishesDodgeTail','attackerPunishesDodgeRecovery',
   'attackerStartupInterrupts','defenderWhiffRecoveryPunishes',
   'defenderStartupInterrupts']){
   assert(Number.isSafeInteger(x[field])&&x[field]>=0,
    'genuine resolved-contact metric required: '+field);
  }
  assert(x.attackerPunishesDodgeTail+x.attackerPunishesDodgeRecovery<=
   x.landedAttackerHits,'no dodge may count twice as tail and recovery');
  assert(x.attackerStartupInterrupts<=x.landedAttackerHits);
  assert(x.defenderWhiffRecoveryPunishes<=x.defenderMeleeHits);
  assert(x.defenderStartupInterrupts<=x.defenderMeleeHits);
  assert.equal(x.defenderDefeated,x.defenderHP===0);
  assert.equal(x.eventsContainForbiddenGuard,false);
 }
 assert.equal(keys.size,report.scenarios);
});

test('source evidence distinguishes active counterplay from stationary losses across pressure patterns',()=>{
 assert(report.cases.some(x=>x.actualAttackerFeints>0&&x.attackerPattern==='feint-heavy'),
  'the scripted feint opponent must actually start feints in simulation');
 assert(report.cases.some(x=>x.defenderPolicy==='read-shot'&&x.confirmedDefenderGunParries>0),
  'true source firearm counter must occur in at least one read scenario');
 assert(report.cases.some(x=>x.defenderPolicy==='cross-step'&&x.confirmedDefenderCornerCrossings>0),
  'actual positional reversal must occur in at least one funded scenario');
 assert(report.cases.some(x=>x.defenderPolicy==='hold'&&x.defenderDefeated),
  'passively losing a corner is allowed without calling it an infinite');
 assert(report.cases.some(x=>x.defenderPolicy==='counterpoke'&&x.defenderMeleeHits>0),
  'source fast melee must give at least one actual alternative');
});

test('fixed inputs and historical observations reproduce results exactly; illegal strategy is rejected',()=>{
 const options={defenderWeapon:'thornwake',attackerWeapon:'mournweave',
  wall:'right',initialStamina:30,observationDelay:8,
  defenderPolicy:'hybrid',attackerPattern:'feint-heavy'};
 assert.deepEqual(huntDelayedCornerScenario(options),huntDelayedCornerScenario(options));
 assert.throws(()=>huntDelayedCornerScenario({...options,defenderPolicy:'guard'}),/Unsupported/);
 assert.throws(()=>huntDelayedCornerScenario({...options,observationDelay:-1}),/Unsupported/);
});
