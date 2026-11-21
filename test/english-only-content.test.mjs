import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUNT_PUBLIC_LOCALES,HUNT_COPY} from '../public/hunt-identity.mjs';
import {ACTIVITY_MODE} from '../server/public-activity.mjs';
const surfaces=[
 '../public/hunt-identity.mjs',
 '../public/hunt.html',
 '../public/hunt.mjs',
 '../public/hunt.css',
 '../public/hunt-render.mjs',
 '../public/hunt-browser-input.mjs',
 '../public/hunt-practice-suite.mjs',
 '../public/hub.html',
 '../public/hub.mjs',
 '../public/side.html',
 '../public/index.html',
 '../experiments/godot-native-4.7/scripts/native_menu.gd',
 '../experiments/godot-native-4.7/scripts/native_court_status.gd'
];
test('game-facing English UI strings contain no Cyrillic translations or Russian locale',()=>{
 assert.deepEqual(HUNT_PUBLIC_LOCALES,['en']);
 assert.deepEqual(Object.keys(HUNT_COPY),['en']);
 for(const path of surfaces){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/[\u0400-\u052F]/u,'Cyrillic game-facing strings detected in '+path);
  assert.doesNotMatch(source,/lang=["']ru["']|hreflang=["']ru["']/i,
   'Unsupported public Russian language option in '+path);
 }
});
test('Court social format is exclusively 1v1, never tag or team fight',()=>{
 assert.equal(ACTIVITY_MODE,'1v1');
 const copy=HUNT_COPY.en;
 assert.equal(copy.mode1v1,'1v1 Only');
 assert.match(copy.modeTeamsUnavailable,/not part of this game/);
 assert.equal(copy.onlineRanked,'Ranked (Unavailable)');
});
