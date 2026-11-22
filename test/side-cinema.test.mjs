import test from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,SIDE_FLOOR} from '../public/side-engine.mjs';
import {SIDE_SHAKE_MAX,sideCameraImpact,sideScoreTension,sideIsFootstep,sideWorldLens} from '../public/side-cinema.mjs';
test('cinematic hit feedback is render-only, strictly capped and expires',()=>{
 const s=sideMatch(),before=structuredClone(s),at=5000;
 const fx=[{e:{kind:'hit',tick:101},at},{e:{kind:'parry',tick:103},at}];
 const start=sideCameraImpact(fx,at,false,'cinematic');
 const follow=sideCameraImpact(fx,at+80,false,'cinematic');
 assert(Math.abs(start.x)<=SIDE_SHAKE_MAX&&Math.abs(start.y)<=SIDE_SHAKE_MAX);
 assert(follow.flash<start.flash);
 assert.deepEqual(sideCameraImpact(fx,at+180),{x:0,y:0,flash:0});
 assert.deepEqual(sideCameraImpact(fx,at,true),{x:0,y:0,flash:0});
 assert.deepEqual(sideCameraImpact(fx,at,false,'performance'),{x:0,y:0,flash:0});
 assert.deepEqual(sideCameraImpact(fx,at,false,'cinematic',true),{x:0,y:0,flash:0});
 assert.deepEqual(s,before);
});
test('only successful server or local hit events can create shaking',()=>{
 const now=30000;
 for(const kind of ['round','action','fire','whiff','other']){
  assert.deepEqual(sideCameraImpact([{e:{kind,tick:10},at:now}],now),{x:0,y:0,flash:0});
 }
 assert.deepEqual(sideCameraImpact([{e:{kind:'hit',tick:10},at:now+1}],now),{x:0,y:0,flash:0});
 assert.deepEqual(sideCameraImpact([{e:{kind:'hit',tick:10},at:NaN}],now),{x:0,y:0,flash:0});
});
test('dynamic score follows confirmed fighter danger and range, not client visual quality',()=>{
 const s=sideMatch();assert.equal(sideScoreTension(s),0);
 s.ready=0;
 const distant=sideScoreTension(s);
 s.p[1].x=340;
 const close=sideScoreTension(s);assert(close>distant);
 s.p[0].hp=13;s.clock=190;
 const danger=sideScoreTension(s);assert(danger>close);
 s.p[0].act='cut';assert(sideScoreTension(s)>danger);
 s.over=true;assert.equal(sideScoreTension(s),0);
 assert.equal(sideScoreTension(null),0);
});
test('footsteps require grounded neutral movement only',()=>{
 const p={y:SIDE_FLOOR,act:'',crouch:false,guardAge:0,vx:3};
 assert.equal(sideIsFootstep(p),true);
 for(const update of [{y:SIDE_FLOOR-4},{act:'step'},{crouch:true},{guardAge:1},{vx:1}]){
  assert.equal(sideIsFootstep({...p,...update}),false);
 }
});

test('2.5D optical lens stays bounded and has exact world-space hitbox alignment',()=>{
 const state=sideMatch(),before=structuredClone(state);
 assert.deepEqual(sideWorldLens(state,'performance'),{zoom:1,shift:0});
 const cinema=sideWorldLens(state,'cinematic');
 assert(cinema.zoom>1.09&&cinema.zoom<1.10);
 const balanced=sideWorldLens(state,'balanced');assert(balanced.zoom>1.05&&balanced.zoom<cinema.zoom);
 state.p[0].x=65;state.p[1].x=65;
 const left=sideWorldLens(state,'cinematic');
 assert(left.shift>0&&left.shift<15);
 state.p[0].x=895;state.p[1].x=895;
 const right=sideWorldLens(state,'cinematic');
 assert(right.shift<0&&right.shift>-15);
 // Transform is one affine map applied to background, fighters and hitboxes.
 for(const point of [65,450,895]){
  const map=x=>480+right.shift+(x-480)*right.zoom;
  assert(Math.abs(map(point+18)-map(point)-18*right.zoom)<1e-10);
 }
 assert.equal(before.p[0].x,255);
 const frozen=structuredClone(state);sideWorldLens(state,'cinematic');assert.deepEqual(state,frozen);
});
