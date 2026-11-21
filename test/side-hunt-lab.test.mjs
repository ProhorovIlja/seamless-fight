import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_RULESET,HUNT_HZ,HUNT_FLOOR,HUNT_ACTIONS,HUNT_MOVES,
 HUNT_BLOOD_COST,HUNT_BLOOD_BULLETS,HUNT_VISCERAL_WINDOW,HUNT_DEFAULT_RULES,
 huntMatch,huntStep,huntInput,huntInspector,canonicalHuntInput,huntFrameTable
} from '../public/side-hunt-lab.mjs';

const cmd=(act='',x=0,y=0)=>({x,y,act,guard:false});
const live=(distance=70,options={})=>{
 const s=huntMatch(options);s.ready=0;s.p[0].x=430;s.p[1].x=430+distance;return s;
};
function frames(s,n,a=huntInput(),b=huntInput(),events){
 for(let i=0;i<n;i++)huntStep(s,[a,b],events);
}

test('isolated Bloodborne-inspired version keeps two original transform weapons and no low/mid/high block',()=>{
 const s=live();
 assert.equal(s.rules,'sf-hunt-lab/2');
 assert.notEqual(s.rules,'sf-trick-lab/3');
 assert.equal(HUNT_HZ,60);
 assert.equal(s.p[0].weapon,'mournweave');
 assert.equal(s.p[1].weapon,'mournweave');
 assert(HUNT_ACTIONS.includes('visceral')&&HUNT_ACTIONS.includes('blood'));
 assert.equal(HUNT_MOVES.foldedCharged.startup,35);
 assert.throws(()=>canonicalHuntInput({guard:true}),/no blocking/i);
 assert.throws(()=>huntStep({...s,rules:'seamless-side/1'}),/Incompatible/);
 assert(huntFrameTable('thornwake').some(m=>m.name==='unfurledCharged'));
});

test('firearm parry interrupts committed melee into a time-limited visceral opening',()=>{
 const s=live(),events=[],a=s.p[0],b=s.p[1];
 a.act='shot';a.age=HUNT_MOVES.shot.startup;
 b.act='foldedHeavy';b.age=HUNT_MOVES.foldedHeavy.startup-2;
 huntStep(s,[huntInput(),huntInput()],events);
 assert(events.some(e=>e.kind==='gunParry'));
 assert.equal(b.act,'stagger');
 assert(b.exposed>0&&b.exposed<=HUNT_VISCERAL_WINDOW);
 assert.equal(b.exposeCause,'gun');
 assert.equal(b.hp,96,'shot damage still lands, but opening—not damage—is its primary reward');
 frames(s,26);
 assert(a.act==='shot'||a.act==='','finite shot recovery');
 huntStep(s,[cmd('visceral'),huntInput()],events);
 assert.equal(a.act,'visceral');
 assert.equal(b.act,'visceralVictim');
 frames(s,8,huntInput(),huntInput(),events);
 assert(events.some(e=>e.kind==='visceral'));
 assert(b.hp<=54,'visceral has a real attack window and can finish the parry conversion');
 assert.equal(b.exposed,0);
});

test('a firearm shot outside the commitment window does not generate a free visceral',()=>{
 const s=live(),events=[];
 s.p[0].act='shot';s.p[0].age=HUNT_MOVES.shot.startup;
 s.p[1].act='foldedHeavy';s.p[1].age=1;
 huntStep(s,[huntInput(),huntInput()],events);
 assert(events.some(e=>e.kind==='bulletHit'));
 assert(!events.some(e=>e.kind==='gunParry'));
 assert.equal(s.p[1].exposed,0);
 assert.throws(()=>canonicalHuntInput({act:'teleport'}),/Invalid/);
});

test('vials heal only after a punishable activation and do not grant unlimited free health',()=>{
 const s=live(200),p=s.p[0],events=[];
 p.hp=45;
 huntStep(s,[cmd('heal'),huntInput()],events);
 assert.equal(p.vials,1);
 assert.equal(p.hp,45);
 frames(s,HUNT_MOVES.heal.startup+2,huntInput(),huntInput(),events);
 assert.equal(p.hp,80);
 assert(events.some(e=>e.kind==='heal'));
 frames(s,60);
 huntStep(s,[cmd('heal'),huntInput()]);
 assert.equal(p.vials,0,'second vial is consumed on startup');
 frames(s,HUNT_MOVES.heal.startup+2);
 assert.equal(p.hp,100,'healing clamps at maximum');
 frames(s,60);
 huntStep(s,[cmd('heal'),huntInput()]);
 assert.equal(p.act,'','empty vials do not create fake healing animations');
});

test('shooting a committed heal prevents its payoff and opens a counter',()=>{
 const s=live(),events=[];
 const a=s.p[0],b=s.p[1];
 a.act='shot';a.age=HUNT_MOVES.shot.startup;
 b.act='heal';b.age=HUNT_MOVES.heal.startup-2;b.hp=49;b.vials=1;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(b.act,'stagger');
 assert.equal(b.hp,45,'shot is damaging, not a free heal');
 frames(s,28,huntInput(),huntInput(),events);
 assert.equal(b.hp,45);
 assert(!events.some(e=>e.kind==='heal'&&e.actor===1));
});

