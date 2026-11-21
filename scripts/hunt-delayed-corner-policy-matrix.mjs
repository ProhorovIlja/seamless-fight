// Seamless Fight: source-simulated 2.5D Hunt v3 corner decisions under delayed observations.
// Not rollback networking, proof of human reaction, or a completed balanced opponent.
import {pathToFileURL} from 'node:url';
import {huntMatch,huntStep,huntCanAct,HUNT_HZ,HUNT_RULESET,HUNT_WEAPONS,
 HUNT_HITSTUN_ESCAPE_START,HUNT_MOVES} from '../public/side-hunt-lab.mjs';

export const HUNT_DELAYED_CORNER_SCHEMA='sf-hunt-delayed-corner-read/1';
export const HUNT_OBSERVATION_DELAYS=Object.freeze([0,4,8]);
export const HUNT_CORNER_RESPONSES=Object.freeze(['hold','counterpoke','read-shot','cross-step','hybrid']);
export const HUNT_ATTACKER_PATTERNS=Object.freeze(['heavy','feint-heavy','delayed-heavy','mixed-light-heavy']);
export const HUNT_CORNER_RESOURCE_LEVELS=Object.freeze([0,30,100]);
const FRAMES=240;
const cmd=(act='',x=0)=>({act,x,y:0,guard:false});
const observe=p=>Object.freeze({act:p.act,age:p.age,x:p.x,dir:p.dir,form:p.form});
const counts=(events,kind,actor,target)=>events.filter(e=>e.kind===kind&&e.actor===actor&&
 (target===undefined||e.target===target)).length;

function defenderInput(me,read,policy,inward){
 const available=huntCanAct(me);
 const distance=Math.abs(me.x-read.x);
 const canShoot=available&&me.st>=HUNT_MOVES.shot.cost&&(me.ammo>0||me.bloodAmmo>0);
 const parryRead=read.act==='foldedHeavy'&&read.age>=3&&read.age<=9;
 const canPoke=available&&me.st>=HUNT_MOVES.foldedLight.cost&&distance<=105;
 const inStun=me.act==='stun'&&me.age>=HUNT_HITSTUN_ESCAPE_START;
 // The rival's action/age used here is from the PAST observation record.
 // The defender is allowed to know its own HP, move and stamina immediately.
 if(policy==='hold')return cmd();
 if(policy==='counterpoke')return cmd(canPoke?'light':'',inward);
 if(policy==='read-shot')return cmd(canShoot&&parryRead?'shot':'');
 if(policy==='cross-step'){
  if(inStun&&me.st>=HUNT_MOVES.step.cost+6)return cmd('step',inward);
  if(available&&me.st>=HUNT_MOVES.step.cost&&
   read.act==='foldedHeavy'&&read.age>=8&&read.age<=12)
   return cmd('step',inward);
  return cmd('',inward);
 }
 if(policy==='hybrid'){
  if(inStun&&me.st>=HUNT_MOVES.step.cost+6)return cmd('step',inward);
  if(canShoot&&parryRead)return cmd('shot');
  if(canPoke)return cmd('light');
  return cmd('',inward);
 }
 throw TypeError('Unknown corner defender strategy');
}

function attackerInput(me,pattern,attacksStarted,frame){
 const ready=huntCanAct(me);
 if(pattern==='feint-heavy'&&me.act==='foldedHeavy'&&
  me.age>=7&&me.age<=9&&attacksStarted%2===1&&me.st>=HUNT_MOVES.feint.cost)
  return cmd('feint');
 if(!ready)return cmd();
 if(pattern==='heavy')return cmd('heavy');
 if(pattern==='feint-heavy')return cmd('heavy');
 if(pattern==='delayed-heavy')return cmd(frame%14===0?'heavy':'');
 if(pattern==='mixed-light-heavy')return cmd(attacksStarted%2===0?'light':'heavy');
 throw TypeError('Unknown corner attacker pattern');
}

