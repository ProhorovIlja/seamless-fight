import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPracticeSession,HUNT_PRACTICE_DRILLS} from '../public/hunt-practice-suite.mjs';
import {HUNT_TRAINING_GOALS,HUNT_TRAINING_SCORE_SCHEMA,evaluateHuntTrainingGoal}
 from '../public/hunt-training-goals.mjs';
import {HUNT_FLOOR,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
const cmd=(act='',x=0,y=0)=>({act,x,y,guard:false});
function run(session,actions={},count=95){
 for(let tick=1;tick<=count;tick++)
  assert.equal(session.append(actions[tick]||cmd()),true,'source append tick '+tick);
 return session;
}
test('all fifteen source drills are authored in English, mapped to real categories and ranked nowhere',()=>{
 assert.equal(HUNT_PRACTICE_DRILLS.length,15);
 const categories=new Set();
 for(const scenario of HUNT_PRACTICE_DRILLS){
  assert(Object.hasOwn(HUNT_TRAINING_GOALS,scenario.id));
  const p=huntPracticeSession({drill:scenario.id});
  const goal=p.goal();
  assert.equal(goal.schema,HUNT_TRAINING_SCORE_SCHEMA);
  assert.equal(goal.language,'en');
  assert.equal(goal.mode,'unrated-offline-1v1');
  assert.equal(goal.drill,scenario.id);
  assert.equal(goal.attempts,0);
  assert.equal(goal.successes,0);
  assert.equal(goal.completed,false);
  assert.equal(p.inspect().rules,HUNT_RULESET);
  assert.equal(p.inspect().p.length,2);
  categories.add(goal.category);
 }
 for(const category of ['Offense','Defense','Resources','Reads & Footsies'])
  assert(categories.has(category));
 assert.throws(()=>evaluateHuntTrainingGoal('throw-tech',[]),/Unknown/);
});
test('successful timed firearm counter is scored only after actual source action and parry',()=>{
 const success=run(huntPracticeSession({drill:'parry-heavy'}),{62:cmd('shot')},76);
 const events=success.eventHistory(200);
 assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy'));
 assert(events.some(e=>e.kind==='gunParry'&&e.actor===0&&e.target===1));
 const score=success.goal();
 assert.equal(score.attempts,1);
 assert.equal(score.successes,1);
 assert.equal(score.completed,true);
 assert.equal(score.lastSuccessTick,events.find(e=>e.kind==='gunParry').tick);
 const whiff=run(huntPracticeSession({drill:'parry-heavy'}),{},76);
 assert.equal(whiff.goal().attempts,1);
 assert.equal(whiff.goal().successes,0);
 assert.match(whiff.goal().status,/not yet confirmed/);
});
test('escape challenge is earned through the actual hit and stamina-paid quickstep, not just an input',()=>{
 const s=run(huntPracticeSession({drill:'escape-stun'}),{75:cmd('step',-1)},80);
 const events=s.eventHistory(200);
 assert(events.some(e=>e.kind==='hit'&&e.actor===1&&e.target===0));
 assert(events.some(e=>e.kind==='action'&&e.actor===0&&e.move==='step'));
 assert.equal(s.goal().successes,1);
 assert(s.metrics().players[0].dodgeEscapes>=1);
 const noEscape=run(huntPracticeSession({drill:'escape-stun'}),{},80);
 assert.equal(noEscape.goal().successes,0);
});
test('quickstep shot defense requires source bullet whiff and actual step inside attack reach',()=>{
 const s=run(huntPracticeSession({drill:'dodge-shot'}),{61:cmd('step',-1)},80);
 assert(s.eventHistory(200).some(e=>e.kind==='whiff'&&e.actor===1&&e.move==='shot'));
 assert.equal(s.inspect().p[0].hp,100);
 assert.equal(s.goal().successes,1);
 const passive=run(huntPracticeSession({drill:'dodge-shot'}),{},80);
 assert.equal(passive.goal().successes,0);
});
test('real jumping opponent generates an airborne target, not an invented anti-air hit',()=>{
 const s=huntPracticeSession({drill:'anti-air'});
 run(s,{},82);
 const jump=s.eventHistory(200).find(e=>e.kind==='jump'&&e.actor===1);
 assert(jump,'second fighter uses actual one-jump input');
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,0,'no confirmed enemy contact should never count as anti-air');
 assert.equal(s.inspect().p.length,2);
});
test('whiff punishment must follow a genuine missed heavy and no passive points awarded',()=>{
 const s=huntPracticeSession({drill:'whiff-punish'});
 run(s,{},94);
 const whiff=s.eventHistory(200).find(e=>e.kind==='whiff'&&e.actor===1&&e.move==='foldedHeavy');
 assert(whiff,'unpunished dummy out-of-range heavy must really miss');
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,0);
});
test('timing-read offers deterministic genuine committed heavy versus feint, never high/low or throws',()=>{
 const a=huntPracticeSession({drill:'timing-read'});
 assert.equal(a.stats().mode,'random');
 assert.equal(a.slotData(0)[62].act,'');
 assert.equal(a.slotData(1)[62].act,'feint');
 a.setMode('loop',1);
 run(a,{},90);
 assert(a.eventHistory(200).some(e=>e.kind==='action'&&e.actor===1&&e.move==='feint'));
 assert.equal(a.goal().attempts,1);
 assert.equal(a.goal().successes,0);
 assert(!a.eventHistory(200).some(e=>['block','throw','tag','guard'].includes(e.kind)));
});
test('30HP-to-five-blood-round ritual then a real shot can complete source resource objective',()=>{
 const s=huntPracticeSession({drill:'blood-economy'});
 const inputs={1:cmd('blood'),46:cmd('shot')};
 run(s,inputs,74);
 const events=s.eventHistory(200);
 assert(events.some(e=>e.kind==='bloodBullets'&&e.actor===0));
 assert(events.some(e=>e.kind==='fire'&&e.actor===0));
 assert.equal(s.goal().successes,1);
 assert.equal(s.inspect().p[0].hp,70);
 assert.equal(s.inspect().p[0].ammo,7);
 assert.equal(s.inspect().p[0].bloodAmmo,4);
});
test('goal evidence resets on replay import, restart and branches when future is overwritten',()=>{
 const s=run(huntPracticeSession({drill:'parry-heavy'}),{62:cmd('shot')},82);
 assert.equal(s.goal().successes,1);
 assert(s.rewind(30));
 assert.equal(s.goal().successes,0,'erased future counter cannot remain as progress');
 assert.equal(s.stats().paused,true);
 for(let i=0;i<30;i++)s.step(cmd());
 assert.equal(s.goal().successes,0);
 s.restart();
 assert.equal(s.goal().attempts,0);
 assert.equal(s.goal().successes,0);
 const replay=run(huntPracticeSession({drill:'parry-heavy'}),{62:cmd('shot')},77).save();
 assert(s.load(replay));
 assert.equal(s.goal().successes,1,
  'verified imported replay must reconstruct the exact source parry evidence');
 assert.equal(s.eventHistory(200).some(e=>e.kind==='gunParry'&&e.actor===0),true);
 assert.equal(s.stats().paused,true);
 assert(s.rewind(30));
 assert.equal(s.goal().successes,0,'imported source replay supports a truly independent branch');
});
test('goal scorer rejects fake victory from bare attack commands without an authoritative hit event',()=>{
 const fake=evaluateHuntTrainingGoal('anti-air',[
  {tick:9,kind:'action',actor:0,move:'shot',opponentAirborne:true},
  {tick:10,kind:'jump',actor:1},
 ]);
 assert.equal(fake.attempts,1);
 assert.equal(fake.successes,0);
 const grounded=evaluateHuntTrainingGoal('anti-air',[
  {tick:10,kind:'jump',actor:1},
  {tick:14,kind:'hit',actor:0,target:1,opponentAirborne:false}
 ]);
 assert.equal(grounded.successes,0);
 const actual=evaluateHuntTrainingGoal('anti-air',[
  {tick:10,kind:'jump',actor:1},
  {tick:14,kind:'hit',actor:0,target:1,opponentAirborne:true}
 ]);
 assert.equal(actual.successes,1);
});

