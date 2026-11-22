// Seamless Fight: visible-telegraph-only, offline no-guard neutral research.
// Unlike a source-whiff oracle, the defender sees only positions, facing,
// form and the rendered attack animation observed AFTER an actual 60Hz step.
// No hidden enemy timing, ammo, HP, queues, collision outcome or future input.
import {
 HUNT_HZ,HUNT_W,HUNT_FLOOR,HUNT_WEAPONS,HUNT_FORMS,
 huntInput,huntMatch,huntStep
} from '../public/side-hunt-lab.mjs';
import {createHuntReplay,huntReplayFingerprint} from '../public/side-hunt-replay.mjs';

export const HUNT_VISIBLE_THREATS=Object.freeze([
 'light','heavy','charged','feint','shot','idle'
]);
export const HUNT_VISIBLE_DEFENSES=Object.freeze([
 'hold','counterpoke','firearm','quickstep','backstep'
]);
export const HUNT_VISIBLE_DELAYS=Object.freeze([0,4,8,12]);
const requireValid=(good,why)=>{if(!good)throw TypeError(why);};

// Observable rendering state, NOT an internal simulator inspector.
// A player can visually distinguish the action ANIMATION, not whether
// the action will hit, whiff, transform, recover or get a parry.
export function huntVisibleCueView(state,viewerSlot=0){
 requireValid(state?.p?.length===2&&[0,1].includes(viewerSlot),
  'A versioned 1v1 state and viewer slot are required');
 const self=state.p[viewerSlot],other=state.p[1-viewerSlot];
 return Object.freeze({
  tick:state.tick,ownX:self.x,ownY:self.y,ownFacing:self.dir,
  enemyX:other.x,enemyY:other.y,enemyFacing:other.dir,
  enemyForm:other.form,enemyAnimation:other.act,
  enemyGrounded:other.y>=HUNT_FLOOR
 });
}

const visualAttack=action=>
 action.endsWith('Light')||action.endsWith('Heavy')||
 action.endsWith('Charged')||
 action==='shot'||action==='airShot';
const response=plan=>
 plan==='counterpoke'?'light':
 plan==='firearm'?'shot':'step';

