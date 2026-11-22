// Seamless Fight: visible-cue whiff-punish research for no-block 1v1.
// Not a hidden source-whiff oracle, online netcode, or human reaction model.
// Only uses the prior rendered action, its visible form and published move
// duration to select an input. Actual whiff/hit events are consulted AFTER
// combat solely to classify the result.
import {pathToFileURL} from 'node:url';
import {
 HUNT_HZ,HUNT_W,HUNT_WEAPONS,HUNT_FORMS,huntInput,huntMatch,
 huntMoveSpec,huntStep
} from '../public/side-hunt-lab.mjs';
import {huntVisibleCueView} from './hunt-visible-neutral-policy.mjs';
import {createHuntReplay,huntReplayFingerprint} from '../public/side-hunt-replay.mjs';

export const HUNT_OBSERVED_WHIFF_SCHEMA='sf-hunt-observed-whiff/1';
export const HUNT_OBSERVED_PLANS=Object.freeze([
 'hold','light','shot','quickstep','backstep'
]);
export const HUNT_OBSERVED_APPROACHES=Object.freeze([
 'hold','duringWindup','afterActive'
]);
export const HUNT_OBSERVED_DELAYS=Object.freeze([0,4,8,12]);
const valid=(value,message)=>{if(!value)throw TypeError(message);};

