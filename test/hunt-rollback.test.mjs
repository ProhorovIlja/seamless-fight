import {test} from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntStep,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
import {huntReplayFingerprint} from '../public/side-hunt-replay.mjs';
import {createHuntRollback,HUNT_ROLLBACK_SCHEMA,HUNT_ROLLBACK_EVENT_BUFFER} from '../public/hunt-rollback.mjs';
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

test('late heavy produces exact firearm parry and timed visceral after true rollback',()=>{
 const original=huntMatch();original.ready=0;
 original.p[0].x=442;original.p[1].x=518;
 const expected=structuredClone(original),r=createHuntRollback({initialState:original,maxRollback:10});
 const events=[],deliveries=[];
 for(let tick=1;tick<=120;tick++){
  const local={...neutral(),act:tick===59?'shot':tick===97?'visceral':''};
  const remote={...neutral(),act:tick===56?'heavy':''};
  huntStep(expected,[local,remote],events);r.advance(local);
  deliveries.push({tick:tick-1,remote,due:tick+3});
  for(const item of deliveries.filter(x=>x.due===tick))
   r.confirm(item.tick,item.remote);
 }
 for(const item of deliveries.filter(x=>x.due>120))r.confirm(item.tick,item.remote);
 assert.deepEqual(r.getState(),expected,'rollback must preserve both counter and conversion');
 assert(events.some(e=>e.tick===68&&e.kind==='gunParry'&&e.actor===0));
 assert(events.some(e=>e.tick===103&&e.kind==='visceral'&&e.actor===0&&e.damage===42));
 assert(r.getStats().corrections>=1);
 assert.equal(r.getStats().pending,0);
});
test('HP-cost temporary blood rounds survive deterministic delayed remote reconciliation',()=>{
 const original=huntMatch();original.ready=0;
 const expected=structuredClone(original),r=createHuntRollback({initialState:original,maxRollback:8});
 const mail=[];
 for(let tick=1;tick<=75;tick++){
  const local={...neutral(),act:tick===1?'blood':tick===46?'shot':''};
  const remote={...neutral(),act:tick===17?'step':''};
  huntStep(expected,[local,remote]);r.advance(local);
  mail.push({tick:tick-1,remote,due:tick+2});
  for(const m of mail.filter(x=>x.due===tick))r.confirm(m.tick,m.remote);
 }
 for(const m of mail.filter(x=>x.due>75))r.confirm(m.tick,m.remote);
 assert.deepEqual(r.getState(),expected);
 assert.equal(r.getState().p[0].hp,70);
 assert.equal(r.getState().p[0].bloodAmmo,4);
 assert.equal(r.getState().p[0].ammo,7);
 assert.equal(r.getStats().pending,0);
});

test('only contiguous confirmed frames emit source actions: no duplicate SFX after rollback',()=>{
 const initial=huntMatch();initial.ready=0;
 initial.p[0].x=442;initial.p[1].x=518;
 const reference=structuredClone(initial),r=createHuntRollback({initialState:initial,maxRollback:12});
 const deliveries=[],expected=[],received=[];
 for(let tick=1;tick<=120;tick++){
  const a={...neutral(),act:tick===59?'shot':tick===97?'visceral':''};
  const b={...neutral(),act:tick===56?'heavy':''};
  const events=[];
  huntStep(reference,[a,b],events);
  for(let i=0;i<events.length;i++)expected.push({...events[i],
   eventId:HUNT_RULESET+':'+(tick-1)+':'+i});
  r.advance(a);
  deliveries.push({tick:tick-1,remote:b,due:tick+3});
  for(const item of deliveries.filter(x=>x.due===tick))
   r.confirm(item.tick,item.remote);
  const drained=r.drainConfirmedEvents();
  if(tick===68)assert(![...received,...drained].some(e=>e.kind==='gunParry'),
   'rollback must not play gun-parry effects from an unconfirmed source tick');
  received.push(...drained);
 }
 for(const item of deliveries.filter(x=>x.due>120))
  r.confirm(item.tick,item.remote);
 received.push(...r.drainConfirmedEvents(2048));
 assert.deepEqual(received,expected,'every real source event exactly once, in tick order');
 assert(received.some(e=>e.kind==='gunParry'&&e.tick===68));
 assert(received.some(e=>e.kind==='visceral'&&e.tick===103));
 assert.equal(new Set(received.map(e=>e.eventId)).size,received.length);
 assert.equal(r.drainConfirmedEvents().length,0,'repeated drain must not replay SFX');
 assert.equal(r.getStats().confirmedThrough,120);
 assert.equal(r.getStats().queuedEvents,0);
 assert.equal(r.getStats().droppedEvents,0);
});
test('discarded speculative impact never leaks into confirmed combat event stream',()=>{
 const initial=huntMatch();initial.ready=0;
 initial.p[0].x=442;initial.p[1].x=518;
 const reference=structuredClone(initial),r=createHuntRollback({initialState:initial,maxRollback:20});
 const commands=[],expected=[],received=[];
 for(let tick=1;tick<=14;tick++){
  const a={...neutral(),act:tick===1?'shot':''};
  const b={...neutral(),act:tick===4?'step':'',x:tick===4?1:0};
  const events=[];
  huntStep(reference,[a,b],events);
  expected.push(...events);
  commands.push(b);
  r.advance(a);
 }
 assert.equal(r.getStats().confirmedThrough,0);
 assert.deepEqual(r.drainConfirmedEvents(),[],'speculative audiovisual events cannot commit');
 // Deliberately reconcile a late evasive step BEFORE filling earlier missing frames.
 r.confirm(3,commands[3]);
 for(let tick=0;tick<14;tick++)if(tick!==3)r.confirm(tick,commands[tick]);
 received.push(...r.drainConfirmedEvents(2048));
 assert.deepEqual(r.getState(),reference);
 assert.deepEqual(received.map(({eventId,...event})=>event),expected);
 assert.equal(r.getStats().confirmedThrough,14);
 assert.equal(r.getStats().droppedEvents,0);
});
test('confirmed event drain validates bounds and returns defensive copies',()=>{
 const r=createHuntRollback({initialState:(()=>{const s=huntMatch();s.ready=0;return s;})()});
 assert.throws(()=>r.drainConfirmedEvents(0),/1..2048/);
 assert.throws(()=>r.drainConfirmedEvents(2049),/1..2048/);
 r.confirm(0,{...neutral(),act:'shot'});
 r.advance(neutral());
 const events=r.drainConfirmedEvents();
 assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='shot'));
 events[0].kind='injected';
 assert.deepEqual(r.drainConfirmedEvents(),[]);
 assert.equal(r.getStats().droppedEvents,0);
});
