import test from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,sideInput,sideStep,SIDE_FLOOR} from '../public/side-engine.mjs';
import {SIDE_DEPTH_QUALITY,SIDE_DEPTH_LIMITS,sideDepthCamera,paintSideDepthStatic,paintSideDepthBack,paintSideDepthFront} from '../public/side-depth.mjs';
const makeG=()=>{
 const actions=[];let stack=0;
 const g=new Proxy({},{
  get(_obj,name){return (...args)=>{
   actions.push([name,...args]);
   if(name==='save')stack++;
   if(name==='restore')stack--;
   if(name==='createRadialGradient'||name==='createLinearGradient')return {addColorStop(...a){actions.push(['addColorStop',...a]);}};
  };},set(){return true;}
 });
 return {g,actions,get depth(){return stack;}};
};
const render=(s,stage,level,now,reduced=false)=>{
 const c=makeG();
 paintSideDepthBack(c.g,stage,now,s,level,reduced);
 paintSideDepthFront(c.g,stage,now,s,level,reduced);
 assert.equal(c.depth,0,'Canvas transforms must always balance');
 return c.actions;
};
test('camera parallax remains bounded and never mutates deterministic combat coordinates',()=>{
 const s=sideMatch(),copy=structuredClone(s);
 const camera=sideDepthCamera(s);
 assert.deepEqual(camera,{focus:480,far:0,mid:0,near:0});
 s.p[0].x=65;s.p[1].x=95;
 const left=sideDepthCamera(s);
 assert.equal(left.focus,120);
 assert.equal(left.far,16.2);assert.equal(left.mid,34.2);assert.equal(left.near,57.6);
 s.p[0].x=875;s.p[1].x=895;
 const right=sideDepthCamera(s);
 assert.equal(right.focus,840);
 assert.equal(right.far,-16.2);assert.equal(right.mid,-34.2);assert.equal(right.near,-57.6);
 assert.equal(sideDepthCamera(null).focus,480);
 assert.equal(copy.p[0].y,SIDE_FLOOR);
 const after=structuredClone(s);sideDepthCamera(s);
 assert.deepEqual(s,after,'cinematic motion never writes to fighter state');
});
test('all three 2.5D stages draw unique Gothic galleries once and restore canvas state',()=>{
 const signatures=[];
 for(const stage of ['lantern','cistern','reliquary']){
  const first=makeG(),second=makeG();
  paintSideDepthStatic(first.g,stage);paintSideDepthStatic(second.g,stage);
  assert.deepEqual(first.actions,second.actions,'baked 2.5D art must be deterministic');
  assert(first.actions.some(a=>a[0]==='quadraticCurveTo'),'vault geometry');
  assert(first.actions.some(a=>a[0]==='createLinearGradient'),'stained-glass gradients');
  assert(first.actions.filter(a=>a[0]==='stroke').length>=20);
  assert(first.actions.length<3500,'static art is batched once per stage');
  assert.equal(first.depth,0);
  signatures.push(JSON.stringify(first.actions));
 }
 assert.equal(new Set(signatures).size,3);
});
test('cinematic/balanced/performance visual budgets are explicit and remain combat-isolated',()=>{
 assert.deepEqual(SIDE_DEPTH_QUALITY,['performance','balanced','cinematic']);
 assert.equal(SIDE_DEPTH_LIMITS.performance.dust,0);
 assert(SIDE_DEPTH_LIMITS.cinematic.dust>SIDE_DEPTH_LIMITS.balanced.dust);
 const state=sideMatch(),copy=structuredClone(state);
 const low=render(state,'reliquary','performance',5600);
 const med=render(state,'reliquary','balanced',5600);
 const high=render(state,'reliquary','cinematic',5600);
 assert(high.length>med.length);
 assert(med.length>low.length);
 for(const c of [low,med,high])assert(c.length<1500,'bounded per-frame decorative work');
 assert.deepEqual(state,copy,'no quality mode can change world rules');
 const after=structuredClone(state);
 sideStep(state,[sideInput(),sideInput()]);
 render(state,'cistern','cinematic',12345);
 assert.equal(state.tick,after.tick+1);
 assert.deepEqual(state.p,after.p);
});
test('reduced motion stops dynamic scenery time motion but keeps atmospheric depth',()=>{
 const s=sideMatch();
 const first=render(s,'cistern','cinematic',50,true),later=render(s,'cistern','cinematic',90000,true);
 assert.deepEqual(first,later,'reduced-motion scene should not drift with wall-clock time');
 const moving=render(s,'cistern','cinematic',90000,false);
 assert.notDeepEqual(first,moving,'animated stage should respond to time');
 assert(first.some(c=>c[0]==='createRadialGradient'),'still atmospheric for reduced-motion users');
});
test('decorative foreground never moves fighters, and out-of-range quality falls back safely',()=>{
 const state=sideMatch(),before=structuredClone(state);
 for(const stage of ['reliquary','lantern','cistern','bogus']){
  const c=render(state,stage,'bogus',2100);
  assert(c.some(a=>a[0]==='fillRect'));
  assert(c.length<1500);
 }
 assert.deepEqual(state,before);
});

test('2.5D foreground pillars never occlude the legal hunter world region',()=>{
 const s=sideMatch();
 for(const x of [65,120,480,840,895]){
  s.p[0].x=x;s.p[1].x=x;
  const c=makeG();
  paintSideDepthFront(c.g,'reliquary',3500,s,'cinematic',false);
  const pillars=c.actions.filter(a=>a[0]==='fillRect'&&a[2]===195&&a[3]===29&&a[4]===269);
  assert.equal(pillars.length,2);
  for(const a of pillars)assert(a[1]<=0||a[1]>=931,'foreground can only occupy the edge gutters');
 }
});
