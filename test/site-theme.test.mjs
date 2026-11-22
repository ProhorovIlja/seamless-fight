import test from 'node:test';
import assert from 'node:assert/strict';
import {bakeSiteSky} from '../public/site-theme.mjs';
test('missing layers preserve fallback and present layers remain clipped outside the floor',()=>{
 const calls=[], ctx=new Proxy({}, {get:(_,k)=>(...args)=>{
   calls.push([k,...args]);if(k==='createLinearGradient')return {addColorStop(){}};
 },set:()=>true});
 assert.equal(bakeSiteSky(ctx,[null,null,null,null],960),false);
 assert.equal(calls.length,0);
 const img={naturalWidth:300,naturalHeight:100};
 assert.equal(bakeSiteSky(ctx,[img,null,img,null],960),true);
 assert.deepEqual(calls.find(c=>c[0]==='rect'),['rect',0,0,960,86]);
 assert.equal(calls.filter(c=>c[0]==='drawImage').length,2);
 assert.equal(calls.at(-1)[0],'restore');
});