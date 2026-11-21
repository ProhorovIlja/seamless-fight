import test from 'node:test';
import assert from 'node:assert/strict';
import {outfit,pair,dyes,sigils,paintOutfit} from '../public/wardrobe.mjs';
test('wardrobe accepts only known cosmetic IDs and defaults legacy captures',()=>{
 const look=outfit({dye:'kelp',sigil:'moon',hp:500});
 assert.deepEqual(look,{dye:'kelp',sigil:'moon'});
 for(const dye of ['__proto__','constructor','#ffffff',[],null])assert.deepEqual(outfit({dye}),{dye:'ash',sigil:'none'});
 assert.deepEqual(pair(),[{dye:'ash',sigil:'none'},{dye:'ash',sigil:'none'}]);
 assert.equal(Object.keys(dyes).length,8);assert.equal(Object.keys(sigils).length,6);
 for(const dye of Object.keys(dyes))for(const sigil of Object.keys(sigils))assert.deepEqual(outfit({dye,sigil}),{dye,sigil});
});
test('every cosmetic combination uses bounded original Canvas vector primitives',()=>{
 const methods=[];
 const g=new Proxy({}, {get(_,name){return (...args)=>{methods.push([name,...args]);};},set(){return true;}});
 for(const dye of Object.keys(dyes))for(const sigil of Object.keys(sigils))paintOutfit(g,{dye,sigil});
 assert(methods.some(x=>x[0]==='ellipse'));
 assert(methods.some(x=>x[0]==='strokeRect'));
 assert(methods.length>48*5);
});
