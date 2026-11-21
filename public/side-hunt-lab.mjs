// Seamless Fight — isolated 60 Hz Bloodborne-inspired hunt-combat research.
// Bloodborne's dodge/gun counter/visceral/resource loop inspires original implementation.
// No Bloodborne animation, textures, models or proprietary game data.
// Research mechanics only: DO NOT feed this state to seamless-side/1 clients,
// the existing Node authority, the GGPO prototype or ranked matchmaking.
// Pure and deterministic; no wall clock, rendering, sound or networking.
export const HUNT_RULESET='sf-hunt-lab/3';
// Exactly one jump; no crouch, airborne dodge, grab or conventional blocking.
export const HUNT_HZ=60, HUNT_FLOOR=436, HUNT_W=960;
export const HUNT_WEAPON='mournweave';
export const HUNT_WEAPONS=Object.freeze(['mournweave','thornwake']);
export const HUNT_FORMS=Object.freeze(['folded','unfurled']);
export const HUNT_ACTIONS=Object.freeze(['','light','heavy','charge','trick','shot','step','feint','sync','visceral','heal','blood']);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const move=(startup,active,recovery,cost,reach,damage,top=-105,bottom=-26)=>
 Object.freeze({startup,active,recovery,cost,reach,damage,top,bottom});
export const HUNT_MOVES=Object.freeze({
 foldedLight:move(7,4,13,10,88,15,-103,-26),
 foldedHeavy:move(17,6,23,24,113,29,-123,-34),
 foldedCharged:move(35,5,33,32,125,32,-125,-30),
 unfurledLight:move(11,6,17,14,160,17,-122,-22),
 unfurledHeavy:move(23,8,26,29,193,30,-130,-23),
 unfurledCharged:move(43,7,37,37,210,38,-133,-20),
 airFoldedLight:move(9,5,18,12,98,15,-108,-7),
 airFoldedHeavy:move(18,6,24,25,120,27,-123,-12),
 airUnfurledLight:move(12,6,21,15,173,18,-112,-2),
 airUnfurledHeavy:move(22,7,27,29,192,29,-121,-7),
 unfurl:move(10,6,17,18,142,21,-120,-26),
 refold:move(10,6,17,18,113,23,-108,-29),
 shiftOut:move(6,0,13,6,0,0),
 shiftIn:move(6,0,13,6,0,0),
 shot:move(9,1,25,9,275,4,-111,-77),
 airShot:move(10,1,27,11,265,4,-93,30),
 visceral:move(6,2,29,0,75,42,-117,-21),
 heal:move(21,1,25,0,0,0),
 blood:move(16,1,23,0,0,0),
 stagger:move(0,0,42,0,0,0),
 visceralVictim:move(0,0,46,0,0,0),
 step:move(0,9,12,19,0,0),
 feint:move(0,0,12,9,0,0),
 sync:move(0,0,5,0,0,0),
 stun:move(0,0,22,0,0,0),
});
// Distinct original arsenals. Both share the same deterministic action graph.
export const THORNWAKE_MOVES=Object.freeze({...HUNT_MOVES,
 foldedLight:move(5,3,15,9,82,12,-96,-24),
 foldedHeavy:move(16,4,24,21,124,25,-114,-31),
 foldedCharged:move(37,6,32,32,139,32,-118,-30),
 unfurledLight:move(14,5,19,16,182,16,-122,-25),
 unfurledHeavy:move(24,8,29,34,222,31,-129,-23),
 unfurledCharged:move(45,7,39,40,236,40,-132,-21),
 airFoldedLight:move(8,4,18,12,99,13,-103,-8),
 airFoldedHeavy:move(19,6,24,24,136,25,-127,-9),
 airUnfurledLight:move(13,5,21,17,190,17,-120,-5),
 airUnfurledHeavy:move(25,7,28,33,224,28,-130,-6),
 unfurl:move(13,6,19,20,188,17,-117,-24),
 refold:move(8,5,16,16,108,18,-103,-27),
 shiftOut:move(8,0,13,7,0,0),
 shiftIn:move(4,0,11,5,0,0)
});
export const HUNT_WEAPON_SPECS=Object.freeze({
 mournweave:HUNT_MOVES,thornwake:THORNWAKE_MOVES
});
export const huntMoveSpec=(p,act=p.act)=>HUNT_WEAPON_SPECS[p.weapon][act];
export function huntFrameTable(weapon=HUNT_WEAPON){
 if(!HUNT_WEAPONS.includes(weapon))throw TypeError('Unknown original trick weapon');
 return Object.freeze(Object.entries(HUNT_WEAPON_SPECS[weapon])
  .map(([name,m])=>Object.freeze({name,...m,totalFrames:m.startup+m.active+m.recovery})));
}

