// English-only, source-evidenced 1v1 practice challenges.
// Adapt training UX (anti-air, whiff punish, decision reads) from other fighters
// without importing their guard/throw/high-mid-low combat systems.
// Never edits the authoritative Hunt v3 state, derives ranked outcomes, or
// treats an attempted command as proof that an attack actually connected.
export const HUNT_TRAINING_SCORE_SCHEMA='sf-hunt-training-score/1';
export const HUNT_TRAINING_GOALS=Object.freeze({
 free:{category:'Open Practice',goal:'Explore original Hunt v3 combat freely.',trigger:'',success:''},
 'parry-heavy':{category:'Defense',goal:'Time a firearm counter against a committed heavy windup.',trigger:'heavy',success:'gunParry'},
 'parry-heal':{category:'Defense',goal:'Counter the opponent during a real vial-healing animation.',trigger:'heal',success:'gunParry'},
 'parry-blood':{category:'Defense',goal:'Counter the opponent while crafting temporary blood rounds.',trigger:'blood',success:'gunParry'},
 'escape-stun':{category:'Defense',goal:'Quickstep out of ordinary hitstun after the eight-frame threshold.',trigger:'hit',success:'stunEscape'},
 'dodge-shot':{category:'Defense',goal:'Quickstep during an incoming firearm shot without taking the hit.',trigger:'shot',success:'dodgeShot'},
 'anti-air':{category:'Defense',goal:'Connect a legal attack against a genuine airborne opponent.',trigger:'jump',success:'airHit'},
 'air-parry':{category:'Defense',goal:'Jump once and land an airborne firearm parry on a committed heavy action.',trigger:'heavy',success:'airParry'},
 'whiff-punish':{category:'Offense',goal:'Strike the enemy after their heavy attack misses during its recovery.',trigger:'whiff',success:'whiffPunish'},
 'hit-confirm':{category:'Offense',goal:'Follow an actual melee hit with a second confirmed melee contact.',trigger:'hit',success:'hitConfirm'},
 'transform-pressure':{category:'Offense',goal:'Land a real melee hit shortly after your weapon transforms.',trigger:'transform',success:'transformHit'},
 'rally-reclaim':{category:'Resources',goal:'Take a real melee hit, then reclaim health through a confirmed melee strike.',trigger:'hit',success:'rally'},
 'blood-economy':{category:'Resources',goal:'Create five temporary rounds at an HP cost and fire one afterward.',trigger:'bloodBullets',success:'bloodShot'},
 'timing-read':{category:'Reads & Footsies',goal:'Recognize a heavy windup or a genuine feint; punish its recovery.',trigger:'feint',success:'feintPunish'},
 'visceral-followup':{category:'Offense',goal:'Convert a successful firearm counter into a real timed visceral strike.',trigger:'gunParry',success:'visceral'}
});
const is=(e,kind,actor,move)=>e.kind===kind&&e.actor===actor&&
 (move===undefined||e.move===move);
const earlier=(events,index,predicate,min,max)=>{
 const e=events[index];
 for(let j=index-1;j>=0;j--){
  const past=events[j];
  if(e.tick-past.tick>max)break;
  if(e.tick-past.tick>=min&&predicate(past))return past;
 }
 return null;
};
/**
 * Check immutable, already-confirmed source event evidence only.
 * Evidence must be produced on fixed Hunt v3 ticks. It is not verified PvP,
 * does not include Elo, nor does it reward a mere keypress as a hit.
 */
