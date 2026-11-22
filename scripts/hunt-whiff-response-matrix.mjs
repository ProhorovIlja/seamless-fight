// Original 60 Hz no-guard neutral lab: NOT ranked gameplay and NOT Bloodborne frame data.
// Stage a real missed R2 at its first vulnerable recovery frame, then run the
// actual combat physics for every input. NEVER substitute guessed hit success.
// The purpose is to distinguish a PRE-READ, a reacted gun parry of the NEW
// trick attack, a true whiff-recovery punish, and a failed/late response.
import {
 HUNT_HZ,HUNT_WEAPONS,HUNT_FORMS,huntInput,huntMatch,huntMoveSpec,huntStep
} from '../public/side-hunt-lab.mjs';

export const HUNT_NEUTRAL_RESPONSE_DELAYS=Object.freeze([0,2,5,9]);
export const HUNT_NEUTRAL_RESPONSE_ACTIONS=Object.freeze(['light','shot','step']);
export const HUNT_NEUTRAL_HEAVIES=Object.freeze(['Heavy','Charged']);
export const HUNT_NEUTRAL_ARENAS=Object.freeze(['center','left','right']);
const insist=(valid,why)=>{if(!valid)throw TypeError(why);};

export function huntWhiffResponseTrial({
 attackerWeapon='mournweave',defenderWeapon='mournweave',
 attackerForm='folded',attackerHeavy='Heavy',
 defenderSlot=0,answer='light',responseDelay=0,distance=70,frames=45,
 arenaSide='center'
}={}){
 insist(HUNT_WEAPONS.includes(attackerWeapon),'Unknown original attacker weapon');
 insist(HUNT_WEAPONS.includes(defenderWeapon),'Unknown original defender weapon');
 insist(HUNT_FORMS.includes(attackerForm),'Unknown original trick form');
 insist(HUNT_NEUTRAL_HEAVIES.includes(attackerHeavy),'Heavy or charged R2 required');
 insist(defenderSlot===0||defenderSlot===1,'Exactly two player slots');
 insist(HUNT_NEUTRAL_ARENAS.includes(arenaSide),'Unknown original arena side');
 insist(HUNT_NEUTRAL_RESPONSE_ACTIONS.includes(answer),'Unknown no-guard answer');
 insist(Number.isInteger(responseDelay)&&responseDelay>=0&&responseDelay<frames,
  'Invalid response delay');
 insist(Number.isFinite(distance)&&distance>=38&&distance<=250,
  'Grounded in-range spacing required');
 insist(Number.isInteger(frames)&&frames>=20&&frames<=120,'Invalid trial duration');

 const attackerSlot=1-defenderSlot;
 const weapons=defenderSlot===0?[defenderWeapon,attackerWeapon]:
  [attackerWeapon,defenderWeapon];
 const state=huntMatch({weapons});state.ready=0;
 const defender=state.p[defenderSlot],attacker=state.p[attackerSlot];
 // Mirror across the 960-unit arena: player-slot order must not change
 // attack read, gun counter, recovery punishment, or movement outcomes.
 defender.x=arenaSide==='left'?65:arenaSide==='right'?895:
  defenderSlot===0?430:530;
 defender.dir=arenaSide==='left'?1:arenaSide==='right'?-1:
  defenderSlot===0?1:-1;
 attacker.x=defender.x+defender.dir*distance;
 attacker.dir=-defender.dir;
 defender.vx=0;attacker.vx=0;defender.st=100;attacker.st=100;
 defender.form='folded';defender.act='';defender.age=0;
 attacker.form=attackerForm;attacker.act=attackerForm+attackerHeavy;
 const heavy=huntMoveSpec(attacker);
 attacker.age=heavy.startup+heavy.active;
 attacker.spent=false;attacker.hitConfirmed=false;attacker.chain=1;
 const initialHealth=[defender.hp,attacker.hp];
 const events=[];
 for(let frame=0;frame<frames;frame++){
  const pair=[huntInput(),huntInput()];
  // Attacker's paid L1 is allowed exactly after the experimental 4F
  // missed-R2 lock. Both players use real commands, not forced actions.
  if(frame===4)pair[attackerSlot]={...huntInput(),act:'trick'};
  if(frame===responseDelay){
   pair[defenderSlot]={...huntInput(),act:answer,
    x:answer==='step'?defender.dir:0};
  }
  huntStep(state,pair,events);
 }
 const counterHit=events.find(e=>e.kind==='hit'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const opponentHit=events.find(e=>e.kind==='hit'&&
  e.actor===attackerSlot&&e.target===defenderSlot);
 const gunParry=events.find(e=>e.kind==='gunParry'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const gunChip=events.find(e=>e.kind==='bulletHit'&&
  e.actor===defenderSlot&&e.target===attackerSlot);
 const followup=events.find(e=>e.kind==='action'&&
  e.actor===attackerSlot&&['unfurl','refold'].includes(e.move));
 const whiffRecoveryPunish=Boolean(counterHit?.punishedRecovery&&
  counterHit.punishedMove===attackerForm+attackerHeavy);
 const transformStartupInterrupt=Boolean(counterHit?.hitDuringStartup&&
  ['unfurl','refold'].includes(counterHit.interruptedMove));
 const category=gunParry?'gunParry':whiffRecoveryPunish?'realWhiffRecoveryHit':
  transformStartupInterrupt?'transformStartupInterrupt':
  counterHit?'otherMeleeContact':gunChip?'gunChipNotParry':'noOffensiveCounter';
 return Object.freeze({
  rules:state.rules,hz:HUNT_HZ,attackerWeapon,defenderWeapon,
  attackerForm,attackerHeavy,defenderSlot,answer,responseDelay,arenaSide,
  distance,frames,category,
  // True geometry and actual hit reaction, never scored by key press.
  whiffRecoveryPunish,transformStartupInterrupt,gunParry:Boolean(gunParry),
  firearmChip:Boolean(gunChip),counterConnected:Boolean(counterHit),
  counterMove:counterHit?.move??'',counterTick:counterHit?.tick??null,
  attackerStartedTrick:Boolean(followup),trickTick:followup?.tick??null,
  opponentConnected:Boolean(opponentHit),
  defenderLostHp:defender.hp<initialHealth[0],
  attackerLostHp:attacker.hp<initialHealth[1],
  defenderHp:defender.hp,attackerHp:attacker.hp,
  // If the counter is too late, the opponent can recover or hit;
  // absence of a response is a legitimate, inspectable result.
  initialMissedMove:attackerForm+attackerHeavy,
  sourceEvents:Object.freeze(events.map(e=>Object.freeze({...e})))
 });
}

export function huntWhiffResponseMatrix({
 delays=HUNT_NEUTRAL_RESPONSE_DELAYS,
 answers=HUNT_NEUTRAL_RESPONSE_ACTIONS,
 arenaSides=['center']
}={}){
 insist(Array.isArray(delays)&&delays.length>0&&
  delays.every(x=>Number.isInteger(x)&&x>=0&&x<45),'Invalid trial delays');
 insist(Array.isArray(answers)&&answers.length>0&&
  answers.every(x=>HUNT_NEUTRAL_RESPONSE_ACTIONS.includes(x)),
  'Invalid no-guard response actions');
 insist(Array.isArray(arenaSides)&&arenaSides.length>0&&
  arenaSides.every(x=>HUNT_NEUTRAL_ARENAS.includes(x)),
  'Invalid source-grounded arena sides');
 const rows=[];
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const attackerHeavy of HUNT_NEUTRAL_HEAVIES)
     for(const arenaSide of arenaSides)
      for(const defenderSlot of [0,1])
      for(const answer of answers)
       for(const responseDelay of delays){
        const result=huntWhiffResponseTrial({
         attackerWeapon,defenderWeapon,attackerForm,attackerHeavy,
         defenderSlot,answer,responseDelay,arenaSide
        });
        // Preserve source-backed outcomes and the projected input horizon,
        // but avoid duplicating thousands of frame events in the report.
        const {sourceEvents,...summary}=result;
        rows.push(Object.freeze(summary));
       }
 return Object.freeze(rows);
}

if(process.argv[1]?.endsWith('hunt-whiff-response-matrix.mjs')){
 const results=huntWhiffResponseMatrix();
 const categories={};
 for(const row of results)categories[row.category]=(categories[row.category]??0)+1;
 console.log(JSON.stringify({
  rules:'sf-hunt-lab/3',hz:HUNT_HZ,type:'SOURCE_SIMULATED_NO_GUARD_RESPONSE',
  note:'Seeded missed-R2 recovery, full real 60Hz collision/inputs; not human-reaction validation',
  scenarioCount:results.length,categories,rows:results
 },null,2));
}
