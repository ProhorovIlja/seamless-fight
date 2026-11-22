import test from 'node:test';
import assert from 'node:assert/strict';
import {huntFullWhiffTrial} from '../scripts/hunt-whiff-from-neutral.mjs';
import {
 huntRecordedNeutralTakeover,HUNT_TAKEOVER_ANSWERS
} from '../scripts/hunt-neutral-takeover.mjs';
import {loadHuntReplay} from '../public/side-hunt-replay.mjs';
import {HUNT_WEAPONS,HUNT_FORMS} from '../public/side-hunt-lab.mjs';

test('true R2 whiff replay takeover re-creates identical original timeline when answering identically',()=>{
 for(const weapon of HUNT_WEAPONS)
  for(const form of HUNT_FORMS)
   for(const defenderSlot of [0,1])
    for(const side of ['center','left','right'])
     for(const answer of HUNT_TAKEOVER_ANSWERS){
      const recorded=huntFullWhiffTrial({
       attackerWeapon:weapon,defenderWeapon:weapon,
       attackerForm:form,attackerHeavy:'Heavy',
       defenderSlot,arenaSide:side,
       answer,responseDelay:5,approach:'postWhiffWalk',
       recordReplay:true,frames:90
      });
      assert.equal(recorded.realR2Whiff,true);
      const branched=huntRecordedNeutralTakeover(recorded,{
       answer,responseDelay:5
      });
      assert.equal(branched.originalReplayUnaffected,true);
      assert.equal(branched.sourceWhiffTick,recorded.whiffTick);
      assert.equal(branched.replayFingerprint,recorded.finalFingerprint,
       'same authored command tape must remain byte-for-byte equivalent state');
      assert.equal(branched.originalFingerprint,recorded.finalFingerprint);
      assert.equal(loadHuntReplay(branched.replayCapture).stats().fingerprint,
       recorded.finalFingerprint);
      assert.equal(branched.replayCapture.startState.tick,recorded.whiffTick);
      assert.equal(branched.replayCapture.finalTick,90);
     }
});

test('alternate R1, shot and step are real independent takes of identical committed R2 history',()=>{
 for(const side of ['center','left','right']){
  const recorded=huntFullWhiffTrial({
   attackerWeapon:'thornwake',defenderWeapon:'mournweave',
   attackerForm:'unfurled',attackerHeavy:'Charged',
   defenderSlot:0,arenaSide:side,recordReplay:true,
   answer:'light',responseDelay:20,frames:120
  });
  const seen=new Set();
  for(const answer of HUNT_TAKEOVER_ANSWERS)
   for(const responseDelay of [0,5,12,20]){
    const r=huntRecordedNeutralTakeover(recorded,{answer,responseDelay});
    assert.equal(r.sourceWhiffTick,recorded.whiffTick);
    assert.equal(r.attemptedAtTick,recorded.whiffTick+responseDelay+1);
    assert.equal(r.originalReplayUnaffected,true);
    assert.equal(r.replayCapture.startState.tick,recorded.whiffTick);
    assert.equal(loadHuntReplay(r.replayCapture).stats().fingerprint,
     r.replayFingerprint);
    seen.add(r.replayFingerprint);
    if(r.gunParry)assert.equal(answer,'shot');
    if(r.actualWhiffRecoveryHit||r.actualTrickStartupInterrupt)
     assert.equal(r.defenderHit,true,
      'only actual melee contact can earn a punish classification');
    if(r.cornerEscape)assert.equal(answer,'step');
   }
  assert(seen.size>1,'different no-guard reads must actually branch source input states');
 }
});

test('replay takeover will not trust forged whiff metadata, modified inputs or fantasy combat options',()=>{
 const recorded=huntFullWhiffTrial({recordReplay:true,frames:90});
 assert.equal(recorded.realR2Whiff,true);
 const metadata={...recorded,whiffTick:recorded.whiffTick+1};
 assert.throws(()=>huntRecordedNeutralTakeover(metadata),TypeError,
  'a user-authored claimed whiff tick is not sufficient to earn a punish');
 const corrupted={...recorded,
  replayCapture:structuredClone(recorded.replayCapture)};
 corrupted.replayCapture.frames[0][1].act='light';
 assert.throws(()=>huntRecordedNeutralTakeover(corrupted),
  /diverged|mismatch|fingerprint/i,
  'tampering with previously recorded inputs must not pass deterministic replay');
 for(const answer of ['guard','grab','airStep','throw','crouch'])
  assert.throws(()=>huntRecordedNeutralTakeover(recorded,{answer}),TypeError);
 assert.throws(()=>huntRecordedNeutralTakeover(recorded,{responseDelay:-1}),TypeError);
 assert.throws(()=>huntRecordedNeutralTakeover(
  {...recorded,replayCapture:null}),TypeError);
});
