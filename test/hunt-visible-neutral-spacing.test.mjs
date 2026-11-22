import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 huntVisibleNeutralMatrix,huntVisibleNeutralTrial
} from '../scripts/hunt-visible-neutral-policy.mjs';

test('spacing sweep extends the visible-only study without changing the established 85U baseline',()=>{
 const baseline=huntVisibleNeutralMatrix({
  attackerPlans:['heavy'],defenderPlans:['hold'],
  delays:[4],arenaSides:['center']
 });
 const explicit=huntVisibleNeutralMatrix({
  attackerPlans:['heavy'],defenderPlans:['hold'],
  delays:[4],arenaSides:['center'],distances:[85]
 });
 assert.deepEqual(explicit,baseline);
 assert.equal(baseline.length,16); // 2 weapons × 2 weapons × 2 forms × 2 slots
 assert(baseline.every(row=>row.distance===85));
 for(const invalid of [[],[37],[251],[NaN],[Infinity],['85']])
  assert.throws(()=>huntVisibleNeutralMatrix({
   attackerPlans:['heavy'],defenderPlans:['hold'],
   delays:[4],distances:invalid
  }),TypeError,'invalid distance grids must not enter frame-accurate analysis');
});

test('a folded R2 can physically miss while the same opponent is struck by an unfurled R2 at the same distance',()=>{
 for(const defenderSlot of [0,1])
  for(const arenaSide of ['center','left','right']){
   const params={attackerWeapon:'mournweave',defenderWeapon:'thornwake',
    attackerPlan:'heavy',defenderPlan:'hold',distance:170,
    defenderSlot,arenaSide,perceptionDelay:4};
   const folded=huntVisibleNeutralTrial({...params,attackerForm:'folded'});
   const unfurled=huntVisibleNeutralTrial({...params,attackerForm:'unfurled'});
   assert.equal(folded.defenderHp,100,
    'a 170U committed folded heavy should not invent extra reach');
   assert(unfurled.defenderHp<100,
    'the real extended weapon must reach a target at 170U');
   assert.equal(folded.perceivedAt,1);
   assert.equal(unfurled.perceivedAt,1);
  }
});

test('all three tested spacings, both corners, weapons/forms and slots retain mirrored combat outcomes',()=>{
 const rows=huntVisibleNeutralMatrix({
  attackerPlans:['heavy','feint','shot'],
  defenderPlans:['counterpoke','firearm','quickstep'],
  delays:[4,12],arenaSides:['center','left','right'],
  distances:[45,145,215]
 });
 assert.equal(rows.length,2592);
 const pairs=new Map();
 for(const row of rows){
  assert([45,145,215].includes(row.distance));
  assert.equal(row.perceivedAt,1);
  assert(row.submittedAt>row.perceivedAt);
  assert.equal(row.attackerOpened,true);
  const key=[
   row.attackerWeapon,row.defenderWeapon,row.attackerForm,row.attackerPlan,
   row.defenderPlan,row.perceptionDelay,row.arenaSide,row.distance
  ].join('|');
  const slots=pairs.get(key)??[];
  slots[row.defenderSlot]=row;
  pairs.set(key,slots);
 }
 assert.equal(pairs.size,1296);
 for(const pair of pairs.values()){
  assert.equal(pair.length,2);
  for(const key of ['category','firstCue','perceivedAt','submittedAt',
    'realGunParry','recoveryPunish','startupInterrupt',
    'defenderMeleeHit','enemyMeleeHit','defenderHp','attackerHp',
    'attackerFeinted','cornerEscaped'])
   assert.deepEqual(pair[0][key],pair[1][key],
    'slot asymmetry across real spacing and walls: '+key);
 }
});

test('distance is not a magic punish classification: far committed whiffs may leave no reachable counter',()=>{
 const near=huntVisibleNeutralTrial({
  attackerPlan:'heavy',attackerForm:'folded',
  defenderPlan:'hold',distance:45
 });
 const far=huntVisibleNeutralTrial({
  attackerPlan:'heavy',attackerForm:'folded',
  defenderPlan:'hold',distance:215
 });
 assert(near.defenderHp<far.defenderHp,
  'real proximity should expose the defender to a committed R2');
 assert.equal(far.defenderHp,100);
 assert.equal(far.defenderMeleeHit,false);
 assert.equal(far.recoveryPunish,false);
});
