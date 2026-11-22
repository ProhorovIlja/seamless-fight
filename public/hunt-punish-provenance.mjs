// Seamless Fight — source-event punish provenance, shared by offline
// visible-neutral and delayed-corner studies. This NEVER alters combat.
// A recovering victim is not evidence that the SAME move really whiffed.
// Labels require source whiff -> same-action contact, still in recovery.
export const HUNT_PUNISH_PROVENANCE_SCHEMA='sf-hunt-punish-provenance/1';

export function huntSourceWhiffPunishes(events,defender=0,attacker=1){
 if(!Array.isArray(events)||![0,1].includes(defender)||
    ![0,1].includes(attacker)||defender===attacker)
  throw TypeError('Expected 1v1 source events and distinct player slots');
 let missed=null,recoveryPhaseContacts=0,sourceConfirmedWhiffPunishes=0;
 const confirmations=[];
 for(const e of events){
  if(!e||!Number.isSafeInteger(e.tick)||e.tick<0)continue;
  if(e.kind==='action'&&e.actor===attacker)missed=null;
  if(e.kind==='whiff'&&e.actor===attacker)
   missed={tick:e.tick,move:e.move};
  if(e.kind==='hit'&&e.target===attacker){
   if(e.actor===defender&&e.punishedRecovery===true){
    recoveryPhaseContacts++;
    if(missed&&missed.move===e.punishedMove&&
       missed.tick<e.tick&&Number.isInteger(e.remainingRecovery)&&
       e.remainingRecovery>0){
     sourceConfirmedWhiffPunishes++;
     confirmations.push(Object.freeze({whiffTick:missed.tick,hitTick:e.tick,
      move:e.punishedMove,remainingRecovery:e.remainingRecovery}));
    }
   }
   // Melee contact interrupts the recovering move. A later hit
   // cannot double-credit the same source whiff after the action ends.
   missed=null;
  }
  if(e.kind==='gunParry'&&e.target===attacker||e.kind==='round')
   missed=null;
 }
 return Object.freeze({
  schema:HUNT_PUNISH_PROVENANCE_SCHEMA,
  recoveryPhaseContacts,sourceConfirmedWhiffPunishes,
  unconfirmedRecoveryContacts:recoveryPhaseContacts-sourceConfirmedWhiffPunishes,
  confirmations:Object.freeze(confirmations)
 });
}
