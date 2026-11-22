import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFighter2_5D,snapshotProjections} from '../bridge.mjs';
test('PlayCanvas/Godot canvas-to-world fixed camera agrees at exact 60 pixels/world unit',()=>{
 assert.deepEqual(projectFighter2_5D({x:255,y:436,dir:1}),{x:-3.75,y:-166/60,z:0,rotationY:0});
 assert.deepEqual(projectFighter2_5D({x:705,y:436,dir:-1}),{x:3.75,y:-166/60,z:0,rotationY:180});
 assert.equal(projectFighter2_5D({x:255,y:436,z:999,dir:1}).z,0);
 assert(projectFighter2_5D({x:500,y:330,dir:1}).y>projectFighter2_5D({x:500,y:436,dir:1}).y);
});
test('malformed, stale or wrong-ruleset snapshots never modify the GPU pose',()=>{
 const valid={rules:'seamless-side/1',tick:31,p:[{x:255,y:436,dir:1},{x:705,y:436,dir:-1}]};
 assert.equal(snapshotProjections(valid,30).tick,31);
 for(const altered of [{...valid,tick:30},{...valid,rules:'lantern-court/2'},
   {...valid,p:[valid.p[0]]},{...valid,p:[{...valid.p[0],x:NaN},valid.p[1]]},
   {...valid,p:[{...valid.p[0],x:-999},valid.p[1]]}])
  assert.equal(snapshotProjections(altered,30),null);
 assert.equal(projectFighter2_5D({x:10,y:436,dir:0}),null);
});
