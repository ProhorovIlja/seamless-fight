// Source-backed UNRATED 1v1 statistics computed from verified local Hunt v3
// input re-simulation. No accounts, anti-cheat proofs or synthetic ratings.
import {HUNT_RULESET,HUNT_HZ,HUNT_MOVES,huntStep}
 from './side-hunt-lab.mjs';
import {loadHuntReplay,huntReplayFingerprint} from './side-hunt-replay.mjs';

export const HUNT_STATS_SCHEMA='sf-hunt-practice-metrics/1';
const fresh=slot=>({
 slot,actionStarts:0,meleeStarts:0,meleeHits:0,meleeWhiffs:0,
 firearmShots:0,firearmHits:0,firearmParries:0,firearmWhiffs:0,
 viscerals:0,visceralAttempts:0,
 damageFromConfirmedEvents:0,damageTakenFromConfirmedEvents:0,
 dodgeEscapes:0,quicksteps:0,rearStaggers:0,cornerEscapes:0,
 recoveryPunishes:0,firearmRecoveryPunishes:0,
 dodgeVulnerableTailPunishes:0,dodgeRecoveryPunishes:0,startupInterrupts:0,
 vialsUsed:0,bloodRituals:0,bloodRoundsCreated:0,
 rallyHealthReclaimed:0,maxCombo:0
});
function isMelee(name){
 return name!=='shot'&&name!=='airShot'&&name!=='visceral'&&
  Object.hasOwn(HUNT_MOVES,name)&&HUNT_MOVES[name].damage>0;
}
export function analyzeHuntReplay(capture){
 // The generic loader validates schema, input count, canonical input stream,
 // exact version, final tick and source-state fingerprint. This fingerprint
 // is an offline corruption check, NOT a cryptographic match attestation.
 const verified=loadHuntReplay(capture);
 const game=structuredClone(capture.startState);
 const players=[fresh(0),fresh(1)];
 const rounds=[];
 for(const inputs of capture.frames){
  const before=structuredClone(game.p);
  const events=[];
  huntStep(game,inputs,events);
  for(const ev of events){
   if(ev.kind==='round'){
    rounds.push({tick:ev.tick,winner:ev.winner,matchOver:ev.over===true});
    continue;
   }
   if(![0,1].includes(ev.actor))continue;
   const p=players[ev.actor];
   const other=players[1-ev.actor];
   switch(ev.kind){
    case 'action':
     p.actionStarts++;
     if(isMelee(ev.move)||['light','heavy','charge','trick'].includes(ev.move))p.meleeStarts++;
     if(ev.move==='visceral')p.visceralAttempts++;
     if(ev.move==='step'){
      p.quicksteps++;
      if(before[ev.actor].act==='stun')p.dodgeEscapes++;
     }
     break;
    case 'hit':
     // Confirmed enemy state at impact, never inferred from a keypress.
     if(ev.punishedRecovery===true){
      p.recoveryPunishes++;
      if(['shot','airShot'].includes(ev.punishedMove))
       p.firearmRecoveryPunishes++;
     }
     if(ev.punishedDodgeVulnerableTail===true)p.dodgeVulnerableTailPunishes++;
     if(ev.punishedDodgeRecovery===true)p.dodgeRecoveryPunishes++;
     if(ev.hitDuringStartup===true)p.startupInterrupts++;
     p.meleeHits++;
     p.maxCombo=Math.max(p.maxCombo,Number(ev.combo)||1);
     p.damageFromConfirmedEvents+=ev.damage;
     other.damageTakenFromConfirmedEvents+=ev.damage;
     break;
    case 'whiff':
     if(isMelee(ev.move))p.meleeWhiffs++;
     if(ev.move==='shot'||ev.move==='airShot')p.firearmWhiffs++;
     break;
    case 'fire':
     p.firearmShots++;
     break;
    case 'bulletHit':
     p.firearmHits++;
     p.damageFromConfirmedEvents+=ev.damage;
     other.damageTakenFromConfirmedEvents+=ev.damage;
     break;
    case 'gunParry':{
     p.firearmHits++;p.firearmParries++;
     // Parry event lacks a separate damage field; the source firearm
     // always deals the same four raw damage before staggering.
     const shotDamage=Math.min(HUNT_MOVES.shot.damage,before[ev.target].hp);
     p.damageFromConfirmedEvents+=shotDamage;
     other.damageTakenFromConfirmedEvents+=shotDamage;
     break;
    }
    case 'visceral':
     p.viscerals++;
     p.damageFromConfirmedEvents+=ev.damage;
     other.damageTakenFromConfirmedEvents+=ev.damage;
     break;
    case 'rearStagger':p.rearStaggers++;break;
    case 'cornerEscape':p.cornerEscapes++;break;
    case 'heal':p.vialsUsed++;break;
    case 'bloodBullets':p.bloodRituals++;p.bloodRoundsCreated+=ev.bullets;break;
    case 'rally':p.rallyHealthReclaimed+=ev.health;break;
    default:break;
   }
  }
 }
 if(huntReplayFingerprint(game)!==verified.stats().fingerprint)
  throw Error('Statistics replay state diverged');
 const summary=players.map(p=>Object.freeze({
  ...p,
  firearmAccuracy:p.firearmShots?Number((p.firearmHits/p.firearmShots*100).toFixed(2)):null,
  meleeContactRate:p.meleeHits+p.meleeWhiffs?
   Number((p.meleeHits/(p.meleeHits+p.meleeWhiffs)*100).toFixed(2)):null,
  finalHealth:game.p[p.slot].hp,finalStamina:game.p[p.slot].st,
  finalAmmo:game.p[p.slot].ammo,finalBloodAmmo:game.p[p.slot].bloodAmmo,
  roundsWon:game.score[p.slot]
 }));
 return Object.freeze({
  schema:HUNT_STATS_SCHEMA,rules:HUNT_RULESET,mode:'unrated-local-1v1',
  language:'en',verifiedCompetitiveResult:false,
  offlineReplayIntegrityChecked:true,
  tickStart:capture.startState.tick,tickEnd:game.tick,
  observedFrames:capture.frames.length,observedSeconds:Number((capture.frames.length/HUNT_HZ).toFixed(3)),
  rounds:Object.freeze(rounds),players:Object.freeze(summary),
  matchComplete:game.over===true,winner:game.over?game.winner:null
 });
}