test('blood bullets cost immediate HP, enable a limited rally window, and are spent before normal ammo',()=>{
 const s=live(190),p=s.p[0],events=[];
 p.hp=77;p.ammo=0;
 huntStep(s,[cmd('blood'),huntInput()],events);
 assert.equal(p.hp,77-HUNT_BLOOD_COST);
 assert.equal(p.rally,HUNT_BLOOD_COST,'blood-bullet health loss can be rallied by melee');
 assert.equal(p.bloodAmmo,0);
 frames(s,HUNT_MOVES.blood.startup+1,huntInput(),huntInput(),events);
 assert.equal(p.bloodAmmo,HUNT_BLOOD_BULLETS);
 frames(s,50);
 huntStep(s,[cmd('shot'),huntInput()]);
 assert.equal(p.bloodAmmo,4);
 assert.equal(p.ammo,0);
 frames(s,60);
 huntStep(s,[cmd('blood'),huntInput()]);
 assert.equal(p.act,'','cannot infinitely stack additional blood bullet batches');
});

test('rally restores only a bounded recently lost HP pool through melee, not gunfire',()=>{
 const s=live(),p=s.p[0],q=s.p[1],events=[];
 p.hp=50;p.rally=24;p.rallyLife=70;p.act='foldedLight';
 p.age=HUNT_MOVES.foldedLight.startup;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(p.hp,65);
 assert.equal(p.rally,9);
 assert.equal(q.hp,85);
 assert(events.some(e=>e.kind==='rally'));
 p.act='shot';p.age=HUNT_MOVES.shot.startup;p.spent=false;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(p.hp,65,'gunfire cannot restore rally');
 p.rallyLife=1;
 frames(s,3);
 assert.equal(p.rally,0,'rally eligibility expires deterministically');
});

test('charged heavy from behind opens a visceral; facing attack does not',()=>{
 function strike(dir){
  const s=live(52),events=[];
  const a=s.p[0],b=s.p[1];
  a.act='foldedCharged';a.age=HUNT_MOVES.foldedCharged.startup;
  b.act='shot';b.age=1;b.dir=dir;
  huntStep(s,[huntInput(),huntInput()],events);
  return {b,events};
 }
 const back=strike(1);
 assert.equal(back.b.act,'stagger');
 assert.equal(back.b.exposeCause,'chargedRear');
 assert(back.events.some(e=>e.kind==='rearStagger'));
 const front=strike(-1);
 assert.equal(front.b.act,'stun');
 assert.equal(front.b.exposed,0);
 assert(!front.events.some(e=>e.kind==='rearStagger'));
});

test('quickstep has bounded invulnerability without giving guard/parry frames',()=>{
 const s=live();
 s.p[0].act='foldedLight';s.p[0].age=HUNT_MOVES.foldedLight.startup;
 s.p[1].act='step';s.p[1].age=4;
 huntStep(s);
 assert.equal(s.p[1].hp,100);
 assert.equal(huntInspector(s,1).visceralWindow,0);
});

test('identical 600-frame inputs reproduce and state stays JSON serializable',()=>{
 const first=huntMatch(),second=huntMatch();first.ready=second.ready=0;
 const tape=Array.from({length:600},(_,t)=>[0,1].map(slot=>{
  const phase=(t+slot*11)%137;
  const act=phase===0?'light':phase===20?'trick':phase===40?'charge':
   phase===64?'shot':phase===92?'heal':phase===118?'blood':'';
  return cmd(act,t%75<37?1:-1,t%120===14?-1:0);
 }));
 const checkpoints=new Map();
 for(let i=0;i<tape.length;i++){
  if(i%93===0)checkpoints.set(i,structuredClone(first));
  huntStep(first,tape[i]);
  huntStep(second,tape[i]);
 }
 assert.deepEqual(first,second);
 for(const [i,checkpoint] of checkpoints){
  for(let j=i;j<tape.length;j++)huntStep(checkpoint,tape[j]);
  assert.deepEqual(checkpoint,first,'deterministic checkpoint recovery at '+i);
 }
 assert.doesNotThrow(()=>JSON.stringify(first));
 assert.equal(first.tick,600);
 assert.equal(huntInspector(first).tick,600);
});

test('single jump is default; second airborne jump is forbidden without changing gravity',()=>{
 const s=live(160),p=s.p[0],events=[];
 huntStep(s,[cmd('',0,-1),huntInput()],events);
 assert.equal(p.jumps,1);
 const initialY=p.y;
 huntStep(s,[cmd(),huntInput()]);
 huntStep(s,[cmd('',0,-1),huntInput()],events);
 assert.equal(p.jumps,1);
 assert(p.y<initialY,'single jump still follows a ballistic trajectory');
 assert(!events.some(e=>e.kind==='doubleJump'));
 assert.equal(HUNT_DEFAULT_RULES.allowAirStep,false);
 frames(s,130);
 assert.equal(p.y,HUNT_FLOOR);
 assert.equal(p.jumps,0,'landing restores the next ordinary jump');
});

