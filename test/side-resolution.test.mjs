import test from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_MAX_BACKING_PIXELS,chooseSideBacking} from '../public/side-resolution.mjs';
test('render stays in logical world coordinates with 1-2.7x bounded backing store',()=>{
 assert.deepEqual(chooseSideBacking(960,1,'balanced'),{scale:1,backingWidth:960,backingHeight:540});
 const desktop=chooseSideBacking(1320,1,'balanced');
 assert(desktop.backingWidth>960,'desktop no longer upscales blurry 960px scene');
 assert(desktop.backingWidth<=2064);
 assert.deepEqual(chooseSideBacking(960,2,'balanced'),{scale:2,backingWidth:1920,backingHeight:1080});
 const cinema=chooseSideBacking(1800,2.5,'cinematic');
 assert(cinema.scale<=2.7);assert(cinema.backingWidth*cinema.backingHeight<=SIDE_MAX_BACKING_PIXELS);
 assert.equal(chooseSideBacking(960,4,'performance').scale,1.35);
});
test('mobile and corrupted device-pixel data never allocate unbounded surfaces',()=>{
 for(const w of [0,-100,NaN,Infinity])for(const dpr of [0,-9,NaN,Infinity]){
  const value=chooseSideBacking(w,dpr);
  assert(value.backingWidth>=960&&value.backingHeight>=540);
  assert(value.backingWidth*value.backingHeight<=SIDE_MAX_BACKING_PIXELS);
 }
 const phone=chooseSideBacking(390,2,'cinematic');
 assert.equal(phone.backingWidth,960);
 assert.equal(chooseSideBacking(240,1,'invalid').scale,1);
});
test('render quality changes backing resolution but never changes actual simulation',()=>{
 const a=chooseSideBacking(1500,2,'cinematic');
 const b=chooseSideBacking(1500,2,'performance');
 assert(a.backingWidth>b.backingWidth);
 assert.equal(960/540,a.backingWidth/a.backingHeight);
 assert(a.backingWidth*a.backingHeight<=SIDE_MAX_BACKING_PIXELS);
});