export function huntDelayedCornerScenario({
 defenderWeapon='mournweave',attackerWeapon='mournweave',wall='left',
 initialStamina=30,observationDelay=0,defenderPolicy='hybrid',attackerPattern='heavy'
}={}){
 if(!HUNT_WEAPONS.includes(defenderWeapon)||!HUNT_WEAPONS.includes(attackerWeapon)||
  !['left','right'].includes(wall)||!HUNT_CORNER_RESOURCE_LEVELS.includes(initialStamina)||
  !HUNT_OBSERVATION_DELAYS.includes(observationDelay)||
  !HUNT_CORNER_RESPONSES.includes(defenderPolicy)||
  !HUNT_ATTACKER_PATTERNS.includes(attackerPattern))
  throw TypeError('Unsupported delayed corner scenario');
 const s=huntMatch({weapons:[defenderWeapon,attackerWeapon]});
 s.ready=0;
 const inward=wall==='left'?1:-1;
 s.p[0].x=wall==='left'?65:895;
 s.p[1].x=wall==='left'?130:830;
 // Maintain genuine physical orientation; neither actor is teleported to escape.
 s.p[0].dir=inward;
 s.p[1].dir=-inward;
 s.p[0].st=initialStamina;
 const events=[],history=[observe(s.p[1])];
 let attacksStarted=0,firstDamageTick=null;
 let actionableAfterDamage=0,neutralAfterDamage=0;
 for(let frame=0;frame<FRAMES;frame++){
  const readIndex=Math.max(0,history.length-1-observationDelay);
  const read=history[readIndex],start=events.length;
  const attackInput=attackerInput(s.p[1],attackerPattern,attacksStarted,frame);
  const defenseInput=defenderInput(s.p[0],read,defenderPolicy,inward);
  huntStep(s,[defenseInput,attackInput],events);
  history.push(observe(s.p[1]));
  for(let i=start;i<events.length;i++){
   const e=events[i];
   if(e.kind==='action'&&e.actor===1&&
    ['foldedHeavy','foldedLight'].includes(e.move))attacksStarted++;
   if(firstDamageTick===null&&e.kind==='hit'&&e.target===0)
    firstDamageTick=e.tick;
  }
  if(firstDamageTick!==null&&s.p[0].hp>0){
   if(huntCanAct(s.p[0]))actionableAfterDamage++;
   if(!s.p[0].act)neutralAfterDamage++;
  }
  if(s.end||s.over)break;
 }
 const dodgeHits=events.filter(e=>e.kind==='hit'&&e.actor===1);
 const defensiveContacts=events.filter(e=>e.kind==='hit'&&e.actor===0);
 // Punish labels are produced ONLY by actual resolved 60Hz melee contact.
 // No near-miss, failed input, elapsed-time guess or practice-script award.
 const attackerPunishesDodgeTail=dodgeHits.filter(e=>e.punishedDodgeVulnerableTail===true).length;
 const attackerPunishesDodgeRecovery=dodgeHits.filter(e=>e.punishedDodgeRecovery===true).length;
 const attackerStartupInterrupts=dodgeHits.filter(e=>e.hitDuringStartup===true).length;
 const defenderWhiffRecoveryPunishes=defensiveContacts.filter(e=>e.punishedRecovery===true).length;
 const defenderStartupInterrupts=defensiveContacts.filter(e=>e.hitDuringStartup===true).length;
 const report={
  defenderWeapon,attackerWeapon,wall,initialStamina,observationDelay,
  defenderPolicy,attackerPattern,simulationHz:HUNT_HZ,rules:HUNT_RULESET,
  opponentObservationModel:'prior-completed-tick-plus-0-4-8-frame-history',
  finalTick:s.tick,firstDamageTick,
  defenderHP:s.p[0].hp,attackerHP:s.p[1].hp,
  defenderStamina:s.p[0].st,attackerStamina:s.p[1].st,
  startedAttackerMoves:attacksStarted,
  actualAttackerFeints:events.filter(e=>e.kind==='action'&&e.actor===1&&e.move==='feint').length,
  landedAttackerHits:dodgeHits.length,
  defenderMeleeHits:counts(events,'hit',0,1),
  // Distinct real risk of a committed dodge versus a missed poke:
  // tail is AFTER i-frames but BEFORE recovery, not a "recovery punish".
  attackerPunishesDodgeTail,attackerPunishesDodgeRecovery,
  attackerStartupInterrupts,defenderWhiffRecoveryPunishes,
  defenderStartupInterrupts,
  confirmedDefenderGunParries:counts(events,'gunParry',0,1),
  confirmedDefenderCornerCrossings:counts(events,'cornerEscape',0,1),
  defenderQuicksteps:events.filter(e=>e.kind==='action'&&e.actor===0&&e.move==='step').length,
  defenderShots:events.filter(e=>e.kind==='action'&&e.actor===0&&e.move==='shot').length,
  neutralAfterDamage,actionableAfterDamage,
  roundFinished:Boolean(s.end||s.over),
  defenderDefeated:s.p[0].hp===0,
  eventsContainForbiddenGuard:events.some(e=>['guard','block','throw','tag'].includes(e.kind))
 };
 return Object.freeze(report);
}

