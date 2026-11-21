import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_PRACTICE_SCHEMA,HUNT_DUMMY_SLOTS,HUNT_DUMMY_MAX_FRAMES,HUNT_PRACTICE_HISTORY,
 huntFrameMeter,huntPracticeSession
} from '../public/hunt-practice-suite.mjs';
import {HUNT_RULESET,HUNT_HZ,HUNT_MOVES,huntMatch,huntInput} from '../public/side-hunt-lab.mjs';
import {createHuntReplay} from '../public/side-hunt-replay.mjs';
const cmd=(act='',x=0,y=0)=>({act,x,y,guard:false});
test('offline practice owns exact Hunt v3 state, not older Godot/JS duel rules',()=>{
 const t=huntPracticeSession(),s=t.inspect(),stats=t.stats();
 assert.equal(stats.schema,HUNT_PRACTICE_SCHEMA);
 assert.equal(stats.rules,HUNT_RULESET);
 assert.equal(stats.simulationHz,60);
 assert.equal(s.rules,'sf-hunt-lab/3');
 assert.equal(stats.paused,false);
 assert.equal(stats.mode,'passive');
 assert.equal(stats.tick,0);
 assert.equal(HUNT_DUMMY_SLOTS,8);
 assert.equal(HUNT_DUMMY_MAX_FRAMES,600);
 assert.equal(HUNT_PRACTICE_HISTORY,720);
 assert.deepEqual(stats.dummyFrames,Array(8).fill(0));
 assert.deepEqual(t.inputHistory(),[]);
 assert.throws(()=>huntPracticeSession({seed:-1}),/32-bit/);
 assert.throws(()=>huntPracticeSession({seed:2**32}),/32-bit/);
});
test('frame meter derives action phases directly from actual 60Hz move table',()=>{
 const s=huntMatch();s.ready=0;s.p[0].act='foldedHeavy';
 s.p[0].age=HUNT_MOVES.foldedHeavy.startup;
 const meter=huntFrameMeter(s);
 assert.equal(meter.frames.startup,17);
 assert.equal(meter.frames.active,6);
 assert.equal(meter.frames.recovery,23);
 assert.equal(meter.frames.phase,'active');
 assert.deepEqual(meter.frames.activeWindow,[17,23]);
 assert.equal(meter.frames.remaining,29);
 assert.equal(meter.health,100);
 assert.equal(meter.stamina,100);
 assert.equal(meter.weapon,'mournweave');
 assert.equal(huntFrameMeter(s,1).frames.total,0);
});
test('practice advances exactly one authoritative combat frame and records ordered input history',()=>{
 const t=huntPracticeSession({seed:5});
 assert(t.append(cmd('light')));
 assert.equal(t.stats().tick,1);
 assert.equal(t.inspect().p[0].act,'foldedLight');
 assert.equal(t.inspect().p[1].act,'');
 assert.equal(t.inputHistory()[0].input[0].act,'light');
 assert.equal(t.frame().frames.phase,'startup');
 t.pause();
 assert.equal(t.append(cmd()),false);
 assert.equal(t.stats().tick,1);
 assert.equal(t.step(cmd()),true);
 assert.equal(t.stats().tick,2);
 t.resume();
 assert(t.append(cmd()));
 assert.equal(t.stats().tick,3);
 assert.deepEqual(t.inputHistory().map(x=>x.tick),[1,2,3]);
 const actual=t.metrics();
 assert.equal(actual.mode,'unrated-local-1v1');
 assert.equal(actual.observedFrames,3);
 assert.equal(actual.players[0].meleeStarts,1);
 assert.equal(actual.verifiedCompetitiveResult,false);
});
test('8 independent dummy slots can record inputs and reject absent/invalid playback slots',()=>{
 const t=huntPracticeSession();
 assert.equal(t.setMode('loop'),false);
 for(let slot=0;slot<HUNT_DUMMY_SLOTS;slot++){
  assert.equal(t.record(slot),true);
  for(let i=0;i<6;i++)assert(t.recordInput(cmd(i===0?'shot':'',i%2?1:-1)));
  assert.equal(t.finish(),6);
  assert.equal(t.slotData(slot).length,6);
 }
 assert.deepEqual(t.stats().dummyFrames,Array(8).fill(6));
 assert.throws(()=>t.record(-1),/0..7/);
 assert.throws(()=>t.record(8),/0..7/);
 assert.throws(()=>t.slotData(99),/0..7/);
 assert.throws(()=>t.setMode('learn-macro'),/Unsupported/);
 assert.equal(t.setMode('loop',7),true);
 assert.equal(t.stats().mode,'loop');
 assert.equal(t.stats().selectedSlot,7);
});
test('dummy loops are original gameplay inputs and mirror horizontal movement',()=>{
 const t=huntPracticeSession(),start=t.inspect().p[1].x;
 t.record(0);
 t.recordInput(cmd('',1));
 t.recordInput(cmd('',1));
 t.finish();
 assert(t.setMode('loop',0));
 for(let i=0;i<10;i++)assert(t.append(cmd()));
 assert(t.inspect().p[1].x<start,'dummy walks left in mirrored 2.5D space');
 assert.equal(t.inputHistory().length,10);
 for(const item of t.inputHistory())assert.equal(item.input[1].x,-1);
});
test('random playback is seeded repeatably, deterministic across fresh practice sessions',()=>{
 const build=()=>{
  const t=huntPracticeSession({seed:0x1234});
  for(let slot=0;slot<3;slot++){
   t.record(slot);
   for(let i=0;i<7;i++)t.recordInput(cmd(i===0?'light':'',slot===0?1:-1));
   t.finish();
  }
  assert(t.setMode('random',0));
  for(let i=0;i<120;i++)assert(t.append(cmd()));
  return {state:t.inspect(),history:t.inputHistory()};
 };
 assert.deepEqual(build(),build());
});
test('rewind and branch takeover preserve exact state while allowing alternative player decisions',()=>{
 const t=huntPracticeSession();
 for(let i=0;i<95;i++)assert(t.append(cmd(i===0?'light':'')));
 const final=t.inspect();
 assert.equal(final.tick,95);
 assert.equal(t.rewind(25),true);
 assert.equal(t.inspect().tick,70);
 assert.equal(t.stats().paused,true);
 for(let i=0;i<25;i++)assert(t.step(cmd()));
 assert.deepEqual(t.inspect(),final,'identical neutral resimulation reproduces same history');
 assert(t.rewind(25));
 for(let i=0;i<25;i++)assert(t.step(cmd(i===0?'shot':'')));
 assert.notDeepEqual(t.inspect(),final,'takeover changes timeline only at selected checkpoint');
 assert.equal(t.inspect().tick,95);
 assert.throws(()=>t.rewind(721),/1..720/);
 assert.throws(()=>t.rewind(0),/1..720/);
});
test('versioned replay import restores source-confirmed input history, rewind and takeover',()=>{
 const t=huntPracticeSession();
 for(let i=0;i<56;i++)t.append(cmd(i%23===3?'shot':''));
 const saved=JSON.parse(JSON.stringify(t.save()));
 const imported=huntPracticeSession();
 assert(imported.load(saved));
 assert.deepEqual(imported.inspect(),t.inspect());
 assert.equal(imported.stats().paused,true);
 assert.equal(imported.inputHistory().length,56);
 assert.deepEqual(imported.inputHistory(),t.inputHistory());
 assert.deepEqual(imported.eventHistory(),t.eventHistory());
 assert(imported.rewind(20),'verified imported replay should support timeline takeover');
 assert.equal(imported.inspect().tick,36);
 assert.equal(imported.stats().paused,true);
 for(let tick=37;tick<=56;tick++)
  assert(imported.step(t.inputHistory()[tick-1].input[0]));
 assert.deepEqual(imported.inspect(),t.inspect(),
  'original verified input tape must reproduce the same outcome after takeover');
 assert.throws(()=>imported.load({...saved,rules:'sf-hunt-lab/2'}),/Invalid|incompatible/);
 assert.throws(()=>t.inputHistory(121),/1..120/);
 assert.throws(()=>t.eventHistory(401),/1..400/);
 imported.restart();
 assert.equal(imported.stats().tick,0);
 assert.equal(imported.stats().paused,true);
});
test('recording from actual match advances into source tape and never exceeds ten-second bound',()=>{
 const t=huntPracticeSession();
 t.record(1);
 for(let i=0;i<HUNT_DUMMY_MAX_FRAMES+3;i++){
  assert(t.append(cmd(i===0?'light':'',i%2?1:-1)));
 }
 assert.equal(t.slotData(1).length,HUNT_DUMMY_MAX_FRAMES);
 assert.equal(t.stats().dummyFrames[1],HUNT_DUMMY_MAX_FRAMES);
 assert.equal(t.finish(),0,'recording automatically stops at exactly 600 frames');
});