export function huntObservedWhiffTrial({
 attackerWeapon='mournweave',defenderWeapon='mournweave',
 attackerForm='folded',defenderForm='unfurled',
 attackerPlan='heavy',defenderPlan='light',
 arenaSide='left',defenderSlot=0,gap=35,
 approach='hold',reactionDelay=0,frames=105,recordReplay=false
}={}){
 valid(HUNT_WEAPONS.includes(attackerWeapon)&&
  HUNT_WEAPONS.includes(defenderWeapon),'Unknown source weapons');
 valid(HUNT_FORMS.includes(attackerForm)&&HUNT_FORMS.includes(defenderForm),
  'Unknown visible trick form');
 valid(['heavy','charged','feint-heavy'].includes(attackerPlan),'Unknown source threat');
 valid(HUNT_OBSERVED_PLANS.includes(defenderPlan),'Unknown no-guard response');
 valid(HUNT_OBSERVED_APPROACHES.includes(approach),'Unknown spacing policy');
 valid(['left','right','center'].includes(arenaSide),'Unknown arena');
 valid([0,1].includes(defenderSlot),'1v1 only');
 valid(Number.isFinite(gap)&&gap>=-40&&gap<=100,'Invalid reach margin');
 valid(Number.isSafeInteger(reactionDelay)&&reactionDelay>=0&&reactionDelay<=30,
  'Invalid visible timing delay');
 valid(Number.isSafeInteger(frames)&&frames>=60&&frames<=180,
  'Invalid simulation horizon');
 valid(typeof recordReplay==='boolean','Invalid replay flag');

 const attackerSlot=1-defenderSlot;
 const weapons=defenderSlot===0?[defenderWeapon,attackerWeapon]:
  [attackerWeapon,defenderWeapon];
 const s=huntMatch({weapons});s.ready=0;
 const d=s.p[defenderSlot],a=s.p[attackerSlot];
 a.form=attackerForm;d.form=defenderForm;
 const intended=attackerForm+(attackerPlan==='charged'?'Charged':'Heavy');
 // Weapon/form and authored frame table are public move knowledge, not an
 // oracle reading whether the current attack already hit or missed.
 const spec=huntMoveSpec(a,intended);
 const distance=spec.reach+gap;
 valid(distance>=38&&distance<=400,'Impossible trial spacing');
 const inward=arenaSide==='right'?-1:
  arenaSide==='left'?1:defenderSlot===0?1:-1;
 d.x=arenaSide==='left'?65:arenaSide==='right'?HUNT_W-65:
  defenderSlot===0?425:535;
 d.dir=inward;a.x=d.x+inward*distance;a.dir=-inward;
 valid(a.x>=65&&a.x<=HUNT_W-65,'Opponent outside legal arena');
 d.vx=0;a.vx=0;d.st=100;a.st=100;
 const tape=recordReplay?createHuntReplay({
  initialState:s,maxFrames:frames,checkpointEvery:15
 }):null;
 let firstCueTick=null,predictedRecoveryTick=null,responseRequestedTick=null;
 let sawFeint=false;
 const events=[];
 for(let frame=0;frame<frames;frame++){
  const pair=[huntInput(),huntInput()];
  if(frame===0)pair[attackerSlot].act=
   attackerPlan==='charged'?'charge':'heavy';
  if(frame===7&&attackerPlan==='feint-heavy')
   pair[attackerSlot].act='feint';
  // Read only the state which the PREVIOUS completed frame displayed.
  // Source whiff events and opponent age/remaining recovery are never
  // used in the controller. The public startup/active values specify
  // when a completed visible R2 has entered its recovery animation.
  const cue=huntVisibleCueView(s,defenderSlot);
  if(firstCueTick!==null&&cue.enemyAnimation!==intended)
   sawFeint=true;
  const validRead=firstCueTick!==null&&!sawFeint&&
   cue.enemyAnimation===intended;
  const afterActive=validRead&&s.tick>=predictedRecoveryTick;
  if(validRead&&(
   approach==='duringWindup'||
   approach==='afterActive'&&afterActive
  ))pair[defenderSlot].x=d.dir;
  if(afterActive&&responseRequestedTick===null&&
   s.tick>=predictedRecoveryTick+reactionDelay&&
   defenderPlan!=='hold'){
   pair[defenderSlot].act=defenderPlan==='light'?'light':
    defenderPlan==='shot'?'shot':'step';
   pair[defenderSlot].x=defenderPlan==='quickstep'?d.dir:
    defenderPlan==='backstep'?0:pair[defenderSlot].x;
   responseRequestedTick=s.tick+1;
  }
  const tickEvents=[];
  huntStep(s,pair,tickEvents);
  events.push(...tickEvents);
  if(tape)tape.append(pair);
  if(firstCueTick===null){
   const seen=huntVisibleCueView(s,defenderSlot);
   if(seen.enemyAnimation===intended){
    firstCueTick=seen.tick;
    predictedRecoveryTick=firstCueTick+spec.startup+spec.active;
   }
  }
 }
 const sourceWhiff=events.find(e=>e.kind==='whiff'&&
  e.actor===attackerSlot&&e.move===intended);
 const sourceHit=events.find(e=>e.kind==='hit'&&
  e.actor===attackerSlot&&e.target===defenderSlot&&e.move===intended);
 const defenderHit=events.find(e=>e.kind==='hit'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const recoveryPunish=Boolean(sourceWhiff&&defenderHit?.punishedRecovery&&
  defenderHit.punishedMove===intended&&defenderHit.tick>sourceWhiff.tick);
 const defenderShot=events.some(e=>e.kind==='bulletHit'&&e.actor===defenderSlot);
 const defenderParry=events.some(e=>e.kind==='gunParry'&&e.actor===defenderSlot);
 const actualFeint=events.some(e=>e.kind==='action'&&
  e.actor===attackerSlot&&e.move==='feint');
 const capture=tape?tape.capture():null;
 const fingerprint=huntReplayFingerprint(s);
 if(capture&&capture.fingerprint!==fingerprint)
  throw Error('Visible response diverged from source replay');
 const category=recoveryPunish?'realVisibleRecoveryPunish':
  sourceHit?'enteredThreatHitbox':
  defenderParry?'actualGunParry':
  defenderHit?'meleeContactOutsideRecovery':
  defenderShot?'gunHitOnly':
  actualFeint?'feintReadNoWhiffPunish':
  sourceWhiff?'whiffNotPunished':'noSourceWhiff';

 return Object.freeze({
  schema:HUNT_OBSERVED_WHIFF_SCHEMA,hz:HUNT_HZ,rules:s.rules,
  attackerWeapon,defenderWeapon,attackerForm,defenderForm,
  attackerPlan,defenderPlan,arenaSide,defenderSlot,gap,distance,
  approach,reactionDelay,frames,firstCueTick,predictedRecoveryTick,
  responseRequestedTick,sawFeint,actualFeint,sourceWhiff:Boolean(sourceWhiff),
  sourceWhiffTick:sourceWhiff?.tick??null,sourceAttackHit:Boolean(sourceHit),
  defenderMeleeHit:Boolean(defenderHit),defenderShotHit:defenderShot,
  defenderParry,realRecoveryPunish:recoveryPunish,
  defenderHp:d.hp,attackerHp:a.hp,category,finalFingerprint:fingerprint,
  sourceEvents:Object.freeze(events.map(e=>Object.freeze({...e}))),
  ...(capture?{replayCapture:capture}:{})
 });
}

export function huntObservedWhiffMatrix({
 attackerPlans=['heavy','feint-heavy'],defenderPlans=['light','shot','hold'],
 gaps=[35,65],approaches=['hold','duringWindup','afterActive'],
 delays=[0,8],arenaSides=['center','left','right']
}={}){
 for(const [list,options,name] of [
  [attackerPlans,['heavy','charged','feint-heavy'],'attacker plans'],
  [defenderPlans,HUNT_OBSERVED_PLANS,'defender plans'],
  [approaches,HUNT_OBSERVED_APPROACHES,'approaches'],
  [arenaSides,['center','left','right'],'arena sides']
 ])valid(Array.isArray(list)&&list.length>0&&
  list.every(x=>options.includes(x)),'Invalid '+name);
 valid(Array.isArray(gaps)&&gaps.length>0&&
  gaps.every(x=>Number.isFinite(x)&&x>=-40&&x<=100),'Invalid gaps');
 valid(Array.isArray(delays)&&delays.length>0&&
  delays.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=30),'Invalid delays');
 const rows=[];
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const defenderForm of HUNT_FORMS)
     for(const defenderSlot of [0,1])
      for(const arenaSide of arenaSides)
       for(const gap of gaps)
        for(const attackerPlan of attackerPlans)
         for(const defenderPlan of defenderPlans)
          for(const approach of approaches)
           for(const reactionDelay of delays){
            const {sourceEvents,...row}=huntObservedWhiffTrial({
             attackerWeapon,defenderWeapon,attackerForm,defenderForm,
             defenderSlot,arenaSide,gap,attackerPlan,defenderPlan,
             approach,reactionDelay
            });
            rows.push(Object.freeze(row));
           }
 return Object.freeze(rows);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 valid(args.length<=1&&args.every(x=>x==='--summary'),
  'Use --summary or no arguments');
 const rows=huntObservedWhiffMatrix({
  gaps:[35],approaches:['hold','afterActive'],arenaSides:['left','right']
 });
 const byCategory={};
 for(const r of rows)byCategory[r.category]=(byCategory[r.category]??0)+1;
 console.log(JSON.stringify({
  schema:HUNT_OBSERVED_WHIFF_SCHEMA,rows:rows.length,
  note:'No source whiff oracle in response policy; public action timing and prior rendered animation only. Deterministic 60Hz source; NOT a human, rollback or balance certification.',
  byCategory,...(args.includes('--summary')?{}:{trials:rows})
 },null,2));
}
