import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,match,step} from '../public/engine.mjs';
import {createSparring,lessonStep,LESSONS} from '../public/tactics.mjs';
import {RULESET,packTick,createReview} from '../public/replay.mjs';
test('sparring waits for past observations and resets on countdown and rewind',()=>{
 const s=match(),bot=createSparring('pressure');s.ready=0;
 for(let i=0;i<16;i++){s.tick=i;assert.deepEqual(bot(s),blank());}
 s.tick=16;assert.equal(bot(s).x,-1);
 s.tick=2;assert.deepEqual(bot(s),blank());
 s.tick=3;s.ready=1;assert.deepEqual(bot(s),blank());
});
test('practice recording reconstructs exact state and pressure differs from range keeper',()=>{
 function run(style){
   const s=match(),bot=createSparring(style),tape=[];
   for(let i=0;i<600&&!s.over;i++){
     const inputs=[{...blank(),x:i>130&&i<210?1:0,act:i===240?'hew':''},bot(s)];
     tape.push(packTick(inputs));step(s,inputs);
   }
   const data=tape.join('');
   assert.deepEqual(createReview({rules:RULESET,tape:data}).at(tape.length),s);
   return data;
 }
 const p=run('pressure');assert.equal(p,run('pressure'));assert.notEqual(p,run('sentinel'));
});
test('lesson credits executed local actions, not countdown or opponent cues',()=>{
 const observe=(distance,cues,live=true)=>({distance,cues,live});
 assert.equal(lessonStep(0,observe(30,[],false)),0);
 assert.equal(lessonStep(0,observe(28,[])),1);
 assert.equal(lessonStep(1,observe(30,[{actor:1,name:'cut'}])),1);
 let stage=1;
 for(const name of ['cut','step','shot','feint'])stage=lessonStep(stage,observe(30,[{actor:0,name}]));
 assert.equal(stage,LESSONS.length);
 assert.equal(lessonStep(stage,observe(30,[])),stage);
});

test('Hard observes earlier than Normal and Easy without seeing current opponent input',()=>{
 const s=match();s.ready=0;
 const bots=['easy','normal','hard'].map(level=>createSparring('duelist',level)),first=Array(3).fill(null);
 for(let tick=0;tick<=24;tick++){s.tick=tick;for(let i=0;i<bots.length;i++){const a=bots[i](s);if(first[i]===null&&a.x)first[i]=tick;}}
 assert.deepEqual(first,[20,12,8]);
});
