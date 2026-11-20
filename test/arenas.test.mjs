import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaId,paintReliquary} from '../public/arenas.mjs';
test('arena metadata is bounded and old replays default to Lantern Court',()=>{
 assert.equal(arenaId('cistern'),'cistern');
 assert.equal(arenaId('reliquary'),'reliquary');
 for(const id of [undefined,null,42,'__proto__','constructor','CISTERN',{},['cistern']])assert.equal(arenaId(id),'lantern');
});
test('Ashen Reliquary background is deterministic and bounded',()=>{
 const draw=()=>{
  const calls=[];
  const g=new Proxy({}, {
   get(_,method){return (...args)=>{
    calls.push([method,...args]);
    if(method==='createLinearGradient'||method==='createRadialGradient')return {addColorStop(){}};
   };},set(){return true;}
  });
  paintReliquary(g,960,540);return calls;
 };
 const a=draw();assert.deepEqual(a,draw());
 assert(a.some(x=>x[0]==='ellipse'));
 assert(a.some(x=>x[0]==='arc'));
 assert(a.filter(x=>x[0]==='fillRect').length>100);
 assert(a.length<25000,'prebaked background must remain bounded');
});