export function huntDelayedCornerMatrix(){
 const cases=[];
 for(const defenderWeapon of HUNT_WEAPONS)
  for(const attackerWeapon of HUNT_WEAPONS)
   for(const wall of ['left','right'])
    for(const initialStamina of HUNT_CORNER_RESOURCE_LEVELS)
     for(const observationDelay of HUNT_OBSERVATION_DELAYS)
      for(const defenderPolicy of HUNT_CORNER_RESPONSES)
       for(const attackerPattern of HUNT_ATTACKER_PATTERNS)
        cases.push(huntDelayedCornerScenario({defenderWeapon,attackerWeapon,wall,
         initialStamina,observationDelay,defenderPolicy,attackerPattern}));
 const byDelay=HUNT_OBSERVATION_DELAYS.map(observationDelay=>{
  const subset=cases.filter(x=>x.observationDelay===observationDelay);
  return Object.freeze({observationDelay,scenarios:subset.length,
   defeatedDefenders:subset.filter(x=>x.defenderDefeated).length,
   successfulParryCases:subset.filter(x=>x.confirmedDefenderGunParries>0).length,
   cornerCrossCases:subset.filter(x=>x.confirmedDefenderCornerCrossings>0).length,
   punishedDodgeTailCases:subset.filter(x=>x.attackerPunishesDodgeTail>0).length,
   punishedDodgeRecoveryCases:subset.filter(x=>x.attackerPunishesDodgeRecovery>0).length,
   defenderWhiffPunishCases:subset.filter(x=>x.defenderWhiffRecoveryPunishes>0).length,
   falseGuardEvents:subset.filter(x=>x.eventsContainForbiddenGuard).length});
 });
 return Object.freeze({
  schema:HUNT_DELAYED_CORNER_SCHEMA,rules:HUNT_RULESET,simulationHz:HUNT_HZ,
  scenarios:cases.length,maxFrames:FRAMES,
  defenderUsesDelayedOpponentObservation:true,
  attackerHasFourScriptedPatterns:true,
  noActualNetworkRollbackHere:true,notHumanAI:true,notBalanceCertified:true,
  note:'Deterministic source simulation; delayed opponent action observations are not end-to-end input latency, packet loss, rollback or human reaction. Success or defeat is policy-specific, never a forced-combo proof.',
  byDelay:Object.freeze(byDelay),cases:Object.freeze(cases)
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {cases,...summary}=huntDelayedCornerMatrix();
 console.log(JSON.stringify(summary,null,2));
}
