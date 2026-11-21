import test from 'node:test';
import assert from 'node:assert/strict';
import {match,blank,step} from '../public/engine.mjs';
test('exact shot and directional hit cues do not affect the simulation',()=>{
 const s=match();s.ready=0;s.p[0].x=420;s.p[1].x=520;
 const plain=structuredClone(s), cues=[];
 for(let i=0;i<40;i++){
   const pair=[{...blank(),act:i===0?'shot':''},blank()];
   step(s,pair,undefined,cues);step(plain,pair);
   if(i<8)assert.equal(cues.length,0);
 }
 assert.deepEqual(s,plain);assert.deepEqual(cues.map(c=>c.name),['shot','hit']);
 assert.equal(cues[0].muzzle,0);assert.equal(cues[1].index,1);assert.equal(cues[1].actor,0,'hit sound and caption belong to attacker, flash belongs to target');assert.equal(cues[1].angle,0);
});