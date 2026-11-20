import {match,step} from './engine.mjs';

// Bump RULESET when match simulation changes. Never silently play old inputs under new rules.
export const RULESET='lantern-court/1';
export const MAX_TICKS=32000;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const actions=['','cut','hew','shot','step','feint'];
export const packInput=({x,y,act})=>alphabet[(x+1)*18+(y+1)*6+actions.indexOf(act)];
const unpack=ch=>{const n=alphabet.indexOf(ch);return {x:Math.floor(n/18)-1,y:Math.floor(n/6)%3-1,act:actions[n%6]};};
export const packTick=inputs=>packInput(inputs[0])+packInput(inputs[1]);
export function createReview(data){
 if(data?.rules!==RULESET)throw Error('Unsupported replay ruleset.');
 const tape=data.tape;
 if(typeof tape!=='string'||!tape.length||tape.length%2||tape.length>MAX_TICKS*2||!/^[A-Za-z0-1]+$/.test(tape))
   throw Error('Invalid replay input tape.');
 const total=tape.length/2, initial=match(), checkpoints=[initial], scan=structuredClone(initial);
 const inputs=t=>[unpack(tape[t*2]),unpack(tape[t*2+1])];
 const stride=120;
 for(let t=0;t<total;t++){
   if(scan.over)throw Error('Replay contains inputs after the match ended.');
   step(scan,inputs(t));
   if((t+1)%stride===0)checkpoints.push(structuredClone(scan));
 }
 return {total,complete:scan.over,inputs,at(t){
   if(!Number.isSafeInteger(t)||t<0||t>total)throw RangeError('Replay tick out of range.');
   const index=Math.floor(t/stride),state=structuredClone(checkpoints[index]);
   for(let i=index*stride;i<t;i++)step(state,inputs(i));
   return state;
 }};
}
