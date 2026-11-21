import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_RULESET,HUNT_HZ,HUNT_FLOOR,HUNT_ACTIONS,HUNT_MOVES,
 HUNT_BLOOD_COST,HUNT_BLOOD_BULLETS,HUNT_VISCERAL_WINDOW,
 HUNT_HITSTUN_ESCAPE_START,HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA,
 huntMatch,huntStep,huntInput,huntInspector,huntHurtbox,canonicalHuntInput,huntFrameTable
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
 assert.equal(s.rules,'sf-hunt-lab/3');
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
 assert.equal(HUNT_MOVES.airStep,undefined);
 assert.throws(()=>huntMatch({allowAirStep:true}),/Unsupported Hunt match option/);
 frames(s,130);
 assert.equal(p.y,HUNT_FLOOR);
 assert.equal(p.jumps,0,'landing restores the next ordinary jump');
});

test('air step is removed in every room, even if a legacy client requests it',()=>{
 const s=live(160),p=s.p[0];
 p.y=HUNT_FLOOR-30;p.vy=0;
 huntStep(s,[cmd('step'),huntInput()]);
 assert.equal(p.act,'','no airborne dodge command should exist');
 assert.equal(huntInspector(s).action,'');
 assert.equal(HUNT_MOVES.airStep,undefined);
 assert.throws(()=>huntMatch({allowAirStep:true}),/Unsupported Hunt match option/);
 assert.throws(()=>huntMatch({allowAirStep:false}),/Unsupported Hunt match option/);
 assert.throws(()=>huntStep({...s,rules:'sf-hunt-lab/2'}),/Incompatible/);
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
 assert.equal(Object.hasOwn(s,'options'),false);
});


test('airborne input actually selects firearm clip, consumes ammo, and obeys finite reserve',()=>{
 const s=live(190),p=s.p[0],events=[];
 p.y=HUNT_FLOOR-45;p.vy=0;p.ammo=1;
 huntStep(s,[cmd('shot'),huntInput()],events);
 assert.equal(p.act,'airShot');
 assert.equal(p.ammo,0);
 assert.equal(p.bloodAmmo,0);
 assert(events.some(e=>e.kind==='action'&&e.move==='airShot'));
 frames(s,70);
 p.y=HUNT_FLOOR-40;p.vy=0;
 huntStep(s,[cmd('shot'),huntInput()]);
 assert.equal(p.act,'','air shooting cannot ignore an empty bullet pool');
});

test('heals and blood bullet creation cannot start while airborne',()=>{
 for(const act of ['heal','blood']){
  const s=live(150),p=s.p[0];
  p.hp=60;p.y=HUNT_FLOOR-40;p.vy=0;
  const startHp=p.hp,startVials=p.vials;
  huntStep(s,[cmd(act),huntInput()]);
  assert.equal(p.act,'');
  assert.equal(p.hp,startHp);
  assert.equal(p.vials,startVials);
  assert.equal(p.bloodAmmo,0);
 }
});

test('committed attacks and quicksteps each consume limited stamina',()=>{
 const attack=live(160),a=attack.p[0];
 huntStep(attack,[cmd('light'),huntInput()]);
 assert.equal(a.st,100-HUNT_MOVES.foldedLight.cost);
 const dodge=live(160),d=dodge.p[0];
 huntStep(dodge,[cmd('step'),huntInput()]);
 assert.equal(d.st,100-HUNT_MOVES.step.cost);
 assert(a.st<100&&d.st<100);
});

