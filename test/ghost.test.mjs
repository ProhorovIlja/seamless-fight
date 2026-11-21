import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,match} from '../public/engine.mjs';
import {createReview,packTick,RULESET,LEGACY_RULESET} from '../public/replay.mjs';
import {createGhost,trainGhost,restoreGhost,ghostInsights,serializeGhost,parseGhost,shouldAutoLearn} from '../public/ghost.mjs';
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
test('portable ghost validates rules, counters, duplicate filenames and corrupted data',()=>{
 const model=trainGhost(view(),0),json=serializeGhost(model),restored=parseGhost(json);
 assert.deepEqual(restored,model);
 const details=ghostInsights(model);
 assert(details.samples>=12&&details.contexts>=1);
 assert.equal(details.sourceCount,1);
 assert.equal(typeof details.signature,'string');
 assert.throws(()=>parseGhost('{'),/JSON/);
 assert.throws(()=>parseGhost('x'.repeat(48001)),/too large/);
 assert.throws(()=>parseGhost(JSON.stringify({...JSON.parse(json),rules:'older-rules'})),/compatible/);
 assert.deepEqual(parseGhost(JSON.stringify({...JSON.parse(json),rules:LEGACY_RULESET})),model);
 assert.throws(()=>parseGhost(JSON.stringify({...JSON.parse(json),model:{...model,counts:[Infinity]}})),/corrupted/);
 assert.equal(json.includes('seamlesshunt.com'),false);
});
test('trained ghost can control either fighter and follows relative positioning',()=>{
 const model=trainGhost(view(),0),g=createGhost(model,0),s=match();s.ready=0;
 for(let tick=0;tick<10;tick++){s.tick=tick;assert.deepEqual(g(s),blank());}
 s.tick=10;assert.deepEqual(g(s),{x:-1,y:0,act:''});
 s.p[0].x=780;s.p[1].x=400;
 for(let tick=11;tick<=26;tick++){s.tick=tick;const move=g(s);if(tick>=22)assert.equal(move.x,1);}
 assert.throws(()=>createGhost(model,2),RangeError);
});

test('auto-learn eligibility requires explicit opt-in and a complete human-controlled match',()=>{
 assert.equal(shouldAutoLearn(true,true,false,600),true);
 assert.equal(shouldAutoLearn(false,true,false,600),false);
 assert.equal(shouldAutoLearn(true,true,true,600),false);
 assert.equal(shouldAutoLearn(true,false,false,600),false);
 assert.equal(shouldAutoLearn(true,true,false,99),false);
 assert.equal(shouldAutoLearn(true,true,false,32001),false);
});