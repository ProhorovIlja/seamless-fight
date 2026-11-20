import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const assets=[["impactMetal_light_000.ogg","7d49262cc9f69eb517cf644f61940ace16714f22"],["impactMetal_heavy_000.ogg","d4432f48b6ff5b4a501045ef0b8068963ef5530d"],["footstep_concrete_000.ogg","163cc56468f1734fe694351e7ff984699afa8b86"]];
const credits=readFileSync(new URL('../ASSET_CREDITS.md',import.meta.url),'utf8');
test('bundled CC0 Ogg foley files match the reviewed source blob hashes and license manifest',()=>{
 for(const [name,hash] of assets){
   const bytes=readFileSync(new URL('../public/audio/'+name,import.meta.url));
   assert.equal(bytes.subarray(0,4).toString('ascii'),'OggS');
   assert(bytes.length>128&&bytes.length<128000);
   const gitBlob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
   assert.equal(gitBlob,hash,name+' must not change without review and attribution');
   assert(credits.includes(name)&&credits.includes(hash));
 }
 assert.match(credits,/Creative Commons Zero 1.0 \(CC0-1.0\)/);
});
