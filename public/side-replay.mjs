// Versioned and bounded deterministic side-view recordings.
// Two ASCII base64url characters per player per tick = four per tick.
import {SIDE_RULESET,sideMatch,sideStep} from './side-engine.mjs';
export const SIDE_TAPE_LIMIT=32000;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const actions=['','cut','hew','shot','step','feint'];
const encode=v=>{
 const x=v?.x===1?1:v?.x===-1?-1:0,y=v?.y===1?1:v?.y===-1?-1:0;
 const act=actions.indexOf(v?.act||'');
 if(act<0)throw Error('Unknown side-view replay action.');
 const n=(((x+1)*3+(y+1))*actions.length+act)*2+(v?.guard===true?1:0);
 return alphabet[Math.floor(n/64)]+alphabet[n%64];
};
const decode=text=>{
 const n=alphabet.indexOf(text[0])*64+alphabet.indexOf(text[1]);
 if(n<0||n>=108)throw Error('Invalid side-view replay input value.');
 const guard=Boolean(n%2),act=actions[Math.floor(n/2)%actions.length],vector=Math.floor(n/12);
 return {x:Math.floor(vector/3)-1,y:vector%3-1,act,guard};
};
export function packSideTick(input){
 if(!Array.isArray(input)||input.length!==2)throw TypeError('Recording expects two inputs.');
 return encode(input[0])+encode(input[1]);
}
export function createSideReview(recording){
 if(recording?.rules!==SIDE_RULESET)throw Error('Unsupported side-view replay ruleset.');
 const tape=recording?.tape;
 if(typeof tape!=='string'||!tape.length||tape.length%4||tape.length>SIDE_TAPE_LIMIT*4||!/^[A-Za-z0-9_-]+$/.test(tape))
  throw Error('Invalid side-view replay tape.');
 const total=tape.length/4,stride=120;
 const inputs=t=>{if(!Number.isSafeInteger(t)||t<0||t>=total)throw RangeError('Replay tick out of range.');
  return [decode(tape.slice(t*4,t*4+2)),decode(tape.slice(t*4+2,t*4+4))];};
 const first=sideMatch(),checkpoints=[structuredClone(first)],scan=structuredClone(first);
 for(let t=0;t<total;t++){
  if(scan.over)throw Error('Replay has inputs after the duel finished.');
  sideStep(scan,inputs(t));
  if((t+1)%stride===0)checkpoints.push(structuredClone(scan));
 }
 return {rules:SIDE_RULESET,total,inputs,complete:scan.over,at(t){
  if(!Number.isSafeInteger(t)||t<0||t>total)throw RangeError('Replay tick out of range.');
  const k=Math.floor(t/stride),s=structuredClone(checkpoints[k]);
  for(let i=k*stride;i<t;i++)sideStep(s,inputs(i));
  return s;
 }};
}
