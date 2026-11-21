// Deterministic native Godot authoring contract, source-derived at build time.
// It describes required authored original animation clips only, not shipped assets.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {HUNT_RULESET,HUNT_HZ,HUNT_WEAPONS,huntFrameTable} from '../../public/side-hunt-lab.mjs';

export const HUNT_GODOT_MANIFEST_SCHEMA='sf-hunt-godot-clips/1';
export const HUNT_SHARED_SHOTS=Object.freeze([
 'idle','walk','run','jump','land','crouch',
 'intro','outro','victory','defeat','taunt','hitFront','hitBack','hitAir',
 'parryRecoil','rallyReclaim','transformHold','breathing'
]);
export function buildGodotHuntManifest(){
 const weapons={};
 for(const weapon of HUNT_WEAPONS){
  weapons[weapon]=huntFrameTable(weapon).map(m=>({
   clip:m.name,frames:m.totalFrames,
   startup:m.startup,active:m.active,recovery:m.recovery,
   activeStart:m.damage?m.startup:null,
   activeEnd:m.damage?m.startup+m.active:null,
   needsPairedPerformance:['visceral','visceralVictim'].includes(m.name),
   mustNeverDrivePhysics:true
  }));
 }
 return {schema:HUNT_GODOT_MANIFEST_SCHEMA,rules:HUNT_RULESET,hz:HUNT_HZ,
  shared:[...HUNT_SHARED_SHOTS],weapons,
  clipsAreFinished:false,
  licensePolicy:'original-or-cleared; never infer ownership from reference game files',
  visualPhysicsPolicy:'read-only 60Hz confirmed simulation age; no collision through animation'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const target=process.argv[2]||'experiments/godot-native-4.7/assets/hunt_animation_manifest.json';
 writeFileSync(target,JSON.stringify(buildGodotHuntManifest(),null,2)+'\n');
 process.stdout.write('Generated original-clip requirements: '+target+'\n');
}
