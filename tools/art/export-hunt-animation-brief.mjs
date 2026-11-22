// Deterministic export of combat-authored timings into an art production brief.
// This generates metadata only. It does NOT generate or approve rigged characters,
// animation clips, commercial licenses, server state, or hitboxes.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  HUNT_RULESET,HUNT_HZ,HUNT_WEAPONS,huntFrameTable
} from '../../public/side-hunt-lab.mjs';

export const HUNT_ANIMATION_BRIEF_SCHEMA='sf-hunt-animation-brief/1';
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
 if(name==='airShot')return 'aerial-firearm-parry';
 if(name==='shot')return 'firearm-parry';
 if(name==='visceral')return 'visceral-actor';
 if(name==='visceralVictim')return 'visceral-victim';
 if(name==='stagger')return 'parried-stagger';
 if(name==='blood')return 'blood-ammo-ritual';
 if(name==='heal')return 'vial-heal';
 if(name.endsWith('Charged'))return 'ground-charged-heavy';
 if(name==='step')return 'ground-mobility';
 if(name==='backstep')return 'ground-backstep-no-iframes';
 if(name.endsWith('BackstepLight'))return 'ground-backstep-counterattack';
 if(name.startsWith('air'))return 'aerial-attack';
 if(name.endsWith('Light')||name.endsWith('Heavy'))return 'ground-attack';
 return 'reactions-and-cancels';
}
export function buildHuntAnimationBrief(){
  const weapons={};
  for(const weapon of HUNT_WEAPONS){
    const clips={};
    for(const m of huntFrameTable(weapon)){
      const before=formOf(m.name);
      const transform=isTransform(m.name);
      const after=transform?(before==='folded'?'unfurled':'folded'):before;
      const total=m.totalFrames;
      clips[m.name]={
        clipId:weapon+'/'+m.name,
        category:classify(m.name),
        initialForm:before,finalForm:after,
        timing:{
          simulationFps:HUNT_HZ,
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
          animationNeverDefinesCollisions:true,
          groundedUtility:m.name==='heal'||m.name==='blood',
          readableFirearmMuzzleAndCounterTiming:m.name==='shot'||m.name==='airShot',
          facialStaggerAndHitReaction:m.name==='stagger'||m.name==='visceralVictim',
          authored3DVisceralPartnerChoreography:m.name==='visceral'||m.name==='visceralVictim'
        }
      };
      if(total<1||transform&&m.startup<1)
        throw Error('Invalid combat timing for animation authoring: '+weapon+'/'+m.name);
    }
    weapons[weapon]={clips};
  }
  return {
    schema:HUNT_ANIMATION_BRIEF_SCHEMA,
    ruleset:HUNT_RULESET,
    fps:HUNT_HZ,
    generatedFrom:'public/side-hunt-lab.mjs',
    purpose:'Bloodborne-first original 3D rig/weapon animation shot list, NOT finished game art',
    mandatoryAbilities:['singleJump','firearmParry','airShot','visceral','chargedRearStagger',
      'bloodBullets','vialHeal','rally','neutralTransform','transformStrike',
      'neutralBackstep','backstepR1'],
    aerialDodge:'unavailable',
    normalHitstunEscape:'grounded quickstep after 8 committed stun frames; paid stamina',
    quicksilverAmmoPolicy:'limited-per-round; blood bullets +5 at health cost',
    note:'No air steps, blocking, command grabs or double jumps in any duel',
    worldPlane:'2.5D side view; native visual animation follows deterministic collision state',
    weapons
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  process.stdout.write(JSON.stringify(buildHuntAnimationBrief(),null,2)+'\n');
}
