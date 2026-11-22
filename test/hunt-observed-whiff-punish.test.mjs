import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntObservedWhiffTrial,huntObservedWhiffMatrix,HUNT_OBSERVED_WHIFF_SCHEMA
} from '../scripts/hunt-observed-whiff-punish.mjs';
import {loadHuntReplay} from '../public/side-hunt-replay.mjs';

test('visible recovery timing allows a REAL confirmed melee whiff punish without a source-whiff oracle',()=>{
 const r=huntObservedWhiffTrial({
  attackerWeapon:'mournweave',defenderWeapon:'thornwake',
  attackerForm:'folded',defenderForm:'unfurled',
  attackerPlan:'heavy',defenderPlan:'light',
  gap:35,approach:'hold',arenaSide:'left',reactionDelay:0,
  recordReplay:true
 });
 assert.equal(r.schema,HUNT_OBSERVED_WHIFF_SCHEMA);
 assert.equal(r.hz,60);
 assert.equal(r.firstCueTick,1);
 assert.equal(r.predictedRecoveryTick,1+17+6,
  'only pre-authored/public animation duration predicts first recovery frame');
 assert.equal(r.responseRequestedTick,r.predictedRecoveryTick+1);
 assert.equal(r.sawFeint,false,'ordinary return to neutral must not look like a visible feint');
 assert.equal(r.sourceWhiff,true,'committed R2 must actually miss the target');
 assert.equal(r.sourceAttackHit,false);
 assert.equal(r.realRecoveryPunish,true,
  'fast extended R1 contact must actually land during the old R2 recovery');
 assert.equal(r.category,'realVisibleRecoveryPunish');
 assert(r.sourceEvents.some(e=>e.kind==='whiff'&&e.actor===1));
 assert(r.sourceEvents.some(e=>e.kind==='hit'&&e.actor===0&&
  e.target===1&&e.punishedRecovery&&e.remainingRecovery>0));
 assert.equal(r.replayCapture.fingerprint,r.finalFingerprint);
 assert.deepEqual(loadHuntReplay(r.replayCapture).getState().p[0].hp,r.defenderHp);
});

test('waiting beyond reachable recovery cannot manufacture a whiff punish',()=>{
 const configs=[
  {gap:100,reactionDelay:0},
  {gap:35,reactionDelay:12}
 ];
 for(const extra of configs){
  const r=huntObservedWhiffTrial({
   attackerWeapon:'mournweave',defenderWeapon:'thornwake',
   attackerForm:'folded',defenderForm:'unfurled',
   attackerPlan:'heavy',defenderPlan:'light',
   arenaSide:'left',approach:'hold',...extra
  });
  assert.equal(r.sourceWhiff,true);
  assert.equal(r.realRecoveryPunish,false,
   'unreachable/late responses are not automatically granted free damage');
 }
});

test('feint of a displayed R2 invalidates the planned recovery timing',()=>{
 for(const wall of ['left','right']){
  const r=huntObservedWhiffTrial({
   attackerPlan:'feint-heavy',defenderPlan:'light',
   arenaSide:wall,gap:35,approach:'hold'
  });
  assert.equal(r.actualFeint,true);
  assert.equal(r.sawFeint,true);
  assert.equal(r.realRecoveryPunish,false);
  assert.equal(r.responseRequestedTick,null,
   'script may not use a predicted recovery after the opponent visibly feinted');
 }
});

test('reaction matrices preserve mirror fairness for wall direction and player slot',()=>{
 const rows=huntObservedWhiffMatrix({
  attackerPlans:['heavy','feint-heavy'],
  defenderPlans:['light','shot','quickstep'],
  gaps:[35,65],approaches:['hold','afterActive'],
  delays:[0,8],arenaSides:['left','right']
 });
 assert.equal(rows.length,2*2*2*2*2*2*2*2*3*2*2);
 const groups=new Map();
 for(const r of rows){
  assert(r.firstCueTick===1);
  assert.equal(r.category==='realVisibleRecoveryPunish',r.realRecoveryPunish);
  if(r.realRecoveryPunish)assert(r.sourceWhiff);
  if(r.actualFeint)assert(!r.realRecoveryPunish);
  const key=[r.attackerWeapon,r.defenderWeapon,r.attackerForm,
   r.defenderForm,r.attackerPlan,r.defenderPlan,r.gap,r.approach,
   r.reactionDelay].join(':');
  const pair=groups.get(key)??[];
  pair.push(r);groups.set(key,pair);
 }
 assert.equal(groups.size,2*2*2*2*2*3*2*2*2);
 for(const group of groups.values()){
  assert.equal(group.length,4);
  const baseline=group[0];
  for(const row of group.slice(1))
   for(const key of ['category','sourceWhiff','sourceAttackHit',
    'realRecoveryPunish','firstCueTick','predictedRecoveryTick',
    'responseRequestedTick','defenderHp','attackerHp'])
    assert.deepEqual(row[key],baseline[key],
     'left/right or P1/P2 directional bias on '+key);
 }
 assert(rows.some(r=>r.realRecoveryPunish));
 assert(rows.some(r=>r.sourceAttackHit===false&&
  r.sourceWhiff===true&&r.realRecoveryPunish===false));
});

test('physical risk: approaching into a live heavy is not misclassified as a recovery punish',()=>{
 const r=huntObservedWhiffTrial({
  attackerWeapon:'mournweave',defenderWeapon:'thornwake',
  attackerForm:'folded',defenderForm:'unfurled',
  arenaSide:'left',attackerPlan:'heavy',
  defenderPlan:'light',approach:'duringWindup',gap:35
 });
 assert.equal(r.sourceAttackHit,true,
  'walking into a heavy hitbox before its active frames is dangerous');
 assert.equal(r.realRecoveryPunish,false);
 assert.equal(r.category,'enteredThreatHitbox');
});

test('the experiment cannot accept guard/grab, impossible spacings, negative latency or forged action names',()=>{
 assert.throws(()=>huntObservedWhiffTrial({defenderPlan:'block'}),TypeError);
 assert.throws(()=>huntObservedWhiffTrial({defenderPlan:'grab'}),TypeError);
 assert.throws(()=>huntObservedWhiffTrial({gap:Infinity}),TypeError);
 assert.throws(()=>huntObservedWhiffTrial({reactionDelay:-1}),TypeError);
 assert.throws(()=>huntObservedWhiffTrial({arenaSide:'ceiling'}),TypeError);
 assert.throws(()=>huntObservedWhiffMatrix({attackerPlans:['teleport']}),TypeError);
 assert.throws(()=>huntObservedWhiffMatrix({delays:[-4]}),TypeError);
});
