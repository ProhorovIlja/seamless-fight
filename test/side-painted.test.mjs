import test from 'node:test';
import assert from 'node:assert/strict';
import {PAINTED_STAGES,checkPaintedStage,drawPaintedStage,loadPaintedStage,paintIllustratedAir} from '../public/side-painted.mjs';
import {sideMatch,sideInput,sideStep} from '../public/side-engine.mjs';
const fake=()=>{
 const events=[];
 const g=new Proxy({}, {
  get(_,key){return (...args)=>{
   events.push([key,...args]);
   if(['createLinearGradient','createRadialGradient'].includes(key))return {addColorStop(...values){events.push(['addColorStop',...values]);}};
  };},
  set(){return true;}
 });
 return {g,events};
};
test('source-backed painted arena manifest is an explicit 16:9 original, not a CDN dependency',()=>{
 assert.deepEqual(Object.keys(PAINTED_STAGES),['reliquary']);
 const m=PAINTED_STAGES.reliquary;
 assert.equal(m.src,'/fight/art/reliquary-painted.webp');
 assert.equal(m.width/m.height,16/9);
 assert(m.bytesMax<500000);
 assert(Object.isFrozen(m));
});
test('decoded painted background renders at full game canvas resolution and falls back fail-closed',()=>{
 const img={naturalWidth:1600,naturalHeight:900};
 assert.equal(checkPaintedStage(img),true);
 assert.equal(checkPaintedStage({...img,naturalHeight:899}),false);
 assert.equal(checkPaintedStage(img,'cistern'),false);
 const {g,events}=fake();
 assert.equal(drawPaintedStage(g,img),true);
 assert.deepEqual(events,[['drawImage',img,0,0,1600,900,0,0,960,540]]);
 assert.equal(drawPaintedStage(g,{naturalWidth:3,naturalHeight:3}),false);
 assert.equal(events.length,1);
});
test('asset loader decodes asynchronously and checks dimensions; bad assets keep procedural renderer',async()=>{
 class ValidImage{
  naturalWidth=1600;naturalHeight=900;
  async decode(){}
 }
 const ok=await loadPaintedStage('reliquary',ValidImage);
 assert(ok instanceof ValidImage);
 assert.equal(ok.src,'/fight/art/reliquary-painted.webp');
 class InvalidImage{naturalWidth=20;naturalHeight=20;async decode(){}}
 assert.equal(await loadPaintedStage('reliquary',InvalidImage),null);
 class BrokenImage{async decode(){throw Error('image unavailable');}}
 assert.equal(await loadPaintedStage('reliquary',BrokenImage),null);
 assert.equal(await loadPaintedStage('cistern',ValidImage),null);
 assert.equal(await loadPaintedStage('reliquary',null),null);
});
test('original illustrated-stage mist is bounded, disabled in performance, and respects reduced motion',()=>{
 const start=fake(),later=fake();
 paintIllustratedAir(start.g,100,true,'cinematic');
 paintIllustratedAir(later.g,900000,true,'cinematic');
 assert.deepEqual(start.events,later.events);
 assert(start.events.filter(a=>a[0]==='arc').length>20);
 assert(start.events.length<200,'per-frame painted air is capped');
 const low=fake();
 paintIllustratedAir(low.g,2000,false,'performance');
 assert.deepEqual(low.events,[]);
 const moved=fake();
 paintIllustratedAir(moved.g,900000,false,'cinematic');
 assert.notDeepEqual(start.events,moved.events);
});
test('painting and atmospheric pass never change deterministic combat state or replays',()=>{
 const state=sideMatch(),baseline=structuredClone(state);
 const c=fake();drawPaintedStage(c.g,{naturalWidth:1600,naturalHeight:900});
 paintIllustratedAir(c.g,20000,false,'balanced');
 assert.deepEqual(state,baseline);
 const inputs=[sideInput(),sideInput()];
 sideStep(state,inputs);
 const expected=structuredClone(baseline);sideStep(expected,inputs);
 assert.deepEqual(state,expected);
});