test('gun-parried victim cannot instantly attack or quickstep out of a visceral opening',()=>{
 const s=live(),events=[],a=s.p[0],b=s.p[1];
 a.act='shot';a.age=HUNT_MOVES.shot.startup;
 b.act='foldedHeavy';b.age=HUNT_MOVES.foldedHeavy.startup-2;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(b.act,'stagger');
 huntStep(s,[huntInput(),cmd('light')],events);
 assert.equal(b.act,'stagger','visceral opening must remain punishable');
 assert(b.exposed>0);
 assert(!events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedLight'));
 // Normal hitstun allows a delayed dodge, but a successful firearm parry
 // is a distinct punishable visceral stagger.
 b.age=HUNT_HITSTUN_ESCAPE_START+2;
 huntStep(s,[huntInput(),cmd('step',-1)],events);
 assert.equal(b.act,'stagger');
});

test('normal melee hitstun permits a delayed paid quickstep, not a free attack cancel',()=>{
 const s=live(68),events=[],a=s.p[0],b=s.p[1];
 a.act='foldedLight';a.age=HUNT_MOVES.foldedLight.startup;
 const originalHealth=b.hp;
 huntStep(s,[huntInput(),huntInput()],events);
 assert.equal(b.act,'stun');
 assert(b.hp<originalHealth,'damage must happen before any recovery attempt');
 const healthAfterHit=b.hp,stamina=b.st;
 for(let age=1;age<HUNT_HITSTUN_ESCAPE_START;age++){
  b.age=age;
  huntStep(s,[huntInput(),cmd('step',-1)],events);
  assert.equal(b.act,'stun','no dodge before recovery frame '+age);
  assert.equal(b.hp,healthAfterHit);
 }
 b.age=HUNT_HITSTUN_ESCAPE_START;
 huntStep(s,[huntInput(),cmd('step',-1)],events);
 assert.equal(b.act,'step','escape allowed at explicit startup frame');
 assert.equal(b.hp,healthAfterHit);
 assert.equal(b.st,stamina-HUNT_MOVES.step.cost-HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA);
 assert(b.vx<0,'backward input moves away, not magnetized toward attacker');
 assert(events.some(e=>e.kind==='action'&&e.actor===1&&e.move==='step'));
});
test('normal hitstun escape fails when stamina cannot cover dodge plus extra recovery tax',()=>{
 const s=live(),p=s.p[1];p.act='stun';p.age=HUNT_HITSTUN_ESCAPE_START;
 p.st=HUNT_MOVES.step.cost+HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA-1;
 huntStep(s,[huntInput(),cmd('step',-1)]);
 assert.equal(p.act,'stun');
 assert.equal(p.st,HUNT_MOVES.step.cost+HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA-1);
});
test('successful parry, charged rear stagger, visceral victim and jump cannot bypass recovery',()=>{
 for(const action of ['stagger','visceralVictim']){
  const s=live(),p=s.p[1];
  p.act=action;p.age=HUNT_HITSTUN_ESCAPE_START+3;p.st=100;p.exposed=30;
  huntStep(s,[huntInput(),cmd('step',-1)]);
  assert.equal(p.act,action);
  assert.equal(p.st,100);
 }
 const air=live(),p=air.p[1];
 p.act='stun';p.age=HUNT_HITSTUN_ESCAPE_START+2;
 p.y=HUNT_FLOOR-45;p.vy=0;
 huntStep(air,[huntInput(),cmd('step',-1)]);
 assert.equal(p.act,'stun','air-dodge prohibited even in hitstun');
});
test('quickstep has limited invulnerability after escape; a mistimed dodge can be caught',()=>{
 const s=live(70),a=s.p[0],b=s.p[1];
 b.act='stun';b.age=HUNT_HITSTUN_ESCAPE_START;b.st=100;
 huntStep(s,[huntInput(),cmd('step',-1)]);
 assert.equal(b.act,'step');
 // A shot during dodge startup can still hurt, while true i-frames avoid it.
 const early=structuredClone(s),late=structuredClone(s);
 early.p[0].act='shot';early.p[0].age=HUNT_MOVES.shot.startup;
 early.p[1].age=0;early.p[1].spent=false;
 const earlyHp=early.p[1].hp;
 huntStep(early,[huntInput(),huntInput()]);
 assert(early.p[1].hp<earlyHp,'first frame does not give perfect instant immunity');
 late.p[0].act='shot';late.p[0].age=HUNT_MOVES.shot.startup;
 late.p[1].age=3;late.p[1].spent=false;
 const lateHp=late.p[1].hp;
 huntStep(late,[huntInput(),huntInput()]);
 assert.equal(late.p[1].hp,lateHp,'actual quickstep i-frames prevent hit');
});
test('firearm only parries inside authored windows; early, late and out-of-range shots are not free staggers',()=>{
 for(const age of [1,HUNT_MOVES.foldedHeavy.startup+HUNT_MOVES.foldedHeavy.active+2]){
  const s=live(),events=[],a=s.p[0],b=s.p[1];
  a.act='shot';a.age=HUNT_MOVES.shot.startup;
  b.act='foldedHeavy';b.age=age;
  const originalHp=b.hp;
  huntStep(s,[huntInput(),huntInput()],events);
  assert.equal(b.exposed,0);
  assert.equal(b.hp,originalHp-HUNT_MOVES.shot.damage);
  assert(events.some(e=>e.kind==='bulletHit'));
  assert(!events.some(e=>e.kind==='gunParry'));
 }
 const far=live(430),events=[],a=far.p[0],b=far.p[1];
 a.act='shot';a.age=HUNT_MOVES.shot.startup;
 b.act='foldedHeavy';b.age=HUNT_MOVES.foldedHeavy.startup-2;
 huntStep(far,[huntInput(),huntInput()],events);
 assert.equal(b.hp,100);
 assert.equal(b.exposed,0);
 assert(!events.some(e=>e.kind==='gunParry'));
});


test('down is not a Bloodborne-first stance: standing hurtbox and movement remain identical',()=>{
 const s=live(250),p=s.p[0],before=p.x;
 const height=huntHurtbox(p).top;
 frames(s,28,cmd('',0,1),huntInput());
 assert.equal(p.x,before);
 assert.equal(p.crouch,false,'legacy checkpoint field remains permanently false');
 assert.equal(huntInspector(s).phase,'neutral');
 assert.equal(huntHurtbox(p).top,height);
 assert.throws(()=>canonicalHuntInput({act:'crouch'}),/Invalid/);
});

test('cornered hunter exits by paid forward quickstep through a body during real i-frames',()=>{
 const s=live(42),a=s.p[0],b=s.p[1],events=[];
 a.x=65;b.x=107;
 huntStep(s,[cmd('step',1),huntInput()],events);
 assert.equal(a.st,81);
 frames(s,11,huntInput(),huntInput(),events);
 assert(a.x>b.x,'forward quickstep crosses a close opponent instead of getting body-locked');
 assert.equal(a.y,HUNT_FLOOR,'grounded quickstep does not wall-jump');
 assert(events.some(e=>e.kind==='action'&&e.actor===0&&e.move==='step'));
});

test('corner crossing is not free: retreat sticks to wall and exhausted player cannot step',()=>{
 const back=live(42);back.p[0].x=65;back.p[1].x=107;
 huntStep(back,[cmd('step',-1),huntInput()]);frames(back,11);
 assert(back.p[0].x<back.p[1].x);
 assert.equal(back.p[0].st,81);
 const empty=live(42);empty.p[0].x=65;empty.p[1].x=107;empty.p[0].st=0;
 huntStep(empty,[cmd('step',1),huntInput()]);frames(empty,11);
 assert(empty.p[0].x<empty.p[1].x);
 assert.notEqual(empty.p[0].act,'step');
});

test('quickstep i-frames end before its recovery, so corner escape can be punished',()=>{
 const s=live(38),a=s.p[0],b=s.p[1];
 a.x=65;b.x=103;a.act='step';a.age=8;a.vx=0;
 b.act='foldedLight';b.age=HUNT_MOVES.foldedLight.startup;b.dir=-1;
 const health=a.hp;
 huntStep(s);
 assert(a.hp<health);
});


test('corner escape event requires actual wall-adjacent movement through an opponent',()=>{
 const s=huntMatch();s.ready=0;s.p[0].x=65;s.p[1].x=107;
 const evidence=[];
 huntStep(s,[{x:1,y:0,act:'step',guard:false},huntInput()],evidence);
 for(let i=0;i<10;i++)huntStep(s,[huntInput(),huntInput()],evidence);
 const escaped=evidence.filter(e=>e.kind==='cornerEscape');
 assert.equal(escaped.length,1,'only one true physical side-crossing is scored');
 assert.equal(escaped[0].actor,0);
 assert.equal(escaped[0].side,'left');
});


test('forward body-crossing escape works symmetrically at the RIGHT wall',()=>{
 const s=huntMatch();s.ready=0;s.p[0].x=895;s.p[1].x=853;
 const events=[];
 huntStep(s,[{x:-1,y:0,act:'step',guard:false},huntInput()],events);
 for(let k=0;k<11;k++)huntStep(s,[huntInput(),huntInput()],events);
 assert(s.p[0].x<s.p[1].x,'right corner escape should reverse sides');
 const crossed=events.filter(x=>x.kind==='cornerEscape');
 assert.equal(crossed.length,1);
 assert.equal(crossed[0].side,'right');
 assert.equal(s.p[0].st,81);
});


test('footsies: bait heavy with six frames back, approach, then strike inside its recovery',()=>{
 const s=live(182),events=[];
 const a=s.p[0],b=s.p[1];
 for(let frame=0;frame<54;frame++){
  const move=frame===26?'light':'';
  const direction=frame<6?-1:frame<26?1:0;
  huntStep(s,[cmd(move,direction),cmd(frame===0?'heavy':'')],events);
 }
 const whiff=events.find(e=>e.kind==='whiff'&&e.actor===1&&e.move==='foldedHeavy');
 const punish=events.find(e=>e.kind==='hit'&&e.actor===0);
 assert(whiff&&punish,'actual neutral hit follows a miss');
 assert(punish.tick>whiff.tick);
 assert.equal(punish.punishedRecovery,true);
 assert.equal(punish.punishedMove,'foldedHeavy');
 assert(punish.remainingRecovery>0);
 assert.equal(a.hp,100);
 assert.equal(b.hp,85);
});
test('late whiff response after enemy recovery is a hit but NOT a recovery punish',()=>{
 const s=live(182),events=[];
 for(let frame=0;frame<55;frame++){
  const move=frame===39?'light':'';
  const direction=frame<6?-1:frame<39?1:0;
  huntStep(s,[cmd(move,direction),cmd(frame===0?'heavy':'')],events);
 }
 const whiff=events.find(e=>e.kind==='whiff'&&e.actor===1);
 const hit=events.find(e=>e.kind==='hit'&&e.actor===0);
 assert(whiff&&hit);
 assert(hit.tick-whiff.tick<=25);
 assert.equal(hit.punishedRecovery,false);
 assert.equal(hit.remainingRecovery,0);
});


test('repeated heavy inputs respect actual recovery instead of universal heavy-to-heavy animation cancels',()=>{
 for(const weapon of ['mournweave','thornwake']){
  for(const wall of ['left','right']){
   const state=huntMatch({weapons:['mournweave',weapon]});
   state.ready=0;
   state.p[0].x=wall==='left'?65:895;
   state.p[1].x=wall==='left'?130:830;
   state.p[0].st=0;
   const events=[];
   for(let tick=0;tick<115;tick++)
    huntStep(state,[cmd('',wall==='left'?1:-1),cmd('heavy')],events);
   const started=events.filter(e=>e.kind==='action'&&e.actor===1&&e.move==='foldedHeavy');
   const hit=events.filter(e=>e.kind==='hit'&&e.actor===1&&e.target===0&&e.move==='foldedHeavy');
   const minFrames=huntFrameTable(weapon).find(m=>m.name==='foldedHeavy').totalFrames;
   assert(started.length>=2,weapon+' normal repeated heavy still works');
   assert(started[1].tick-started[0].tick>=minFrames,
    'next R2 must not start inside the previous R2 recovery');
   assert(hit.length>=2);
   assert(hit[1].tick-hit[0].tick>=minFrames,
    'corner cannot bypass normal heavy recovery via generic hit-confirm');
  }
 }
});
test('a confirmed heavy may still convert to a light response, not a duplicate heavy',()=>{
 const state=live(70,{weapons:['mournweave','mournweave']});
 const ev=[];
 for(let tick=0;tick<35;tick++){
  huntStep(state,[cmd(tick===0?'heavy':tick===21?'light':''),huntInput()],ev);
 }
 assert(ev.some(e=>e.kind==='action'&&e.actor===0&&e.move==='foldedLight'),
  'fast light conversion is still permitted after real contact');
});

test('a real quickstep is immune inside i-frames but punishable during real recovery only',()=>{
 for(const weapon of ['mournweave','thornwake']){
  const fight=live(60,{weapons:[weapon,weapon]});
  const events=[];
  for(let frame=0;frame<90;frame++)
   huntStep(fight,[cmd(frame===62?'light':''),cmd(frame===55?'step':'',frame===55?-1:0)],events);
  const step=events.find(e=>e.kind==='action'&&e.actor===1&&e.move==='step');
  const attack=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
  assert(step&&attack);
  assert(attack.tick-step.tick>=7,'the attack never bypasses six real quickstep i-frames');
  assert.equal(attack.punishedDodgeRecovery,true);
  assert(attack.dodgeRecoveryFrames>0);
  assert.equal(attack.punishedRecovery,false,'a step punish is not mislabeled attack whiff punish');
 }
});
test('a late post-quickstep hit is real damage, but no dodge recovery punish',()=>{
 const fight=live(60),events=[];
 for(let frame=0;frame<91;frame++)
  huntStep(fight,[cmd(frame===69?'light':''),cmd(frame===55?'step':'',frame===55?-1:0)],events);
 const hit=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
 assert(hit);
 assert.equal(hit.punishedDodgeRecovery,false);
 assert.equal(hit.dodgeRecoveryFrames,0);
});
