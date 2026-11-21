import test from 'node:test';
import assert from 'node:assert/strict';
import {blank} from '../public/engine.mjs';
import {MAX_TAPE, phase, makeLab, practiceTick, writeTape, tapeInput, preset} from '../public/lab.mjs';

test('recording is bounded and copies inputs, neutral after playback',()=>{
 const tape=[], cmd={x:1,y:0,act:'hew'};
 for(let i=0;i<MAX_TAPE+1;i++)writeTape(tape,cmd);
 cmd.act='cut';assert.equal(tape.length,MAX_TAPE);
 assert.equal(tapeInput(tape,0).act,'hew');assert.deepEqual(tapeInput(tape,MAX_TAPE),blank());
});
test('preset replay recreates the same fight state and feint timing',()=>{
 const tape=preset('bait'), run=()=>{
   const s=makeLab('close'), frames=[];
   for(let i=0;i<tape.length;i++){practiceTick(s,[blank(),tapeInput(tape,i)]);frames.push(s.p[1].act);}
   return {s,frames};
 };
 const a=run();assert.deepEqual(a,run());assert.equal(a.frames[18],'hew');
 assert.equal(a.frames[28],'feint');assert.equal(a.frames[54],'cut');assert.equal(a.s.p[0].hp,81);
});
test('unseen mix-up chooses distinct deterministic authored actions and stays replayable',()=>{
 const names=['whiff','bait','interrupt'];
 for(let i=0;i<3;i++){
  const tape=preset('mixup',i),expected=preset(names[i]);
  assert.deepEqual(tape,expected);
  assert.deepEqual(preset('mixup',i+3),expected);
  const s=makeLab('edge');for(const input of tape)practiceTick(s,[blank(),input]);
  const reconstructed=makeLab('edge');for(const input of expected)practiceTick(reconstructed,[blank(),input]);
  assert.deepEqual(s,reconstructed);
 }
 assert.notDeepEqual(preset('mixup',0),preset('mixup',1));
 assert.notDeepEqual(preset('mixup',1),preset('mixup',2));
});
test('practice presets are isolated and reset spacing, ammo and stamina',()=>{
 const t=preset('whiff');t[18].act='shot';assert.equal(preset('whiff')[18].act,'hew');
 const a=makeLab('far');assert.equal(a.p[1].x-a.p[0].x,190);a.p[1].ammo=0;
 const b=makeLab('far');assert.equal(b.p[1].ammo,3);assert.equal(b.p[0].st,100);
});
test('timeline distinguishes active, recovery, invulnerability and stun',()=>{
 const p={act:'cut',age:0};assert.equal(phase(p),1);p.age=10;assert.equal(phase(p),2);
 p.age=15;assert.equal(phase(p),3);p.age=31;assert.equal(phase(p),0);
 assert.equal(phase({act:'step',age:8}),4);assert.equal(phase({act:'step',age:9}),2);
 assert.equal(phase({act:'stun',age:1}),5);
});
