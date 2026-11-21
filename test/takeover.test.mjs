import test from 'node:test';
import assert from 'node:assert/strict';
import {blank} from '../public/engine.mjs';
import {restoreDrill,preset,practiceTick,tapeInput,TIMELINE} from '../public/lab.mjs';

test('takeover reproduces the windup exactly, then branches without modifying the original attempt',()=>{
 const foe=preset('whiff'), attempt=Array.from({length:120},blank);
 const original=restoreDrill('close',foe,attempt,50);
 assert.equal(original.state.p[0].hp,67);
 const fork=restoreDrill('close',foe,attempt,39);
 assert.equal(fork.state.p[1].act,'hew');assert.equal(fork.state.p[1].age,21);
 for(let i=39;i<50;i++)practiceTick(fork.state,[i===39?{...blank(),act:'step'}:blank(),tapeInput(foe,i)]);
 assert.equal(fork.state.p[0].hp,100);
 assert.deepEqual(restoreDrill('close',foe,attempt,50),original);
});
test('rewind restores exact feint recovery and bounds seek work and timeline',()=>{
 const foe=preset('bait'), a=restoreDrill('close',foe,[],29);
 assert.equal(a.state.p[1].act,'feint');assert.equal(a.state.p[1].st,62);
 const b=restoreDrill('close',foe,[],999999);
 assert.equal(b.tick,180);assert.equal(b.trace.length,TIMELINE);
 assert.equal(restoreDrill('close',foe,[],NaN).tick,0);
});
