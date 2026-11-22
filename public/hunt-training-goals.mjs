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
 'stamina-escape':{category:'Resources',goal:'Preserve the costly 25-stamina hitstun escape. Dodge promptly after a REAL enemy hit instead of wasting early stamina.',trigger:'hit',success:'promptFundedEscape'},
 'dodge-shot':{category:'Defense',goal:'Quickstep during an incoming firearm shot without taking the hit.',trigger:'shot',success:'dodgeShot'},
 'anti-air':{category:'Defense',goal:'Connect a legal attack against a genuine airborne opponent.',trigger:'jump',success:'airHit'},
 'air-parry':{category:'Defense',goal:'Jump once and land an airborne firearm parry on a committed heavy action.',trigger:'heavy',success:'airParry'},
 'whiff-punish':{category:'Offense',goal:'Bait a real heavy miss and strike while the opponent is STILL in its locked recovery.',trigger:'whiff',success:'whiffPunish'},
 'dodge-punish':{category:'Defense',goal:'Bait an incoming quickstep; strike AFTER its real i-frames but BEFORE recovery ends.',trigger:'step',success:'dodgePunish'},
 'gun-whiff-punish':{category:'Reads & Footsies',goal:'Evade a real firearm shot, then land a melee hit before its vulnerable recovery ends.',trigger:'whiff',success:'gunWhiffPunish'},
 'counter-hit':{category:'Defense',goal:'Interrupt an incoming heavy windup with real melee contact BEFORE its attack becomes active.',trigger:'heavy',success:'counterHit'},
 'hit-confirm':{category:'Offense',goal:'Follow an actual melee hit with a second confirmed melee contact.',trigger:'hit',success:'hitConfirm'},
 'transform-pressure':{category:'Offense',goal:'Land a real melee hit shortly after your weapon transforms.',trigger:'transform',success:'transformHit'},
 'rally-reclaim':{category:'Resources',goal:'Take a real melee hit, then reclaim health through a confirmed melee strike.',trigger:'hit',success:'rally'},
 'blood-economy':{category:'Resources',goal:'Create five temporary rounds at an HP cost and fire one afterward.',trigger:'bloodBullets',success:'bloodShot'},
 'timing-read':{category:'Reads & Footsies',goal:'Read a committed heavy or a genuine feint, then retaliate when a safe opening appears.',trigger:'heavy',success:'timingPunish'},
 'parry-feint-read':{category:'Reads & Footsies',goal:'Parry a committed R2, or read the feint, save the bullet and actively create space.',trigger:'heavy',success:'gunParryOrFeintFootwork'},
 'visceral-followup':{category:'Offense',goal:'Convert a successful firearm counter into a real timed visceral strike.',trigger:'gunParry',success:'visceral'},
 'corner-escape':{category:'Defense',goal:'Escape the LEFT wall by a paid forward quickstep THROUGH the opponent during real i-frames.',trigger:'heavy',success:'cornerEscape'},
 'corner-escape-right':{category:'Defense',goal:'Escape the RIGHT wall by a paid forward quickstep THROUGH the opponent during real i-frames.',trigger:'heavy',success:'cornerEscape'},
 'corner-interrupt-left':{category:'Defense',goal:'At the LEFT wall, interrupt a real incoming R2 windup using a grounded R1 before its active hitbox.',trigger:'heavy',success:'cornerCounterHit'},
 'corner-interrupt-right':{category:'Defense',goal:'At the RIGHT wall, interrupt a real incoming R2 windup using a grounded R1 before its active hitbox.',trigger:'heavy',success:'cornerCounterHit'}
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
 let attempts=0,successes=0,lastSuccessTick=null,lastAttemptTick=null;
 let lastIntervalFrames=null,bestIntervalFrames=null,intervalSum=0,intervalSamples=0;
 const creditedTimingOpportunities=new Set();
 // Every evidence entry comes from the local 60Hz source state projection.
 // Stable order matters for reaction/convert sequences.
 const entries=evidence.filter(e=>e&&Number.isSafeInteger(e.tick)&&
  e.tick>=0&&typeof e.kind==='string');
 const success=(e,sourceTick=lastAttemptTick)=>{
  successes++;lastSuccessTick=e.tick;
  if(Number.isSafeInteger(sourceTick)&&sourceTick>=0&&sourceTick<=e.tick){
   const elapsed=e.tick-sourceTick;
   lastIntervalFrames=elapsed;
   bestIntervalFrames=bestIntervalFrames===null?elapsed:Math.min(bestIntervalFrames,elapsed);
   intervalSum+=elapsed;
   intervalSamples++;
  }
 };
 for(let i=0;i<entries.length;i++){
  const e=entries[i];
  if(drill==='parry-heavy'&&is(e,'action',1,'foldedHeavy')||
   drill==='parry-feint-read'&&is(e,'action',1,'foldedHeavy')||
   drill==='parry-heal'&&is(e,'action',1,'heal')||
   drill==='parry-blood'&&is(e,'action',1,'blood')||
   drill==='escape-stun'&&is(e,'hit',1)||
   drill==='stamina-escape'&&is(e,'hit',1)&&e.target===0||
   drill==='dodge-shot'&&is(e,'action',1,'shot')||
   drill==='anti-air'&&is(e,'jump',1)||
   drill==='air-parry'&&is(e,'action',1,'foldedHeavy')||
   drill==='whiff-punish'&&is(e,'whiff',1,'foldedHeavy')||
   drill==='dodge-punish'&&is(e,'action',1,'step')||
   drill==='gun-whiff-punish'&&is(e,'whiff',1,'shot')||
   drill==='counter-hit'&&is(e,'action',1,'foldedHeavy')||
   drill==='hit-confirm'&&is(e,'hit',0)||
   drill==='transform-pressure'&&is(e,'transform',0)||
   drill==='rally-reclaim'&&is(e,'hit',1)||
   drill==='blood-economy'&&is(e,'bloodBullets',0)||
   drill==='timing-read'&&is(e,'action',1,'foldedHeavy')||
   drill==='visceral-followup'&&is(e,'gunParry',0)||
   drill==='corner-escape'&&is(e,'action',1,'foldedHeavy')&&e.playerWall==='left'||
   drill==='corner-escape-right'&&is(e,'action',1,'foldedHeavy')&&e.playerWall==='right'||
   drill==='corner-interrupt-left'&&is(e,'action',1,'foldedHeavy')&&e.playerWall==='left'||
   drill==='corner-interrupt-right'&&is(e,'action',1,'foldedHeavy')&&e.playerWall==='right'){
   attempts++;
   lastAttemptTick=e.tick;
  }
  switch(drill){
   case 'parry-heavy':
   case 'parry-feint-read':
   case 'parry-heal':
   case 'parry-blood':{
    if(drill==='parry-feint-read'&&
      is(e,'feintReadWindowClosed',1,'feint')&&
      e.sourceStateVerified===true){
     const feint=earlier(entries,i,p=>is(p,'action',1,'feint'),1,24);
     const heavy=earlier(entries,i,p=>is(p,'action',1,'foldedHeavy'),1,60);
     // A no-input/passive dummy feint is NOT proof of a human read.
     // Reward only real, source-observed FOOTWORK creating safe space,
     // and only if no firearm was wasted since the R2 commitment.
     if(feint&&heavy&&heavy.tick<feint.tick&&
       Number.isFinite(e.playerX)&&Number.isFinite(feint.playerX)&&
       Math.abs(e.playerX-feint.playerX)>=12&&
       Number.isFinite(e.distance)&&Number.isFinite(feint.distance)&&
       e.distance>=feint.distance+8&&
       !entries.some(p=>p.tick>=heavy.tick&&p.tick<=e.tick&&
        is(p,'action',0)&&['shot','airShot'].includes(p.move)))
      success(e,heavy.tick);
     break;
    }
    if(!is(e,'gunParry',0))break;
    const move=['parry-heavy','parry-feint-read'].includes(drill)?
     'foldedHeavy':drill==='parry-heal'?'heal':'blood';
    // The impact-frame source parry MUST interrupt this exact action.
    // A heavy that previously feinted into something else must not award
    // Counter Heavy Windup; neither may unrelated historical healing/blood.
    if(e.target===1&&e.interruptedMove===move&&
       Number.isInteger(e.interruptedAge)&&e.interruptedAge>=1&&
       earlier(entries,i,p=>is(p,'action',1,move),0,44))success(e);
    break;
   }
   case 'escape-stun':
    if(is(e,'action',0,'step')&&e.playerStartedStunned===true)success(e);
    break;
   case 'stamina-escape':{
    // The core already rejects actions below (19+6) stamina. Score ONLY a
    // real paid dodge out of ordinary stun soon after real melee damage.
    // A normal neutral dodge once stun expired, a delayed regenerated
    // escape or an action input which failed to start gets no credit.
    if(!is(e,'action',0,'step')||e.playerStartedStunned!==true)break;
    const hit=earlier(entries,i,p=>is(p,'hit',1)&&p.target===0,8,12);
    if(hit)success(e,hit.tick);
    break;
   }
   case 'dodge-shot':
    // A firearm can miss because it was too far away or fired backward.
    // Only score a true dodge when the practice projection confirms that
    // the shot's active hitbox overlapped the player's actual hurtbox
    // during existing quickstep i-frames (not mere distance or keypress).
    if(is(e,'whiff',1,'shot')&&e.confirmedDodgeEvade===true&&
       earlier(entries,i,p=>is(p,'action',0,'step'),0,18)&&
       earlier(entries,i,p=>is(p,'action',1,'shot'),0,40))success(e);
    break;
   case 'anti-air':
    if((is(e,'hit',0)||is(e,'bulletHit',0))&&e.opponentAirborne===true)success(e);
    break;
   case 'air-parry':
    if(is(e,'gunParry',0)&&e.playerAirborne===true)success(e);
    break;
   case 'counter-hit':
    if(is(e,'hit',0)&&e.hitDuringStartup===true&&
       e.interruptedMove==='foldedHeavy'&&e.remainingStartup>0&&
       earlier(entries,i,p=>is(p,'action',1,'foldedHeavy'),0,25))
     success(e);
    break;
   case 'dodge-punish':
    if(is(e,'hit',0)&&e.punishedDodgeRecovery===true&&
       Number.isInteger(e.dodgeRecoveryFrames)&&e.dodgeRecoveryFrames>0&&
       earlier(entries,i,p=>is(p,'action',1,'step'),0,25))
     success(e);
    break;
   case 'whiff-punish':
    if(is(e,'hit',0)&&e.punishedRecovery===true&&
       e.punishedMove==='foldedHeavy'&&e.remainingRecovery>0&&
       earlier(entries,i,p=>is(p,'whiff',1,'foldedHeavy'),0,25))
     success(e);
    break;
   case 'gun-whiff-punish':{
    // A successful gun parry, chip hit, mere attempted shot, or a late
    // normal melee hit is NOT a recovery punish. This needs the
    // authoritative *shot missed* event AND connected melee contact
    // inside the original firearm's remaining vulnerable recovery.
    const missed=earlier(entries,i,p=>is(p,'whiff',1,'shot'),0,25);
    if(is(e,'hit',0)&&e.target===1&&e.punishedRecovery===true&&
       e.punishedMove==='shot'&&e.remainingRecovery>0&&missed)
      success(e,missed.tick);
    break;
   }
   case 'hit-confirm':{
    if(is(e,'hit',0)&&e.combo>=2){
     const prior=earlier(entries,i,p=>is(p,'hit',0),1,48);
     if(prior)success(e,prior.tick);
    }
    break;
   }
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
   case 'timing-read':{
    if(!is(e,'hit',0)||e.target!==1)break;
    // A genuine R2 whiff punish MUST have physically contacted that same
    // recovering R2, with an observed source whiff and no new opponent act.
    const missed=earlier(entries,i,p=>is(p,'whiff',1,'foldedHeavy'),1,25);
    const newActionSince=fromTick=>entries.some(p=>p.tick>fromTick&&
     p.tick<=e.tick&&is(p,'action',1));
    if(missed&&e.punishedRecovery===true&&
       e.punishedMove==='foldedHeavy'&&e.remainingRecovery>0&&
       !newActionSince(missed.tick)&&
       !creditedTimingOpportunities.has('whiff:'+missed.tick)){
     creditedTimingOpportunities.add('whiff:'+missed.tick);
     success(e,missed.tick);
     break;
    }
    // The separate FEINT branch is an active spacing/read conversion,
    // not a false claim that the rival is still punishable in R2 recovery.
    // It needs a REAL heavy -> authored feint, a MELEE HIT within a short
    // decision window, and NO newly started enemy action before contact.
    const feint=earlier(entries,i,p=>is(p,'action',1,'feint'),1,20);
    if(!feint||newActionSince(feint.tick)||
       creditedTimingOpportunities.has('feint:'+feint.tick))break;
    const j=entries.indexOf(feint);
    const committed=earlier(entries,j,p=>is(p,'action',1,'foldedHeavy'),1,18);
    if(!committed)break;
    const switched=entries.some(p=>p.tick>committed.tick&&p.tick<feint.tick&&
     is(p,'action',1));
    if(switched)break;
    creditedTimingOpportunities.add('feint:'+feint.tick);
    success(e,feint.tick);
    break;
   }
   case 'corner-escape':
   case 'corner-escape-right':{
    const side=drill==='corner-escape'?'left':'right';
    const pressure=earlier(entries,i,p=>is(p,'action',1,'foldedHeavy')&&
      p.playerWall===side,0,48);
    if(is(e,'cornerEscape',0)&&e.side===side&&pressure)
     success(e,pressure.tick);
    break;
   }
   case 'corner-interrupt-left':
   case 'corner-interrupt-right':{
    const side=drill.endsWith('left')?'left':'right';
    const trigger=earlier(entries,i,p=>is(p,'action',1,'foldedHeavy')&&
      p.playerWall===side,0,25);
    // The R1 must physically connect before the opponent's heavy hitbox
    // starts. A gun shot, a late R1, or the wrong-wall drill earns nothing.
    if(is(e,'hit',0)&&e.move==='foldedLight'&&
       e.hitDuringStartup===true&&
       e.interruptedMove==='foldedHeavy'&&e.remainingStartup>0&&trigger)
      success(e,trigger.tick);
    break;
   }
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
  // Genuine scenario trigger -> confirmed source combat outcome.
  // NOT physiological reaction time, input-to-photon or network latency.
  lastIntervalFrames,bestIntervalFrames,intervalSamples,
  averageIntervalFrames:intervalSamples?
   Number((intervalSum/intervalSamples).toFixed(2)):null,
  // An attempt is a true opponent action, never a fictitious timed event.
  status:drill==='free'?'Explore the combat system.':
   successes>0?'Objective met with confirmed combat events.':
   attempts>0?'Training situation observed. Objective not yet confirmed.':
   'Waiting for a source-valid training situation.'
 });
}
