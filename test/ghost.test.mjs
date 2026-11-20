import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,match} from '../public/engine.mjs';
import {createReview,packTick,RULESET} from '../public/replay.mjs';
import {createGhost,trainGhost,restoreGhost} from '../public/ghost.mjs';
const view=(side=0,action='')=>createReview({rules:RULESET,tape:Array.from({length:320},(_,i)=>{
 const inputs=[blank(),blank()];
 if(i>=121)inputs[side]={x:side?1:-1,y:0,act:i===180?action:''};
 return packTick(inputs);
}).join('')});
test('explicit training is bounded, validates storage, rejects repeats and merges another fighter',()=>{
 const a=trainGhost(view(),0);assert.deepEqual(restoreGhost(a),a);
 assert.throws(()=>trainGhost(view(),0,a),/already/);
 const b=trainGhost(view(1),1,a);assert.equal(b.sources.length,2);
 assert.equal(restoreGhost({...b,counts:[1]}),null);
 assert.throws(()=>trainGhost(view(),1),/movement/);
});
test('ghost responds to relative position instead of reproducing absolute recorded inputs',()=>{
 const g=createGhost(trainGhost(view(),0)),s=match();s.ready=0;
 for(let i=0;i<10;i++){s.tick=i;assert.deepEqual(g(s),blank());}
 s.tick=10;assert.deepEqual(g(s),{x:1,y:0,act:''});
 s.p[0].x=880;s.p[1].x=420;
 for(let i=11;i<=28;i++){s.tick=i;const move=g(s);if(i>=22)assert.equal(move.x,-1);}
});