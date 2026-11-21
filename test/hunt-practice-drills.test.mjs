import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPracticeSession,HUNT_PRACTICE_DRILLS,HUNT_DUMMY_LIBRARY_SCHEMA,
 HUNT_DUMMY_SLOTS,HUNT_DUMMY_MAX_FRAMES} from '../public/hunt-practice-suite.mjs';
import {HUNT_RULESET,HUNT_ACTIONS} from '../public/side-hunt-lab.mjs';
const cmd=(act='',x=0,y=0)=>({act,x,y,guard:false});
const run=(session,{shootTick=-1,stepTick=-1,frames=85}={})=>{
 for(let tick=1;tick<=frames;tick++){
  assert(session.append(cmd(tick===shootTick?'shot':tick===stepTick?'step':'',
   tick===stepTick?-1:0)), 'source practice must advance at tick '+tick);
 }
 return {state:session.inspect(),events:session.eventHistory(400)};
};
test('17 English-only 1v1 scenarios all use original source actions, never guard/throws',()=>{
 assert.equal(HUNT_PRACTICE_DRILLS.length,17);
 assert.deepEqual(HUNT_PRACTICE_DRILLS.map(x=>x.id),[
  'free','parry-heavy','parry-heal','parry-blood','escape-stun','dodge-shot',
  'anti-air','air-parry','whiff-punish','dodge-punish','hit-confirm','transform-pressure',
  'rally-reclaim','blood-economy','timing-read','visceral-followup','corner-escape']);
 for(const scenario of HUNT_PRACTICE_DRILLS){
  const session=huntPracticeSession({drill:scenario.id,weapons:['thornwake','mournweave']});
  const state=session.inspect();
  assert.equal(state.rules,HUNT_RULESET);
  assert.equal(state.p.length,2);
  assert.equal(state.p[0].weapon,'thornwake');
  assert.equal(state.p[1].weapon,'mournweave');
  assert.equal(session.stats().drill,scenario.id);
  assert.equal(session.stats().simulationHz,60);
  if(scenario.id!=='free'){
   assert.equal(state.p[1].x-state.p[0].x,scenario.spacing);
   assert.equal(session.stats().mode,scenario.id==='timing-read'?'random':'loop');
   assert.equal(session.slotData(0).length,150);
   assert.equal(session.slotData(0)[scenario.startAt].act,scenario.action);
   assert.equal(session.inspect().p[1].act,'');
   if(scenario.id==='timing-read'){
    assert.equal(session.slotData(1).length,150);
    assert.equal(session.slotData(1)[scenario.startAt+7].act,'feint');
   }
   if(scenario.id==='anti-air')
    assert.equal(session.slotData(0)[scenario.startAt].y,-1);
   if(scenario.id==='dodge-punish')
    assert.equal(session.slotData(0)[scenario.startAt].x,-1);
  }else{
   assert.equal(state.p[1].x-state.p[0].x,450);
   assert.equal(session.stats().mode,'passive');
   assert.equal(session.slotData(0).length,0);
  }
 }
 assert.throws(()=>huntPracticeSession({drill:'2v2'}),/Unknown/);
 assert.throws(()=>huntPracticeSession({drill:'grab-defense'}),/Unknown/);
});
test('counter-heavy drill genuinely gun-parries the actual timed heavy startup, not idle gunfire',()=>{
 const s=huntPracticeSession({drill:'parry-heavy'});
 const result=run(s,{shootTick:62,frames:75});
 const parry=result.events.find(x=>x.kind==='gunParry');
 assert(parry,'a correctly timed gunshot should open real visceral stagger');
 assert.equal(parry.actor,0);
 assert.equal(parry.target,1);
 assert.equal(result.state.p[1].exposeCause,'gun');
 assert.equal(result.state.p[0].ammo,6);
 assert(result.state.p[1].hp<=96);
 assert(s.metrics().players[0].firearmParries>=1);
});
test('timed shot legitimately interrupts vial healing and blood-round ritual, not generic idle vulnerability',()=>{
 for(const [drill,shot] of [['parry-heal',61],['parry-blood',60]]){
  const s=huntPracticeSession({drill});
  const {events}=run(s,{shootTick:shot,frames:80});
  assert(events.some(x=>x.kind==='action'&&x.actor===1&&
   (drill==='parry-heal'?x.move==='heal':x.move==='blood')),'dummy utility action must be real');
  assert(events.some(x=>x.kind==='gunParry'&&x.target===1),drill+' should be parried during actual utility startup');
 }
});
test('escape-stun drill uses paid grounded step after real attack hitstun',()=>{
 const s=huntPracticeSession({drill:'escape-stun'});
 const {state,events}=run(s,{stepTick:75,frames:80});
 assert(events.some(x=>x.kind==='hit'&&x.actor===1));
 assert(events.some(x=>x.kind==='action'&&x.actor===0&&x.move==='step'),
  'escape must use real 19+6 stamina ground step after eight hitstun frames');
 assert(state.p[0].st<=75);
 assert(s.metrics().players[0].dodgeEscapes>0);
});
test('dodge-shot drill obeys real source i-frames; no infinite air step or guard',()=>{
 const s=huntPracticeSession({drill:'dodge-shot'});
 const {state,events}=run(s,{stepTick:61,frames:80});
 assert(events.some(x=>x.kind==='action'&&x.actor===1&&x.move==='shot'));
 assert(events.some(x=>x.kind==='action'&&x.actor===0&&x.move==='step'));
 assert(!events.some(x=>x.kind==='bulletHit'&&x.target===0));
 assert.equal(state.p[0].hp,100);
 assert(!HUNT_ACTIONS.includes('guard'));
 assert(!HUNT_ACTIONS.includes('air-step'));
});
test('eight dummy recordings export/import atomically with exact-version inputs and no executable scripts',()=>{
 const s=huntPracticeSession({drill:'parry-heavy'});
 assert.equal(s.saveDummyLibrary().schema,HUNT_DUMMY_LIBRARY_SCHEMA);
 const data=JSON.parse(JSON.stringify(s.saveDummyLibrary()));
 assert.equal(data.tapes.length,HUNT_DUMMY_SLOTS);
 assert.equal(data.tapes[0].length,150);
 const other=huntPracticeSession();
 assert.equal(other.loadDummyLibrary(data),true);
 assert.deepEqual(other.saveDummyLibrary(),data);
 assert.equal(other.stats().mode,'passive');
 assert.equal(other.setMode('loop',0),true);
 other.append(cmd());
 assert.equal(other.inspect().tick,1);
 data.tapes[0][0].act='shield';
 assert.equal(other.slotData(0)[0].act,'');
 const before=other.saveDummyLibrary();
 assert.throws(()=>other.loadDummyLibrary(data),/Invalid|Unknown/);
 assert.deepEqual(other.saveDummyLibrary(),before,'invalid import must not mutate any previous slot');
 assert.throws(()=>other.loadDummyLibrary({...before,language:'ru'}),/English/);
 assert.throws(()=>other.loadDummyLibrary({...before,rules:'sf-hunt-lab/2'}),/incompatible/);
 assert.throws(()=>other.loadDummyLibrary({...before,tapes:[[]]}),/incompatible/);
 const excessive=structuredClone(before);
 excessive.tapes[7]=Array.from({length:HUNT_DUMMY_MAX_FRAMES+1},()=>cmd('light'));
 assert.throws(()=>other.loadDummyLibrary(excessive),/600 frames/);
 assert.deepEqual(other.saveDummyLibrary(),before);
});

