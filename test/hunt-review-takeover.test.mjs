import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';
const cmd=(act='',x=0,y=0)=>({x,y,act,guard:false});
function run(s,to,make=()=>cmd()){
 for(let t=s.inspect().tick+1;t<=to;t++)assert(s.append(make(t)),'tick '+t);
 return s;
}
test('review rejects unobserved and free-play situations without mutating source state',()=>{
 const free=run(huntPracticeSession(),40);
 assert.equal(free.reviewLastAttempt(),null);
 const heavy=run(huntPracticeSession({drill:'parry-heavy'}),40);
 assert.equal(heavy.reviewLastAttempt(),null);
 assert.throws(()=>heavy.reviewLastAttempt({leadFrames:-1}),/0..60/);
 assert.equal(heavy.inspect().tick,40);
});
test('failed timed-counter situation replays exact opponent inputs for a new successful parry',()=>{
 const s=run(huntPracticeSession({drill:'parry-heavy'}),85);
 assert.equal(s.goal().attempts,1);
 assert.equal(s.goal().successes,0);
 const tape=s.save().frames.slice(44,85).map(inputs=>inputs[1]);
 const review=s.reviewLastAttempt({leadFrames:12});
 assert(review);
 assert.equal(review.attemptTick,56);
 assert.equal(review.rewoundTo,44);
 assert.equal(review.confirmed,false);
 assert.equal(s.stats().mode,'takeover');
 assert.equal(s.stats().paused,true);
 const observed=[];
 for(let tick=45;tick<=85;tick++){
  assert(s.step(cmd(tick===62?'shot':'')));
  observed.push(s.inputHistory(1)[0].input[1]);
 }
 assert.deepEqual(observed,tape,'source opponent inputs must be reproduced exactly');
 assert.equal(s.goal().successes,1,'a second attempt scores only actual firearm success');
 assert(s.eventHistory(200).some(e=>e.kind==='gunParry'&&e.actor===0));
 assert.equal(s.stats().mode,'takeover');
 assert(s.step(cmd()));
 assert.equal(s.stats().mode,'passive','takeover must stop after recorded frames');
});
test('verified imported successful replay permits a different failed outcome on takeover',()=>{
 const original=run(huntPracticeSession({drill:'parry-heavy'}),85,t=>cmd(t===62?'shot':''));
 assert.equal(original.goal().successes,1);
 const s=huntPracticeSession({drill:'parry-heavy'});
 assert(s.load(original.save()));
 const review=s.reviewLastAttempt();
 assert(review);
 assert.equal(review.confirmed,true);
 assert.equal(s.goal().successes,0,'erased future cannot count');
 for(let tick=s.inspect().tick+1;tick<=85;tick++)assert(s.step(cmd()));
 assert.equal(s.goal().successes,0);
 assert(s.eventHistory(150).some(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy'));
});
test('manual dummy selection discards the temporary opponent review tape',()=>{
 const s=run(huntPracticeSession({drill:'parry-heavy'}),80);
 assert(s.reviewLastAttempt());
 assert(s.setMode('passive',0));
 assert(s.step(cmd()));
 assert.equal(s.inputHistory(1)[0].input[1].act,'');
 assert.equal(s.stats().mode,'passive');
});
