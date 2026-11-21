import {test} from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntStep,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
import {huntReplayFingerprint} from '../public/side-hunt-replay.mjs';
import {createHuntRollback,HUNT_ROLLBACK_SCHEMA} from '../public/hunt-rollback.mjs';
const neutral=()=>({x:0,y:0,act:'',guard:false});
function scripted(t,slot){
 return {x:(t+slot*11)%39<19?1:-1,y:t%73===27?-1:0,
  act:t%61===(slot?9:11)?'shot':t%97===(slot?51:49)?'trick':
   t%43===(slot?28:8)?'light':t%131===(slot?45:22)?'heavy':
   t%151===(slot?35:29)?'step':'',guard:false};
}
test('Hunt source 60Hz state matches uninterrupted reference after delayed/reordered inputs',()=>{
 const start=huntMatch();start.ready=0;
 const r=createHuntRollback({initialState:start,maxRollback:12});
 const expected=structuredClone(start),mail=[];let corrected=0;
 for(let t=0;t<360;t++){
  const a=scripted(t,0),b=scripted(t,1);
  huntStep(expected,[a,b]);r.advance(a);
  mail.push({tick:t,remote:b,due:t+1+(t*7)%6});
  for(const m of mail.filter(x=>x.due===t).reverse())
   if(r.confirm(m.tick,m.remote).rolledBack)corrected++;
 }
 for(const m of mail.filter(x=>x.due>=360).reverse())
  if(r.confirm(m.tick,m.remote).rolledBack)corrected++;
 assert.deepEqual(r.getState(),expected);
 assert.equal(r.getStats().fingerprint,huntReplayFingerprint(expected));
 assert.equal(r.getStats().pending,0);
 assert.equal(r.getStats().confirmedThrough,360);
 assert.equal(r.getStats().schema,HUNT_ROLLBACK_SCHEMA);
 assert(corrected>0);assert(r.getStats().resimulated>corrected);
 assert(r.getStats().retained<=12);
});
test('speculative predictions hold movement, never synthesize a second attack or heal',()=>{
 const start=huntMatch();start.ready=0;
 const r=createHuntRollback({initialState:start,maxRollback:5});
 r.confirm(0,{x:-1,y:0,act:'shot',guard:false});
 assert.equal(r.advance(neutral()).predicted,false);
 assert.equal(r.advance(neutral()).predicted,true);
 assert.equal(r.getState().p[1].ammo,6);
 assert.equal(r.confirm(1,{x:-1,y:0,act:'',guard:false}).rolledBack,false);
});
test('window pressure stalls safely, then confirms and rejects expired packets',()=>{
 const r=createHuntRollback({maxRollback:3});
 for(let i=0;i<3;i++)r.advance(neutral());
 const hash=r.getStats().fingerprint;
 assert.throws(()=>r.advance(neutral()),/Prediction window exhausted/);
 assert.equal(r.getStats().fingerprint,hash);
 assert.equal(r.getStats().tick,3);
 r.confirm(0,neutral());r.advance(neutral());
 assert.throws(()=>r.confirm(0,{...neutral(),x:1}),/outside Hunt rollback/);
});
test('future early delivery and duplicate confirms do not mutate confirmed snapshots',()=>{
 const r=createHuntRollback({maxRollback:8});
 const shot={...neutral(),act:'shot'};
 r.confirm(0,shot);assert.equal(r.advance(neutral()).predicted,false);
 const hash=r.getStats().fingerprint;
 assert.equal(r.confirm(0,shot).rolledBack,false);
 assert.equal(r.getStats().fingerprint,hash);
 assert.throws(()=>r.confirm(0,{...neutral(),act:'heavy'}),/Conflicting/);
 assert.throws(()=>r.confirm(200,neutral()),/too far ahead/);
 assert.throws(()=>r.confirm(1,{...neutral(),guard:true}),/blocking|guard/i);
 assert.equal(r.getStats().fingerprint,hash);
});
test('confirmed prefix excludes speculative future; state copies are immutable',()=>{
 const r=createHuntRollback({maxRollback:5});
 const base=r.confirmedPrefixState();
 r.advance(neutral());
 const modified=r.getState();modified.p[0].hp=0;modified.score[0]=999;
 assert.deepEqual(r.confirmedPrefixState(),base);
 assert.equal(r.getState().p[0].hp,100);
 r.confirm(0,{...neutral(),act:'light'});
 assert.equal(r.getStats().pending,0);
 assert.deepEqual(r.confirmedPrefixState(),r.getState());
 assert.equal(r.getState().rules,HUNT_RULESET);
});
test('other rulesets, extra fighters and oversized windows cannot enter Hunt rollback',()=>{
 assert.throws(()=>createHuntRollback({initialState:{rules:'seamless-side/1',tick:0,p:[{},{}]}}),/Hunt/);
 const bad=huntMatch();bad.p.push({});
 assert.throws(()=>createHuntRollback({initialState:bad}),/Hunt/);
 assert.throws(()=>createHuntRollback({maxRollback:121}),/1..120/);
});