const ATTACKS=new Set(Object.keys(HUNT_MOVES).filter(x=>HUNT_MOVES[x].damage>0));
const ORDINARY=new Set(['foldedLight','foldedHeavy','unfurledLight','unfurledHeavy',
 'airFoldedLight','airFoldedHeavy','airUnfurledLight','airUnfurledHeavy',
 'foldedCharged','unfurledCharged']);
const TRANSFORMS=new Set(['unfurl','refold']);
// Meter-backed grounded pursuit cancel: only after confirmed contact, never on whiff.
// Never grants an aerial dodge.
export const HUNT_PURSUIT_FOCUS=25;
export const HUNT_HITSTUN_ESCAPE_START=8; // Minimum frames of normal hitstun before quickstep.
export const HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA=6; // On top of standard 19-step cost.
export const HUNT_VIAL_HEAL=35;
export const HUNT_BLOOD_COST=30; // 30% of 100 maximum HP, subject to future PvP balance.
export const HUNT_BLOOD_BULLETS=5;
export const HUNT_RALLY_WINDOW=100;
export const HUNT_VISCERAL_WINDOW=40;
const total=s=>s.startup+s.active+s.recovery;
export const huntInput=()=>({x:0,y:0,act:'',guard:false});
export function canonicalHuntInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw TypeError('Input object required');
 const {x=0,y=0,act='',guard=false}=input;
 if(![-1,0,1].includes(x)||![-1,0,1].includes(y)||!HUNT_ACTIONS.includes(act)||
  typeof guard!=='boolean'||guard)throw TypeError('Invalid movement, action or guard input; no blocking in Hunt');
 return {x,y,act,guard};
}
export function huntFighter(slot,weapon=HUNT_WEAPON){
 if(!HUNT_WEAPONS.includes(weapon))throw TypeError('Unknown original trick weapon');
 return {x:slot?705:255,y:HUNT_FLOOR,vx:0,vy:0,dir:slot?-1:1,weapon,
  hp:100,st:100,ammo:7,bloodAmmo:0,vials:2,focus:0,form:'folded',
  rally:0,rallyLife:0,exposed:0,exposeCause:'',visceralTarget:-1,
  act:'',age:0,spent:false,hitConfirmed:false,
  crouch:false,jumpHeld:false,jumps:0,regen:0,
  combo:0,chain:0,queue:'',queueLife:0};
}
export function huntMatch({weapons=[HUNT_WEAPON,HUNT_WEAPON],...unsupported}={}){
 if(Object.keys(unsupported).length)throw TypeError('Unsupported Hunt match option');
 if(!Array.isArray(weapons)||weapons.length!==2||weapons.some(x=>!HUNT_WEAPONS.includes(x)))
  throw TypeError('Two original trick weapons required');
 return {rules:HUNT_RULESET,tick:0,clock:65*HUNT_HZ,ready:90,end:0,round:1,
  winner:null,over:false,score:[0,0],p:[huntFighter(0,weapons[0]),huntFighter(1,weapons[1])]};
}
export const huntCanAct=p=>!p.act||p.age>=total(huntMoveSpec(p));
export const huntPhase=p=>{
 if(!p.act)return p.y<HUNT_FLOOR?'airborne':'neutral';
 const m=huntMoveSpec(p);
 return p.age<m.startup?'startup':p.age<m.startup+m.active?'active':'recovery';
};
const motion=(p,input)=>{
 const airborne=p.y<HUNT_FLOOR;
 const form=p.form==='folded'
  ?(airborne?'Folded':'folded'):(airborne?'Unfurled':'unfurled');
 if(input==='light'||input==='heavy'||input==='charge')
  return input==='charge'?(airborne?'':p.form)+'Charged':
   (airborne?'air':'')+form+input[0].toUpperCase()+input.slice(1);
 if(input==='trick')
  return !p.act?(p.form==='folded'?'shiftOut':'shiftIn'):
   (p.form==='folded'?'unfurl':'refold');
 if(input==='step')return p.y<HUNT_FLOOR?'':'step';
 if(input==='shot')return p.y<HUNT_FLOOR?'airShot':'shot';
 return input;
};
export function huntHurtbox(p){
 return {left:p.x-18,right:p.x+18,top:p.y-111,bottom:p.y-8};
}
export function huntAttackbox(p){
 const m=huntMoveSpec(p);
 if(!m?.damage)return null;
 return {left:p.dir>0?p.x+8:p.x-m.reach,right:p.dir>0?p.x+m.reach:p.x-8,
  top:p.y+m.top,bottom:p.y+m.bottom};
}
function buffer(p,input){
 if(input.act){
  p.queue=input.act;
  p.queueLife=6;
 }else if(p.queueLife>0){
  p.queueLife--;
  if(!p.queueLife)p.queue='';
 }
}
function starts(p,other,requested,input){
 if(!requested)return false;
 const m=huntMoveSpec(p,requested);
 const escaping=p.act==='stun'&&requested==='step';
 const extraCost=escaping?HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA:0;
 if(!m||p.st<m.cost+extraCost)return false;
 if((requested==='shot'||requested==='airShot')&&!p.ammo&&!p.bloodAmmo)return false;
 if(requested==='airShot'&&p.y>=HUNT_FLOOR)return false;
 if(['blood','heal'].includes(requested)&&p.y<HUNT_FLOOR)return false;
 if(requested==='blood'&&(p.hp<=HUNT_BLOOD_COST||p.bloodAmmo))return false;
 if(requested==='heal'&&(!p.vials||p.hp>=100))return false;
 if(requested==='visceral'&&(!other.exposed||p.y<HUNT_FLOOR||
   Math.abs(p.x-other.x)>76||p.dir*(other.x-p.x)<0))return false;
 if(['heal','blood','visceral'].includes(requested)&&p.act&&!huntCanAct(p))return false;
 if((requested==='shiftOut'||requested==='shiftIn')&&p.y<HUNT_FLOOR)return false;
 const old=huntMoveSpec(p);
 const wasAttacking=ATTACKS.has(p.act)&&!['shot','visceral'].includes(p.act);
 let chained=false;
 if(!p.act||huntCanAct(p)){
  if(requested==='feint'||requested==='sync')return false;
  p.chain=0;
 }else if(escaping&&p.age>=HUNT_HITSTUN_ESCAPE_START&&
   p.age<total(old)-5&&p.y>=HUNT_FLOOR){
  // Bloodborne-like recovery: the hit still lands, but a costly dodge can
  // escape ordinary hitstun before it expires. Parry/visceral stagger is NOT escapable.
  chained=false;
 }else if(requested==='feint'&&p.act.endsWith('Heavy')&&
   p.age>=5&&p.age<old.startup-3){
  chained=true;
 }else if(TRANSFORMS.has(requested)&&
   (ORDINARY.has(p.act)||p.act==='step')&&
   p.age>=old.startup+1&&p.age<total(old)-6&&p.chain<4){
  // Form-cancel permitted on contact or whiff, but costs real stamina.
  chained=true;
 }else if(wasAttacking&&ORDINARY.has(requested)&&
   p.hitConfirmed&&p.age>=old.startup+old.active-1&&
   p.age<total(old)-6&&p.chain<4){
  // Regular follow-up only after confirmed contact, not free whiff cancels.
  chained=true;
 }else if(requested==='step'&&wasAttacking&&
   p.hitConfirmed&&p.focus>=HUNT_PURSUIT_FOCUS&&p.chain<4&&
   p.age>=old.startup+old.active-1&&p.age<total(old)-5){
  // Hit-confirm-only dash chase: meaningful mobility with a meter and stamina tax.
  // No input-free pressure reset after a whiff, and no unbounded air-step loops.
  chained=true;
 }else if(requested==='sync'&&p.focus>=60&&wasAttacking&&
   p.age>=old.startup+old.active&&p.age<total(old)-3){
  chained=true;
 }else{
  return false;
 }
 if(requested==='sync')p.focus-=60;
 if(chained&&requested==='step')p.focus-=HUNT_PURSUIT_FOCUS;
 p.act=requested;p.age=0;p.spent=false;p.hitConfirmed=false;
 p.chain=chained?p.chain+1:1;
 p.st=clamp(p.st-m.cost-extraCost,0,100);p.regen=27;
 p.crouch=false;
 if(requested==='shot'||requested==='airShot'){
  if(p.bloodAmmo)p.bloodAmmo--;
  else p.ammo--;
 }
 if(requested==='heal')p.vials--;
 if(requested==='blood'){
  p.hp-=HUNT_BLOOD_COST;
  p.rally=Math.min(100,p.rally+HUNT_BLOOD_COST);
  p.rallyLife=HUNT_RALLY_WINDOW;
 }
 if(requested==='visceral'){
  p.visceralTarget=1; // scalar opponent marker; never store object refs in replay state
  other.act='visceralVictim';other.age=0;other.exposed=0;other.queue='';other.queueLife=0;
 }
 if(requested==='step'){
  // Respect directional input: quickstep away or through the opponent.
  // A neutral step defaults toward the current facing direction.
  const travel=input.x||p.dir;
  p.vx=10.6*travel;
 }
 return true;
}
function drive(p,q,input,events,tick,actor){
 const wasGround=p.y>=HUNT_FLOOR;
 if(p.exposed>0)p.exposed--;
 if(p.rallyLife>0)p.rallyLife--;
 else p.rally=0;
 if(huntCanAct(p)){p.act='';p.age=0;p.chain=0;p.hitConfirmed=false;}
 if(!p.act)p.dir=q.x>=p.x?1:-1;
 const jumping=input.y===-1;
 // Reserved versioned checkpoint field, not a playable stance.
 p.crouch=false;
 if(jumping&&!p.jumpHeld&&p.jumps<1&&!p.act&&p.st>=6){
  p.vy=-12.6;
  p.y-=.01;p.jumps++;p.st-=6;p.regen=15;p.crouch=false;
  events?.push({tick,kind:'jump',actor,x:p.x,y:p.y});
 }
 p.jumpHeld=jumping;
 buffer(p,input);
 // Bloodborne-aligned: no conventional block; evasions and firearms define defense.
 if(p.queue){
  const requested=motion(p,p.queue);
  // One queued attack is consumed only when permitted. No free neutral inputs.
  // A transform queued during an attack is morph; otherwise it's a slow shift.
  if(starts(p,q,requested,input)){
   events?.push({tick,kind:'action',actor,move:requested,form:p.form,x:p.x,y:p.y-80});
   p.queue='';p.queueLife=0;
  }
 }
 const m=huntMoveSpec(p);
 if(m&&(TRANSFORMS.has(p.act)||p.act==='shiftOut'||p.act==='shiftIn')&&p.age===m.startup-1){
  p.form=p.form==='folded'?'unfurled':'folded';
  events?.push({tick,kind:'transform',actor,form:p.form,move:p.act,x:p.x,y:p.y-72});
 }
 if(p.act==='step')p.vx*=.89;
 else if(p.act){
  p.vx*=.74;
  if(m.damage&&p.age===m.startup-1)p.vx+=p.dir*(p.act.includes('Heavy')?4.0:2.4);
 }else{
  const speed=wasGround?3.9:3.5;
  const accel=wasGround?.33:.14;
  p.vx+=(input.x*speed-p.vx)*accel;
 }
 p.x=clamp(p.x+p.vx,65,HUNT_W-65);
 if(p.y<HUNT_FLOOR||p.vy<0){
  p.vy=Math.min(15,p.vy+.75);p.y=Math.min(HUNT_FLOOR,p.y+p.vy);
  if(p.y===HUNT_FLOOR){
   p.vy=0;p.jumps=0;
  }
 }else{p.y=HUNT_FLOOR;p.vy=0;}
 if(p.regen)p.regen--;
 else if(!p.act)p.st=Math.min(100,p.st+.69);
}
function settleUtility(p,events,tick,actor){
 const m=huntMoveSpec(p);
 if(p.act==='heal'&&p.age===m.startup){
  p.hp=Math.min(100,p.hp+HUNT_VIAL_HEAL);p.rally=0;p.rallyLife=0;
  events?.push({tick,kind:'heal',actor,health:p.hp});
 }
 if(p.act==='blood'&&p.age===m.startup){
  p.bloodAmmo=HUNT_BLOOD_BULLETS;
  events?.push({tick,kind:'bloodBullets',actor,bullets:p.bloodAmmo});
 }
}
function huntParryableAction(p){
 const m=huntMoveSpec(p);
 if(!m)return false;
 // Aimed shots interrupt committed offense and visible utility windups,
 // not idle/movement/another firearm, stun, or invulnerable quicksteps.
 if(p.act==='heal'||p.act==='blood')return p.age>=3&&p.age<=m.startup;
 const attackable=ORDINARY.has(p.act)||p.act==='unfurl'||p.act==='refold';
 return attackable&&p.age>=Math.max(2,m.startup-6)&&p.age<m.startup+m.active;
}
function canStrike(p,q){
 const m=huntMoveSpec(p);
 if(!m?.damage||p.spent||p.age<m.startup||p.age>=m.startup+m.active)return false;
 if(q.act==='step'&&q.age>=1&&q.age<7)return false;
 const attack=huntAttackbox(p),hurt=huntHurtbox(q);
 return attack.left<hurt.right&&attack.right>hurt.left&&
  attack.top<hurt.bottom&&attack.bottom>hurt.top;
}
// Firearms interrupt attacks/heals into a time-limited visceral opening.
// Unlike conventional fighters, there are no low/mid/high guards or block-parries.
function resolveHit(s,actor,target,moveName,events){
 const a=s.p[actor],b=s.p[target],m=huntMoveSpec(a,moveName);
 a.spent=true;
 const prior=b.hp;
 if(moveName==='shot'||moveName==='airShot'){
  const parryable=huntParryableAction(b);
  b.hp=Math.max(0,b.hp-m.damage);
  b.rally=Math.min(100,b.rally+(prior-b.hp));b.rallyLife=HUNT_RALLY_WINDOW;
  a.hitConfirmed=true;
  if(parryable){
   b.act='stagger';b.age=0;b.exposed=HUNT_VISCERAL_WINDOW;
   b.exposeCause='gun';b.vx=0;b.queue='';b.queueLife=0;b.chain=0;
   b.hitConfirmed=false;
   events?.push({tick:s.tick,kind:'gunParry',actor,target,opening:b.exposed});
  }else events?.push({tick:s.tick,kind:'bulletHit',actor,target,damage:prior-b.hp});
  return;
 }
 if(moveName==='visceral'){
  if(b.act!=='visceralVictim')return;
  b.hp=Math.max(0,b.hp-m.damage);
  b.rally=Math.min(100,b.rally+(prior-b.hp));b.rallyLife=HUNT_RALLY_WINDOW;
  b.act='stun';b.age=0;b.exposed=0;b.queue='';b.queueLife=0;b.vx=0;
  a.hitConfirmed=true;a.focus=Math.min(100,a.focus+15);
  events?.push({tick:s.tick,kind:'visceral',actor,target,damage:prior-b.hp});
  return;
 }
 if(!m.damage)return;
 // A true whiff punish must CONNECT while the target remains committed
 // to recovery of a genuinely missed attack. Time since a whiff alone
 // is insufficient: the opponent may already be able to attack/evade.
 const recovery=huntMoveSpec(b);
 const punishedRecovery=ATTACKS.has(b.act)&&!b.spent&&
  b.age>=recovery.startup+recovery.active&&b.age<total(recovery);
 const punishedMove=punishedRecovery?b.act:'';
 const remainingRecovery=punishedRecovery?total(recovery)-b.age:0;
 const combo=b.act==='stun'?b.combo+1:1;
 const damage=Math.max(5,Math.ceil(m.damage*Math.max(.45,1-.13*(combo-1))));
 // Rally recovery happens only on successful melee contact; never from gunfire.
 const regain=Math.min(a.rally,damage);
 a.hp=Math.min(100,a.hp+regain);a.rally-=regain;
 if(!a.rally)a.rallyLife=0;
 if(regain)events?.push({tick:s.tick,kind:'rally',actor,health:regain});
 b.hp=Math.max(0,b.hp-damage);
 b.rally=Math.min(100,b.rally+(prior-b.hp));b.rallyLife=HUNT_RALLY_WINDOW;
 b.combo=combo;b.act='stun';b.age=0;b.crouch=false;
 b.queue='';b.queueLife=0;b.chain=0;b.hitConfirmed=false;b.exposed=0;
 b.vx=a.dir*(m.damage>=27?6.1:4.4);
 a.hitConfirmed=true;a.focus=Math.min(100,a.focus+9);
 // A charged heavy connecting from behind creates a distinct visceral window.
 const rear=(a.x-b.x)*b.dir<0;
 if(moveName.endsWith('Charged')&&rear&&b.y===HUNT_FLOOR){
  b.act='stagger';b.age=0;b.exposed=HUNT_VISCERAL_WINDOW;
  b.exposeCause='chargedRear';b.vx=0;
  events?.push({tick:s.tick,kind:'rearStagger',actor,target,opening:b.exposed});
 }
 events?.push({tick:s.tick,kind:'hit',actor,target,move:moveName,damage:prior-b.hp,combo,
  punishedRecovery,punishedMove,remainingRecovery});
}
export function huntStep(s,inputs=[huntInput(),huntInput()],events){
 if(s?.rules!==HUNT_RULESET||!Array.isArray(s.p)||s.p.length!==2)
  throw TypeError('Incompatible versioned Hunt combat state');
 const commands=[canonicalHuntInput(inputs[0]),canonicalHuntInput(inputs[1])];
 s.tick++;
 if(s.over)return s;
 if(s.end){
  if(!--s.end){s.p=[huntFighter(0,s.p[0].weapon),huntFighter(1,s.p[1].weapon)];
   s.clock=65*HUNT_HZ;s.ready=90;s.round++;s.winner=null;}
  return s;
 }
 if(s.ready){s.ready--;return s;}
 const a=s.p[0],b=s.p[1];
 const beforeX=[a.x,b.x];
 drive(a,b,commands[0],events,s.tick,0);
 drive(b,a,commands[1],events,s.tick,1);
 // During paid forward quickstep i-frames, pass the opponent's body to exit
 // a wall trap. No teleport, wall jump, air dodge or free defensive guard.
 // Collision resumes immediately when the dodge window closes.
 const forwardStep=p=>p.act==='step'&&p.age>=1&&p.age<7&&p.vx*p.dir>0;
 if(!forwardStep(a)&&!forwardStep(b)&&Math.abs(a.y-b.y)<55&&Math.abs(a.x-b.x)<38){
  const dir=a.x<=b.x?-1:1,d=(38-Math.abs(a.x-b.x))/2;
  a.x=clamp(a.x+dir*d,65,HUNT_W-65);b.x=clamp(b.x-dir*d,65,HUNT_W-65);
 }
 // Training may observe a real physical position reversal near the wall.
 // This is read-only event evidence, not a scripted escape or hitbox override.
 for(let slot=0;slot<2;slot++){
  const me=s.p[slot],other=s.p[1-slot],old=beforeX[slot];
  const crossed=(old-beforeX[1-slot])*(me.x-other.x)<0;
  if(crossed&&forwardStep(me)&&
   ((old<=140&&me.vx>0)||(old>=HUNT_W-140&&me.vx<0)))
   events?.push({tick:s.tick,kind:'cornerEscape',actor:slot,target:1-slot,
    stamina:me.st,side:old<=140?'left':'right'});
 }
 // Gun counters resolve before utility payoffs; melee trades remain simultaneous.
 const gunHits=[['shot','airShot'].includes(a.act)&&canStrike(a,b),
  ['shot','airShot'].includes(b.act)&&canStrike(b,a)];
 const gunMoves=[a.act,b.act];
 for(let slot=0;slot<2;slot++)if(gunHits[slot])
  resolveHit(s,slot,1-slot,gunMoves[slot],events);
 const hits=[!['shot','airShot'].includes(a.act)&&canStrike(a,b),
  !['shot','airShot'].includes(b.act)&&canStrike(b,a)];
 const names=[a.act,b.act];
 for(let slot=0;slot<2;slot++)if(hits[slot])
  resolveHit(s,slot,1-slot,names[slot],events);
 for(let slot=0;slot<2;slot++)settleUtility(s.p[slot],events,s.tick,slot);
 for(let slot=0;slot<2;slot++){
  const p=s.p[slot],m=huntMoveSpec(p);
  if((p.act==='shot'||p.act==='airShot')&&p.age===m.startup)
   events?.push({tick:s.tick,kind:'fire',actor:slot,move:p.act});
  if(m?.damage&&!p.spent&&p.age===m.startup+m.active-1)
   events?.push({tick:s.tick,kind:'whiff',actor:slot,move:p.act});
  if(p.act)p.age++;
 }
 if(--s.clock<=0||a.hp<=0||b.hp<=0){
  const winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;
  s.winner=winner;if(winner!==-1)s.score[winner]++;
  s.over=s.score.includes(2)||s.round>=6;
  if(s.over&&s.score.every(x=>x<2))s.winner=s.score[0]===s.score[1]?-1:s.score[0]>s.score[1]?0:1;
  s.end=s.over?0:115;
  events?.push({tick:s.tick,kind:'round',winner:s.winner,over:s.over});
 }
 return s;
}
export function huntInspector(state,slot=0){
 if(state?.rules!==HUNT_RULESET||![0,1].includes(slot))throw TypeError('Wrong ruleset or player slot');
 const p=state.p[slot],moveInfo=huntMoveSpec(p);
 return Object.freeze({tick:state.tick,weapon:p.weapon,form:p.form,action:p.act,
  hitstunEscapeStart:HUNT_HITSTUN_ESCAPE_START,
  phase:huntPhase(p),startup:moveInfo?.startup??0,active:moveInfo?.active??0,
  recovery:moveInfo?.recovery??0,age:p.age,chain:p.chain,
  hitConfirmed:p.hitConfirmed,queued:p.queue,bufferFrames:p.queueLife,
  jumps:p.jumps,focus:p.focus,health:p.hp,stamina:p.st,ammo:p.ammo,
  bloodAmmo:p.bloodAmmo,vials:p.vials,rally:p.rally,rallyLife:p.rallyLife,
  visceralWindow:p.exposed,exposeCause:p.exposeCause,
  firearmCounterWindowOpen:huntParryableAction(p),
  groundedHitstunEscapeReady:p.act==='stun'&&p.y>=HUNT_FLOOR&&
   p.age>=HUNT_HITSTUN_ESCAPE_START&&
   p.age<total(huntMoveSpec(p))-5&&
   p.st>=HUNT_MOVES.step.cost+HUNT_HITSTUN_ESCAPE_EXTRA_STAMINA
 });
}
