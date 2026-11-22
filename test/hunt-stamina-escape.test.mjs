import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';
import {evaluateHuntTrainingGoal} from '../public/hunt-training-goals.mjs';
import {HUNT_MOVES,HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA,
 HUNT_HITSTUN_ESCAPE_START} from '../public/side-hunt-lab.mjs';
const cmd=(act='',x=0)=>({act,x,y:0,guard:false});
const dodgeBudget=HUNT_MOVES.step.cost+HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA;
function trial(weapons,spendEarly=false){
 const session=huntPracticeSession({drill:'stamina-escape',weapons});
 const initial=session.inspect();
 assert.equal(initial.p[0].st,25);
 assert.equal(initial.p[1].form,'unfurled');
 let enteredStun=false;
 for(let tick=1;tick<=72;tick++){
  const me=session.inspect().p[0];
  if(me.act==='stun')enteredStun=true;
  const request=spendEarly&&tick===1?'light':
   me.act==='stun'&&me.age>=HUNT_HITSTUN_ESCAPE_START&&
    me.age<=HUNT_HITSTUN_ESCAPE_START+3?'step':'';
  assert(session.append(cmd(request,request==='step'?-1:0)));
 }
 assert(enteredStun,'enemy actually connected and caused normal hitstun');
 return session;
}

test('resource drill makes the 19+6 actual engine dodge tax and original PvP one-jump rules visible',()=>{
 assert.equal(dodgeBudget,25);
 const p=huntPracticeSession({drill:'stamina-escape'});
 const initial=p.inspect();
 assert.equal(initial.ready,0);
 assert.equal(initial.p.length,2);
 assert.equal(initial.p[0].st,25);
 assert.equal(initial.p[0].form,'folded');
 assert.equal(initial.p[1].form,'unfurled');
 assert.equal(initial.p[1].x-initial.p[0].x,130);
 assert.equal(p.slotData(0)[12].act,'light');
 assert.equal(p.goal().category,'Resources');
 assert.equal(p.goal().language,'en');
 assert.equal(p.goal().successes,0);
});

test('conserve stamina -> real R1 hit -> a prompt funded quickstep out of stun',()=>{
 for(const weapons of [
  ['mournweave','mournweave'],['thornwake','mournweave'],
  ['mournweave','thornwake'],['thornwake','thornwake']
 ]){
  const p=trial(weapons,false);
  const events=p.eventHistory(400);
  const hit=events.find(e=>e.kind==='hit'&&e.actor===1&&e.target===0);
  const escape=events.find(e=>e.kind==='action'&&e.actor===0&&e.move==='step');
  assert(hit&&escape,JSON.stringify(weapons)+' needs source hit and paid step');
  assert(escape.tick>hit.tick+7&&escape.tick<=hit.tick+12);
  const result=p.goal();
  assert.equal(result.attempts,1);
  assert.equal(result.successes,1);
  assert.equal(result.completed,true);
  assert(result.lastIntervalFrames>=8&&result.lastIntervalFrames<=12);
  assert(p.metrics().players[0].dodgeEscapes>=1);
  assert(!events.some(e=>['block','guard','throw'].includes(e.kind)));
 }
});

test('early stamina waste or no action must not produce a resource-defense achievement',()=>{
 const p=trial(['mournweave','mournweave'],true);
 const events=p.eventHistory(400);
 assert(events.some(e=>e.kind==='action'&&e.actor===0&&e.move==='foldedLight'));
 assert(events.some(e=>e.kind==='hit'&&e.actor===1&&e.target===0));
 assert.equal(p.goal().attempts,1);
 assert.equal(p.goal().successes,0,
  'spending reserve on an early whiff should remove the prompt paid escape');
 const passive=huntPracticeSession({drill:'stamina-escape'});
 for(let tick=1;tick<=72;tick++)assert(passive.append(cmd()));
 assert.equal(passive.goal().attempts,1);
 assert.equal(passive.goal().successes,0);
 const impossible=evaluateHuntTrainingGoal('stamina-escape',[
  {tick:12,kind:'hit',actor:1,target:0},
  {tick:20,kind:'action',actor:0,move:'step',playerStartedStunned:false}
 ]);
 assert.equal(impossible.successes,0);
 const tooLate=evaluateHuntTrainingGoal('stamina-escape',[
  {tick:12,kind:'hit',actor:1,target:0},
  {tick:30,kind:'action',actor:0,move:'step',playerStartedStunned:true}
 ]);
 assert.equal(tooLate.successes,0);
});

test('import and rewind rebuild actual stamina/escape scoring from verified inputs',()=>{
 const p=trial(['mournweave','mournweave']);
 assert.equal(p.goal().successes,1);
 const capture=p.save();
 const loaded=huntPracticeSession({drill:'stamina-escape'});
 assert(loaded.load(capture));
 assert.equal(loaded.goal().successes,1);
 assert(loaded.rewind(60));
 assert.equal(loaded.goal().successes,0);
 for(let i=0;i<60;i++)assert(loaded.step(cmd()));
 assert.equal(loaded.goal().successes,0);
});