function play(drill,command,count=130,prepare){
 const s=huntPracticeSession({drill});
 if(prepare)prepare(s);
 for(let tick=1;tick<=count;tick++)assert(s.append(command(tick)));
 return s;
}
test('anti-air success is a genuinely connected gunshot while second fighter is airborne',()=>{
 const s=play('anti-air',t=>cmd(t===52?'shot':''),95);
 assert(s.eventHistory(140).some(e=>e.kind==='jump'&&e.actor===1));
 assert(s.eventHistory(140).some(e=>e.kind==='bulletHit'&&e.actor===0&&e.target===1));
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,1);
 assert.equal(s.goal().lastSuccessTick,61);
});
test('aerial firearm parry is earned by one ordinary jump and precise real-airShot counter',()=>{
 const s=play('air-parry',t=>cmd(t===58?'shot':'',0,t===45?-1:0),95);
 assert(s.eventHistory(140).some(e=>e.kind==='jump'&&e.actor===0));
 assert(s.eventHistory(140).some(e=>e.kind==='action'&&e.actor===0&&e.move==='airShot'));
 assert(s.eventHistory(140).some(e=>e.kind==='gunParry'&&e.actor===0));
 assert.equal(s.goal().successes,1);
 assert.equal(s.inspect().p[0].jumps<=1,true,'no double jump added');
});
test('whiff punishment counts a real attacker hit only after the dummy heavy whiffs',()=>{
 const s=play('whiff-punish',t=>cmd(t===88?'light':'',
  t>=69&&t<88?1:0),135);
 assert(s.eventHistory(140).some(e=>e.kind==='whiff'&&e.actor===1&&e.move==='foldedHeavy'));
 assert(s.eventHistory(140).some(e=>e.kind==='hit'&&e.actor===0&&e.target===1));
 assert.equal(s.goal().successes,1);
});
test('actual two-contact hit confirm is counted, without importing traditional guard or throw',()=>{
 const s=play('hit-confirm',t=>cmd([1,11].includes(t)?'light':''),70);
 assert.equal(s.goal().successes,1);
 assert.equal(s.goal().attempts,2);
 const hits=s.eventHistory(120).filter(e=>e.kind==='hit'&&e.actor===0);
 assert.deepEqual(hits.map(e=>e.combo),[1,2]);
});
test('offense scores a confirmed weapon transformation hit, not the transformation alone',()=>{
 const s=play('transform-pressure',t=>cmd(t===1?'trick':t===17?'light':''),80);
 assert(s.eventHistory(100).some(e=>e.kind==='transform'&&e.actor===0&&e.form==='unfurled'));
 assert(s.eventHistory(100).some(e=>e.kind==='hit'&&e.actor===0&&e.move==='unfurledLight'));
 assert.equal(s.goal().successes,1);
 const noHit=play('transform-pressure',t=>cmd(t===1?'trick':''),75);
 assert.equal(noHit.goal().attempts,1);
 assert.equal(noHit.goal().successes,0);
});
test('source rally recovery restores actual HP only after melee is taken and returned',()=>{
 const s=play('rally-reclaim',t=>cmd(t===92?'light':'',
  t>=85&&t<92?1:0),125);
 const events=s.eventHistory(160);
 assert(events.some(e=>e.kind==='hit'&&e.actor===1));
 assert(events.some(e=>e.kind==='rally'&&e.actor===0&&e.health===15));
 assert.equal(s.goal().successes,1);
 assert.equal(s.inspect().p[0].hp,100);
});
test('true heavy-to-feint timing read rewards the confirmed punish and not a synthetic mixup',()=>{
 const s=play('timing-read',t=>cmd(t===72?'light':'',
  t>=67&&t<72?1:0),105,
  instance=>instance.setMode('loop',1));
 const events=s.eventHistory(140);
 assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='feint'));
 assert(events.some(e=>e.kind==='hit'&&e.actor===0));
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,1);
});
test('real firearm counter converts to timed visceral strike before opening expires',()=>{
 const s=play('visceral-followup',t=>cmd(t===59?'shot':t===97?'visceral':''),125);
 const events=s.eventHistory(140);
 assert(events.some(e=>e.kind==='gunParry'&&e.actor===0));
 assert(events.some(e=>e.kind==='visceral'&&e.actor===0));
 assert.equal(s.goal().successes,1);
 assert.equal(s.goal().lastSuccessTick,103);
});
