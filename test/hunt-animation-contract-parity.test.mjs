import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUNT_RULESET,HUNT_HZ,HUNT_WEAPONS,HUNT_WEAPON_SPECS}
 from '../public/side-hunt-lab.mjs';

// This manifest is the strict, original-art authoring contract for native 3D
// research. Never bypass rig acceptance by substituting dummy animations.
const manifest=JSON.parse(readFileSync(new URL(
 '../experiments/godot-native-4.7/assets/hunt_animation_manifest.json',
 import.meta.url),'utf8'));
const forbidden=new Set(['guard','guardBreak','grab','throw','airStep','airDash','doubleJump']);

test('original 3D rig contract contains exactly every playable Hunt action',()=>{
 assert.equal(manifest.schema,'sf-hunt-godot-clips/1');
 assert.equal(manifest.rules,HUNT_RULESET);
 assert.equal(manifest.hz,HUNT_HZ);
 assert.equal(manifest.clipsAreFinished,false);
 assert.equal(manifest.visualPhysicsPolicy,
  'read-only 60Hz confirmed simulation age; no collision through animation');
 assert.deepEqual(Object.keys(manifest.weapons).sort(),[...HUNT_WEAPONS].sort());
 assert.equal(new Set(manifest.shared).size,manifest.shared.length);
 assert.equal(manifest.shared.length,18);
 assert(manifest.shared.includes('retreat'),
  'backward footsies require their own animation, not a forward run played backwards');
 assert.equal(manifest.shared.includes('crouch'),false,
  'no-guard Hunt v3 has no crouch gameplay animation');
 for(const weapon of HUNT_WEAPONS){
  const spec=HUNT_WEAPON_SPECS[weapon];
  const records=manifest.weapons[weapon];
  const expectedNames=Object.keys(spec);
  const authorNames=records.map(r=>r.clip);
  assert.equal(new Set(authorNames).size,authorNames.length,weapon+' duplicate clip');
  assert.deepEqual(authorNames,expectedNames,weapon+' source action list drifted');
  assert.equal(records.length,28,weapon+' all authored actions required');
  assert.equal(manifest.shared.length+records.length,46);
  for(const name of authorNames)assert.equal(forbidden.has(name),false,
   weapon+' forbidden conventional-fighter action '+name);
 }
});

test('every original move has an exact 60Hz visual lifetime and genuine hit window',()=>{
 for(const weapon of HUNT_WEAPONS){
  for(const row of manifest.weapons[weapon]){
   const m=HUNT_WEAPON_SPECS[weapon][row.clip];
   const length=m.startup+m.active+m.recovery;
   assert.equal(row.startup,m.startup,weapon+':'+row.clip+' startup');
   assert.equal(row.active,m.active,weapon+':'+row.clip+' active');
   assert.equal(row.recovery,m.recovery,weapon+':'+row.clip+' recovery');
   assert.equal(row.frames,length,weapon+':'+row.clip+' duration');
   const damages=m.damage>0;
   assert.equal(row.activeStart,damages?m.startup:null,
    weapon+':'+row.clip+' hitbox begins');
   assert.equal(row.activeEnd,damages?m.startup+m.active:null,
    weapon+':'+row.clip+' hitbox ends');
   assert.equal(row.mustNeverDrivePhysics,true);
   assert.equal(typeof row.needsPairedPerformance,'boolean');
   assert.equal(row.frames>0,true);
  }
 }
});

test('backstep and R1 follow-up performances cannot silently disappear',()=>{
 for(const weapon of HUNT_WEAPONS){
  const clips=manifest.weapons[weapon].map(x=>x.clip);
  for(const name of ['backstep','foldedBackstepLight','unfurledBackstepLight']){
   assert(clips.includes(name),weapon+' '+name+' missing from required native rig');
  }
 }
});
