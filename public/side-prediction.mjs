// Side-view movement-only input prediction. Authoritative health, stamina,
// attacks and close-range pushboxes are NEVER predicted or locally awarded.
// Entire saved online replay always uses the server-applied input tape.
import {sideInput,sideStep} from './side-engine.mjs';
export const SIDE_PREDICTION_LIMIT=12;
export function reconcileSide(state,slot,pending,ack){
 if(!state||![0,1].includes(slot)||!Array.isArray(pending)||!Number.isSafeInteger(ack))
  throw TypeError('Invalid side-view prediction state.');
 const outstanding=pending.filter(i=>i.seq>ack).slice(-SIDE_PREDICTION_LIMIT);
 const p=state.p[slot],q=state.p[1-slot];
 const safe=!state.ready&&!state.end&&!state.over&&!p.act&&!q.act&&
  Math.abs(p.x-q.x)>145&&outstanding.every(i=>!i.act&&!i.guard);
 if(!safe||!outstanding.length)return {pending:outstanding,p:{...p},predicted:false};
 const simulation=structuredClone(state),empty=sideInput();
 for(const input of outstanding){
  const own=simulation.p[slot],other=simulation.p[1-slot];
  if(Math.abs(own.x-other.x)<=145||own.act||other.act)break;
  sideStep(simulation,slot===0?[{...input,act:'',guard:false},empty]:[empty,{...input,act:'',guard:false}]);
  if(simulation.over||simulation.end)break;
 }
 return {pending:outstanding,p:simulation.p[slot],predicted:true};
}
