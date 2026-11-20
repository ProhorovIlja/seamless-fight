import test from 'node:test';
import assert from 'node:assert/strict';
import {moves} from '../public/engine.mjs';
import {bladeAngle} from '../public/presentation.mjs';
test('melee arcs remain bounded across startup, active and recovery and settle to idle',()=>{
 const arc=Math.acos(.45);
 for(const act of ['cut','hew']){
   const m=moves[act],total=m[0]+m[1]+m[2],angles=Array.from({length:total+1},(_,i)=>bladeAngle(act,i,m));
   assert(angles.every(x=>Number.isFinite(x)&&Math.abs(x)<=arc+1e-10));
   assert.equal(angles[m[0]+m[1]-1],arc);
   assert(Math.abs(angles.at(-1)-.42)<1e-9);
 }
 assert.equal(bladeAngle('shot',8,moves.shot),0);
});
