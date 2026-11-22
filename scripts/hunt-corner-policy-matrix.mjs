// Seamless Fight — fixed 60Hz corner decisions, not a balance-certified opponent.
// No guard/throw, no synthetic state healing/teleport, no action granted by script.
// Deliberately scripted attacker presses heavy every tick; defender policies observe
// exact engine action frames. These are ORACLE policies, not human reaction models.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {huntMatch,huntStep,huntCanAct,HUNT_WEAPONS,HUNT_HZ,HUNT_RULESET,
 HUNT_HITSTUN_ESCAPE_START} from '../public/side-hunt-lab.mjs';

export const HUNT_CORNER_POLICY_SCHEMA='sf-hunt-corner-policy-matrix/1';
export const HUNT_CORNER_POLICIES=Object.freeze([
 'passive','retreat','dodge-on-stun','counterpoke','early-parry','late-parry','hybrid'
]);
export const HUNT_CORNER_STAMINA=Object.freeze([0,10,30,100]);
const MAX_FRAMES=220;
const input=(act='',x=0)=>({x,y:0,act,guard:false});

// A state-aware training script, not a competitive AI implementation.
function defenderCommand(p,q,policy,inward){
 const actionable=huntCanAct(p);
 const stunned=p.act==='stun'&&p.age>=HUNT_HITSTUN_ESCAPE_START;
 const inPokeRange=Math.abs(p.x-q.x)<=105;
 const parryableRead=q.act==='foldedHeavy';
 const canShoot=actionable&&p.st>=9&&(p.ammo>0||p.bloodAmmo>0);
 const canPoke=actionable&&p.st>=10&&inPokeRange;
 let act='',x=inward;
 if(policy==='passive')x=0;
 else if(policy==='retreat')x=actionable?-inward:inward;
 else if(policy==='dodge-on-stun'&&stunned)act='step';
 else if(policy==='counterpoke'&&canPoke)act='light';
 else if(policy==='early-parry'&&canShoot&&parryableRead&&q.age>=6&&q.age<=7)
  act='shot';
 else if(policy==='late-parry'&&canShoot&&parryableRead&&q.age>=12&&q.age<=13)
  act='shot';
 else if(policy==='hybrid'){
  if(stunned)act='step';
  else if(canShoot&&parryableRead&&q.age>=6&&q.age<=7)act='shot';
  else if(canPoke)act='light';
 }
 return input(act,x);
}

export function huntCornerPolicyScenario(defenderWeapon,attackerWeapon,wall,initialStamina,policy){
 if(!HUNT_WEAPONS.includes(defenderWeapon)||!HUNT_WEAPONS.includes(attackerWeapon)||
  !['left','right'].includes(wall)||!HUNT_CORNER_STAMINA.includes(initialStamina)||
  !HUNT_CORNER_POLICIES.includes(policy))throw TypeError('Unsupported fixed corner audit case');
 const state=huntMatch({weapons:[defenderWeapon,attackerWeapon]});
 state.ready=0;
 const inward=wall==='left'?1:-1;
 state.p[0].x=wall==='left'?65:895;
 state.p[1].x=wall==='left'?130:830;
 state.p[0].st=initialStamina;
 const events=[];
 let firstDamageTick=null,actionableAfterDamage=0,neutralAfterDamage=0;
 for(let frame=0;frame<MAX_FRAMES;frame++){
  const [defender,attacker]=state.p;
  const start=events.length;
  huntStep(state,[defenderCommand(defender,attacker,policy,inward),input('heavy')],events);
  for(let k=start;k<events.length;k++){
   const e=events[k];
   if(e.kind==='hit'&&e.target===0&&firstDamageTick===null)
    firstDamageTick=e.tick;
  }
  if(firstDamageTick!==null&&state.p[0].hp>0){
   if(huntCanAct(state.p[0]))actionableAfterDamage++;
   if(!state.p[0].act)neutralAfterDamage++;
  }
  if(state.end||state.over)break;
 }
 const defenderEvents=events.filter(e=>e.actor===0);
 const firstDamage=events.find(e=>e.kind==='hit'&&e.target===0);
 return Object.freeze({
  defenderWeapon,attackerWeapon,wall,initialStamina,policy,
  fixedOpponent:'repeat-folded-heavy',
  firstDamageTick,firstDamage:firstDamage?.damage??0,
  finalTick:state.tick,
  defenderHP:state.p[0].hp,attackerHP:state.p[1].hp,
  defenderStamina:state.p[0].st,
  defenderShotsLeft:state.p[0].ammo+state.p[0].bloodAmmo,
  hitsTaken:events.filter(e=>e.kind==='hit'&&e.target===0).length,
  meleeHitsGiven:events.filter(e=>e.kind==='hit'&&e.target===1).length,
  successfulGunParries:defenderEvents.filter(e=>e.kind==='gunParry').length,
  confirmedCornerCrossings:defenderEvents.filter(e=>e.kind==='cornerEscape').length,
  actualDodgeStarts:defenderEvents.filter(e=>e.kind==='action'&&e.move==='step').length,
  actualShotsStarted:defenderEvents.filter(e=>e.kind==='action'&&e.move==='shot').length,
  neutralAfterDamage,actionableAfterDamage,
  roundFinished:Boolean(state.end||state.over),
  defeated:state.p[0].hp<=0,
  opponentDefeated:state.p[1].hp<=0
 });
}

export function huntCornerPolicyMatrix(){
 const cases=[];
 for(const defenderWeapon of HUNT_WEAPONS)
  for(const attackerWeapon of HUNT_WEAPONS)
   for(const wall of ['left','right'])
    for(const initialStamina of HUNT_CORNER_STAMINA)
     for(const policy of HUNT_CORNER_POLICIES)
      cases.push(huntCornerPolicyScenario(
       defenderWeapon,attackerWeapon,wall,initialStamina,policy));
 const summary=HUNT_CORNER_POLICIES.map(policy=>{
  const xs=cases.filter(x=>x.policy===policy);
  const funded=xs.filter(x=>x.initialStamina>=30);
  return Object.freeze({
   policy,scenarios:xs.length,
   defenderKOs:xs.filter(x=>x.defeated).length,
   defenderMeleeContactCases:xs.filter(x=>x.meleeHitsGiven>0).length,
   successfulParryCases:xs.filter(x=>x.successfulGunParries>0).length,
   fundedCornerCrossCases:funded.filter(x=>x.confirmedCornerCrossings>0).length,
   casesWithActionableFramesAfterHit:xs.filter(x=>x.actionableAfterDamage>0).length
  });
 });
 assert.equal(cases.length,224);
 return Object.freeze({
  schema:HUNT_CORNER_POLICY_SCHEMA,rules:HUNT_RULESET,simulationHz:HUNT_HZ,
  maxFrames:MAX_FRAMES,notHumanAI:true,notBalanceCertified:true,
  note:'Full-frame state-observing fixed defenders versus heavy-only spam. Zero latency and no reaction delay: not fair human opponent models, not rollback, not proof of forced or escapable human combinations. An actionable frame after a hit means that a losing passive defense is not a true continuous hitstun lock.',
  summary:Object.freeze(summary),cases:Object.freeze(cases)
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {cases,...compact}=huntCornerPolicyMatrix();
 console.log(JSON.stringify(compact,null,2));
}
