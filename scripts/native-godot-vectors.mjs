// Generate a canonical 1,350-frame parity trace from the existing JS rules.
// Generated JSON is CI-only, not bundled into a consumer native release.
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {sideMatch,sideStep,sideInput} from '../public/side-engine.mjs';
const target=resolve('experiments/godot-native-4.7/tests/native_parity_vectors.json');
const move={'':0,cut:1,hew:2,shot:3,step:4,feint:5,stun:6,guardBreak:7};
const fields=['x','y','vx','vy','dir','hp','st','ammo','act','age','spent','crouch','jumpHeld','guardAge','regen','combo'];
let seed=0x9765bb12;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function input(t,slot){
 const r=rand(),a=rand(),b=rand();
 return {...sideInput(),x:r<.37?-1:r>.73?1:0,
  y:a<.055?-1:a>.91?1:0,
  act:b<.025?'cut':b<.043?'hew':b<.061?'shot':b<.085?'step':b<.102?'feint':'',
  guard:rand()<.21};
}
function encode(s){
 return [s.tick,s.clock,s.ready,s.end,s.round,...s.score,s.winner??-2,Number(s.over),
  ...s.p.flatMap(p=>fields.map(k=>k==='act'?move[p[k]]:
    typeof p[k]==='boolean'?Number(p[k]):p[k]))];
}
const trace=[],s=sideMatch();
for(let t=0;t<1350;t++){
 let p0=input(t,0),p1=input(t,1);
 if(t>=90&&t<250){
  p0={x:t<156?1:0,y:0,guard:false,act:t===180?'cut':t===215?'hew':''};
  p1={x:t<156?-1:0,y:0,guard:t>=160&&t<200,act:''};
 }
 const ints=[p0,p1].flatMap(p=>[p.x,p.y,move[p.act],Number(p.guard)]);
 sideStep(s,[p0,p1]);
 trace.push({i:ints,s:encode(s)});
}
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify({rules:s.rules,ticks:trace})+'\n');
console.log('NATIVE_GODOT_PARITY_VECTORS',trace.length,'lastTick',s.tick);
