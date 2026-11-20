import test from 'node:test';
import assert from 'node:assert/strict';
import {damageTrail,duelMessage} from '../public/presentation.mjs';
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
test('exhibitions name the winner rather than declaring the computer to be YOU',()=>{
 const s={tick:160,round:1,ready:0,end:0,over:true,winner:1};
 assert.equal(duelMessage(s,'practice',0,false,false),'Defeat');
 assert.equal(duelMessage(s,'practice',0,false,true),'Cinder wins');
 assert.equal(duelMessage(s,'spectate',-1,true,false),'Cinder wins');
 assert.equal(duelMessage(s,'online',1,false,false),'Victory');
 s.over=false;s.end=30;
 assert.equal(duelMessage(s,'practice',0,false,true),'Cinder takes the round');
 s.end=0;s.ready=89;
 assert.equal(duelMessage(s,'practice',0,false,true),'Round 1  /  2');
 assert.equal(duelMessage(s,'review',0,false,false),'');
});
