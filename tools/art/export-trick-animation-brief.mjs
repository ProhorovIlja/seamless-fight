// Deterministic export of combat-authored timings into an art production brief.
// This generates metadata only. It does NOT generate or approve rigged characters,
// animation clips, commercial licenses, server state, or hitboxes.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  TRICK_RULESET,TRICK_HZ,TRICK_WEAPONS,trickFrameTable
} from '../../public/side-trick-lab.mjs';

export const TRICK_ANIMATION_BRIEF_SCHEMA='sf-trick-animation-brief/1';
const isTransform=name=>['unfurl','refold','shiftOut','shiftIn'].includes(name);
const formOf=name=>{
  if(['unfurl','shiftOut'].includes(name))return 'folded';
  if(['refold','shiftIn'].includes(name))return 'unfurled';
  if(name.startsWith('unfurled')||name.startsWith('airUnfurled'))return 'unfurled';
  if(name.startsWith('folded')||name.startsWith('airFolded'))return 'folded';
  return 'either';
};
function classify(name){
  if(isTransform(name))return name.startsWith('shift')?'neutral-transform':'transform-strike';
  if(name.startsWith('air')&&name!=='airStep')return 'aerial-attack';
  if(name==='airStep')return 'aerial-mobility';
  if(name==='step')return 'ground-mobility';
  if(name==='shot')return 'firearm';
  if(name.endsWith('Light')||name.endsWith('Heavy'))return 'ground-attack';
  return 'reactions-and-cancels';
}
export function buildTrickAnimationBrief(){
  const weapons={};
  for(const weapon of TRICK_WEAPONS){
    const clips={};
    for(const m of trickFrameTable(weapon)){
      const before=formOf(m.name);
      const transform=isTransform(m.name);
      const after=transform?(before==='folded'?'unfurled':'folded'):before;
      const total=m.totalFrames;
      clips[m.name]={
        clipId:weapon+'/'+m.name,
        category:classify(m.name),
        initialForm:before,finalForm:after,
        timing:{
          simulationFps:TRICK_HZ,
          startupFrames:m.startup,activeFrames:m.active,recoveryFrames:m.recovery,
          totalFrames:total,
          activeStartAge:m.damage>0?m.startup:null,
          activeEndAgeExclusive:m.damage>0?m.startup+m.active:null,
          formSwitchAge:transform?m.startup-1:null
        },
        gameplayEnvelope:{
          reachWorldUnits:m.reach,
          hitTopWorldUnits:m.top,
          hitBottomWorldUnits:m.bottom,
          damage:m.damage,
          staminaCost:m.cost
        },
        visualRequirements:{
          authoredFullBodyPerformance:true,
          explicitGripAndWeaponGeometry:transform,
          footContactReview:true,
          faceAndClothSecondaryMotionReview:true,
          animationNeverDefinesCollisions:true
        }
      };
      if(total<1||transform&&m.startup<1)
        throw Error('Invalid combat timing for animation authoring: '+weapon+'/'+m.name);
    }
    weapons[weapon]={clips};
  }
  return {
    schema:TRICK_ANIMATION_BRIEF_SCHEMA,
    ruleset:TRICK_RULESET,
    fps:TRICK_HZ,
    generatedFrom:'public/side-trick-lab.mjs',
    purpose:'Editable 3D rig and weapon-animation shot list, NOT game-ready art',
    worldPlane:'2.5D side view; native visual animation follows deterministic collision state',
    weapons
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  process.stdout.write(JSON.stringify(buildTrickAnimationBrief(),null,2)+'\n');
}
