// Source-derived native Godot Hunt v3 60Hz integration vectors; CI-only.
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {huntMatch,huntStep,huntInput,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
const request={'':0,light:1,heavy:2,charge:3,trick:4,shot:5,step:6,
 feint:7,sync:8,visceral:9,heal:10,blood:11};
const target=resolve('experiments/godot-native-4.7/tests/native_hunt_godot_vectors.json');
let seed=0x5a14c0de;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function pick(xs){return xs[Math.floor(rand()*xs.length)];}
const state=huntMatch({weapons:['mournweave','thornwake']});
const frames=[];
for(let t=0;t<900;t++){
 const input=[0,1].map(slot=>{
  const v=huntInput();
  v.x=t<156?(slot?-1:1):pick([-1,0,0,1]);
  v.y=t%121===24?-1:t%139===18?1:0;
  v.act=rand()<.18?pick(['light','heavy','charge','trick','shot',
   'step','feint','sync','visceral','heal','blood']):'';
  if(t>=160&&t<320){
   const phase=t%56;v.x=0;v.y=0;
   v.act=slot?(phase===0?'heavy':phase===37?'blood':''):
    (phase===7?'shot':phase===33?'light':phase===48?'trick':'');
  }
  return v;
 });
 const encoded=input.flatMap(v=>[v.x,v.y,request[v.act],0]);
 huntStep(state,input);
 frames.push({i:encoded,s:structuredClone(state)});
}
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify({rules:HUNT_RULESET,weaponPair:[0,1],ticks:frames})+'\n');
console.log('NATIVE_GODOT_HUNT_V3_SOURCE_VECTORS=PASS frames=900 fighters=2');
