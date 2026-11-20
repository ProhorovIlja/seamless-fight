import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetrics,percentile} from '../public/metrics.mjs';
test('diagnostics distinguish input ack, ping and snapshot arrival and ignore duplicate ticks',()=>{
 const m=createMetrics();
 m.sent(1,10);m.snapshot(3,1,55);
 m.snapshot(3,1,60);m.sent(2,80);m.snapshot(6,2,113);
 m.ping(40);m.ping(70);m.frame(16);m.correction(8);
 assert.deepEqual(m.summary(),{rtt:40,rttSpread:30,ack:45,gap:58,frame:16,correction:8});
 m.clearFrame();m.snapshot(9,2,2000);
 assert.equal(m.summary().frame,null);assert.equal(m.summary().gap,58);
});
test('measurements and outstanding input stamps are bounded',()=>{
 const m=createMetrics();for(let i=0;i<300;i++){m.frame(i);m.sent(i,i);}
 m.snapshot(3,1,400);assert.equal(m.summary().ack,null);
 m.snapshot(6,299,450);assert.equal(m.summary().ack,151);
 assert.equal(m.summary().frame,293);assert.equal(percentile([],0.95),null);
});