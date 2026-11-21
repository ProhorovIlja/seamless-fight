import test from 'node:test';
import assert from 'node:assert/strict';
import {match} from '../public/engine.mjs';
import {footwork} from '../public/footwork.mjs';
const frame=(tick,x,patch={})=>{const s=match();s.ready=0;s.tick=tick;s.p[1].x=x;return Object.assign(s,patch);};
test('neutral motion interpolates without extrapolation or rewinding on bursty delivery',()=>{
 const f=footwork();
 f.push(frame(3,300),0);f.push(frame(6,330),50);
 assert.equal(f.sample(50)[1].x,300);
 assert.equal(f.sample(75)[1].x,315);
 f.push(frame(9,360),77);f.push(frame(12,390),78);
 const x=f.sample(80)[1].x;
 assert(x>=315&&x<330);
 assert(f.delayMs()>50&&f.delayMs()<=100);
 assert.equal(f.sample(1000)[1].x,390);
});
test('combat, round changes and stream gaps invalidate old neutral poses',()=>{
 const f=footwork();f.push(frame(3,300),0);f.push(frame(6,330),50);
 const s=frame(9,335);s.p[1].act='hew';f.push(s,100);
 assert.equal(f.sample(100),null);
 f.push(frame(12,355),150);assert.equal(f.sample(150)[1].x,355);
 f.push(frame(15,688,{round:2}),200);assert.equal(f.sample(200)[1].x,688);
 f.push(frame(18,650),500);assert.equal(f.sample(500)[1].x,650);
 f.push(frame(21,650,{over:true}),550);assert.equal(f.sample(550),null);
});