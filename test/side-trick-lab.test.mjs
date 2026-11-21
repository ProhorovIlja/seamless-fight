import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 TRICK_RULESET,TRICK_HZ,TRICK_FLOOR,TRICK_MOVES,TRICK_ACTIONS,
 TRICK_WEAPONS,TRICK_WEAPON_SPECS,trickMoveSpec,trickFrameTable,
 trickInput,trickMatch,trickStep,trickPhase,trickAttackbox,trickInspector,
 canonicalTrickInput
} from '../public/side-trick-lab.mjs';

const cmd=(act='',x=0,y=0,guard=false)=>({act,x,y,guard});
const live=(distance=87)=>{
 const s=trickMatch();s.ready=0;s.p[0].x=435;s.p[1].x=435+distance;return s;
};
function many(s,n,a=trickInput(),b=trickInput(),events){
 for(let t=0;t<n;t++)trickStep(s,[a,b],events);
}
function finish(s,limit=100){
 for(let t=0;t<limit&&s.p[0].act;t++)trickStep(s);
}
test('new experimental ruleset is isolated from existing production protocol and input spoofing',()=>{
 const state=trickMatch();
 assert.equal(state.rules,'sf-trick-lab/2');
 assert.equal(TRICK_RULESET,'sf-trick-lab/1');assert.equal(TRICK_HZ,60);
 assert.notEqual(state.rules,'seamless-side/1');
 assert.equal(trickPhase(state.p[0]),'neutral');
 assert.deepEqual(canonicalTrickInput({}),trickInput());
 assert.equal(TRICK_MOVES.unfurl.damage,21);
 assert.equal(TRICK_MOVES.refold.damage,23);
 assert.throws(()=>trickStep({...state,rules:'seamless-side/1'}),/Incompatible/);
 for(const input of [{act:'stun'},{act:'root'},{x:2},{guard:1},{y:NaN},[],null])
  assert.throws(()=>canonicalTrickInput(input),/Input|Invalid/);
 assert(TRICK_ACTIONS.includes('trick'));
});
test('neutral transformation changes both form and accessible attack data without dealing free damage',()=>{
 const s=live(95),events=[];
 const initial=s.p[0].st;
 trickStep(s,[cmd('trick'),trickInput()],events);
 assert.equal(s.p[0].act,'shiftOut');
 assert.equal(s.p[0].form,'folded');
 many(s,8,cmd(),trickInput(),events);
 assert.equal(s.p[0].form,'unfurled');
 assert.equal(s.p[1].hp,100);
 assert.equal(s.p[0].st,initial-6);
 assert.equal(events.filter(e=>e.kind==='transform').length,1);
 finish(s);
 trickStep(s,[cmd('light'),trickInput()]);
 assert.equal(s.p[0].act,'unfurledLight');
 assert.equal(trickInspector(s).startup,11);
 assert.equal(trickAttackbox(s.p[0]).right-s.p[0].x,160);
});
test('folded attack -> transformation strike -> extended follow-up -> return transformation is a real chain',()=>{
 const s=live(78),events=[];
 trickStep(s,[cmd('light'),trickInput()],events);
 many(s,9,cmd(),trickInput(),events);
 assert.equal(s.p[0].act,'foldedLight');
 trickStep(s,[cmd('trick'),trickInput()],events);
 assert.equal(s.p[0].act,'unfurl');
 assert.equal(s.p[0].form,'folded');
 assert.equal(s.p[0].chain,2);
 many(s,12,cmd(),trickInput(),events);
 assert.equal(s.p[0].form,'unfurled');
 assert.equal(s.p[0].act,'unfurl');
 assert(events.some(e=>e.kind==='transform'&&e.move==='unfurl'));
 finish(s);
 trickStep(s,[cmd('light'),trickInput()],events);
 assert.equal(s.p[0].act,'unfurledLight');
 finish(s);
 trickStep(s,[cmd('trick'),trickInput()],events);
 assert.equal(s.p[0].act,'shiftIn','neutral trick is a transformation only, not a free strike');
 many(s,6,cmd(),trickInput(),events);
 assert.equal(s.p[0].form,'folded');
 assert(s.p[0].st<100);
 assert(events.filter(e=>e.kind==='transform').length>=2);
});
test('attack-on-hit follow-ups are legal but whiff chains are not; buffered input expires',()=>{
 const hit=live(75);
 trickStep(hit,[cmd('light'),trickInput()]);
 many(hit,10);
 assert(hit.p[0].hitConfirmed,'first hit was actually resolved');
 trickStep(hit,[cmd('heavy'),trickInput()]);
 assert.equal(hit.p[0].act,'foldedHeavy','light cancels into heavy only after confirmed strike');
 const missed=live(230);
 trickStep(missed,[cmd('light'),trickInput()]);
 many(missed,8);
 trickStep(missed,[cmd('heavy'),trickInput()]);
 assert.equal(missed.p[0].act,'foldedLight','whiff cannot cancel into ordinary heavy');
 many(missed,6);
 assert.equal(missed.p[0].queue,'','five-frame buffer expires during long recovery');
 const p=missed.p[0];
 p.age=TRICK_MOVES.foldedLight.startup+TRICK_MOVES.foldedLight.active+TRICK_MOVES.foldedLight.recovery-3;
 trickStep(missed,[cmd('heavy'),trickInput()]);
 assert.equal(p.act,'foldedLight');
 many(missed,4);
 assert.equal(p.act,'foldedHeavy','last frames of recovery preserve a genuine buffered action');
});
test('double jump and air trick attacks preserve 2.5D inertia with no infinite third jump',()=>{
 const s=live(130),p=s.p[0];
 trickStep(s,[cmd('',1,-1),trickInput()]);
 assert.equal(p.jumps,1);assert(p.y<TRICK_FLOOR);
 const firstY=p.y;
 trickStep(s,[cmd('',1,0),trickInput()]);
 trickStep(s,[cmd('',1,-1),trickInput()]);
 assert.equal(p.jumps,2);assert(p.y<firstY);
 trickStep(s,[cmd('',1,0),trickInput()]);
 trickStep(s,[cmd('',1,-1),trickInput()]);
 assert.equal(p.jumps,2,'three jump inputs during one air-time permit only two');
 assert(p.vx>0,'inertia is carried in air rather than zeroed at jump');
 trickStep(s,[cmd('light'),trickInput()]);
 assert.equal(p.act,'airFoldedLight');
 assert.equal(trickInspector(s).startup,9);
 many(s,120);
 assert.equal(p.y,TRICK_FLOOR);assert.equal(p.jumps,0);
});
test('perfect guard has a bounded four-frame window and cannot grant infinite parry meter',()=>{
 const s=live(75),events=[];
 trickStep(s,[cmd('light'),trickInput()]);
 many(s,5);
 many(s,3,cmd(),cmd('',0,0,true),events);
 assert(events.some(e=>e.kind==='parry'));
 assert.equal(s.p[1].hp,100);
 assert.equal(s.p[0].act,'stun');
 assert.equal(s.p[1].focus,24);
 const block=live(75),blocked=[];
 trickStep(block,[cmd('heavy'),cmd('',0,0,true)]);
 many(block,25,cmd(),cmd('',0,0,true),blocked);
 assert(blocked.some(e=>e.kind==='block'));
 assert(block.p[1].hp<100);
 assert.equal(block.p[1].focus,0,'blocking is not a free meter farm');
});
test('quickstep invulnerability has limited frames and focus cancel consumes a real resource',()=>{
 const s=live(80);
 s.p[0].act='foldedLight';s.p[0].age=7;
 s.p[1].act='step';s.p[1].age=4;
 trickStep(s);
 assert.equal(s.p[1].hp,100);
 const focus=live(90),p=focus.p[0];
 p.focus=75;p.act='foldedLight';p.age=TRICK_MOVES.foldedLight.startup+TRICK_MOVES.foldedLight.active;
 trickStep(focus,[cmd('sync'),trickInput()]);
 assert.equal(p.act,'sync');assert.equal(p.focus,15);
 assert.equal(trickInspector(focus).phase,'recovery');
 finish(focus);
 assert.equal(p.act,'');
});
test('same-tick genuine attacks trade and render events do not modify the simulation',()=>{
 const a=live(74),b=structuredClone(a),events=[];
 a.p[0].act='foldedLight';a.p[0].age=7;
 a.p[1].act='foldedLight';a.p[1].age=7;
 b.p[0].act='foldedLight';b.p[0].age=7;
 b.p[1].act='foldedLight';b.p[1].age=7;
 trickStep(a,[trickInput(),trickInput()],events);
 trickStep(b,[trickInput(),trickInput()]);
 assert.deepEqual(a,b);
 assert.equal(a.p[0].hp,85);assert.equal(a.p[1].hp,85);
 assert.equal(events.filter(e=>e.kind==='hit').length,2);
});
test('new rules are deterministic across 1,400 ticks and arbitrary rewind/branch playback',()=>{
 const reference=trickMatch();
 const inputs=Array.from({length:1400},(_,n)=>{
  const script=slot=>{
   const act=n%43===(slot?5:3)?'light':n%89===(slot?11:14)?'trick':
    n%101===(slot?19:6)?'heavy':n%113===(slot?9:16)?'shot':
    n%67===(slot?27:25)?'step':n%131===(slot?17:20)?'feint':'';
   return cmd(act,n%60<(slot?28:30)?1:-1,n%83===11?-1:n%71===23?1:0,n%47>=41&&n%47<=45);
  };
  return [script(0),script(1)];
 });
 const checkpoints=[];
 for(let n=0;n<inputs.length;n++){
  if(n%137===0)checkpoints.push([n,structuredClone(reference)]);
  trickStep(reference,inputs[n]);
 }
 for(const [n,restore]of checkpoints){
  for(let k=n;k<inputs.length;k++)trickStep(restore,inputs[k]);
  assert.deepEqual(restore,reference,'same inputs must reproduce from tick '+n);
 }
 assert.equal(reference.tick,1400);
 for(const p of reference.p){
  assert(Number.isFinite(p.hp)&&p.hp>=0&&p.hp<=100);
  assert(Number.isFinite(p.st)&&p.st>=0&&p.st<=100);
  assert(['folded','unfurled'].includes(p.form));
 }
});

