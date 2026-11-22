import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntVisibleCueView,huntVisibleNeutralTrial,huntVisibleNeutralMatrix,
 HUNT_VISIBLE_THREATS,HUNT_VISIBLE_DEFENSES,HUNT_VISIBLE_DELAYS
} from '../scripts/hunt-visible-neutral-policy.mjs';
import {HUNT_WEAPONS,HUNT_FORMS,huntMatch} from '../public/side-hunt-lab.mjs';
import {loadHuntReplay,huntReplayFingerprint} from '../public/side-hunt-replay.mjs';

test('the simulated defender sees ONLY visible animation, form, facing and location — never game-rule or future state',()=>{
 const s=huntMatch();s.ready=0;
 const observed=huntVisibleCueView(s,0);
 assert.deepEqual(Object.keys(observed),[
  'tick','ownX','ownY','ownFacing','enemyX','enemyY',
  'enemyFacing','enemyForm','enemyAnimation','enemyGrounded'
 ]);
 for(const privateField of ['age','startup','recovery','queue','hitConfirmed',
  'spent','ammo','hp','st','exposed','parryable','punishedRecovery',
  'whiff','reaction','opponentInputs','remainingRecovery'])
  assert(!Object.hasOwn(observed,privateField),
   'no privileged source-only information: '+privateField);
 assert(Object.isFrozen(observed));
 assert.deepEqual(HUNT_VISIBLE_DELAYS,[0,4,8,12]);
 assert.deepEqual(HUNT_VISIBLE_DEFENSES,
  ['hold','counterpoke','firearm','quickstep','backstep']);
 assert(HUNT_VISIBLE_THREATS.includes('feint'));
});

test('800 neutral cases record real animation-telegraph replies only AFTER the first rendered action',()=>{
 const rows=huntVisibleNeutralMatrix();
 assert.equal(rows.length,2*2*2*2*5*5*4);
 for(const row of rows){
  assert.equal(row.schema,'sf-hunt-visible-neutral/1');
  assert.equal(row.hz,60);
  assert.equal(row.attackerOpened,true);
  assert.equal(row.perceivedAt,1);
  assert(row.firstCue!=='','real displayed animation must be observed');
  if(row.defenderPlan==='hold')assert.equal(row.submittedAt,null);
  else assert.equal(row.submittedAt,
   row.perceivedAt+row.perceptionDelay+1,
   'input cannot be submitted on the same frame as unseen opponent input');
  assert.equal(row.recoveryPunish,row.confirmedWhiffPunishes>0);
  assert.equal(row.recoveryPhaseContact,row.recoveryPhaseContacts>0);
  assert.equal(row.confirmedWhiffPunishes+row.unconfirmedRecoveryContacts,
   row.recoveryPhaseContacts);
  assert(row.confirmedWhiffPunishes<=row.recoveryPhaseContacts);
  if(row.category==='realRecoveryPunish')
   assert(row.recoveryPunish,'a TRUE source whiff must precede recovery contact');
  if(row.category==='recoveryContactNoProvenWhiff')
   assert(row.recoveryPhaseContact&&!row.recoveryPunish);
  if(row.realGunParry)assert.equal(row.defenderPlan,'firearm');
  if(row.cornerEscaped)assert.equal(row.defenderPlan,'quickstep');
  if(row.category==='realRecoveryPunish'||row.category==='realStartupInterrupt')
   assert.equal(row.defenderMeleeHit,true);
  assert(!Object.hasOwn(row,'sourceEvents'),
   'compact matrix reports cannot fabricate simulated events');
  assert(!Object.hasOwn(row,'replayCapture'));
 }
 const bySlot=5*5*4;
 for(let i=0;i<rows.length;i+=2*bySlot){
  for(let j=0;j<bySlot;j++){
   const first=rows[i+j],second=rows[i+bySlot+j];
   assert.equal(first.defenderSlot,0);
   assert.equal(second.defenderSlot,1);
   for(const field of ['category','firstCue','perceivedAt','submittedAt',
    'attackerFeinted','realGunParry','recoveryPunish',
    'recoveryPhaseContact','confirmedWhiffPunishes',
    'recoveryPhaseContacts','unconfirmedRecoveryContacts',
    'startupInterrupt','defenderMeleeHit','enemyMeleeHit',
    'defenderHp','attackerHp','cornerEscaped'])
    assert.deepEqual(first[field],second[field],
     'first-versus-second player unfairness '+field+' '+JSON.stringify(first));
  }
 }
});

