import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntMatch,huntInput,huntStep,HUNT_MOVES
} from '../public/side-hunt-lab.mjs';
import {createHuntReplay} from '../public/side-hunt-replay.mjs';
import {analyzeHuntReplay} from '../public/hunt-match-analytics.mjs';
import {huntObservedWhiffTrial} from '../scripts/hunt-observed-whiff-punish.mjs';

test('confirmed R2 whiff punish requires a real prior source miss and contact during its recovery',()=>{
 for(const arenaSide of ['left','right'])
  for(const defenderSlot of [0,1]){
   const trial=huntObservedWhiffTrial({
    attackerWeapon:'mournweave',defenderWeapon:'thornwake',
    attackerForm:'folded',defenderForm:'unfurled',
    defenderSlot,arenaSide,gap:35,approach:'hold',
    defenderPlan:'light',recordReplay:true
   });
   assert.equal(trial.realRecoveryPunish,true);
   assert.equal(trial.sourceWhiff,true);
   const metrics=analyzeHuntReplay(trial.replayCapture);
   const p=metrics.players[defenderSlot];
   assert.equal(p.confirmedWhiffRecoveryPunishes,1,
    'must record the actual R2 whiff followed by the physical recovery hit');
   assert.equal(p.confirmedGunWhiffRecoveryPunishes,0);
   assert(p.recoveryPunishes>=1);
   assert.equal(metrics.players[1-defenderSlot].confirmedWhiffRecoveryPunishes,0);
   assert.equal(metrics.offlineReplayIntegrityChecked,true);
  }
});

test('passive, unreachable and delayed responses cannot manufacture a whiff punish in metrics',()=>{
 for(const plan of [
  {defenderPlan:'hold',gap:35,reactionDelay:0},
  {defenderPlan:'light',gap:100,defenderForm:'folded',reactionDelay:0},
  {defenderPlan:'light',gap:35,reactionDelay:12}
 ]){
  const r=huntObservedWhiffTrial({
   attackerWeapon:'mournweave',defenderWeapon:'thornwake',
   attackerForm:'folded',defenderForm:'unfurled',
   arenaSide:'left',approach:'hold',...plan,recordReplay:true
  });
  assert.equal(r.sourceWhiff,true);
  assert.equal(r.realRecoveryPunish,false);
  const p=analyzeHuntReplay(r.replayCapture).players[0];
  assert.equal(p.confirmedWhiffRecoveryPunishes,0);
  assert.equal(p.confirmedGunWhiffRecoveryPunishes,0);
 }
});

test('recovery-seeded single-frame hit is not automatically source-confirmed whiff punishment',()=>{
 const s=huntMatch();s.ready=0;
 s.p[0].x=420;s.p[0].act='foldedLight';
 s.p[0].age=HUNT_MOVES.foldedLight.startup;
 s.p[1].x=463;s.p[1].act='foldedHeavy';
 s.p[1].age=HUNT_MOVES.foldedHeavy.startup+HUNT_MOVES.foldedHeavy.active+1;
 s.p[1].spent=false;
 const tape=createHuntReplay({initialState:s});
 tape.append([huntInput(),huntInput()]);
 const p=analyzeHuntReplay(tape.capture()).players[0];
 assert.equal(p.recoveryPunishes,1,
  'hit against a recovering body is still a valid phase-based recovery hit');
 assert.equal(p.confirmedWhiffRecoveryPunishes,0,
  'the imported one-frame replay never observed the earlier missed attack');
});

test('same source gun whiff can be confirmed as a firearm recovery punish without a fabricated parry',()=>{
 const s=huntMatch();s.ready=0;
 const hunter=s.p[0],gunner=s.p[1];
 hunter.x=420;hunter.dir=1;
 gunner.x=500;gunner.dir=1; // deliberately fires AWAY from hunter
 hunter.act='foldedLight';hunter.age=HUNT_MOVES.foldedLight.startup-1;
 gunner.act='shot';gunner.age=HUNT_MOVES.shot.startup;
 gunner.ammo=6;
 const tape=createHuntReplay({initialState:s});
 tape.append([huntInput(),huntInput()]);
 tape.append([huntInput(),huntInput()]);
 const p=analyzeHuntReplay(tape.capture()).players[0];
 assert.equal(p.confirmedWhiffRecoveryPunishes,1);
 assert.equal(p.confirmedGunWhiffRecoveryPunishes,1);
 assert.equal(p.firearmRecoveryPunishes,1);
 assert.equal(p.firearmParries,0);
});