test('two original trick weapons have independently authored frame windows and are bound to match loadouts',()=>{
 assert.deepEqual(TRICK_WEAPONS,['mournweave','thornwake']);
 assert.equal(TRICK_WEAPON_SPECS.thornwake.foldedLight.startup,5);
 assert.equal(TRICK_WEAPON_SPECS.mournweave.foldedLight.startup,7);
 assert.notEqual(TRICK_WEAPON_SPECS.thornwake.unfurl.reach,
  TRICK_WEAPON_SPECS.mournweave.unfurl.reach);
 assert.throws(()=>trickMatch({weapons:['unknown','mournweave']}),/original trick weapons/);
 const fast=trickMatch({weapons:['thornwake','mournweave']});
 const slow=trickMatch();
 fast.ready=0;slow.ready=0;
 fast.p[0].x=slow.p[0].x=430;
 fast.p[1].x=slow.p[1].x=505;
 trickStep(fast,[cmd('light'),trickInput()]);
 trickStep(slow,[cmd('light'),trickInput()]);
 many(fast,5);many(slow,5);
 assert(fast.p[1].hp<100,'Thornwake reaches its fast startup by tick 6');
 assert.equal(slow.p[1].hp,100,'Mournweave has not entered its slower active frames yet');
 assert.equal(trickInspector(fast).weapon,'thornwake');
 assert.equal(trickInspector(fast).startup,5);
 assert.equal(trickMoveSpec(fast.p[0]).damage,12);
});
test('chosen weapon profile survives round resets and never silently equips a different weapon',()=>{
 const s=trickMatch({weapons:['thornwake','mournweave']});
 s.ready=0;s.clock=1;
 trickStep(s);
 assert.equal(s.end,115);
 many(s,115);
 assert.equal(s.round,2);
 assert.deepEqual(s.p.map(p=>p.weapon),['thornwake','mournweave']);
 assert.equal(s.p[0].form,'folded');
});

test('inspectable frame data is weapon-specific, immutable and covers every authored action',()=>{
 const mour=trickFrameTable('mournweave'),thorn=trickFrameTable('thornwake');
 assert.equal(mour.length,thorn.length);
 assert(mour.length>=18);
 const find=(rows,name)=>rows.find(x=>x.name===name);
 assert.equal(find(mour,'foldedLight').startup,7);
 assert.equal(find(thorn,'foldedLight').startup,5);
 assert.equal(find(thorn,'unfurl').reach,188);
 assert.equal(find(mour,'unfurl').reach,142);
 for(const move of thorn){
  assert.equal(move.totalFrames,move.startup+move.active+move.recovery);
  assert(move.startup>=0&&move.active>=0&&move.recovery>=0);
  assert(Object.isFrozen(move));
 }
 assert(Object.isFrozen(thorn));
 assert.throws(()=>trickFrameTable('unlicensed-mesh'),/Unknown/);
});
