import test from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,SIDE_FLOOR} from '../public/side-engine.mjs';
import {SIDE_SHAKE_MAX,sideCameraImpact,sideScoreTension,sideIsFootstep} from '../public/side-cinema.mjs';
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