export function evaluateHuntTrainingGoal(drill,evidence=[]){
 if(!Object.hasOwn(HUNT_TRAINING_GOALS,drill))
  throw TypeError('Unknown English Hunt v3 1v1 training goal');
 if(!Array.isArray(evidence))throw TypeError('Source event evidence array required');
 const definition=HUNT_TRAINING_GOALS[drill];
 let attempts=0,successes=0,lastSuccessTick=null;
 // Every evidence entry comes from the local 60Hz source state projection.
 // Stable order matters for reaction/convert sequences.
 const entries=evidence.filter(e=>e&&Number.isSafeInteger(e.tick)&&
  e.tick>=0&&typeof e.kind==='string');
 const success=e=>{
  successes++;lastSuccessTick=e.tick;
 };
 for(let i=0;i<entries.length;i++){
  const e=entries[i];
  if(drill==='parry-heavy'&&is(e,'action',1,'foldedHeavy')||
   drill==='parry-heal'&&is(e,'action',1,'heal')||
   drill==='parry-blood'&&is(e,'action',1,'blood')||
   drill==='escape-stun'&&is(e,'hit',1)||
   drill==='dodge-shot'&&is(e,'action',1,'shot')||
   drill==='anti-air'&&is(e,'jump',1)||
   drill==='air-parry'&&is(e,'action',1,'foldedHeavy')||
   drill==='whiff-punish'&&is(e,'whiff',1,'foldedHeavy')||
   drill==='hit-confirm'&&is(e,'hit',0)||
   drill==='transform-pressure'&&is(e,'transform',0)||
   drill==='rally-reclaim'&&is(e,'hit',1)||
   drill==='blood-economy'&&is(e,'bloodBullets',0)||
   drill==='timing-read'&&is(e,'action',1,'feint')||
   drill==='visceral-followup'&&is(e,'gunParry',0))attempts++;
  switch(drill){
   case 'parry-heavy':
   case 'parry-heal':
   case 'parry-blood':{
    if(!is(e,'gunParry',0))break;
    const move=drill==='parry-heavy'?'foldedHeavy':drill==='parry-heal'?'heal':'blood';
    if(earlier(entries,i,p=>is(p,'action',1,move),0,44))success(e);
    break;
   }
   case 'escape-stun':
    if(is(e,'action',0,'step')&&e.playerStartedStunned===true)success(e);
    break;
   case 'dodge-shot':
    if(is(e,'whiff',1,'shot')&&
       earlier(entries,i,p=>is(p,'action',0,'step')&&p.distance<=300,0,18)&&
       earlier(entries,i,p=>is(p,'action',1,'shot'),0,40))success(e);
    break;
   case 'anti-air':
    if((is(e,'hit',0)||is(e,'bulletHit',0))&&e.opponentAirborne===true)success(e);
    break;
   case 'air-parry':
    if(is(e,'gunParry',0)&&e.playerAirborne===true)success(e);
    break;
   case 'whiff-punish':
    if(is(e,'hit',0)&&earlier(entries,i,p=>is(p,'whiff',1,'foldedHeavy'),0,45))
     success(e);
    break;
   case 'hit-confirm':
    if(is(e,'hit',0)&&e.combo>=2&&
      earlier(entries,i,p=>is(p,'hit',0),1,48))success(e);
    break;
   case 'transform-pressure':
    if(is(e,'hit',0)&&earlier(entries,i,p=>is(p,'transform',0),0,50))success(e);
    break;
   case 'rally-reclaim':
    if(is(e,'rally',0)&&e.health>0&&
      earlier(entries,i,p=>is(p,'hit',1),0,100))success(e);
    break;
   case 'blood-economy':
    if(is(e,'fire',0)&&
      earlier(entries,i,p=>is(p,'bloodBullets',0),0,150))success(e);
    break;
   case 'timing-read':
    if(is(e,'hit',0)&&
      earlier(entries,i,p=>is(p,'action',1,'feint'),0,50))success(e);
    break;
   case 'visceral-followup':
    if(is(e,'visceral',0)&&
       earlier(entries,i,p=>is(p,'gunParry',0),0,40))success(e);
    break;
  }
 }
 return Object.freeze({
  schema:HUNT_TRAINING_SCORE_SCHEMA,language:'en',mode:'unrated-offline-1v1',
  drill,category:definition.category,goal:definition.goal,
  attempts,successes,lastSuccessTick,completed:successes>0,
  // An attempt is a true opponent action, never a fictitious timed event.
  status:drill==='free'?'Explore the combat system.':
   successes>0?'Objective met with confirmed combat events.':
   attempts>0?'Opponent action observed. Objective not yet confirmed.':
   'Waiting for a source-valid training situation.'
 });
}
