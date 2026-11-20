import test from 'node:test';
import assert from 'node:assert/strict';
import {rangeBand,synth} from '../public/audio.mjs';
test('distance bands have stable boundaries and distinct cue samples',()=>{
 assert.equal(rangeBand(85,'far'),'cut');
 assert.equal(rangeBand(93,'cut'),'cut');
 assert.equal(rangeBand(95,'cut'),'shot');
 assert.equal(rangeBand(195,'shot'),'shot');
 assert.equal(rangeBand(199,'shot'),'far');
 assert.equal(rangeBand(195,'far'),'far');
 const clips=['rangeCut','rangeShot','rangeExit'].map(name=>synth(name,8000));
 assert(clips.every(a=>a[0]===0&&a.every(x=>Number.isFinite(x)&&Math.abs(x)<=1)));
 assert.equal(new Set(clips.map(a=>Array.from(a.slice(100,120)).join())).size,3);
});