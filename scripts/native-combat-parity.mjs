import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sideMatch,sideInput,sideStep} from '../public/side-engine.mjs';

const MOVE=Object.freeze({'':0,cut:1,hew:2,shot:3,step:4,feint:5,stun:6,guardBreak:7});
const keys=['x','y','vx','vy','dir','hp','st','ammo','act','age','spent','crouch','jumpHeld','guardAge','regen','combo'];
const original=sideMatch();assert.equal(original.rules,'seamless-side/1');
const work=mkdtempSync(join(tmpdir(),'seamless-native-core-'));
const external=process.env.SF_NATIVE_CORE_EXE;
const exe=external?resolve(external):join(work,process.platform==='win32'?'sf-native-core.exe':'sf-native-core');
let seed=0x45ad1c72;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const action=()=>rnd()<.18?['cut','hew','shot','step','feint'][Math.floor(rnd()*5)]:'';
const traces=[];
for(let t=0;t<6500;t++){
 const scripted=t>90&&t<245;
 const a={...sideInput(),x:scripted?1:rnd()<.41?-1:rnd()<.76?1:0,
  y:rnd()<.04?-1:rnd()<.14?1:0,guard:rnd()<.15,act:action()};
 const b={...sideInput(),x:scripted?-1:rnd()<.45?1:rnd()<.84?-1:0,
  y:rnd()<.05?-1:rnd()<.18?1:0,guard:rnd()<.16,act:action()};
 // Deterministic approach/hold sequence exercises true block and parry
 // windows before the random stress corpus starts. Never manipulate state.
 if(t>=90&&t<250){
  a.x=t<156?1:0;b.x=t<156?-1:0;
  a.y=0;b.y=0;
  a.guard=false;b.guard=(t>=160&&t<200)||(t>=233&&t<247);
  a.act=t===180?'cut':t===215?'hew':'';b.act='';
 }
 if(t>=250&&t%251===0){a.act='hew';b.act='shot';}
 traces.push([a,b]);
}
let compile;
try{
 if(!external){
 compile=spawnSync(process.env.CXX||'g++',[
  '-std=c++17','-O2','-Wall','-Wextra','-Werror','-ffp-contract=off','-fno-fast-math',
  resolve('native/combat/side_core.cpp'),'-o',exe],{encoding:'utf8',timeout:60000});
 if(compile.status!==0)throw Error('Native core compilation failed: '+compile.stderr);
 }
 const packet=traces.map(pair=>pair.flatMap(v=>[v.x,v.y,MOVE[v.act],Number(v.guard)]).join(' ')).join('\n')+'\n';
 const native=spawnSync(exe,[],{input:packet,encoding:'utf8',maxBuffer:25*1024*1024,timeout:60000});
 if(native.status!==0)throw Error('Native simulation execution failed: '+native.stderr);
 assert.match(native.stderr,/NATIVE_LOCAL_ROLLBACK_RESIM_PASSED checkpoints=[1-9][0-9]*/,'native eight-frame rewind must be exercised');
 const lines=native.stdout.trim().split('\n');
 assert.equal(lines.length,traces.length,'native C++ output count');
 const s=sideMatch(),observed={hit:0,parry:0,block:0,round:0,whiff:0,action:0};
 let states=0,maxDifference=0;
 function compare(expected,real,label,t){
  if(typeof expected==='boolean')expected=Number(expected);
  if(expected===null)expected=-2;
  if(typeof expected==='string')expected=MOVE[expected];
  const difference=Math.abs(Number(expected)-real);
  if(!Number.isFinite(difference)||difference>1e-8){
   throw Error(`Native/JS simulation diverged at input tick=${t} field=${label}: JS=${expected} C++=${real} delta=${difference}`);
  }
  maxDifference=Math.max(maxDifference,difference);states++;
 }
 for(let t=0;t<traces.length;t++){
  const events=[];sideStep(s,traces[t],events);
  for(const e of events)if(e.kind in observed)observed[e.kind]++;
  const fields=lines[t].trim().split(/\s+/).map(Number);
  assert.equal(fields.length,41,'native state must have fixed fields at tick '+t);
  let k=0;
  for(const name of ['tick','clock','ready','end','round'])compare(s[name],fields[k++],name,t);
  for(const value of [s.score[0],s.score[1],s.winner,s.over])compare(value,fields[k++],'match-stat',t);
  for(let player=0;player<2;player++)for(const name of keys)
   compare(s.p[player][name],fields[k++],`p${player}.${name}`,t);
 }
 assert(observed.hit>0||observed.parry>0,'trace did not exercise actual hit/parry events');
 assert(observed.block>0,'trace did not exercise actual defended/chip-damage strikes');
 assert(observed.parry>0,'trace did not exercise genuine 4-frame perfect-deflect window');
 assert(observed.action>0&&observed.round>0,'trace did not exercise move actions and rounds');
 console.log(JSON.stringify({status:'NATIVE_CPP_JS_RULESET_PARITY_PASS',rules:s.rules,
  ticks:traces.length,checkedFields:states,maxDifference,rollbackCheckpoints:Math.floor(traces.length/157),events:observed,round:s.round,score:s.score}));
}finally{rmSync(work,{recursive:true,force:true});}
