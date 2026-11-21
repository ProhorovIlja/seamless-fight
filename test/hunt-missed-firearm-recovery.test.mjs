import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntMatch,huntStep,huntInput,huntMoveSpec,HUNT_WEAPONS
} from '../public/side-hunt-lab.mjs';
import {
 huntPracticeSession,HUNT_PRACTICE_DRILLS
} from '../public/hunt-practice-suite.mjs';
import {evaluateHuntTrainingGoal} from '../public/hunt-training-goals.mjs';

const cmd=(act='',x=0)=>({...huntInput(),act,x});
function exchange({gunFacingRight,weapon='mournweave'}={}){
 const s=huntMatch({weapons:[weapon,weapon]});s.ready=0;
 const hunter=s.p[0],gunner=s.p[1];
 hunter.x=420;hunter.vx=0;hunter.dir=1;
 gunner.x=500;gunner.vx=0;gunner.dir=gunFacingRight?1:-1;
 hunter.act='foldedLight';hunter.age=huntMoveSpec(hunter).startup-1;
 gunner.act='shot';gunner.age=huntMoveSpec(gunner).startup;
 // Ammo has already been spent to begin the committed firearm action.
 gunner.ammo=6;
 const events=[];
 huntStep(s,[huntInput(),huntInput()],events);
 huntStep(s,[huntInput(),huntInput()],events);
 return {s,events};
}

test('genuine missed shot is actually vulnerable to melee during firearm recovery',()=>{
 for(const weapon of HUNT_WEAPONS){
  const {s,events}=exchange({gunFacingRight:true,weapon});
  const whiff=events.find(e=>e.kind==='whiff'&&e.actor===1&&e.move==='shot');
  const hit=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
  assert(whiff,weapon+' must genuinely miss with a committed firearm');
  assert(hit,weapon+' hunter must physically connect in the shot recovery');
  assert.equal(hit.punishedRecovery,true);
  assert.equal(hit.punishedMove,'shot');
  assert(hit.remainingRecovery>0);
  assert.equal(s.p[1].act,'stun','the shot is interrupted by a genuine landed melee hit');
  const grade=evaluateHuntTrainingGoal('gun-whiff-punish',events);
  assert.equal(grade.attempts,1);
  assert.equal(grade.successes,1);
  assert.equal(grade.completed,true);
  assert.equal(grade.lastIntervalFrames,hit.tick-whiff.tick);
 }
});

test('a gunshot hitting the opponent never earns fake shot-whiff-punish credit',()=>{
 const {events}=exchange({gunFacingRight:false});
 assert(events.some(e=>e.kind==='bulletHit'&&e.actor===1));
 assert(!events.some(e=>e.kind==='whiff'&&e.actor===1&&e.move==='shot'));
 const grade=evaluateHuntTrainingGoal('gun-whiff-punish',events);
 assert.equal(grade.attempts,0);
 assert.equal(grade.successes,0);
});

test('missed firearm practice requires confirmed melee contact during genuine recovery',()=>{
 const miss={tick:65,kind:'whiff',actor:1,move:'shot'};
 const actual={tick:72,kind:'hit',actor:0,target:1,move:'foldedLight',
  punishedRecovery:true,punishedMove:'shot',remainingRecovery:18};
 const score=ev=>evaluateHuntTrainingGoal('gun-whiff-punish',ev);
 assert.equal(score([miss,actual]).successes,1);
 assert.equal(score([miss,{...actual,kind:'action'}]).successes,0);
 assert.equal(score([miss,{...actual,target:0}]).successes,0);
 assert.equal(score([miss,{...actual,punishedRecovery:false}]).successes,0);
 assert.equal(score([miss,{...actual,punishedMove:'foldedHeavy'}]).successes,0);
 assert.equal(score([miss,{...actual,remainingRecovery:0}]).successes,0);
 assert.equal(score([{...miss,actor:0},actual]).successes,0);
 assert.equal(score([miss,{...actual,tick:91}]).successes,0,
  'punish after the guaranteed source 25F gun recovery must not score');
 assert.equal(score([{...miss,kind:'bulletHit'},actual]).successes,0,
  'an actual gun hit is NOT a firearm whiff');
});

test('new English neutral drill records a real gun action; attempts require its MISS',()=>{
 const config=HUNT_PRACTICE_DRILLS.find(x=>x.id==='gun-whiff-punish');
 assert(config);
 assert.equal(config.action,'shot');
 assert.equal(config.spacing,110);
 const practice=huntPracticeSession({drill:'gun-whiff-punish'});
 for(let tick=1;tick<=91;tick++)practice.append(cmd());
 assert(practice.eventHistory(400).some(e=>e.kind==='action'&&e.actor===1&&e.move==='shot'));
 assert.equal(practice.goal().successes,0,'passive input cannot fake a punish');
 assert.equal(practice.goal().language,'en');
 assert.equal(practice.goal().mode,'unrated-offline-1v1');
});

test('a real player can dodge the live gunshot then melee-punish its recovery',()=>{
 const s=huntPracticeSession({drill:'gun-whiff-punish'});
 for(let tick=1;tick<=101;tick++){
  const input=tick===59?cmd('step',1):tick===81?cmd('light'):cmd();
  assert(s.append(input),'replay must accept each ordinary 60Hz input');
 }
 const events=s.eventHistory(300);
 const shot=events.find(e=>e.kind==='action'&&e.actor===1&&e.move==='shot');
 const miss=events.find(e=>e.kind==='whiff'&&e.actor===1&&e.move==='shot');
 const hit=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(shot,'dummy must execute real firearm input');
 assert(miss,'real step i-frames must dodge the single active gun frame');
 assert(hit,'hunter must actually connect the follow-up attack');
 assert.equal(hit.punishedRecovery,true);
 assert.equal(hit.punishedMove,'shot');
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,1);
 assert.equal(s.inspect().p[0].hp,100);
 assert.equal(s.goal().lastIntervalFrames,hit.tick-miss.tick);
});

test('LEFT-corner escape attempts cannot be awarded from RIGHT-wall pressure',()=>{
 const action={tick:46,kind:'action',actor:1,move:'foldedHeavy'};
 const crossed={tick:53,kind:'cornerEscape',actor:0,side:'left'};
 const score=events=>evaluateHuntTrainingGoal('corner-escape',events);
 assert.equal(score([{...action,playerWall:'right'},crossed]).attempts,0);
 assert.equal(score([{...action,playerWall:'right'},crossed]).successes,0);
 assert.equal(score([{...action,playerWall:'left'},crossed]).successes,1);
});
