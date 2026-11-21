import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGodotHuntManifest,HUNT_SHARED_SHOTS,HUNT_GODOT_MANIFEST_SCHEMA}
 from '../tools/art/export-hunt-godot-manifest.mjs';
import {HUNT_HZ,HUNT_RULESET,HUNT_WEAPONS,huntFrameTable}
 from '../public/side-hunt-lab.mjs';
const artifact=JSON.parse(readFileSync(new URL('../experiments/godot-native-4.7/assets/hunt_animation_manifest.json',import.meta.url),'utf8'));
test('checked-in Godot v3 animation contract is exactly generated from authoritative source',()=>{
 const expected=buildGodotHuntManifest();
 assert.deepEqual(artifact,expected,'native Godot asset contract drift: regenerate from current fight rules');
 assert.equal(artifact.schema,HUNT_GODOT_MANIFEST_SCHEMA);
 assert.equal(artifact.rules,HUNT_RULESET);
 assert.equal(artifact.hz,HUNT_HZ);
 assert.equal(artifact.clipsAreFinished,false);
 assert.equal(artifact.shared.length,HUNT_SHARED_SHOTS.length);
});
test('native animation manifest requires authored performances for all 56 weapon action clips',()=>{
 let total=0;
 for(const weapon of HUNT_WEAPONS){
  const m=artifact.weapons[weapon],table=huntFrameTable(weapon);
  assert.equal(m.length,table.length);
  assert.equal(new Set(m.map(x=>x.clip)).size,table.length);
  total+=m.length;
  for(let i=0;i<table.length;i++){
   const row=m[i],source=table[i];
   assert.equal(row.clip,source.name);
   assert.equal(row.frames,source.totalFrames);
   assert.equal(row.startup,source.startup);
   assert.equal(row.active,source.active);
   assert.equal(row.recovery,source.recovery);
   assert.equal(row.mustNeverDrivePhysics,true);
  }
 }
 assert.equal(total,56);
 assert(!artifact.shared.includes('guard'));
 assert(!artifact.shared.includes('airStep'));
 assert(!artifact.shared.includes('doubleJump'));
});
