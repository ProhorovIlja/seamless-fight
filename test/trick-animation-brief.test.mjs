import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRICK_HZ,TRICK_RULESET,TRICK_WEAPONS,trickFrameTable}
 from '../public/side-trick-lab.mjs';
import {TRICK_ANIMATION_BRIEF_SCHEMA,buildTrickAnimationBrief}
 from '../tools/art/export-trick-animation-brief.mjs';

test('3D art shot list derives every action from the exact deterministic ruleset',()=>{
 const brief=buildTrickAnimationBrief();
 assert.equal(brief.schema,TRICK_ANIMATION_BRIEF_SCHEMA);
 assert.equal(brief.ruleset,TRICK_RULESET);
 assert.equal(brief.fps,TRICK_HZ);
 assert.deepEqual(Object.keys(brief.weapons),TRICK_WEAPONS);
 for(const weapon of TRICK_WEAPONS){
  const expected=trickFrameTable(weapon);
  assert.deepEqual(Object.keys(brief.weapons[weapon].clips),expected.map(m=>m.name));
  for(const m of expected){
   const c=brief.weapons[weapon].clips[m.name];
   const t=c.timing;
   assert.equal(t.totalFrames,m.startup+m.active+m.recovery);
   assert.equal(t.startupFrames,m.startup);
   assert.equal(t.activeFrames,m.active);
   assert.equal(t.recoveryFrames,m.recovery);
   assert.equal(t.simulationFps,60);
   assert.equal(c.gameplayEnvelope.reachWorldUnits,m.reach);
   assert.equal(t.activeStartAge,m.damage>0?m.startup:null);
   assert.equal(t.activeEndAgeExclusive,m.damage>0?m.startup+m.active:null);
   assert.equal(c.visualRequirements.animationNeverDefinesCollisions,true);
   assert(!c.clipId.includes('Bloodborne')&&!c.clipId.includes('DMC'));
  }
 }
});
test('both transformations name the real gameplay form-swap age and required grip geometry',()=>{
 const brief=buildTrickAnimationBrief();
 for(const [weapon,entry] of Object.entries(brief.weapons)){
  for(const [name,before,after] of [
   ['unfurl','folded','unfurled'],['refold','unfurled','folded'],
   ['shiftOut','folded','unfurled'],['shiftIn','unfurled','folded']
  ]){
   const c=entry.clips[name],m=trickFrameTable(weapon).find(x=>x.name===name);
   assert.equal(c.initialForm,before);
   assert.equal(c.finalForm,after);
   assert.equal(c.timing.formSwitchAge,m.startup-1);
   assert.equal(c.visualRequirements.explicitGripAndWeaponGeometry,true);
  }
  assert.equal(entry.clips.airUnfurledHeavy.initialForm,'unfurled');
  assert.equal(entry.clips.airFoldedLight.initialForm,'folded');
  assert.equal(entry.clips.step.initialForm,'either');
 }
});
test('art metadata export is repeatable and independent of fight state and presentation',()=>{
 const first=JSON.stringify(buildTrickAnimationBrief());
 const second=JSON.stringify(buildTrickAnimationBrief());
 assert.equal(first,second);
 assert.equal(JSON.parse(first).ruleset,'sf-trick-lab/3');
});
