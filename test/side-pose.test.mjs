import test from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_FLOOR,sideMatch,sideInput,sideStep} from '../public/side-engine.mjs';
import {sideVisualPose} from '../public/side-pose.mjs';

test('animation pose is fully render-only across authored combat states',()=>{
 const s=sideMatch(),before=structuredClone(s);
 for(const act of ['', 'cut','hew','shot','step','stun','guardBreak']){
  const p={...s.p[0],act,age:13,vx:3.4};
  const animation=sideVisualPose(p,2500);
  for(const key of ['stride','breathing','recoil','shoulder','coatTrail','flutter','footBob'])
   assert(Number.isFinite(animation[key]),key+' is bounded and numeric');
  assert(animation.coatTrail>=0&&animation.coatTrail<=17);
  assert(typeof animation.blink==='boolean');
 }
 assert.deepEqual(s,before);
 assert.throws(()=>sideVisualPose({x:Infinity,y:SIDE_FLOOR}),TypeError);
});
test('idle breathing, running drapery and active pistol recoil use independent phases',()=>{
 const s=sideMatch(),p=s.p[0];
 const idle=sideVisualPose(p,2300);
 assert(Math.abs(idle.breathing)<=1.25);
 p.vx=9;
 const run=sideVisualPose(p,2300);
 assert(run.coatTrail>idle.coatTrail);
 assert(run.stride!==0);
 p.act='shot';p.age=9;
 assert.equal(sideVisualPose(p,2300).recoil,-5);
 p.act='hew';p.age=23;
 assert.equal(sideVisualPose(p,2300).shoulder,-8);
});
test('reduced motion still renders legible poses with zero decorative sway',()=>{
 const s=sideMatch(),p=s.p[0];p.vx=4;
 const a=sideVisualPose(p,0,true),b=sideVisualPose(p,7000,true);
 assert.equal(a.stride,0);assert.equal(a.coatTrail,0);
 assert.equal(a.breathing,0);assert.equal(a.flutter,0);
 assert.deepEqual(a,b);
 assert.equal(a.blink,false);
});
test('secondary animation cannot modify frame, replay or side collision',()=>{
 const a=sideMatch(),b=structuredClone(a);
 for(let i=0;i<150;i++){
  sideVisualPose(a.p[0],i*16.6667);
  sideVisualPose(a.p[1],i*16.6667);
  const inputs=[{...sideInput(),x:i%9<5?1:-1,act:i%47===1?'cut':''},sideInput()];
  sideStep(a,inputs);sideStep(b,inputs);
 }
 assert.deepEqual(a,b);
});