test('visible committed R2 versus feinted R2 share the SAME initial cue but differ in true gun-parry risk',()=>{
 let realParries=0,feints=0;
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const defenderSlot of [0,1]){
    const props={attackerWeapon,defenderWeapon,defenderSlot,
     attackerForm:'folded',defenderPlan:'firearm',perceptionDelay:4};
    const heavy=huntVisibleNeutralTrial({...props,attackerPlan:'heavy'});
    const feint=huntVisibleNeutralTrial({...props,attackerPlan:'feint'});
    assert.equal(heavy.firstCue,feint.firstCue,
     'a defender cannot know in advance that a committed R2 will be feinted');
    assert.equal(heavy.perceivedAt,feint.perceivedAt);
    assert.equal(heavy.submittedAt,feint.submittedAt);
    assert.equal(feint.attackerFeinted,true,
     'a feint must really pass the combat core authored start window');
    if(heavy.realGunParry)realParries++;
    if(!feint.realGunParry)feints++;
    assert.equal(feint.realGunParry,false,
     'committed R2 has disappeared when the reactive gun bullet resolves');
   }
 assert(realParries>0,'true heavy gun vulnerability exists at readable timing');
 assert.equal(feints,8);
});

test('idle opponent gives no magical visual cue and cannot activate a response policy',()=>{
 for(const defenderPlan of HUNT_VISIBLE_DEFENSES)
  for(const perceptionDelay of [0,4,12]){
   const trial=huntVisibleNeutralTrial({
    attackerPlan:'idle',defenderPlan,perceptionDelay
   });
   assert.equal(trial.perceivedAt,null);
   assert.equal(trial.firstCue,'');
   assert.equal(trial.submittedAt,null);
   assert.equal(trial.attackerOpened,false);
   assert.equal(trial.realGunParry,false);
  }
});

test('real LEFT and RIGHT wall geometry resolves the same set of human-visible choices',()=>{
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const attackerForm of HUNT_FORMS)
   for(const defenderSlot of [0,1])
    for(const attackerPlan of ['heavy','charged','feint','shot','light'])
     for(const defenderPlan of HUNT_VISIBLE_DEFENSES){
      const props={attackerWeapon,attackerForm,defenderSlot,
       attackerPlan,defenderPlan,perceptionDelay:8};
      const left=huntVisibleNeutralTrial({...props,arenaSide:'left'});
      const right=huntVisibleNeutralTrial({...props,arenaSide:'right'});
      for(const field of ['category','firstCue','perceivedAt','submittedAt',
       'realGunParry','attackerFeinted','recoveryPunish',
       'recoveryPhaseContact','confirmedWhiffPunishes',
       'recoveryPhaseContacts','unconfirmedRecoveryContacts',
       'startupInterrupt','defenderMeleeHit','enemyMeleeHit','defenderHp','attackerHp',
       'cornerEscaped'])
       assert.deepEqual(left[field],right[field],
        'actual arena wall orientation unfairness '+field+' '+JSON.stringify(props));
     }
});

test('full opponent program and defender response are recorded as real input tapes',()=>{
 for(const attackerPlan of ['heavy','charged','feint','shot','light','idle'])
  for(const defenderPlan of ['hold','counterpoke','firearm','quickstep','backstep']){
   const trial=huntVisibleNeutralTrial({
    attackerPlan,defenderPlan,recordReplay:true,
    perceptionDelay:8,arenaSide:'left'
   });
   const replay=loadHuntReplay(trial.replayCapture);
   assert.equal(replay.stats().fingerprint,trial.finalFingerprint);
   assert.equal(huntReplayFingerprint(replay.getState()),trial.finalFingerprint);
   assert.equal(trial.replayCapture.finalTick,85);
   assert.equal(trial.replayCapture.frames.length,85);
   if(trial.submittedAt!==null){
    const input=trial.replayCapture.frames[trial.submittedAt-1][0];
    assert.equal(input.act,defenderPlan==='counterpoke'?'light':
     defenderPlan==='firearm'?'shot':'step');
   }
  }
});

test('the study refuses block/throw/air-step, private moves or invalid render timing',()=>{
 for(const invalid of [
  {attackerPlan:'mixup-high'},{defenderPlan:'block'},
  {defenderPlan:'grab'},{defenderPlan:'airStep'},
  {defenderPlan:'throw'},{defenderSlot:2},
  {distance:10},{perceptionDelay:-1},{perceptionDelay:32},
  {arenaSide:'air'},{attackerForm:'crouch'}, {frames:30},
  {recordReplay:'yes'}
 ])assert.throws(()=>huntVisibleNeutralTrial(invalid),TypeError);
 assert.throws(()=>huntVisibleNeutralMatrix({attackerPlans:['grab']}),TypeError);
 assert.throws(()=>huntVisibleNeutralMatrix({defenderPlans:['guard']}),TypeError);
 assert.throws(()=>huntVisibleNeutralMatrix({delays:[-1]}),TypeError);
 assert.throws(()=>huntVisibleNeutralMatrix({arenaSides:['offstage']}),TypeError);
});
