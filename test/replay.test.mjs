import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,match,step} from '../public/engine.mjs';
import {RULESET,LEGACY_RULESET,MAX_TICKS,packTick,createReview} from '../public/replay.mjs';
test('replay checkpoints restore exact states across countdown, movement and combat',()=>{
 const s=match(), states=[structuredClone(s)];let tape='';
 for(let t=0;t<350;t++){
   const inputs=[{x:t<190?1:0,y:0,act:t===195?'hew':t===203?'feint':''},{x:t<190?-1:0,y:0,act:t===220?'shot':''}];
   tape+=packTick(inputs);step(s,inputs);states.push(structuredClone(s));
 }
 const r=createReview({rules:RULESET,tape});
 for(const t of [0,119,120,121,205,239,240,349,350])assert.deepEqual(r.at(t),states[t]);
 const fork=r.at(180);step(fork,[{...blank(),act:'step'},r.inputs(180)[1]]);
 assert.notDeepEqual(fork,r.at(181));assert.deepEqual(r.at(181),states[181]);
});
test('invalid rules, malformed inputs and oversized replays fail closed',()=>{
 for(const tape of ['','A','AA/0','AA2Z','AA'.repeat(MAX_TICKS+1)])
   assert.throws(()=>createReview({rules:RULESET,tape}));
 assert.throws(()=>createReview({rules:'old',tape:'AA'}),/ruleset/);
});

test('completed matches contain ordered round markers and reject appended ticks',()=>{
 const s=match(), pairs=[];let safety=0;
 while(!s.over&&safety++<10000){
   const d=s.p[1].x-s.p[0].x;
   const input={x:d>75?1:0,y:0,act:d>75?'':'cut'};
   const cmds=[input,blank()];pairs.push(packTick(cmds));step(s,cmds);
 }
 assert(s.over);
 const tape=pairs.join(''), r=createReview({rules:RULESET,tape});
 assert.equal(r.complete,true);assert.deepEqual(r.at(r.total),s);
 assert.equal(r.events.filter(e=>e.label.endsWith('starts')).length,2);
 assert.equal(r.events.at(-1).label,'Veil wins match');
 assert.throws(()=>createReview({rules:RULESET,tape:tape+'AA'}),/ended/);
});

test('new replays end after six drawn rounds and still reconstruct exact authoritative ticks',()=>{
 const s=match(),tape=[];let ticks=0;
 while(!s.over&&ticks<MAX_TICKS){
   const cmds=[blank(),blank()];tape.push(packTick(cmds));step(s,cmds);ticks++;
 }
 assert(s.over&&ticks<MAX_TICKS);
 const view=createReview({rules:RULESET,tape:tape.join('')});
 assert(view.complete);assert.deepEqual(view.at(view.total),s);
 assert.equal(view.events.at(-1).label,'Match drawn');
 assert.throws(()=>createReview({rules:RULESET,tape:tape.join('')+'YY'}),/ended/);
});
test('old lantern-court/1 inputs remain replayable after the draw-limit rule change',()=>{
 const s=match(),tape=[];let ticks=0;
 while(s.round<=6&&ticks<MAX_TICKS){
   const cmds=[blank(),blank()];tape.push(packTick(cmds));step(s,cmds,undefined,undefined,true);ticks++;
 }
 assert.equal(s.over,false);
 assert.equal(s.round,7);
 const view=createReview({rules:LEGACY_RULESET,tape:tape.join('')});
 assert.equal(view.complete,false);
 assert.deepEqual(view.at(view.total),s);
});

test('combat report uses confirmed engine damage rather than treating commands as hits',async()=>{
 const {replayReport}=await import('../public/analysis.mjs');
 const commands=[];
 for(let t=0;t<245;t++){
   const a={x:t>=120&&t<180?1:0,y:0,act:t===185?'cut':''};
   const b={x:t>=120&&t<180?-1:0,y:0,act:''};
   commands.push(packTick([a,b]));
 }
 const view=createReview({rules:RULESET,tape:commands.join('')});
 const report=replayReport(view);
 assert.equal(report.ticks,245);
 assert.equal(report.fighters[0].inputs.cut,1);
 assert.equal(report.fighters[1].inputs.cut,0);
 assert(report.fighters[0].movementTicks>0);
 assert(report.fighters[0].damage>0,'actual engine collision registered');
 assert(report.fighters[0].hits>=1);
 assert.equal(report.fighters[1].hits,0);
 assert.equal(report.complete,false);
 const idle=createReview({rules:RULESET,tape:Array.from({length:240},()=>packTick([blank(),blank()])).join('')});
 assert.equal(replayReport(idle).fighters[0].damage,0);
});
