import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HUNT_RULESET,HUNT_HZ,HUNT_WEAPONS,HUNT_FORMS,huntFrameTable}
 from '../public/side-hunt-lab.mjs';
import {HUNT_PRODUCTION_CATALOG_SCHEMA,buildHuntProductionCatalog}
 from '../tools/art/build-hunt-production-catalog.mjs';

test('full production shot register is machine-checkable, original and never falsely claims shipped animations',()=>{
 const p=buildHuntProductionCatalog();
 assert.equal(p.schema,HUNT_PRODUCTION_CATALOG_SCHEMA);
 assert.equal(p.ruleset,HUNT_RULESET);
 assert.equal(p.fps,HUNT_HZ);
 assert(p.counts.totalRequests>=450,'high-production multi-hundred-animation authoring backlog');
 assert.equal(p.counts.newAuthoredAssets,0);
 assert.equal(p.counts.approvedAssets,0);
 assert.equal(p.originalBloodborneClipCount,null,
  'we must not invent the complete original Bloodborne animation count');
 assert.equal(p.counts.totalRequests,p.shots.length);
 assert.equal(new Set(p.shots.map(x=>x.id)).size,p.shots.length);
 for(const item of p.shots){
  assert.match(item.id,/^[a-z0-9/-]+$/);
  assert.equal(item.assetStatus,'not-authored');
  assert.equal(item.originalPerformanceRequired,true);
  assert.equal(item.authoring,'original-or-cleared');
  assert(!/air-step|double-jump|normal-block|command-grab/.test(item.id));
  assert(['tier-0','tier-1','tier-2'].includes(item.rank));
 }
});
test('every weapon authoritative combat move has exact 60Hz frame timings, including air shot',()=>{
 const p=buildHuntProductionCatalog();
 const relevant=p.shots.filter(s=>s.category==='combat-authoritative');
 assert.equal(relevant.length,HUNT_WEAPONS.reduce((n,w)=>n+huntFrameTable(w).length,0));
 assert.equal(p.counts.sourceCombatActions,relevant.length);
 for(const weapon of HUNT_WEAPONS){
  const expected=huntFrameTable(weapon);
  for(const m of expected){
   const matches=relevant.filter(x=>x.weapon===weapon&&x.timing.sourceAction===m.name);
   assert.equal(matches.length,1,weapon+' '+m.name+' exactly once');
   const shot=matches[0];
   assert.equal(shot.timing.fps,60);
   assert.equal(shot.timing.startup,m.startup);
   assert.equal(shot.timing.active,m.active);
   assert.equal(shot.timing.recovery,m.recovery);
   assert.equal(shot.timing.total,m.totalFrames);
   assert.equal(shot.timing.activeStart,m.damage?m.startup:null);
   assert.equal(shot.timing.activeEnd,m.damage?m.startup+m.active:null);
  }
 }
 assert(relevant.some(x=>x.timing.sourceAction==='airShot'));
 assert(relevant.some(x=>x.timing.sourceAction==='visceralVictim'));
});
test('all two-form weapons need independent original grips, cancels, intros and combat reaction performances',()=>{
 const p=buildHuntProductionCatalog();
 for(const weapon of HUNT_WEAPONS){
  for(const form of HUNT_FORMS){
   const list=p.shots.filter(s=>s.weapon===weapon&&s.form===form);
   assert(list.length>=60,'each specific weapon form needs substantial authored repertoire');
   assert(list.some(x=>x.category==='offense'&&x.id.endsWith('attack-into-quickstep')));
   assert(list.some(x=>x.id.endsWith('stance-exhausted')));
   assert(list.some(x=>x.id.endsWith('weapon-blood-clean')));
  }
  const special=p.shots.filter(s=>s.weapon===weapon&&s.id.includes('/special/'));
  assert(special.length>=30);
  assert(special.some(s=>s.id.endsWith('visceral-victim-breakaway')));
  assert(special.some(s=>s.id.endsWith('gun-parry-air-success')));
 }
});
test('cinematic and performance requests include round intros/outros, taunts, grunts and world actions',()=>{
 const p=buildHuntProductionCatalog();
 const has=suffix=>p.shots.some(x=>x.id.endsWith(suffix));
 for(const name of [
  'intro-enter-left','intro-rival','outro-weapon-holster','victory-perfect',
  'victory-low-health','defeat-collapse','taunt-bow','taunt-silent-prayer',
  'vocal-effort-light','vocal-air-shot','vocal-defeat','face-pain',
  'hit-gun-back','stun-dodge-escape','blood-bullet-interrupted','heal-inject',
  'rain-flinch','lamp-interact'
 ])assert(has(name),'missing required cinematic/performative request '+name);
 for(const key of ['skeleton','visual','audio','gameplay','verify'])
  assert.equal(typeof p.productionGate[key],'string');
 assert.match(p.productionGate.audio,/Foley/);
});
test('catalog JSON is stable; retargeted body variations cannot inflate unique original clip count',()=>{
 const a=JSON.stringify(buildHuntProductionCatalog());
 const b=JSON.stringify(buildHuntProductionCatalog());
 assert.equal(a,b);
 assert(!a.includes('Bloodborne/animation/'));
 assert.equal(JSON.parse(a).counts.approvedAssets,0);
});
