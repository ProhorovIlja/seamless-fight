import test from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_RULESET,sideMatch,sideStep,sideInput} from '../public/side-engine.mjs';
import {packSideTick,createSideReview,SIDE_TAPE_LIMIT} from '../public/side-replay.mjs';
function command(t,i){
 return {x:t%13===0?1:t%11===0?-1:0,y:t%89===0?-1:t%59===0?1:0,
  act:t%137===i+4?'cut':t%197===i+8?'shot':'',guard:t%49>=43&&t%49<=46};
}
test('side replay is compact, versioned, bounded and preserves explicit guard bit',()=>{
 const a={x:-1,y:1,act:'feint',guard:true},b={x:1,y:-1,act:'shot',guard:false};
 const tape=packSideTick([a,b]);assert.equal(tape.length,4);
 const review=createSideReview({rules:SIDE_RULESET,tape});
 assert.deepEqual(review.inputs(0),[a,b]);
 for(const t of ['','AA','AAA','AAAA/','AAAA'.repeat(SIDE_TAPE_LIMIT+1)])assert.throws(()=>createSideReview({rules:SIDE_RULESET,tape:t}));
 assert.throws(()=>createSideReview({rules:'lantern-court/2',tape}),/ruleset/);
 assert.throws(()=>packSideTick([{x:0,y:0,act:'teleport'},b]),/Unknown/);
});
test('side replay restores exactly across arbitrary checkpoint and takeover branches',()=>{
 const original=sideMatch(),states=[structuredClone(original)],frames=[];
 for(let t=0;t<820;t++){
  const pair=[command(t,0),command(t,1)];frames.push(packSideTick(pair));
  sideStep(original,pair);states.push(structuredClone(original));
 }
 const r=createSideReview({rules:SIDE_RULESET,tape:frames.join('')});
 assert.equal(r.total,820);
 for(const i of [0,1,60,90,119,120,121,179,239,240,420,719,819,820])
  assert.deepEqual(r.at(i),states[i],'state parity at '+i);
 const fork=r.at(500),recorded=r.inputs(500);
 sideStep(fork,[{...sideInput(),x:-1,act:'step'},recorded[1]]);
 assert.notDeepEqual(fork,r.at(501),'future Veil inputs can diverge');
 assert.deepEqual(r.at(501),states[501],'original recorded outcome stays unchanged');
 assert.throws(()=>r.at(-1),RangeError);
 assert.throws(()=>r.at(821),RangeError);
});
test('untrusted side replay rejects values outside packed alphabet range and after match end',()=>{
 assert.throws(()=>createSideReview({rules:SIDE_RULESET,tape:'__AA'}),/Invalid side-view replay input value/);
 const s=sideMatch();s.ready=0;s.p[0].hp=100;s.p[1].hp=1;s.p[0].x=460;s.p[1].x=520;
 let tape='',total=0;
 while(!s.over&&total<8000){
  const pair=[{x:0,y:0,act:total%35===0?'cut':'',guard:false},sideInput()];
  tape+=packSideTick(pair);sideStep(s,pair);total++;
 }
 assert(s.over,'match must complete');
 assert.doesNotThrow(()=>createSideReview({rules:SIDE_RULESET,tape}));
 assert.throws(()=>createSideReview({rules:SIDE_RULESET,tape:tape+packSideTick([sideInput(),sideInput()])}),/after/);
});
