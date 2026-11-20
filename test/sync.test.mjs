import test from 'node:test';
import assert from 'node:assert/strict';
import {match,step,blank} from '../public/engine.mjs';
import {RULESET,createReview,packTick} from '../public/replay.mjs';

// Determinism and save/load are prerequisites for *future* rollback networking.
// This test does not enable speculation, rollback or peer-to-peer networking.
const digest=state=>{
 const str=JSON.stringify(state);
 let hash=2166136261;
 for(let i=0;i<str.length;i++)hash=Math.imul(hash^str.charCodeAt(i),16777619);
 return hash>>>0;
};
test('engine snapshots survive save/load and replay the exact same authoritative inputs',()=>{
 let seed=0x91e10dba;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const inputs=Array.from({length:2400},(_,frame)=>[0,1].map(side=>{
   const n=random(),axis=x=>x%3-1;
   const action=frame>120&&frame%41===side*5?['cut','hew','shot','step','feint'][Math.floor(n/13)%5]:'';
   return {x:axis(n),y:axis(n>>>9),act:action};
 }));
 const s=match(),snapshots=new Map(),hashes=new Map();
 for(let i=0;i<inputs.length;i++){
   if(i%120===0)snapshots.set(i,structuredClone(s));
   step(s,inputs[i]);
   if(i%19===0)hashes.set(i+1,digest(s));
 }
 const final=structuredClone(s);
 for(const [from,snapshot] of snapshots){
   const fork=structuredClone(snapshot);
   for(let i=from;i<inputs.length;i++){
     step(fork,inputs[i]);
     if(hashes.has(i+1))assert.equal(digest(fork),hashes.get(i+1),'state hash differs at tick '+(i+1)+' from snapshot '+from);
   }
   assert.deepEqual(fork,final);
 }
 const review=createReview({rules:RULESET,tape:inputs.map(packTick).join('')});
 assert.equal(review.total,inputs.length);
 for(const i of [0,1,120,121,780,1320,2400]){
   const fromStart=match();
   for(let tick=0;tick<i;tick++)step(fromStart,inputs[tick]);
   assert.deepEqual(review.at(i),fromStart);
 }
 assert.deepEqual(review.at(inputs.length),final);
});
