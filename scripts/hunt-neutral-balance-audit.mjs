// Seamless Fight — reproducible Bloodborne-first neutral and corner pressure audit.
// Measures real 60Hz source actions: it does NOT certify a balanced competitive game.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {huntMatch,huntStep,HUNT_WEAPONS,HUNT_RULESET,HUNT_HZ} from '../public/side-hunt-lab.mjs';

export const HUNT_NEUTRAL_AUDIT_SCHEMA='sf-hunt-neutral-audit/1';
const c=(act='',x=0)=>({act,x,y:0,guard:false});

function footsies(attackAt){
 const state=huntMatch({weapons:['mournweave','mournweave']});
 state.ready=0;state.p[0].x=389;state.p[1].x=571;
 const events=[];
 for(let t=0;t<55;t++){
  const direction=t<6?-1:t<attackAt?1:0;
  huntStep(state,[c(t===attackAt?'light':'',direction),c(t===0?'heavy':'')],events);
 }
 const whiff=events.find(e=>e.kind==='whiff'&&e.actor===1&&e.move==='foldedHeavy');
 const hit=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(whiff&&hit,'Actual source neutral exchange must register missed heavy and melee contact');
 return Object.freeze({
  whiffTick:whiff.tick,contactTick:hit.tick,
  latencyAfterWhiff:hit.tick-whiff.tick,
  recoveryPunish:hit.punishedRecovery===true,
  remainingTargetRecoveryFrames:hit.remainingRecovery,
  targetMoveAtContact:hit.punishedMove,
  health:[state.p[0].hp,state.p[1].hp]
 });
}
function corner(defWeapon,attackWeapon,side,initialStamina){
 const state=huntMatch({weapons:[defWeapon,attackWeapon]});
 state.ready=0;
 const dir=side==='left'?1:-1;
 state.p[0].x=side==='left'?65:895;
 state.p[1].x=side==='left'?130:830;
 state.p[0].st=initialStamina;
 const events=[];
 let firstHitTick=null,firstEscapeTick=null,firstCrossTick=null;
 let neutralAfterDamageFrames=0;
 let completedTick=0;
 // Defender reacts to an ordinary melee hitstun window whenever it can.
 // Source commands are deliberately an OPTIMISTIC frame-perfect policy.
 for(let t=0;t<150;t++){
  const defender=state.p[0];
  const ready=defender.act==='stun'&&defender.age>=8;
  const before=events.length;
  huntStep(state,[c(ready?'step':'',dir),c('heavy')],events);
  for(let i=before;i<events.length;i++){
   const e=events[i];
   if(firstHitTick===null&&e.kind==='hit'&&e.target===0)firstHitTick=e.tick;
   if(firstEscapeTick===null&&e.kind==='action'&&e.actor===0&&e.move==='step')
    firstEscapeTick=e.tick;
   if(firstCrossTick===null&&e.kind==='cornerEscape'&&e.actor===0)firstCrossTick=e.tick;
  }
  if(firstHitTick!==null&&state.p[0].act===''&&state.p[0].hp>0)
   neutralAfterDamageFrames++;
  completedTick=state.tick;
  if(state.end||state.over)break;
 }
 return Object.freeze({
  defenderWeapon:defWeapon,attackerWeapon:attackWeapon,side,initialStamina,
  firstHitTick,firstEscapeTick,firstCrossTick,neutralAfterDamageFrames,
  actualHits:events.filter(e=>e.kind==='hit'&&e.target===0).length,
  defenderHP:state.p[0].hp,defenderStamina:state.p[0].st,
  attackerStamina:state.p[1].st,roundFinished:Boolean(state.end||state.over),
  completedTick,
  // A warning, not an assertion that every such matchup is unwinnable.
  exhaustedCornerZeroToDeath:initialStamina===0&&state.p[0].hp===0
 });
}
export function huntNeutralBalanceAudit(){
 const actualPunish=footsies(26),tooLate=footsies(39);
 const cornerMatrix=[];
 for(const defenderWeapon of HUNT_WEAPONS)
  for(const attackerWeapon of HUNT_WEAPONS)
   for(const side of ['left','right'])
    for(const startingStamina of [0,30,100])
     cornerMatrix.push(corner(defenderWeapon,attackerWeapon,side,startingStamina));
 return Object.freeze({
  schema:HUNT_NEUTRAL_AUDIT_SCHEMA,rules:HUNT_RULESET,
  hz:HUNT_HZ,notBalanceCertified:true,
  footsies:{actualPunish,tooLate},
  cornerMatrix,
  riskCases:cornerMatrix.filter(x=>x.exhaustedCornerZeroToDeath),
  // This data is intended for tuning true-combo limits, recoil and risk.
  // No simulated defender is awarded free stamina or an auto-wall-escape.
  note:'Fixed inputs and frame-perfect reaction only. Real PvP, recovery reads, rollback delay and human reaction times are untested.'
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log(JSON.stringify(huntNeutralBalanceAudit(),null,2));
