import test from 'node:test';
import assert from 'node:assert/strict';
import {damageTrail} from '../public/presentation.mjs';
const state=(tick,hp,round=1,ready=0)=>({tick,round,ready,p:[{hp},{hp:100}]});
test('damage trail holds, decays and clamps without changing authoritative HP',()=>{
 const trail=damageTrail(), hit=state(2,67);
 assert.equal(trail.update(state(1,100),16,false)[0],100);
 assert.equal(trail.update(hit,16,false)[0],100);
 assert.equal(trail.update(hit,145,false)[0],100);
 assert(trail.update(hit,150,false)[0]<100);
 assert.equal(trail.update(hit,500,false)[0],67);
 assert.equal(hit.p[0].hp,67);
});
test('reduced motion, seeks, healing, and round reset clear damage history',()=>{
 const trail=damageTrail();
 trail.update(state(50,100),16,false);
 assert.equal(trail.update(state(51,70),16,true)[0],70);
 assert.equal(trail.update(state(52,75),16,false)[0],75);
 assert.equal(trail.update(state(53,65),16,false)[0],75);
 assert.equal(trail.update(state(51,60),16,false)[0],60);
 assert.equal(trail.update(state(100,100,2,120),16,false)[0],100);
 trail.clear();assert.equal(trail.update(state(100,55,2),16,false)[0],55);
});