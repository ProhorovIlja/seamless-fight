import test from 'node:test';
import assert from 'node:assert/strict';
import {backingSize} from '../public/presentation.mjs';
test('backing resolution scales with layout and respects the high-DPI cap',()=>{
 assert.deepEqual(backingSize(348,2,960,540),{width:696,height:392});
 assert.deepEqual(backingSize(1050,3,960,540),{width:1920,height:1080});
 assert.deepEqual(backingSize(0,NaN,960,540),{width:960,height:540});
 assert.deepEqual(backingSize(70,1,960,540),{width:320,height:180});
});