test('dummy reversal waits for a real hitstun recovery and does not auto-play while idle',()=>{
 const t=huntPracticeSession();
 t.record(0);t.recordInput(cmd('light',1));t.finish();
 assert(t.setMode('reversal',0));
 for(let i=0;i<10;i++)t.append(cmd());
 assert.equal(t.inspect().p[1].act,'','reversal must never start before the dummy is hit');
 const initial=huntMatch();initial.ready=0;
 initial.p[1].act='stun';initial.p[1].age=18;
 // Valid zero-frame capture of a versioned local practice checkpoint.
 // The replay loader correctly validates the start-state fingerprint.
 // Capture a genuine tape by making an independent practice session and then
 // surgically move its initial hitstun state using the production replay API.
 const capture=createHuntReplay({initialState:initial,maxFrames:20}).capture();
 assert(t.load(capture));
 assert(t.setMode('reversal',0));
 t.resume(); // Import intentionally pauses playback until the player resumes.
 let sawHitstun=false,sawReversal=false;
 for(let i=0;i<12;i++){
  t.append(cmd());
  const state=t.inspect();
  if(state.p[1].act==='stun')sawHitstun=true;
  if(state.p[1].act==='foldedLight')sawReversal=true;
 }
 assert(sawHitstun);
 assert(sawReversal,'bounded recorded response should start after stun recovery');
 assert.equal(t.stats().mode,'reversal');
});
