import test from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_HZ,SIDE_FLOOR,SIDE_RULESET,SIDE_MOVES,sideMatch,sideStep,sideInput,sideAttackbox,sideHurtbox,sidePhase,sideCanFeint} from '../public/side-engine.mjs';

const live=(distance=85)=>{
 const s=sideMatch();s.ready=0;s.p[0].x=438;s.p[1].x=438+distance;return s;
};
const input=(act='',x=0,y=0,guard=false)=>({act,x,y,guard});
const tick=(s,n,a=sideInput(),b=sideInput(),events)=>{for(let i=0;i<n;i++)sideStep(s,[a,b],events);};

test('side-view simulation is independent and explicitly versioned',()=>{
 const s=sideMatch();
 assert.equal(s.rules,SIDE_RULESET);assert.equal(SIDE_HZ,60);
 assert.equal(s.p[0].y,SIDE_FLOOR);assert.equal(s.p[1].y,SIDE_FLOOR);
 assert.equal(s.p[0].dir,1);assert.equal(s.p[1].dir,-1);
 assert.equal(s.ready,90);assert.equal(s.clock,3900);
 assert.equal(sidePhase(s.p[0]),'neutral');
 assert.throws(()=>sideStep({...s,rules:'lantern-court/2'}),/Incompatible/);
 assert.equal(SIDE_MOVES.cut.startup,9);
 assert.equal(SIDE_MOVES.hew.damage,34);
});
test('jump has a rising edge, gravity and stable landing; crouch shrinks vertical hurtbox',()=>{
 const s=live();
 sideStep(s,[input('',0,-1),sideInput()]);
 assert(s.p[0].y<SIDE_FLOOR);
 let min=s.p[0].y;
 for(let j=0;j<60;j++){sideStep(s,[input('',0,-1),sideInput()]);min=Math.min(min,s.p[0].y);}
 assert(min<SIDE_FLOOR-70);
 assert.equal(s.p[0].y,SIDE_FLOOR,'holding the jump key does not auto bunnyhop');
 assert.equal(s.p[0].vy,0);
 sideStep(s,[input('',0,1),sideInput()]);
 assert.equal(s.p[0].crouch,true);
 assert.equal(sideHurtbox(s.p[0]).top,SIDE_FLOOR-58);
 sideStep(s,[input('',0,-1),sideInput()]);
 assert(s.p[0].y<SIDE_FLOOR,'releasing jump rearms one jump');
});
test('cut hits center-projected hurtbox once; pistol whiffs over a crouching opponent',()=>{
 const s=live(83),events=[];
 tick(s,18,input('cut'),sideInput(),events);
 assert(s.p[1].hp<100);assert(s.p[1].hp>=81);
 assert.equal(events.filter(e=>e.kind==='hit').length,1);
 const shot=live(100),result=[];
 tick(shot,20,input('shot'),input('',0,1),result);
 assert.equal(shot.p[1].hp,100);
 assert(!result.some(e=>e.kind==='hit'),'low hurtbox avoids high pistol shot');
});
test('heavy guard chips health, and a timed guard deflects with no chip',()=>{
 const block=live(103),events=[];
 tick(block,30,input('hew'),input('',0,0,true),events);
 assert(block.p[1].hp<=100&&block.p[1].hp>=96);
 assert(events.some(e=>e.kind==='block'));
 const s=live(84),parries=[];
 tick(s,6,input('cut'));
 tick(s,5,input('cut'),input('',0,0,true),parries);
 assert(parries.some(e=>e.kind==='parry'));
 assert.equal(s.p[1].hp,100);
 assert.equal(s.p[0].act,'stun');
});
test('heavy feint consumes extra stamina but never hits during its recovery',()=>{
 const s=live(80),events=[];
 sideStep(s,[input('hew'),sideInput()]);
 tick(s,5);assert(sideCanFeint(s.p[0]));
 sideStep(s,[input('feint'),sideInput()],events);
 assert.equal(s.p[0].act,'feint');assert.equal(s.p[0].st,61);
 tick(s,22,sideInput(),sideInput(),events);
 assert.equal(s.p[1].hp,100);
 assert.equal(events.filter(e=>e.kind==='hit').length,0);
});
test('quickstep invulnerability is bounded; action costs cannot be bypassed',()=>{
 const s=live(80);
 s.p[0].act='cut';s.p[0].age=9;
 s.p[1].act='step';s.p[1].age=4;
 sideStep(s,[sideInput(),sideInput()]);
 assert.equal(s.p[1].hp,100);
 const exhausted=live();exhausted.p[0].st=0;
 sideStep(exhausted,[input('hew'),sideInput()]);
 assert.equal(exhausted.p[0].act,'');
});
test('same-tick attacks trade damage even when first hit causes stun',()=>{
 const s=live(75),events=[];
 s.p[0].act='cut';s.p[1].act='cut';
 s.p[0].age=SIDE_MOVES.cut.startup;s.p[1].age=SIDE_MOVES.cut.startup;
 sideStep(s,[sideInput(),sideInput()],events);
 assert.equal(s.p[0].hp,81);
 assert.equal(s.p[1].hp,81);
 assert.equal(events.filter(e=>e.kind==='hit').length,2);
});
test('same inputs reproduce exactly after checkpoint restore at arbitrary frames',()=>{
 const a=sideMatch();a.ready=0;
 const frames=Array.from({length:930},(_,t)=>[
  input(t%177===3?'cut':t%181===8?'hew':t%211===17?'shot':'',t%88<44?1:-1,t%73===2?-1:0,t%47>=35&&t%47<=39),
  input(t%139===5?'cut':t%167===4?'step':'',t%92<46?-1:1,t%109===3?-1:0,t%61>=50&&t%61<=55)
 ]);
 const checkpoints=[];
 for(let t=0;t<frames.length;t++){
  if(t%97===0)checkpoints.push([t,structuredClone(a)]);
  sideStep(a,frames[t]);
 }
 for(const [at,copy]of checkpoints){
  for(let t=at;t<frames.length;t++)sideStep(copy,frames[t]);
  assert.deepEqual(copy,a,'a restored side-view simulation must be identical');
 }
 assert(a.tick===frames.length);
 assert(a.p.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.hp)));
});
test('boxes are horizontal forward ranges and no camera, stage or art changes their coordinates',()=>{
 const s=live(),p=s.p[0];
 p.act='cut';const box=sideAttackbox(p),hurt=sideHurtbox(s.p[1]);
 assert(box.right>p.x);assert(box.left>p.x);
 assert(hurt.top<hurt.bottom);
 p.dir=-1;const reversed=sideAttackbox(p);
 assert(reversed.left<p.x&&reversed.right<p.x);
 assert.equal(sideAttackbox({...p,act:''}),null);
});

test('authored move phases emit one action cue and one pistol fire without spoofed input FX',()=>{
 const s=live(120),events=[];
 sideStep(s,[input('shot'),sideInput()],events);
 assert.equal(events.filter(e=>e.kind==='action'&&e.move==='shot').length,1);
 assert.equal(events.some(e=>e.kind==='fire'),false);
 for(let i=0;i<40;i++)sideStep(s,[sideInput(),sideInput()],events);
 assert.equal(events.filter(e=>e.kind==='action'&&e.move==='shot').length,1);
 assert.equal(events.filter(e=>e.kind==='fire'&&e.move==='shot').length,1);
 const reject=live(90),none=[];reject.p[0].st=0;
 sideStep(reject,[input('shot'),sideInput()],none);
 assert.equal(none.filter(e=>['action','fire'].includes(e.kind)).length,0);
});
