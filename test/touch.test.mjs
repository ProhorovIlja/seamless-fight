import test from 'node:test';
import assert from 'node:assert/strict';
import {touchDirection} from '../public/controls.mjs';
test('touch stick has a dead zone and maps only to server-supported directions',()=>{
 for(const [x,y,want] of [[1,3,[0,0]],[50,3,[1,0]],[-30,-30,[-1,-1]],[2,50,[0,1]],[Infinity,0,[0,0]]]){
   const move=touchDirection(x,y);assert.deepEqual([move.x,move.y],want);
 }
});