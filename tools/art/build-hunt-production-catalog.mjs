// Master *production request* registry, not a file manifest of completed animations.
// Every request below must eventually be fulfilled by original authored 3D animation.
// Retargeted sizes/looks do not count as a distinct performed clip.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {HUNT_RULESET,HUNT_HZ,HUNT_WEAPONS,HUNT_FORMS,huntFrameTable}
 from '../../public/side-hunt-lab.mjs';

export const HUNT_PRODUCTION_CATALOG_SCHEMA='sf-hunt-3d-animation-production/1';
const GROUPS=Object.freeze({
 locomotion:[
  'idle-neutral','idle-alert','idle-injured','idle-low-stamina','idle-aiming','breathing-light',
  'breathing-heavy','turn-left','turn-right','walk-start','walk-loop','walk-stop',
  'run-start','run-loop','run-stop','sprint-start','sprint-loop','sprint-stop',
  'crouch-enter','crouch-hold','crouch-exit','land-soft','land-heavy','land-stumble',
  'step-forward','step-back','quickstep-recover','quickstep-escape-hitstun'
 ],
 aerial:[
  'jump-prep','jump-takeoff','jump-rise','jump-apex','jump-fall','jump-land',
  'jump-forward','jump-back','air-turn','air-pistol-aim','air-pistol-recoil',
  'air-hit-light','air-hit-heavy','air-stagger','air-fall-recover'
 ],
 impacts:[
  'hit-blade-front','hit-blade-back','hit-blade-high','hit-blade-low','hit-thrust',
  'hit-blunt','hit-gun-front','hit-gun-back','hit-counter','hit-critical',
  'hit-stagger-gun','hit-stagger-rear','hit-wall','hit-knockdown-front',
  'hit-knockdown-back','get-up-face-down','get-up-face-up','get-up-fast',
  'get-up-injured','stun-wobble','stun-dodge-escape','recover-from-whiff',
  'recover-from-gun-hit','stun-collapse','death-front','death-back','death-airborne'
 ],
 rituals:[
  'heal-draw-vial','heal-inject','heal-remove','heal-interrupted','heal-empty',
  'blood-bullet-prepare','blood-bullet-sacrifice','blood-bullet-recoil',
  'blood-bullet-interrupted','ammo-empty','aim-reticle-fix','gun-reload-cosmetic',
  'rally-blood-recovery','rally-expiry','item-equip','item-throw-start',
  'item-throw-release','item-throw-recover'
 ],
 cinematic:[
  'intro-enter-left','intro-enter-right','intro-stand-off','intro-camera-closeup',
  'intro-weapon-inspection','intro-silent-threat','intro-salute','intro-rival',
  'round-ready','round-start','round-end','victory-normal','victory-close',
  'victory-perfect','victory-low-health','victory-comeback','victory-rival',
  'victory-bow','defeat-kneel','defeat-collapse','defeat-grief','defeat-exhausted',
  'outro-exit-left','outro-exit-right','outro-look-back','outro-weapon-holster',
  'round-rematch-idle','match-champion-pose'
 ],
 taunts:[
  'taunt-bow','taunt-dismiss','taunt-come-closer','taunt-threaten','taunt-point',
  'taunt-laugh-low','taunt-laugh-loud','taunt-clap-slow','taunt-weapon-tap',
  'taunt-silent-prayer','taunt-ritual','taunt-turn-back','taunt-lean',
  'taunt-salute','taunt-shrug','taunt-victory-cry','taunt-rivalry'
 ],
 world:[
  'ledge-observe','lamp-interact','gate-push','door-open','chair-sit','chair-rise',
  'rain-flinch','wind-brace','look-up-moon','look-at-corpse','investigate-floor',
  'inspect-wall','dust-wipe','cough','shiver','hood-adjust','cloak-wrap',
  'weapon-oil','weapon-clean','scabbard-adjust','look-at-hands'
 ],
 performance:[
  'face-neutral','face-determined','face-pain','face-shock','face-anger',
  'face-panic','face-exhausted','face-triumph','face-grief','face-derision',
  'face-smirk','face-breath-mouth','face-blink','face-look-target',
  'face-look-down','face-look-up','vocal-effort-light','vocal-effort-heavy',
  'vocal-dodge','vocal-air-shot','vocal-critical','vocal-hit','vocal-victory',
  'vocal-defeat'
 ]
});
const FORM_GROUPS=Object.freeze({
 stance:[
  'stance-neutral','stance-evasive','stance-wounded','stance-exhausted','stance-adrenaline',
  'stance-alert-enter','stance-alert-exit','stance-weapon-elevation','stance-look-target',
  'stance-shift-weight','stance-crouch-ready','stance-breathing',
 ],
 traversal:[
  'walk-weapon-front','walk-weapon-back','run-weapon-front','run-weapon-back',
  'sprint-weapon-front','sprint-weapon-back','turn-weapon','ground-step',
  'jump-hold-weapon','air-recovery-weapon','land-weapon','pivot-weapon'
 ],
 offense:[
  'light-feint-start','light-feint-recover','heavy-feint-start','heavy-feint-recover',
  'heavy-charge-start','heavy-charge-hold','heavy-charge-release','charged-hit-confirm',
  'whiff-recovery-light','whiff-recovery-heavy','hit-confirm-followup',
  'counter-hit-followup','attack-into-transform','transform-into-attack',
  'attack-into-quickstep','quickstep-into-attack'
 ],
 handling:[
  'grip-adjust','weapon-inspect','weapon-draw','weapon-stow','weapon-hold-rest',
  'weapon-raise-gun','weapon-cross-hand','weapon-brace','weapon-recoil',
  'weapon-blood-clean','weapon-fidget','weapon-reload-cosmetic'
 ],
 expressivity:[
  'idle-blade-twitch','idle-shoulder','idle-cloak-sweep','idle-weight-shift',
  'outro-weapon-hold','intro-weapon-hold','taunt-weapon-show',
  'taunt-weapon-rotate','weapon-victory-pose','weapon-defeat-drop'
 ]
});
const WEAPON_SPECIALS=Object.freeze({
 critical:[
  'visceral-approach-front','visceral-approach-rear','visceral-start',
  'visceral-contact','visceral-recoil','visceral-release','visceral-miss',
  'visceral-victim-front','visceral-victim-rear','visceral-victim-breakaway'
 ],
 transformation:[
  'folded-to-unfurled-windup','folded-to-unfurled-lock',
  'unfurled-to-folded-windup','unfurled-to-folded-lock',
  'transform-light-confirm','transform-heavy-confirm',
  'transform-whiff','transform-stagger-interrupt'
 ],
 firearm:[
  'gun-parry-anticipate','gun-parry-success','gun-parry-miss',
  'gun-parry-air-success','gun-parry-air-miss','gun-recoil',
  'gun-recover','gun-empty','gun-blood-ammo-load'
 ],
 combo:[
  'combo-first-light','combo-second-light','combo-third-light',
  'combo-heavy-finisher','combo-transformation-finisher',
  'combo-step-chase','combo-overextension','combo-break-reaction'
 ]
});
const REQUIREMENTS=Object.freeze({
 skeleton:'Unique articulated source rig, eye/facial bones, hand/weapon sockets and corrective poses',
 visual:'Original 3D animation with inspected feet, cloth, hair, camera silhouette, and weapon grip',
 audio:'Separate licensed/original impact, body Foley, weapon handling, grunts and space/acoustics',
 gameplay:'Authoritative 60Hz combat events; clips never decide collision, damage, i-frames or rollback',
 verify:'Source ownership/license, editable rig/clip, real Windows GPU side-view capture and review'
});
const slug=v=>v.replace(/[^a-z0-9-]/g,'-');
function add(list,seen,{id,category,weapon=null,form=null,timing=null,layer='full-body',rank='tier-2',tag='original'}){
 if(!/^[a-z0-9/-]+$/.test(id)||seen.has(id))throw Error('Invalid or duplicate animation request '+id);
 seen.add(id);
 list.push(Object.freeze({id,category,weapon,form,rank,layer,timing,
  assetStatus:'not-authored',sourceStatus:'unverified',authoring:'original-or-cleared',
  originalPerformanceRequired:true,tag}));
}
export function buildHuntProductionCatalog(){
 const shots=[],seen=new Set();
 for(const [group,names] of Object.entries(GROUPS)){
  for(const name of names)add(shots,seen,{id:'shared/'+group+'/'+slug(name),category:group,
   layer:group==='performance'?'additive-face-voice':'full-body',
   rank:['locomotion','impacts'].includes(group)?'tier-0':'tier-1'});
 }
 for(const weapon of HUNT_WEAPONS){
  for(const move of huntFrameTable(weapon)){
   add(shots,seen,{id:weapon+'/combat/'+move.name,category:'combat-authoritative',
    weapon,rank:'tier-0',tag:'direct-frame-synchronized',
    timing:{fps:HUNT_HZ,startup:move.startup,active:move.active,
      recovery:move.recovery,total:move.totalFrames,
      activeStart:move.damage?move.startup:null,
      activeEnd:move.damage?move.startup+move.active:null}});
  }
  for(const form of HUNT_FORMS)
   for(const [group,names] of Object.entries(FORM_GROUPS))
    for(const name of names)
     add(shots,seen,{id:weapon+'/'+form+'/'+group+'/'+slug(name),category:group,
      weapon,form,rank:group==='offense'?'tier-0':'tier-1'});
  for(const [group,names] of Object.entries(WEAPON_SPECIALS))
   for(const name of names)
    add(shots,seen,{id:weapon+'/special/'+group+'/'+slug(name),category:group,
     weapon,rank:['critical','transformation'].includes(group)?'tier-0':'tier-1'});
 }
 const counts={
  totalRequests:shots.length,
  sharedRequests:shots.filter(x=>x.weapon===null).length,
  sourceCombatActions:shots.filter(x=>x.category==='combat-authoritative').length,
  newAuthoredAssets:0,approvedAssets:0
 };
 if(shots.some(x=>/air-step|double-jump|normal-block|command-grab/.test(x.id)))
  throw Error('Rejected incompatible motion from production list');
 return Object.freeze({
  schema:HUNT_PRODUCTION_CATALOG_SCHEMA,ruleset:HUNT_RULESET,fps:HUNT_HZ,
  intent:'Comprehensive original animation authoring backlog, not playable GLB clips',
  originalBloodborneClipCount:null,
  benchmark:'Compare later against an audited, legally obtained list of original game action classes; never invent a source count',
  readiness:'NONE_OF_THE_REQUESTS_IS_EVIDENCE_OF_SHIPPED_3D_ANIMATIONS',
  constraints:['single jump','no air step','no command grab','no normal block',
   'airborne shot and precise gun parry','ground quickstep and stun escape',
   'two form trick weapons','paired visceral choreography'],
  productionGate:REQUIREMENTS,counts,shots
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 process.stdout.write(JSON.stringify(buildHuntProductionCatalog(),null,2)+'\n');
