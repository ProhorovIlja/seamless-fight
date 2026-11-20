import test from 'node:test';
import assert from 'node:assert/strict';
import {outfit,pair} from '../public/wardrobe.mjs';
test('wardrobe accepts only known cosmetic IDs and defaults legacy captures',()=>{
 const look=outfit({dye:'kelp',sigil:'moon',hp:500});
 assert.deepEqual(look,{dye:'kelp',sigil:'moon'});
 for(const dye of ['__proto__','constructor','#ffffff',[],null])assert.deepEqual(outfit({dye}),{dye:'ash',sigil:'none'});
 assert.deepEqual(pair(),[{dye:'ash',sigil:'none'},{dye:'ash',sigil:'none'}]);
});