test('air-step is an explicit experimental room rule, never a ranked default',()=>{
 const normal=live(160),p=normal.p[0];
 p.y=HUNT_FLOOR-30;p.vy=0;
 huntStep(normal,[cmd('step'),huntInput()]);
 assert.equal(p.act,'','air dodge is not silently enabled');
 const custom=live(160,{allowAirStep:true}),a=custom.p[0];
 a.y=HUNT_FLOOR-30;a.vy=0;
 huntStep(custom,[cmd('step'),huntInput()]);
 assert.equal(a.act,'airStep');
 assert.equal(a.airSteps,1);
 assert.equal(huntInspector(custom).airStepAllowed,true);
 assert.throws(()=>huntMatch({allowAirStep:'yes'}),/boolean/);
});

test('airborne firearm can interrupt a committed grounded heal and cancel its health reward',()=>{
 const s=live(),a=s.p[0],b=s.p[1],events=[];
 a.y=HUNT_FLOOR-50;a.vy=0;a.act='airShot';a.age=HUNT_MOVES.airShot.startup;
 b.act='heal';b.age=HUNT_MOVES.heal.startup-2;b.hp=40;
 huntStep(s,[huntInput(),huntInput()],events);
 assert(events.some(e=>e.kind==='gunParry'));
 assert.equal(b.act,'stagger');
 assert.equal(b.hp,36);
 frames(s,30,huntInput(),huntInput(),events);
 assert(!events.some(e=>e.kind==='heal'&&e.actor===1));
});

test('airborne firearm counters a committed aerial attack when actual trajectories intersect',()=>{
 const s=live(65),a=s.p[0],b=s.p[1],events=[];
 a.y=HUNT_FLOOR-45;a.act='airShot';a.age=HUNT_MOVES.airShot.startup;
 b.y=HUNT_FLOOR-57;b.act='airFoldedLight';
 b.age=HUNT_MOVES.airFoldedLight.startup-1;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(b.act,'stagger');
 assert.equal(b.exposeCause,'gun');
 assert(events.some(e=>e.kind==='gunParry'));
});

test('blood-bullet creation is punishable by gunfire before and at payout, with no bullet reward',()=>{
 for(const age of [HUNT_MOVES.blood.startup-2,HUNT_MOVES.blood.startup]){
  const s=live(),a=s.p[0],b=s.p[1],events=[];
  a.act='shot';a.age=HUNT_MOVES.shot.startup;
  b.act='blood';b.age=age;b.hp=70;b.bloodAmmo=0;
  huntStep(s,[huntInput(),huntInput()],events);
  assert.equal(b.act,'stagger','Blood Bullet windup interrupted at '+age);
  frames(s,25,huntInput(),huntInput(),events);
  assert.equal(b.bloodAmmo,0);
  assert(!events.some(e=>e.kind==='bloodBullets'&&e.actor===1));
 }
});

test('gun parry takes precedence over vial payout on the same 60Hz simulation tick',()=>{
 const s=live(),events=[],a=s.p[0],b=s.p[1];
 a.act='shot';a.age=HUNT_MOVES.shot.startup;
 b.act='heal';b.age=HUNT_MOVES.heal.startup;b.hp=43;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(b.act,'stagger');
 assert.equal(b.hp,39);
 assert(!events.some(e=>e.kind==='heal'&&e.actor===1));
});

test('bullets are finite each round, blood conversion gives five, and both reset next round',()=>{
 const s=live(130),p=s.p[0];
 p.ammo=0;p.bloodAmmo=0;
 huntStep(s,[cmd('shot'),huntInput()]);
 assert.equal(p.act,'','zero ammunition prohibits free infinite parries');
 assert.equal(p.ammo,0);
 p.ammo=1;p.bloodAmmo=4;p.vials=0;
 s.clock=1;
 huntStep(s,[huntInput(),huntInput()]);
 assert.equal(s.end,115);
 frames(s,115);
 assert.equal(s.round,2);
 assert.equal(s.p[0].ammo,7);
 assert.equal(s.p[0].bloodAmmo,0);
 assert.equal(s.p[0].vials,2);
});

test('no universal grab or block input, while timed firearm parry remains a separate option',()=>{
 const s=live();
 for(const act of ['grab','throw','block','commandGrab'])
  assert.throws(()=>canonicalHuntInput({act}),/Invalid/);
 assert.throws(()=>canonicalHuntInput({guard:true}),/no blocking/i);
 assert(HUNT_ACTIONS.includes('shot'));
 assert(HUNT_ACTIONS.includes('visceral'));
 assert.equal(s.options.allowAirStep,false);
});
