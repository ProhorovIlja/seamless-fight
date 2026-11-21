// 60 Hz sf-hunt-lab/3 source vs portable C++17, standalone research only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {huntMatch,huntStep,huntInput,huntMoveSpec,HUNT_RULESET,HUNT_HZ} from '../public/side-hunt-lab.mjs';
const REQUEST={'':0,light:1,heavy:2,charge:3,trick:4,shot:5,step:6,feint:7,sync:8,visceral:9,heal:10,blood:11};
const MOVES=['','foldedLight','foldedHeavy','foldedCharged','unfurledLight','unfurledHeavy',
 'unfurledCharged','airFoldedLight','airFoldedHeavy','airUnfurledLight',
 'airUnfurledHeavy','unfurl','refold','shiftOut','shiftIn','shot','airShot',
 'visceral','heal','blood','stagger','visceralVictim','step','feint','sync','stun',
 'backstep','foldedBackstepLight','unfurledBackstepLight'];
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
 // Directed REAL gun-counter conversion: not probabilistic coverage.
 // Move both fighters from the canonical default spawn, allow momentum to
 // settle and reproduce actual source attack/parry/visceral timing. C++ sees
 // precisely the same inputs, including the original 90-frame round ready.
 const directed=huntMatch({weapons:['mournweave','thornwake']});
 const trace=[],sourceEvents=[];
 const n=(x=0,act='')=>({x,y:0,act,guard:false});
 const record=(left,right)=>{
  const pair=[left,right],events=[];
  huntStep(directed,pair,events);
  trace.push({inputs:pair,state:structuredClone(directed)});
  sourceEvents.push(...events);
  for(const e of events)if(e.kind in eventsSeen)eventsSeen[e.kind]++;
 };
 for(let t=0;t<90;t++)record(n(),n());
 let approach=0;
 while(Math.abs(directed.p[1].x-directed.p[0].x)>58&&approach<110){
  record(n(1),n(-1));approach++;
 }
 assert(approach<110,'Canonical close-range entry not reached');
 for(let t=0;t<20;t++)record(n(),n());
 for(let k=0;k<95;k++)
  record(n(0,k===3?'shot':k===39?'visceral':''),n(0,k===0?'heavy':''));
 assert(sourceEvents.some(e=>e.kind==='gunParry'&&e.actor===0&&e.target===1),
  'Directed scenario did not create the REAL opponent heavy firearm parry');
 assert(sourceEvents.some(e=>e.kind==='visceral'&&e.actor===0&&e.target===1&&e.damage===42),
  'Directed parry did not convert into the REAL source visceral');
 const scriptedPacket='0 1\n'+trace.map(t=>t.inputs.flatMap(
  i=>[i.x,i.y,REQUEST[i.act],Number(i.guard)]).join(' ')).join('\n')+'\n';
 const nativeDirected=spawnSync(exe,[],{input:scriptedPacket,encoding:'utf8',
  maxBuffer:15*1024*1024,timeout:90000});
 assert.equal(nativeDirected.status,0,'Native directed visceral run failed:\n'+nativeDirected.stderr);
 assert.match(nativeDirected.stderr,/HUNT_V3_NATIVE_LOCAL_REWIND_PASSED checkpoints=[1-9]/);
 const rows=nativeDirected.stdout.trim().split('\n');
 assert.equal(rows.length,trace.length);
 for(let t=0;t<trace.length;t++){
  const values=rows[t].trim().split(/\s+/).map(Number);
  assert.equal(values.length,totalFields);
  const state=trace[t].state;
  let at=0;
  const compare=(field,expected)=>{
   const got=values[at++],wanted=number(field,expected);
   if(!Number.isFinite(got)||!Number.isFinite(wanted)||Math.abs(got-wanted)>1e-8)
    throw Error('Directed real visceral C++ mismatch at frame='+t+
     ' field='+field+' JS='+wanted+' C++='+got);
   checks++;maxError=Math.max(maxError,Math.abs(got-wanted));
  };
  for(const field of GLOBAL)compare(field,state[field]);
  compare('score0',state.score[0]);compare('score1',state.score[1]);
  for(const fighter of state.p)for(const field of FIELDS)compare(field,fighter[field]);
 }
 rewinds+=Math.floor(trace.length/157);
 // Native corner proof is not inferred from generic stress frames. We
 // explicitly reproduce both arena ends from identical validated snapshots.
 let verifiedCornerCrossings=0,cornerTicks=0;
 for(const side of ['left','right']){
  const defender=huntMatch({weapons:['mournweave','thornwake']});
  defender.ready=0;
  defender.p[0].x=side==='left'?65:895;
  defender.p[1].x=side==='left'?107:853;
  const direction=side==='left'?1:-1;
  const samples=Array.from({length:24},(_,k)=>[
   {x:k===0?direction:0,y:0,act:k===0?'step':'',guard:false},
   huntInput()]);
  const packet='0 1\n'+samples.map(pair=>pair.flatMap(
   i=>[i.x,i.y,REQUEST[i.act],Number(i.guard)]).join(' ')).join('\n')+'\n';
  const nativeCorner=spawnSync(exe,['--corner-'+side],{
   input:packet,encoding:'utf8',timeout:90000,maxBuffer:4*1024*1024});
  assert.equal(nativeCorner.status,0,'Native corner test failed: '+nativeCorner.stderr);
  const lines=nativeCorner.stdout.trim().split('\n');
  assert.equal(lines.length,samples.length);
  const sourceCornerEvents=[];
  for(let tick=0;tick<samples.length;tick++){
   huntStep(defender,samples[tick],sourceCornerEvents);
   const actual=lines[tick].trim().split(/\s+/).map(Number);
   assert.equal(actual.length,totalFields);
   let k=0;
   const compare=(field,value)=>{
    const got=actual[k++],expected=number(field,value);
    if(!Number.isFinite(got)||!Number.isFinite(expected)||Math.abs(expected-got)>1e-8)
     throw Error('Native '+side+' corner mismatch tick='+tick+' field='+field+
      ' C++='+got+' JS='+expected);
    checks++;maxError=Math.max(maxError,Math.abs(expected-got));
   };
   for(const field of GLOBAL)compare(field,defender[field]);
   compare('score0',defender.score[0]);compare('score1',defender.score[1]);
   for(const fighter of defender.p)
    for(const field of FIELDS)compare(field,fighter[field]);
  }
  const crossings=sourceCornerEvents.filter(e=>e.kind==='cornerEscape'&&e.actor===0);
  assert.equal(crossings.length,1,'Source must escape exactly once from '+side);
  assert.equal(crossings[0].side,side);
  assert(side==='left'?
   defender.p[0].x>defender.p[1].x:
   defender.p[0].x<defender.p[1].x,
   'Source defender must really swap position at '+side);
  verifiedCornerCrossings++;
  cornerTicks+=samples.length;
 }
 assert.equal(verifiedCornerCrossings,2);
 // Purpose-built native/JS parity for THE competitive slot-order invariant.
 // The ordinary random movement suite rarely produces exact same-frame R1
 // trades; verify full 69-field states with both weapon orders and Rally pools.
 let directedTradeScenarios=0,directedTradeTicks=0;
 for(const [flag,priorRally] of [['--trade',0],['--trade-rally',10]]){
  for(const [w0,w1] of PAIRS){
   const source=huntMatch({weapons:[WEAPONS[w0],WEAPONS[w1]]});
   source.ready=0;source.p[0].x=430;source.p[1].x=500;
   source.p[0].dir=1;source.p[1].dir=-1;
   for(const hunter of source.p){
    hunter.act='foldedLight';
    hunter.age=huntMoveSpec(hunter).startup;
    hunter.hp=priorRally?80:100;
    hunter.rally=priorRally;
    hunter.rallyLife=priorRally?50:0;
   }
   const samples=Array.from({length:32},()=>[huntInput(),huntInput()]);
   const packet=w0+' '+w1+'\\n'+samples.map(row=>row.flatMap(
    v=>[v.x,v.y,REQUEST[v.act],Number(v.guard)]).join(' ')).join('\\n')+'\\n';
   const result=spawnSync(exe,[flag],{input:packet,encoding:'utf8',
    maxBuffer:4*1024*1024,timeout:90000});
   assert.equal(result.status,0,'Directed trade CLI failed: '+result.stderr);
   const nativeRows=result.stdout.trim().split('\\n');
   assert.equal(nativeRows.length,samples.length);
   for(let t=0;t<samples.length;t++){
    const actualEvents=[];
    huntStep(source,samples[t],actualEvents);
    if(t===0){
     assert.equal(actualEvents.filter(x=>x.kind==='hit').length,2,
      'Both weapon hitboxes must physically connect during one source tick');
     assert.equal(actualEvents.filter(x=>x.kind==='rally').length,priorRally?2:0,
      'Only pre-contact Rally can be reclaimed, never same-tick damage');
     assert(source.p.every(x=>x.hitConfirmed===false),
      'No stunned fighter keeps an asymmetric hidden hit confirm');
    }
    const native=nativeRows[t].trim().split(/\\s+/).map(Number);
    assert.equal(native.length,totalFields);
    let k=0;
    const compare=(field,val)=>{
     const got=native[k++],wanted=number(field,val);
     if(!Number.isFinite(got)||!Number.isFinite(wanted)||Math.abs(got-wanted)>1e-8)
      throw Error('Native same-tick trade mismatch '+flag+
       ' weapons='+w0+','+w1+' frame='+t+' field='+field+
       ' JS='+wanted+' CPP='+got);
     checks++;maxError=Math.max(maxError,Math.abs(got-wanted));
    };
    for(const field of GLOBAL)compare(field,source[field]);
    compare('score0',source.score[0]);compare('score1',source.score[1]);
    for(const fighter of source.p)for(const field of FIELDS)compare(field,fighter[field]);
   }
   directedTradeScenarios++;
   directedTradeTicks+=samples.length;
  }
 }
 assert.equal(directedTradeScenarios,8);
 assert(eventsSeen.hit>0&&eventsSeen.transform>0&&eventsSeen.round>0&&eventsSeen.visceral>0,
  'Trace missed core Hunt gameplay situations');
 console.log(JSON.stringify({result:'HUNT_V3_NATIVE_CPP_JS_PARITY_PASS',
  rules:HUNT_RULESET,hz:HUNT_HZ,ticks:PAIRS.length*TICKS+trace.length+cornerTicks+directedTradeTicks,
  directedTradeScenarios,directedTradeTicks,
  directedVisceral:true,directedTicks:trace.length,cornerCrossings:verifiedCornerCrossings,
  weaponPairs:PAIRS.length,fieldsPerTick:totalFields,fieldComparisons:checks,
  maxAbsoluteDifference:maxError,nativeRollbackChecks:rewinds,
  sourceEvents:eventsSeen}));
}finally{rmSync(dir,{recursive:true,force:true});}
