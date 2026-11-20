import test from 'node:test';
import assert from 'node:assert/strict';
import {scorePCM,exertionPCM} from '../public/score.mjs';
test('score layers and exertion use bounded deterministic PCM with a silent onset',()=>{
 const clips=[scorePCM(2000,'lantern','drone'),scorePCM(2000,'cistern','drone'),scorePCM(2000,'lantern','pulse'),exertionPCM(2000),exertionPCM(2000,true)];
 for(const clip of clips){assert.equal(clip[0],0);assert(clip.some(x=>Math.abs(x)>.03));assert(clip.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));}
 assert.deepEqual(clips[0],scorePCM(2000,'lantern','drone'));
 assert.notDeepEqual(clips[0],clips[1]);assert.notDeepEqual(clips[3],clips[4]);
});
