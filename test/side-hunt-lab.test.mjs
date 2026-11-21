import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_RULESET,HUNT_HZ,HUNT_FLOOR,HUNT_ACTIONS,HUNT_MOVES,
 HUNT_BLOOD_COST,HUNT_BLOOD_BULLETS,HUNT_VISCERAL_WINDOW,
 huntMatch,huntStep,huntInput,huntInspector,canonicalHuntInput,huntFrameTable
} from '../public/side-hunt-lab.mjs';

const cmd=(act='',x=0,y=0)=>({x,y,act,guard:false});
const live=(distance=70)=>{
 const s=huntMatch();s.ready=0;s.p[0].x=430;s.p[1].x=430+distance;return s;
};
function frames(s,n,a=huntInput(),b=huntInput(),events){
 for(let i=0;i<n;i++)huntStep(s,[a,b],events);
}

test('isolated Bloodborne-inspired version keeps two original transform weapons and no low/mid/high block',()=>{
 const s=live();
 assert.equal(s.rules,'sf-hunt-lab/1');
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

test('blood bullets cost unrecoverable immediate health and are spent before standard ammo',()=>{
 const s=live(190),p=s.p[0],events=[];
 p.hp=77;p.ammo=0;
 huntStep(s,[cmd('blood'),huntInput()],events);
 assert.equal(p.hp,77-HUNT_BLOOD_COST);
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
