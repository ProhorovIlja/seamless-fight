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
test('all twenty-one source drills are authored in English, mapped to real categories and ranked nowhere',()=>{
 assert.equal(HUNT_PRACTICE_DRILLS.length,21);
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
 const punish=s.eventHistory(140).find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(punish,'real melee hit must connect');
 assert.equal(punish.punishedRecovery,true,'opponent is still locked in heavy recovery');
 assert.equal(punish.punishedMove,'foldedHeavy');
 assert(punish.remainingRecovery>0);
 assert.equal(s.goal().successes,1);
});
test('late melee hit is NOT a whiff punish even within old 25-frame heuristic',()=>{
 const late=play('whiff-punish',t=>{
  const age=t-56;
  return cmd(age===39?'light':'',age>=0&&age<6?-1:
   age>=6&&age<39?1:0);
 },130);
 const events=late.eventHistory(180);
 const whiff=events.find(e=>e.kind==='whiff'&&e.actor===1&&e.move==='foldedHeavy');
 const hit=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(whiff&&hit);
 assert(hit.tick-whiff.tick<=25,'previous scoring heuristic would have falsely awarded this hit');
 assert.equal(hit.punishedRecovery,false,'at contact, the target was ALREADY actionable');
 assert.equal(hit.punishedMove,'');
 assert.equal(late.goal().successes,0,'no points for a late hit after recovery finished');
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

test('actual source trigger-to-success intervals are measured in frames and do not grant fake successes',()=>{
 const failed=run(huntPracticeSession({drill:'parry-heavy'}),{},85).goal();
 assert.equal(failed.lastIntervalFrames,null);
 assert.equal(failed.bestIntervalFrames,null);
 assert.equal(failed.averageIntervalFrames,null);
 assert.equal(failed.intervalSamples,0);
 const parry=run(huntPracticeSession({drill:'parry-heavy'}),{62:cmd('shot')},85).goal();
 assert.equal(parry.lastIntervalFrames,parry.lastSuccessTick-56);
 assert.equal(parry.bestIntervalFrames,parry.lastIntervalFrames);
 assert.equal(parry.averageIntervalFrames,parry.lastIntervalFrames);
 assert.equal(parry.intervalSamples,1);
 const anti=play('anti-air',tick=>cmd(tick===52?'shot':''),95).goal();
 assert.equal(anti.lastIntervalFrames,5);
 const visceral=play('visceral-followup',tick=>cmd(tick===59?'shot':tick===97?'visceral':''),125).goal();
 assert.equal(visceral.lastIntervalFrames,35);
 const combo=play('hit-confirm',tick=>cmd([1,11].includes(tick)?'light':''),70).goal();
 assert.equal(combo.lastIntervalFrames,10,'start from first landed strike, not second hit');
});
test('rewind erases observed timing and verified import rebuilds proof',()=>{
 const p=run(huntPracticeSession({drill:'parry-heavy'}),{62:cmd('shot')},85);
 const frames=p.goal().lastIntervalFrames;
 assert(frames>0);
 const capture=p.save();
 assert(p.rewind(35));
 assert.equal(p.goal().lastIntervalFrames,null);
 assert.equal(p.goal().intervalSamples,0);
 assert(p.load(capture));
 assert.equal(p.goal().lastIntervalFrames,frames);
 assert.equal(p.goal().intervalSamples,1);
});


test('both wall counterpoke drills actually interrupt R2 startup without guard or firearm',()=>{
 for(const side of ['left','right']){
  const drill='corner-interrupt-'+side;
  const s=huntPracticeSession({drill});
  const initial=s.inspect();
  assert.equal(initial.p[0].x,side==='left'?65:895);
  assert.equal(initial.p[1].x,side==='left'?107:853);
  run(s,{48:cmd('light')},90);
  const actions=s.eventHistory(160);
  assert(actions.some(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy'));
  const hit=actions.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
  assert(hit,drill+' requires a real successful melee counter');
  assert.equal(hit.move,'foldedLight');
  assert.equal(hit.hitDuringStartup,true);
  assert.equal(hit.interruptedMove,'foldedHeavy');
  assert(hit.remainingStartup>0);
  assert.equal(actions.some(e=>e.kind==='gunParry'),false);
  const grade=s.goal();
  assert.equal(grade.attempts,1);
  assert.equal(grade.successes,1);
  assert.equal(grade.completed,true);
  assert.equal(grade.lastIntervalFrames,hit.tick-46);
  const passive=run(huntPracticeSession({drill}),{},90);
  assert.equal(passive.goal().attempts,1);
  assert.equal(passive.goal().successes,0);
 }
});

test('corner counterhit score requires the actual designated wall, heavy startup and melee hit',()=>{
 for(const [side,opposite] of [['left','right'],['right','left']]){
  const goal='corner-interrupt-'+side;
  const source=[
   {tick:46,kind:'action',actor:1,move:'foldedHeavy',playerWall:side},
   {tick:54,kind:'hit',actor:0,target:1,move:'foldedLight',
    hitDuringStartup:true,interruptedMove:'foldedHeavy',remainingStartup:8}
  ];
  assert.equal(evaluateHuntTrainingGoal(goal,source).successes,1);
  assert.equal(evaluateHuntTrainingGoal(goal,[
   {...source[0],playerWall:opposite},source[1]
  ]).successes,0,'no mirrored wall mismatch can earn success');
  assert.equal(evaluateHuntTrainingGoal(goal,[
   source[0],{...source[1],hitDuringStartup:false,remainingStartup:0}
  ]).successes,0,'late recovery strike is NOT a startup interrupt');
  assert.equal(evaluateHuntTrainingGoal(goal,[
   source[0],{...source[1],move:'shot'}
  ]).successes,0,'bullet parry is a separate skill, not a melee startup interrupt');
  assert.equal(evaluateHuntTrainingGoal(goal,[source[0]]).attempts,1);
  assert.equal(evaluateHuntTrainingGoal(goal,[source[0]]).successes,0);
 }
});

test('corner goal cannot be earned by a button press without actual source crossing',()=>{
 const empty=evaluateHuntTrainingGoal('corner-escape',[
  {tick:46,kind:'action',actor:1,move:'foldedHeavy',playerWall:'left'},
  {tick:48,kind:'action',actor:0,move:'step'}]);
 assert.equal(empty.attempts,1);
 assert.equal(empty.completed,false);
 const confirmed=evaluateHuntTrainingGoal('corner-escape',[
  {tick:46,kind:'action',actor:1,move:'foldedHeavy',playerWall:'left'},
  {tick:48,kind:'action',actor:0,move:'step'},
  {tick:53,kind:'cornerEscape',actor:0,target:1,side:'left'}]);
 assert.equal(confirmed.completed,true);
 assert.equal(confirmed.lastIntervalFrames,7);
});

test('both wall-crossing drills award only a real directional through-step at the indicated side',()=>{
 for(const side of ['left','right']){
  const drill=side==='left'?'corner-escape':'corner-escape-right';
  const session=huntPracticeSession({drill});
  assert.equal(session.inspect().p[0].x,side==='left'?65:895);
  assert.equal(session.inspect().p[1].x,side==='left'?107:853);
  for(let frame=1;frame<=66;frame++){
   assert(session.append(cmd(frame===48?'step':'',frame===48?(side==='left'?1:-1):0)));
  }
  const pressure=session.eventHistory(200).find(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy');
  const crossing=session.eventHistory(200).find(e=>e.kind==='cornerEscape'&&e.actor===0);
  assert(pressure&&crossing,`actual ${side} wall pressure and collision crossing required`);
  assert.equal(crossing.side,side);
  assert.equal(session.goal().attempts,1);
  assert.equal(session.goal().successes,1);
  const final=session.inspect().p;
  assert(side==='left'?final[0].x>final[1].x:final[0].x<final[1].x);
  const noInput=huntPracticeSession({drill});
  for(let frame=1;frame<=66;frame++)noInput.append(cmd());
  assert.equal(noInput.goal().successes,0);
 }
});

test('mirrored wall-cross scoring rejects mismatched wall evidence',()=>{
 const fake=[
  {tick:46,kind:'action',actor:1,move:'foldedHeavy',playerWall:'left'},
  {tick:54,kind:'cornerEscape',actor:0,target:1,side:'right'}
 ];
 assert.equal(evaluateHuntTrainingGoal('corner-escape',fake).successes,0);
 assert.equal(evaluateHuntTrainingGoal('corner-escape-right',fake).successes,0);
 assert.equal(evaluateHuntTrainingGoal('corner-escape',[
  {...fake[0],playerWall:'right'},
  {...fake[1],side:'left'}
 ]).successes,0);
});

test('quickstep recovery drill scores real contact after i-frames but before step recovery',()=>{
 const valid=run(huntPracticeSession({drill:'dodge-punish'}),{63:cmd('light')},94);
 const step=valid.eventHistory(140).find(e=>e.kind==='action'&&e.actor===1&&e.move==='step');
 const hit=valid.eventHistory(140).find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(step&&hit);
 assert.equal(hit.punishedDodgeRecovery,true);
 assert.equal(hit.dodgeRecoveryFrames,7);
 assert.equal(valid.goal().successes,1);
 assert.equal(valid.goal().attempts,1);
 const late=run(huntPracticeSession({drill:'dodge-punish'}),{70:cmd('light')},98);
 const lateHit=late.eventHistory(140).find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(lateHit);
 assert.equal(lateHit.punishedDodgeRecovery,false);
 assert.equal(late.goal().successes,0,'post-recovery light must not earn punishment');
 const idle=run(huntPracticeSession({drill:'dodge-punish'}),{},98);
 assert.equal(idle.goal().successes,0,'observing the dummy step never awards points');
});

test('heavy startup interrupt is an authentic counter-hit, not free gun parry or extra damage',()=>{
 const valid=run(huntPracticeSession({drill:'counter-hit'}),{61:cmd('light')},94);
 const ev=valid.eventHistory(140);
 const hit=ev.find(e=>e.kind==='hit'&&e.actor===0);
 assert(hit);
 assert.equal(hit.hitDuringStartup,true);
 assert.equal(hit.interruptedMove,'foldedHeavy');
 assert.equal(hit.remainingStartup,5);
 assert.equal(hit.damage,15,'original physical light damage, not an invented bonus');
 assert.equal(valid.goal().attempts,1);
 assert.equal(valid.goal().successes,1);
 assert(!ev.some(e=>e.kind==='gunParry'),'no firearm or visceral was used');
 const idle=run(huntPracticeSession({drill:'counter-hit'}),{},95);
 assert.equal(idle.goal().successes,0);
});
