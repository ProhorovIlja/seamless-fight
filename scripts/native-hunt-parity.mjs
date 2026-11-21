// 60 Hz sf-hunt-lab/3 source vs portable C++17, standalone research only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {huntMatch,huntStep,huntInput,HUNT_RULESET,HUNT_HZ} from '../public/side-hunt-lab.mjs';
const REQUEST={'':0,light:1,heavy:2,charge:3,trick:4,shot:5,step:6,feint:7,sync:8,visceral:9,heal:10,blood:11};
const MOVES=['','foldedLight','foldedHeavy','foldedCharged','unfurledLight','unfurledHeavy',
 'unfurledCharged','airFoldedLight','airFoldedHeavy','airUnfurledLight',
 'airUnfurledHeavy','unfurl','refold','shiftOut','shiftIn','shot','airShot',
 'visceral','heal','blood','stagger','visceralVictim','step','feint','sync','stun'];
const WEAPONS=['mournweave','thornwake'],FORMS=['folded','unfurled'],CAUSES=['','gun','chargedRear'];
const FIELDS=['x','y','vx','vy','dir','weapon','hp','st','ammo','bloodAmmo','vials',
 'focus','form','rally','rallyLife','exposed','exposeCause','visceralTarget','act',
 'age','spent','hitConfirmed','crouch','jumpHeld','jumps','regen','combo','chain','queue','queueLife'];
const GLOBAL=['tick','clock','ready','end','round','winner','over'];
const totalFields=GLOBAL.length+2+2*FIELDS.length;
assert.equal(totalFields,69);
function number(field,value){
 if(field==='weapon')return WEAPONS.indexOf(value);
 if(field==='form')return FORMS.indexOf(value);
 if(field==='exposeCause')return CAUSES.indexOf(value);
 if(field==='act')return MOVES.indexOf(value);
 if(field==='queue')return REQUEST[value];
 return value===null?-2:typeof value==='boolean'?Number(value):value;
}
const dir=mkdtempSync(join(tmpdir(),'sf-hunt-v3-'));
const external=process.env.SF_HUNT_NATIVE_CORE_EXE;
const exe=external?resolve(external):join(dir,process.platform==='win32'?'hunt-core.exe':'hunt-core');
let checks=0,maxError=0,rewinds=0;
const eventsSeen={hit:0,gunParry:0,visceral:0,bloodBullets:0,transform:0,round:0,jump:0};
try{
 if(!external){
  const c=spawnSync(process.env.CXX||'g++',['-std=c++17','-O2',
   '-Wall','-Wextra','-Werror','-ffp-contract=off','-fno-fast-math',
   resolve('native/combat/hunt_core.cpp'),'-o',exe],
   {encoding:'utf8',timeout:90000});
  assert.equal(c.status,0,'Native GCC Hunt v3 build:\n'+c.stderr);
 }
 const PAIRS=[[0,0],[0,1],[1,0],[1,1]],TICKS=2400;
 for(let p=0;p<PAIRS.length;p++){
  let seed=(0x5a14c0de+(p*0x91b7))>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const choice=xs=>xs[Math.floor(rand()*xs.length)];
  const frames=[];
  for(let t=0;t<TICKS;t++){
   const row=[0,1].map(slot=>{
    const i=huntInput();
    i.x=t<160?(slot?-1:1):t>=310&&t<400?0:choice([-1,0,0,0,1]);
    i.y=t%121===24?-1:t%139===18?1:0;
    i.act=rand()<.20?choice(['light','heavy','charge','trick','shot','step',
      'feint','sync','visceral','heal','blood']):'';
    if(t>=160&&t<300){
     const phase=t%56;i.x=0;i.y=0;
     i.act=slot?(phase===0?'heavy':phase===37?'blood':''):
      (phase===7?'shot':phase===33?'light':phase===48?'trick':'');
    }
    if(t>=310&&t<400){
     const phase=(t-310)%45;
     i.act=slot?(phase===0?'heal':phase===22?'heavy':''):
      phase===8?'shot':phase===30?'trick':'';
    }
    if(t>=400&&t<1000){
     if(t%67===(slot?3:5))i.act='blood';
     if(t%71===(slot?40:44))i.act='shot';
     if(t%73===(slot?12:16))i.act='trick';
    }
    return i;
   });
   frames.push(row);
  }
  const [w0,w1]=PAIRS[p];
  const packet=w0+' '+w1+'\n'+frames.map(row=>row.flatMap(
   v=>[v.x,v.y,REQUEST[v.act],Number(v.guard)]).join(' ')).join('\n')+'\n';
  const run=spawnSync(exe,[],{input:packet,encoding:'utf8',timeout:90000,maxBuffer:48*1024*1024});
  assert.equal(run.status,0,'Native CLI failed:\n'+run.stderr);
  assert.match(run.stderr,/HUNT_V3_NATIVE_LOCAL_REWIND_PASSED checkpoints=[1-9]/);
  rewinds+=Math.floor(TICKS/157);
  const lines=run.stdout.trim().split('\n');
  assert.equal(lines.length,TICKS);
  const state=huntMatch({weapons:[WEAPONS[w0],WEAPONS[w1]]});
  assert.equal(state.rules,HUNT_RULESET);
  for(let t=0;t<TICKS;t++){
   const events=[];huntStep(state,frames[t],events);
   for(const e of events)if(e.kind in eventsSeen)eventsSeen[e.kind]++;
   const values=lines[t].trim().split(/\s+/).map(Number);
   assert.equal(values.length,totalFields,'State size at tick '+t);
   let k=0;
   const compare=(field,val)=>{
    const native=values[k++],js=number(field,val);
    if(!Number.isFinite(native)||!Number.isFinite(js)||
       Math.abs(native-js)>1e-8)
     throw Error('Hunt parity mismatch pair='+p+' tick='+t+
      ' field='+field+' JS='+js+' CPP='+native+' delta='+Math.abs(native-js));
    checks++;maxError=Math.max(maxError,Math.abs(native-js));
   };
   for(const field of GLOBAL)compare(field,state[field]);
   compare('score0',state.score[0]);compare('score1',state.score[1]);
   for(const fighter of state.p)for(const field of FIELDS)compare(field,fighter[field]);
   assert.equal(k,totalFields);
  }
 }
 assert(eventsSeen.hit>0&&eventsSeen.transform>0&&eventsSeen.round>0,
  'Trace missed core Hunt gameplay situations');
 console.log(JSON.stringify({result:'HUNT_V3_NATIVE_CPP_JS_PARITY_PASS',
  rules:HUNT_RULESET,hz:HUNT_HZ,ticks:PAIRS.length*TICKS,
  weaponPairs:PAIRS.length,fieldsPerTick:totalFields,fieldComparisons:checks,
  maxAbsoluteDifference:maxError,nativeRollbackChecks:rewinds,
  sourceEvents:eventsSeen}));
}finally{rmSync(dir,{recursive:true,force:true});}
