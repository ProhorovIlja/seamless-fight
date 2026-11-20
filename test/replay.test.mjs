import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,match,step} from '../public/engine.mjs';
import {RULESET,MAX_TICKS,packTick,createReview} from '../public/replay.mjs';
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
