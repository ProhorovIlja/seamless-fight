import test from 'node:test';
import assert from 'node:assert/strict';
import {match,step,blank} from '../public/engine.mjs';
const z=blank(), act=(a)=>({...z,act:a});
const close=()=>{const s=match();s.ready=0;s.p[0].x=440;s.p[1].x=505;return s;};
const tick=(s,n,a=z,b=z)=>{for(let i=0;i<n;i++)step(s,[a,b]);};
test('light attack telegraphs and only lands once',()=>{const s=close();tick(s,1,act('cut'));tick(s,9);assert.equal(s.p[1].hp,100);tick(s,20);assert.equal(s.p[1].hp,81);});
test('shot interrupts a heavy windup and consumes ammo',()=>{const s=close();tick(s,1,act('hew'),act('shot'));tick(s,9);assert.equal(s.p[0].act,'stun');assert.equal(s.p[0].hp,92);assert.equal(s.p[1].ammo,2);});
test('attacks cannot ignore stamina',()=>{const s=close();s.p[0].st=0;tick(s,1,act('hew'));assert.equal(s.p[0].act,'');});
test('quickstep invulnerability is bounded',()=>{const s=close();tick(s,7,act('cut'));tick(s,6,z,act('step'));assert.equal(s.p[1].hp,100);});
test('movement accelerates, normalizes diagonal and brakes',()=>{const s=close();tick(s,1,{x:1,y:1,act:''});const initial=Math.hypot(s.p[0].vx,s.p[0].vy);assert(initial>0&&initial<3.1);tick(s,30,{x:0,y:1,act:''});assert(Math.hypot(s.p[0].vx,s.p[0].vy)<=3.1);tick(s,20);assert(Math.abs(s.p[0].vy)<.01);});
test('round timeout awards a round; two wins finish the match',()=>{const s=close();s.p[1].hp=80;s.clock=1;tick(s,1);assert.deepEqual(s.score,[1,0]);tick(s,150);assert.equal(s.round,2);s.ready=0;s.p[1].hp=80;s.clock=1;tick(s,1);assert.equal(s.over,true);assert.equal(s.winner,0);});
test('simultaneous knockout is a draw',()=>{const s=close();s.p.forEach(p=>p.hp=19);tick(s,11,act('cut'),act('cut'));assert.equal(s.winner,-1);assert.deepEqual(s.score,[0,0]);});

test('heavy feint costs stamina, cannot attack during recovery and never lands',()=>{
 const s=close();tick(s,1,act('hew'));tick(s,5);tick(s,1,act('feint'));
 assert.equal(s.p[0].act,'feint');assert.equal(s.p[0].st,62);
 tick(s,12,act('cut'));assert.equal(s.p[0].act,'feint');
 tick(s,1,act('cut'));assert.equal(s.p[0].act,'cut');assert.equal(s.p[1].hp,100);
});
test('idle, early and late feints cannot cancel or damage',()=>{
 const s=close();tick(s,1,act('feint'));assert.equal(s.p[0].act,'');
 tick(s,1,act('hew'));tick(s,1,act('feint'));assert.equal(s.p[0].act,'hew');
 tick(s,15);tick(s,1,act('feint'));assert.equal(s.p[0].act,'hew');
 tick(s,10);assert.equal(s.p[1].hp,67);
});
test('feint fails without the additional stamina',()=>{
 const s=close();s.p[0].st=35;tick(s,1,act('hew'));tick(s,5);tick(s,1,act('feint'));
 assert.equal(s.p[0].act,'hew');assert.equal(s.p[0].st,5);
});

test('six drawn rounds conclude a finite unranked match',()=>{
 const s=match();let ticks=0;
 while(!s.over&&ticks<32000){step(s,[blank(),blank()]);ticks++;}
 assert.equal(s.over,true);
 assert.equal(s.round,6);
 assert.equal(s.winner,-1);
 assert.deepEqual(s.score,[0,0]);
 assert(ticks<32000);
});
test('sixth-round tiebreak awards higher round score when no one reached two',()=>{
 const s=match();s.ready=0;s.round=6;s.score=[1,0];s.clock=1;
 step(s,[blank(),blank()]);
 assert.equal(s.over,true);assert.equal(s.winner,0);
 assert.deepEqual(s.score,[1,0]);
});
