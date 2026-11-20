import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaId} from '../public/arenas.mjs';
test('arena metadata is bounded and old replays default to Lantern Court',()=>{
 assert.equal(arenaId('cistern'),'cistern');
 for(const id of [undefined,null,42,'__proto__','constructor','CISTERN',{},['cistern']])assert.equal(arenaId(id),'lantern');
});