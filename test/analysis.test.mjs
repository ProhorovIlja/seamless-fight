import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,match,step} from '../public/engine.mjs';
import {describe,logInput,LIMIT} from '../public/analysis.mjs';
test('history groups continuous direction without merging repeated action edges',()=>{
 const h=[];for(let t=1;t<4;t++)logInput(h,t,{...blank(),x:1});
 assert.deepEqual(h,[{from:1,to:3,label:'→'}]);
 for(let t=4;t<24;t++)logInput(h,t,{...blank(),act:'cut'});
 assert.equal(h.length,LIMIT);assert.deepEqual(h.at(-1),{from:23,to:23,label:'· Cut'});
});
test('inspector tracks actual heavy and dodge phases using shared rules',()=>{
 const s=match();s.ready=0;step(s,[{...blank(),act:'hew'},{...blank(),act:'step'}]);
 assert.match(describe(s.p[0]),/startup/);assert.match(describe(s.p[1]),/invulnerable/);
 for(let i=0;i<4;i++)step(s,[blank(),blank()]);
 assert.match(describe(s.p[0]),/feint available/);
 s.p[0].st=0;assert.doesNotMatch(describe(s.p[0]),/feint available/);
});