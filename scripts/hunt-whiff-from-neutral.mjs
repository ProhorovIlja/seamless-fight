// Seamless Fight — real neutral lifecycle experiment, NOT an online combat rule.
// Unlike the recovery-seeded response matrix, this starts with normal player
// inputs at 60Hz and DOES NOT invent a whiff: the source must emit it.
// Pure source/physics evidence. Never infer a hit or parry from button presses.
import {
 HUNT_HZ,HUNT_WEAPONS,HUNT_FORMS,HUNT_W,huntInput,huntMatch,huntMoveSpec,huntStep
} from '../public/side-hunt-lab.mjs';

export const HUNT_FULL_WHIFF_APPROACHES=Object.freeze([
 'hold','postWhiffWalk','precommitWalk'
]);
export const HUNT_FULL_WHIFF_ANSWERS=Object.freeze(['light','shot','step']);
export const HUNT_FULL_WHIFF_DELAYS=Object.freeze([0,5,12,20]);
const requireRule=(okay,why)=>{if(!okay)throw TypeError(why);};

export function huntFullWhiffTrial({
 attackerWeapon='mournweave',defenderWeapon='mournweave',
 attackerForm='folded',attackerHeavy='Heavy',defenderSlot=0,
 arenaSide='center',initialGap=48,approach='hold',
 answer='light',responseDelay=0,frames=125
}={}){
 requireRule(HUNT_WEAPONS.includes(attackerWeapon),'Unknown attacker weapon');
 requireRule(HUNT_WEAPONS.includes(defenderWeapon),'Unknown defender weapon');
 requireRule(HUNT_FORMS.includes(attackerForm),'Unknown trick form');
 requireRule(['Heavy','Charged'].includes(attackerHeavy),'Normal/charged R2 only');
 requireRule([0,1].includes(defenderSlot),'1v1 player slot only');
 requireRule(['center','left','right'].includes(arenaSide),'Unknown arena side');
 requireRule(HUNT_FULL_WHIFF_APPROACHES.includes(approach),'Unknown approach');
 requireRule(HUNT_FULL_WHIFF_ANSWERS.includes(answer),'Unknown combat answer');
 requireRule(Number.isInteger(responseDelay)&&responseDelay>=0&&responseDelay<=40,
  'Invalid source response delay');
 requireRule(Number.isInteger(frames)&&frames>=60&&frames<=200,
  'Invalid test time horizon');
 requireRule(Number.isFinite(initialGap)&&initialGap>=-40&&initialGap<=100,
  'Invalid measured reach margin');
 const attackerSlot=1-defenderSlot;
 const weapons=defenderSlot===0?[defenderWeapon,attackerWeapon]:
  [attackerWeapon,defenderWeapon];
 const state=huntMatch({weapons});state.ready=0;
 const hunter=state.p[defenderSlot],rival=state.p[attackerSlot];
 rival.form=attackerForm;
 const committedMove=attackerForm+attackerHeavy;
 const committedSpec=huntMoveSpec(rival,committedMove);
 // The initial spacing is derived from the REAL chosen R2 reach, so a
 // long weapon does not get silently evaluated as if it were a short R1.
 const distance=committedSpec.reach+initialGap;
 requireRule(distance>=38&&distance<=HUNT_W-130,'Invalid physical spacing');
 hunter.x=arenaSide==='left'?65:arenaSide==='right'?HUNT_W-65:
  defenderSlot===0?425:535;
 hunter.dir=arenaSide==='left'?1:arenaSide==='right'?-1:
  defenderSlot===0?1:-1;
 rival.x=hunter.x+hunter.dir*distance;rival.dir=-hunter.dir;
 requireRule(rival.x>=65&&rival.x<=HUNT_W-65,'Rival must be inside arena');
 hunter.vx=0;rival.vx=0;hunter.st=100;rival.st=100;
 const events=[];
 let actualWhiff=null,answerRequestedTick=null;
 for(let frame=0;frame<frames;frame++){
  const inputs=[huntInput(),huntInput()];
  if(frame===0)
   inputs[attackerSlot]={...huntInput(),
    act:attackerHeavy==='Charged'?'charge':'heavy'};
  if(approach==='precommitWalk'||
    approach==='postWhiffWalk'&&actualWhiff!==null)
   inputs[defenderSlot]={...huntInput(),x:hunter.dir};
  if(actualWhiff){
   // The preceding tick must have emitted a real whiff. With a 0F delay,
   // the first available counter input is the very NEXT 60Hz tick.
   const elapsed=state.tick-actualWhiff.tick;
   if(elapsed===4)inputs[attackerSlot]={...huntInput(),act:'trick'};
   if(elapsed===responseDelay){
    answerRequestedTick=state.tick+1;
    inputs[defenderSlot]={...huntInput(),act:answer,
     x:answer==='step'?hunter.dir:inputs[defenderSlot].x};
   }
  }
  const tickEvents=[];
  huntStep(state,inputs,tickEvents);
  events.push(...tickEvents);
  const newlyMissed=tickEvents.find(e=>e.kind==='whiff'&&
   e.actor===attackerSlot&&e.move===committedMove);
  if(newlyMissed&&!actualWhiff)actualWhiff=newlyMissed;
 }
 const firstHit=events.find(e=>e.kind==='hit'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const rivalHit=events.find(e=>e.kind==='hit'&&
  e.actor===attackerSlot&&e.target===defenderSlot);
 const parry=events.find(e=>e.kind==='gunParry'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const chip=events.find(e=>e.kind==='bulletHit'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const originalAttackHit=events.find(e=>e.kind==='hit'&&
  e.actor===attackerSlot&&e.target===defenderSlot&&e.move===committedMove);
 const startedR2=events.find(e=>e.kind==='action'&&
  e.actor===attackerSlot&&e.move===committedMove);
 const trick=events.find(e=>e.kind==='action'&&
  e.actor===attackerSlot&&['unfurl','refold'].includes(e.move));
 const actualRecoveryHit=Boolean(actualWhiff&&firstHit?.punishedRecovery&&
  firstHit.punishedMove===committedMove&&firstHit.tick>actualWhiff.tick);
 const nextAttackInterrupt=Boolean(actualWhiff&&
  firstHit?.hitDuringStartup&&
  ['unfurl','refold'].includes(firstHit.interruptedMove));
 const category=!actualWhiff?(originalAttackHit?'R2HitNoWhiff':'R2NotMissed'):
  actualRecoveryHit?'realR2WhiffPunish':
  nextAttackInterrupt?'nextTrickStartupInterrupt':parry?'gunParry':
  firstHit?'otherMeleeContact':chip?'gunChipOnly':'noConnectedCounter';
 return Object.freeze({
  rules:state.rules,hz:HUNT_HZ,attackerWeapon,defenderWeapon,
  attackerForm,attackerHeavy,defenderSlot,arenaSide,initialGap,
  distance,approach,answer,responseDelay,frames,
  category,attackerStartedR2:Boolean(startedR2),
  originalR2Hit:Boolean(originalAttackHit),
  realR2Whiff:Boolean(actualWhiff),whiffTick:actualWhiff?.tick??null,
  answerRequestedTick,attackerStartedTrick:Boolean(trick),
  trickTick:trick?.tick??null,
  realWhiffRecoveryPunish:actualRecoveryHit,
  nextTrickStartupInterrupt:nextAttackInterrupt,
  gunParry:Boolean(parry),gunChip:Boolean(chip),
  defenderMeleeHit:Boolean(firstHit),
  attackerMeleeHit:Boolean(rivalHit),
  attackerHp:rival.hp,defenderHp:hunter.hp,
  cornerEscapes:events.filter(e=>e.kind==='cornerEscape'&&
   e.actor===defenderSlot).length,
  sourceEvents:Object.freeze(events.map(e=>Object.freeze({...e})))
 });
}

export function huntFullWhiffMatrix({
 gaps=[48],approaches=['hold','postWhiffWalk'],
 delays=HUNT_FULL_WHIFF_DELAYS,answers=HUNT_FULL_WHIFF_ANSWERS,
 arenaSides=['center']
}={}){
 requireRule(Array.isArray(gaps)&&gaps.length>0&&
  gaps.every(x=>Number.isFinite(x)&&x>=-40&&x<=100),'Invalid gaps');
 requireRule(Array.isArray(approaches)&&approaches.length>0&&
  approaches.every(x=>HUNT_FULL_WHIFF_APPROACHES.includes(x)),
  'Invalid approach policies');
 requireRule(Array.isArray(delays)&&delays.length>0&&
  delays.every(x=>Number.isInteger(x)&&x>=0&&x<=40),'Invalid delays');
 requireRule(Array.isArray(answers)&&answers.length>0&&
  answers.every(x=>HUNT_FULL_WHIFF_ANSWERS.includes(x)),
  'Invalid responses');
 requireRule(Array.isArray(arenaSides)&&arenaSides.length>0&&
  arenaSides.every(x=>['center','left','right'].includes(x)),
  'Invalid arena selection');
 const rows=[];
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const attackerHeavy of ['Heavy','Charged'])
     for(const arenaSide of arenaSides)
      for(const defenderSlot of [0,1])
       for(const initialGap of gaps)
        for(const approach of approaches)
         for(const answer of answers)
          for(const responseDelay of delays){
           const result=huntFullWhiffTrial({
            attackerWeapon,defenderWeapon,attackerForm,attackerHeavy,
            arenaSide,defenderSlot,initialGap,approach,answer,responseDelay
           });
           const {sourceEvents,...summary}=result;
           rows.push(Object.freeze(summary));
          }
 return Object.freeze(rows);
}

if(process.argv[1]?.endsWith('hunt-whiff-from-neutral.mjs')){
 const flags=process.argv.slice(2);
 requireRule(flags.every(x=>['--all-arenas','--summary','--bait'].includes(x)),
  'Supported flags: --all-arenas, --summary, --bait');
 const rows=huntFullWhiffMatrix({
  arenaSides:flags.includes('--all-arenas')?
   ['center','left','right']:['center'],
  approaches:flags.includes('--bait')?
   ['hold','postWhiffWalk','precommitWalk']:['hold','postWhiffWalk']
 });
 const outcomeCounts={},byPolicy={};
 for(const r of rows){
  outcomeCounts[r.category]=(outcomeCounts[r.category]??0)+1;
  const policy=byPolicy[r.approach]??={};
  policy[r.category]=(policy[r.category]??0)+1;
 }
 console.log(JSON.stringify({
  type:'SF_HUNT_FULL_NEUTRAL_R2_LIFECYCLE',hz:HUNT_HZ,
  source:'real heavy input > active frames > source whiff > delayed defense',
  warning:'Not human reaction, visual timing, online GGPO, or verified pro balance',
  trials:rows.length,outcomeCounts,byPolicy,
  ...(flags.includes('--summary')?{}:{rows})
 },null,2));
}
