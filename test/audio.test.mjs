import test from 'node:test';
import assert from 'node:assert/strict';
import {synth,soundChanges} from '../public/audio.mjs';
const state=(tick,p={})=>({tick,ready:0,round:1,p:[{x:300,hp:100,act:'',age:0,...p},{x:660,hp:100,act:'',age:0}]});
test('all combat clips are bounded, distinct and deterministic',()=>{
 const clips=['cut','hew','cock','shot','step','feint','hit','interrupt','bell'].map(name=>{
   const a=synth(name,8000);assert.deepEqual(a,synth(name,8000));
   assert(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));
   assert(a.some(x=>Math.abs(x)>.06));assert.equal(a[0],0);return a;
 });
 assert.equal(new Set(clips.map(a=>Array.from(a.slice(100,120)).join())).size,clips.length);
});
test('cue changes detect new actions, interruptions and a round start once',()=>{
 const a=state(1), b=state(2,{act:'hew',age:1});
 assert.deepEqual(soundChanges(a,b),[{name:'hew',x:300}]);
 assert.deepEqual(soundChanges(b,state(3,{act:'hew',age:4})),[]);
 const c=state(4,{act:'stun',age:1,hp:92});
 assert.deepEqual(soundChanges(b,c),[{name:'interrupt',x:300,index:0}]);
 assert.deepEqual(soundChanges(c,c),[]);
 assert.deepEqual(soundChanges(c,{...state(5),round:2}),[]);
 assert.deepEqual(soundChanges({...a,ready:1},b).map(x=>x.name),['bell','hew']);
});

test('pistol preparation and discharge are separate, with one shared visual/audio trigger',()=>{
 const a=state(10), b=state(13,{act:'shot',age:3});
 assert.deepEqual(soundChanges(a,b),[{name:'cock',x:300}]);
 const c=state(19,{act:'shot',age:9,hp:92});
 assert.deepEqual(soundChanges(b,c),[{name:'shot',x:300,muzzle:0},{name:'hit',x:300,index:0}]);
 assert.deepEqual(soundChanges(c,state(22,{act:'shot',age:12,hp:92})),[]);
 assert.deepEqual(soundChanges(a,state(25,{act:'shot',age:15})),[{name:'shot',x:300,muzzle:0}]);
 assert.deepEqual(soundChanges(b,state(16)),[]);
});
test('caption attribution follows fighter slots rather than screen position',()=>{
 const a=state(10), b=state(13,{x:720,act:'shot',age:3});
 assert.deepEqual(soundChanges(a,b,true),[{name:'cock',x:720,actor:0}]);
});

test('foley variants are bounded, repeatable and distinct',()=>{
 const a=synth('interrupt',8000,1),b=synth('interrupt',8000,2);
 assert.deepEqual(a,synth('interrupt',8000,1));assert.notDeepEqual(a,b);
 assert.equal(a[0],0);assert(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));
});
