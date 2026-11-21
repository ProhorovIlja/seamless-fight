import test from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,HUNT_ACTIONS,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
import {HUNT_IDENTITY_SCHEMA,HUNT_WORKING_TITLE,HUNT_PUBLIC_LOCALES,HUNT_COPY,
 huntText,huntActionName,huntPublicHud} from '../public/hunt-identity.mjs';

test('public identity names are original bilingual and preserve generic action understanding',()=>{
 assert.equal(HUNT_IDENTITY_SCHEMA,'sf-hunt-identity/1');
 assert.equal(HUNT_WORKING_TITLE,'Seamless Fight');
 assert.deepEqual(HUNT_PUBLIC_LOCALES,['en','ru']);
 assert.deepEqual(Object.keys(HUNT_COPY.en).sort(),Object.keys(HUNT_COPY.ru).sort());
 for(const locale of HUNT_PUBLIC_LOCALES){
  for(const [key,value] of Object.entries(HUNT_COPY[locale])){
   assert.equal(typeof value,'string',key);
   assert(value.trim().length>0,'empty '+locale+'/'+key);
   assert.equal(huntText(key,locale),value);
   assert(!/bloodborne|yharnam|quicksilver|hunter's dream|visceral attack|fromsoftware|saw cleaver/i.test(value),
    'No private game IP terms in the public title/control/HUD copy: '+key);
  }
  for(const act of HUNT_ACTIONS){
   const v=huntActionName(act,locale);
   assert(v.length>1);
   assert(!/bloodborne/i.test(v));
  }
 }
 assert.throws(()=>huntText('missing'),/Unknown/);
 assert.throws(()=>huntText('title','xx'),/Unsupported/);
 assert.throws(()=>huntActionName('grab'),/Unknown/);
 assert.throws(()=>huntActionName('step','fr'),/Unsupported/);
});
test('public match overlay is a source-state read-only projection, not an alternative simulation',()=>{
 const s=huntMatch();
 const before=structuredClone(s);
 const en=huntPublicHud(s,0,'en'),ru=huntPublicHud(s,1,'ru');
 assert.equal(s.rules,HUNT_RULESET);
 assert.equal(en.weapon,'Mournweave');
 assert.equal(en.labels.ammo,'Silver Rounds');
 assert.equal(ru.labels.bloodAmmo,'Багряные патроны');
 assert.equal(en.health,100);
 assert.equal(en.ammo,7);
 assert.equal(ru.vials,2);
 assert.deepEqual(s,before);
 assert.throws(()=>huntPublicHud({...s,rules:'sf-hunt-lab/2'}),/Incompatible/);
 assert.throws(()=>huntPublicHud(s,2),/Incompatible/);
});
