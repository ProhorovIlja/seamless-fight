import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HUNT_HZ,HUNT_RULESET,HUNT_WEAPONS,huntFrameTable}
 from '../public/side-hunt-lab.mjs';
import {HUNT_ANIMATION_BRIEF_SCHEMA,buildHuntAnimationBrief}
 from '../tools/art/export-hunt-animation-brief.mjs';

test('Hunt 3D animation shot list is exact to the native-port candidate 60Hz source action data',()=>{
 const brief=buildHuntAnimationBrief();
 assert.equal(brief.schema,HUNT_ANIMATION_BRIEF_SCHEMA);
 assert.equal(brief.ruleset,HUNT_RULESET);
 assert.equal(brief.fps,60);
 assert.equal(HUNT_HZ,60);
 assert.deepEqual(Object.keys(brief.weapons),HUNT_WEAPONS);
 assert.equal(brief.aerialDodge,'unavailable');
 assert(!brief.mandatoryAbilities.includes('airStep'));
 assert.match(brief.normalHitstunEscape,/grounded quickstep/);
 for(const weapon of HUNT_WEAPONS){
  const table=huntFrameTable(weapon),clips=brief.weapons[weapon].clips;
  assert.deepEqual(Object.keys(clips),table.map(row=>row.name));
  assert(!('guardBreak' in clips),'no nonexistent conventional block-break attacks');
  for(const row of table){
   const m=clips[row.name];
   assert.equal(m.clipId,weapon+'/'+row.name);
   assert.equal(m.timing.startupFrames,row.startup);
   assert.equal(m.timing.activeFrames,row.active);
   assert.equal(m.timing.recoveryFrames,row.recovery);
   assert.equal(m.timing.totalFrames,row.totalFrames);
   assert.equal(m.timing.simulationFps,60);
   assert.equal(m.gameplayEnvelope.staminaCost,row.cost);
   assert.equal(m.gameplayEnvelope.reachWorldUnits,row.reach);
   assert.equal(m.gameplayEnvelope.damage,row.damage);
   assert.equal(m.visualRequirements.animationNeverDefinesCollisions,true);
  }
 }
});

test('firearm/parry, visceral, blood, heal, stagger and charged heavy demand real authored 3D performances',()=>{
 const brief=buildHuntAnimationBrief();
 const c=brief.weapons.mournweave.clips;
 assert.equal(c.airShot.category,'aerial-firearm-parry');
 assert.equal(c.airShot.visualRequirements.readableFirearmMuzzleAndCounterTiming,true);
 assert.equal(c.shot.category,'firearm-parry');
 assert.equal(c.visceral.category,'visceral-actor');
 assert.equal(c.visceralVictim.category,'visceral-victim');
 assert.equal(c.visceralVictim.visualRequirements.authored3DVisceralPartnerChoreography,true);
 assert.equal(c.stagger.category,'parried-stagger');
 assert.equal(c.blood.category,'blood-ammo-ritual');
 assert.equal(c.blood.visualRequirements.groundedUtility,true);
 assert.equal(c.heal.category,'vial-heal');
 assert.equal(c.foldedCharged.category,'ground-charged-heavy');
 assert.equal(c.unfurledCharged.category,'ground-charged-heavy');
 assert.equal(c.airStep,undefined,'no authored aerial dodge clip');
 assert.equal(c.unfurl.timing.formSwitchAge,c.unfurl.timing.startupFrames-1);
 assert.equal(c.refold.timing.formSwitchAge,c.refold.timing.startupFrames-1);
 assert(!brief.mandatoryAbilities.includes('doubleJump'));
 assert(!brief.mandatoryAbilities.includes('block'));
 assert(!brief.mandatoryAbilities.includes('grab'));
});

test('Hunt art timeline export is stable and independent of frame pacing',()=>{
 const a=JSON.stringify(buildHuntAnimationBrief());
 const b=JSON.stringify(buildHuntAnimationBrief());
 assert.equal(a,b);
 assert.equal(JSON.parse(a).ruleset,'sf-hunt-lab/3');
});
