import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntFullWhiffTrial
} from '../scripts/hunt-whiff-from-neutral.mjs';
import {
 HUNT_WEAPONS,HUNT_FORMS,huntStep,
} from '../public/side-hunt-lab.mjs';
import {
 HUNT_CAPTURE_SCHEMA,loadHuntReplay,huntReplayFingerprint
} from '../public/side-hunt-replay.mjs';

test('full no-guard footsies produces an independently verified 60Hz replay, not just claimed whiff results',()=>{
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const defenderSlot of [0,1])
     for(const arenaSide of ['center','left','right']){
      const r=huntFullWhiffTrial({attackerWeapon,defenderWeapon,
       attackerForm,defenderSlot,arenaSide,recordReplay:true,
       approach:'postWhiffWalk',answer:'light',responseDelay:5,
       frames:85});
      const c=r.replayCapture;
      assert.equal(c.schema,HUNT_CAPTURE_SCHEMA);
      assert.equal(c.rules,r.rules);
      assert.equal(c.frames.length,85);
      assert.equal(c.finalTick,85);
      assert.equal(c.fingerprint,r.finalFingerprint);
      assert(!Object.hasOwn(c,'userId')&&!Object.hasOwn(c,'rank'),
       'offline training tape never discloses an online identity');
      assert.equal(c.frames[0][1-defenderSlot].act,'heavy',
       'opponent actually begins R2 on frame zero of the input tape');
      assert(r.realR2Whiff,'this safe spacing must produce actual missed swing');
      const loaded=loadHuntReplay(c,{checkpointEvery:15});
      assert.equal(loaded.stats().endTick,85);
      assert.equal(loaded.stats().fingerprint,c.fingerprint);
      const end=loaded.getState();
      assert.equal(huntReplayFingerprint(end),r.finalFingerprint);
      assert.equal(end.p[defenderSlot].hp,r.defenderHp);
      assert.equal(end.p[1-defenderSlot].hp,r.attackerHp);
      for(const tick of [0,1,r.whiffTick,45,85]){
       assert.equal(loaded.stateAt(tick).tick,tick,
        'seek and exact 60Hz input replay must reach requested tick');
      }
      // Re-simulate the frozen recorded inputs independently from state
      // WITHOUT access to the oracle that reported 'whiffTick'.
      const state=structuredClone(c.startState),events=[];
      for(const pair of c.frames)huntStep(state,pair,events);
      assert.equal(huntReplayFingerprint(state),c.fingerprint);
      assert.equal(events.find(e=>e.kind==='whiff'&&
       e.actor===1-defenderSlot&&
       e.move===attackerForm+'Heavy')?.tick,r.whiffTick);
      assert.equal(events.some(e=>e.kind==='gunParry'&&
       e.actor===defenderSlot),r.gunParry);
      assert.equal(events.filter(e=>e.kind==='cornerEscape'&&
       e.actor===defenderSlot).length,r.cornerEscapes);
     }
});

test('different read delays, shot versus step, hit versus true miss all survive capture roundtrip',()=>{
 for(const answer of ['light','shot','step'])
  for(const responseDelay of [0,5,12,20])
   for(const approach of ['hold','precommitWalk']){
    const r=huntFullWhiffTrial({recordReplay:true,answer,
     responseDelay,approach,attackerWeapon:'thornwake',
     attackerForm:'unfurled',attackerHeavy:'Charged',frames:115});
    const restored=loadHuntReplay(r.replayCapture);
    assert.equal(restored.stats().fingerprint,r.finalFingerprint);
    const tape=r.replayCapture.frames;
    const challengerSlot=0;
    const firstInputIndex=tape.findIndex(pair=>pair[challengerSlot].act===answer);
    if(r.realR2Whiff)
     assert.equal(firstInputIndex+1,r.answerRequestedTick,
      'only actual prior source whiff may unlock delayed response command');
    else
     assert.equal(firstInputIndex,-1,
      'real R2 contact cannot trigger a nonexistent missed-swing reaction');
   }
});

test('offline recorded neutral supports independent replay takeover without altering recorded whiff',()=>{
 const r=huntFullWhiffTrial({recordReplay:true,frames:95});
 const saved=structuredClone(r.replayCapture);
 const original=loadHuntReplay(saved);
 const before=original.stats().fingerprint;
 const branch=original.fork(r.whiffTick);
 assert.equal(branch.stats().endTick,r.whiffTick);
 branch.append([{act:'light',x:1,y:0,guard:false},
                {act:'',x:0,y:0,guard:false}]);
 assert.equal(original.stats().fingerprint,before,
  'takeover must not mutate the archived neutral recording');
 assert.equal(saved.fingerprint,before);
 const tampered=structuredClone(saved);
 tampered.frames[0][1].act='light';
 assert.throws(()=>loadHuntReplay(tampered),
  /diverged|fingerprint|mismatch/i,
  'source commands cannot be silently edited and still pass fingerprint check');
});

test('recording is opt-in and never mutates production/realtime rules or creates phantom awards',()=>{
 const without=huntFullWhiffTrial();
 const withReplay=huntFullWhiffTrial({recordReplay:true});
 assert.equal(without.finalFingerprint,withReplay.finalFingerprint);
 assert.equal(without.category,withReplay.category);
 assert.equal(without.whiffTick,withReplay.whiffTick);
 assert(!Object.hasOwn(without,'replayCapture'));
 assert.equal(withReplay.replayCapture.fingerprint,without.finalFingerprint);
 assert.throws(()=>huntFullWhiffTrial({recordReplay:'true'}),TypeError);
});