test('frame inspector announces only genuine frame-specific parry windows and paid escape eligibility',()=>{
 const heavy=huntPracticeSession({drill:'parry-heavy'});
 const vulnerable=[];
 for(let i=1;i<=83;i++){
  heavy.append(cmd());
  const defender=heavy.frame(1);
  assert.equal(typeof defender.firearmCounterWindowOpen,'boolean');
  assert.equal(typeof defender.groundedHitstunEscapeReady,'boolean');
  if(defender.firearmCounterWindowOpen)vulnerable.push(i);
 }
 assert(vulnerable.length>0,'source heavy action must have a counter timing window');
 assert(vulnerable[0]>55,'idle before actual attack must never be parryable');
 assert(vulnerable.length<40,'counter opportunity must be finite rather than always parryable');
 const escape=huntPracticeSession({drill:'escape-stun'});
 let readyAt=-1;
 for(let i=1;i<=95;i++){
  escape.append(cmd());
  if(escape.frame(0).groundedHitstunEscapeReady&&readyAt<0)readyAt=i;
 }
 assert(readyAt>55,'source hit must happen before the escape window appears');
 assert.equal(escape.frame(0).firearmCounterWindowOpen,false);
});


test('corner escape drill requires real opponent pressure and physical side switch',()=>{
 const s=huntPracticeSession({drill:'corner-escape'});
 const initial=s.inspect();
 assert.equal(initial.p[0].x,65);
 assert.equal(initial.p[1].x,107);
 for(let frame=1;frame<=66;frame++){
  const move=frame===48?cmd('step',1):cmd();
  assert(s.append(move));
 }
 const events=s.eventHistory(400),score=s.goal();
 assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy'));
 const escape=events.find(e=>e.kind==='cornerEscape'&&e.actor===0);
 assert(escape,'real source step crossed the pressured opponent');
 assert.equal(escape.side,'left');
 assert.equal(score.completed,true,'scoring is derived from confirmed source position swap');
 assert.equal(score.successes,1);
 assert(s.inspect().p[0].x>s.inspect().p[1].x);
 const failed=huntPracticeSession({drill:'corner-escape'});
 for(let frame=1;frame<=66;frame++)failed.append(cmd());
 assert.equal(failed.goal().completed,false,'merely waiting for pressure is not escape');
});