export function huntVisibleNeutralTrial({
 attackerWeapon='mournweave',defenderWeapon='mournweave',
 attackerForm='folded',attackerPlan='heavy',
 defenderPlan='firearm',perceptionDelay=4,defenderSlot=0,
 arenaSide='center',distance=85,frames=85,recordReplay=false
}={}){
 requireValid(HUNT_WEAPONS.includes(attackerWeapon),'Unknown attacker weapon');
 requireValid(HUNT_WEAPONS.includes(defenderWeapon),'Unknown defender weapon');
 requireValid(HUNT_FORMS.includes(attackerForm),'Unknown original weapon form');
 requireValid(HUNT_VISIBLE_THREATS.includes(attackerPlan),'Unknown opponent program');
 requireValid(HUNT_VISIBLE_DEFENSES.includes(defenderPlan),'Unknown no-guard counter');
 requireValid([0,1].includes(defenderSlot),'Only two player slots');
 requireValid(['center','left','right'].includes(arenaSide),'Unknown arena');
 requireValid(Number.isInteger(perceptionDelay)&&perceptionDelay>=0&&
  perceptionDelay<=30,'Invalid visible-action response delay');
 requireValid(Number.isFinite(distance)&&distance>=38&&distance<=250,
  'Invalid physical initial gap');
 requireValid(Number.isInteger(frames)&&frames>=50&&frames<=180,
  'Invalid 60Hz experimental duration');
 requireValid(typeof recordReplay==='boolean','recordReplay must be boolean');
 const attackerSlot=1-defenderSlot;
 const weapons=defenderSlot===0?[defenderWeapon,attackerWeapon]:
  [attackerWeapon,defenderWeapon];
 const state=huntMatch({weapons});state.ready=0;
 const d=state.p[defenderSlot],a=state.p[attackerSlot];
 d.x=arenaSide==='left'?65:arenaSide==='right'?HUNT_W-65:
  defenderSlot===0?425:535;
 d.dir=arenaSide==='left'?1:arenaSide==='right'?-1:
  defenderSlot===0?1:-1;
 a.x=d.x+d.dir*distance;a.dir=-d.dir;a.form=attackerForm;
 requireValid(a.x>=65&&a.x<=HUNT_W-65,'Attacker exceeds legal arena');
 d.vx=0;a.vx=0;d.st=100;a.st=100;
 const tape=recordReplay?createHuntReplay({
  initialState:state,maxFrames:frames,checkpointEvery:15
 }):null;
 const events=[];
 let perceivedAt=null,firstCue='',submittedAt=null;
 const triggered=defenderPlan!=='hold';
 for(let frame=0;frame<frames;frame++){
  const pair=[huntInput(),huntInput()];
  // Attacker program is authored ahead of time. It cannot examine the
  // defender's hidden action state or retroactively change on a hit.
  if(frame===0&&attackerPlan!=='idle')
   pair[attackerSlot].act=attackerPlan==='charged'?'charge':
    attackerPlan==='feint'?'heavy':attackerPlan;
  // Legitimate feint of a visible R2 windup: deceptive animation,
  // not a fake "no whiff" source event or privileged scripting.
  if(frame===7&&attackerPlan==='feint')pair[attackerSlot].act='feint';
  // The defender's ONLY signal is an earlier visible attack animation.
  // It cannot react in the same tick as an unobserved enemy input.
  if(triggered&&perceivedAt!==null&&
   state.tick===perceivedAt+perceptionDelay&&submittedAt===null){
   pair[defenderSlot].act=response(defenderPlan);
   pair[defenderSlot].x=defenderPlan==='quickstep'?d.dir:0;
   submittedAt=state.tick+1;
  }
  const stepEvents=[];
  huntStep(state,pair,stepEvents);
  events.push(...stepEvents);
  if(tape)tape.append(pair);
  if(perceivedAt===null){
   const view=huntVisibleCueView(state,defenderSlot);
   if(visualAttack(view.enemyAnimation)){
    perceivedAt=view.tick;firstCue=view.enemyAnimation;
   }
  }
 }
 const capture=tape?tape.capture():null;
 const finalFingerprint=huntReplayFingerprint(state);
 if(capture&&capture.fingerprint!==finalFingerprint)
  throw Error('Visible-read input tape diverged from source 60Hz combat');
 const gunParry=events.some(e=>e.kind==='gunParry'&&e.actor===defenderSlot);
 const defenderHit=events.find(e=>e.kind==='hit'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const shotHit=events.some(e=>e.kind==='bulletHit'&&e.actor===defenderSlot);
 const enemyHit=events.find(e=>e.kind==='hit'&&
  e.actor===attackerSlot&&e.target===defenderSlot);
 const recoveryPunish=Boolean(defenderHit?.punishedRecovery);
 const startupInterrupt=Boolean(defenderHit?.hitDuringStartup);
 const escape=events.some(e=>e.kind==='cornerEscape'&&e.actor===defenderSlot);
 const category=gunParry?'realGunParry':
  recoveryPunish?'realRecoveryPunish':
  startupInterrupt?'realStartupInterrupt':
  defenderHit?'otherMeleeContact':shotHit?'firearmHitNoParry':
  escape?'physicalCornerEscape':'noConfirmedCounter';
 return Object.freeze({
  schema:'sf-hunt-visible-neutral/1',
  rules:state.rules,hz:HUNT_HZ,
  attackerWeapon,defenderWeapon,attackerForm,attackerPlan,
  defenderPlan,perceptionDelay,defenderSlot,arenaSide,distance,frames,
  perceivedAt,firstCue,submittedAt,
  attackerOpened:events.some(e=>e.kind==='action'&&e.actor===attackerSlot),
  attackerFeinted:events.some(e=>e.kind==='action'&&e.actor===attackerSlot&&e.move==='feint'),
  realGunParry:gunParry,recoveryPunish,startupInterrupt,
  defenderMeleeHit:Boolean(defenderHit),enemyMeleeHit:Boolean(enemyHit),
  defenderHp:d.hp,attackerHp:a.hp,
  defenderShotHit:shotHit,cornerEscaped:escape,
  category,finalFingerprint,
  sourceEvents:Object.freeze(events.map(e=>Object.freeze({...e}))),
  ...(capture?{replayCapture:capture}:{})
 });
}

export function huntVisibleNeutralMatrix({
 attackerPlans=['heavy','charged','feint','shot','light'],
 defenderPlans=HUNT_VISIBLE_DEFENSES,
 delays=HUNT_VISIBLE_DELAYS,arenaSides=['center']
}={}){
 requireValid(Array.isArray(attackerPlans)&&attackerPlans.length>0&&
  attackerPlans.every(x=>HUNT_VISIBLE_THREATS.includes(x)),
  'Invalid threat choices');
 requireValid(Array.isArray(defenderPlans)&&defenderPlans.length>0&&
  defenderPlans.every(x=>HUNT_VISIBLE_DEFENSES.includes(x)),
  'Invalid no-block answers');
 requireValid(Array.isArray(delays)&&delays.length>0&&
  delays.every(x=>Number.isInteger(x)&&x>=0&&x<=30),
  'Invalid perception delays');
 requireValid(Array.isArray(arenaSides)&&arenaSides.length>0&&
  arenaSides.every(x=>['center','left','right'].includes(x)),
  'Invalid arena choices');
 const rows=[];
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const defenderSlot of [0,1])
     for(const arenaSide of arenaSides)
      for(const attackerPlan of attackerPlans)
       for(const defenderPlan of defenderPlans)
        for(const perceptionDelay of delays){
         const {sourceEvents,...row}=huntVisibleNeutralTrial({
          attackerWeapon,defenderWeapon,attackerForm,defenderSlot,
          arenaSide,attackerPlan,defenderPlan,perceptionDelay
         });
         rows.push(Object.freeze(row));
        }
 return Object.freeze(rows);
}

if(process.argv[1]?.endsWith('hunt-visible-neutral-policy.mjs')){
 const args=process.argv.slice(2);
 requireValid(args.every(x=>['--all-arenas','--summary'].includes(x)),
  'Use --summary and optionally --all-arenas');
 const rows=huntVisibleNeutralMatrix({
  arenaSides:args.includes('--all-arenas')?
   ['center','left','right']:['center']
 });
 const byThreat={},byDefense={},byArena={};
 for(const r of rows){
  for(const [container,key] of [[byThreat,r.attackerPlan],
   [byDefense,r.defenderPlan],[byArena,r.arenaSide]]){
   const counts=container[key]??={};
   counts[r.category]=(counts[r.category]??0)+1;
  }
 }
 console.log(JSON.stringify({
  schema:'sf-hunt-visible-neutral-study/1',
  note:'Opponent rendered animation and positions only, not internal whiff/gun-parry state; offline deterministic simulation NOT human reaction',
  rows:rows.length,byThreat,byDefense,byArena,
  ...(args.includes('--summary')?{}:{trials:rows})
 },null,2));
}
