// Seamless Fight — original, separately versioned 60 Hz trick-weapon lab.
// No Bloodborne animation, textures, models or proprietary game data.
// Research mechanics only: DO NOT feed this state to seamless-side/1 clients,
// the existing Node authority, the GGPO prototype or ranked matchmaking.
// Pure and deterministic; no wall clock, rendering, sound or networking.
export const TRICK_RULESET='sf-trick-lab/2';
export const TRICK_HZ=60, TRICK_FLOOR=436, TRICK_W=960;
export const TRICK_WEAPON='mournweave';
export const TRICK_WEAPONS=Object.freeze(['mournweave','thornwake']);
export const TRICK_FORMS=Object.freeze(['folded','unfurled']);
export const TRICK_ACTIONS=Object.freeze(['','light','heavy','trick','shot','step','feint','sync']);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const move=(startup,active,recovery,cost,reach,damage,top=-105,bottom=-26)=>
 Object.freeze({startup,active,recovery,cost,reach,damage,top,bottom});
export const TRICK_MOVES=Object.freeze({
 foldedLight:move(7,4,13,10,88,15,-103,-26),
 foldedHeavy:move(17,6,23,24,113,29,-123,-34),
 unfurledLight:move(11,6,17,14,160,17,-122,-22),
 unfurledHeavy:move(23,8,26,29,193,30,-130,-23),
 airFoldedLight:move(9,5,18,12,98,15,-108,-7),
 airFoldedHeavy:move(18,6,24,25,120,27,-123,-12),
 airUnfurledLight:move(12,6,21,15,173,18,-112,-2),
 airUnfurledHeavy:move(22,7,27,29,192,29,-121,-7),
 unfurl:move(10,6,17,18,142,21,-120,-26),
 refold:move(10,6,17,18,113,23,-108,-29),
 shiftOut:move(6,0,13,6,0,0),
 shiftIn:move(6,0,13,6,0,0),
 shot:move(9,1,25,21,275,10,-111,-77),
 step:move(0,9,12,19,0,0),
 airStep:move(0,8,15,22,0,0),
 feint:move(0,0,12,9,0,0),
 sync:move(0,0,5,0,0,0),
 stun:move(0,0,22,0,0,0),
 guardBreak:move(0,0,29,0,0,0)
});
// Distinct original arsenals. Both share the same deterministic action graph.
export const THORNWAKE_MOVES=Object.freeze({...TRICK_MOVES,
 foldedLight:move(5,3,15,9,82,12,-96,-24),
 foldedHeavy:move(16,4,24,21,124,25,-114,-31),
 unfurledLight:move(14,5,19,16,182,16,-122,-25),
 unfurledHeavy:move(24,8,29,34,222,31,-129,-23),
 airFoldedLight:move(8,4,18,12,99,13,-103,-8),
 airFoldedHeavy:move(19,6,24,24,136,25,-127,-9),
 airUnfurledLight:move(13,5,21,17,190,17,-120,-5),
 airUnfurledHeavy:move(25,7,28,33,224,28,-130,-6),
 unfurl:move(13,6,19,20,188,17,-117,-24),
 refold:move(8,5,16,16,108,18,-103,-27),
 shiftOut:move(8,0,13,7,0,0),
 shiftIn:move(4,0,11,5,0,0)
});
export const TRICK_WEAPON_SPECS=Object.freeze({
 mournweave:TRICK_MOVES,thornwake:THORNWAKE_MOVES
});
export const trickMoveSpec=(p,act=p.act)=>TRICK_WEAPON_SPECS[p.weapon][act];
export function trickFrameTable(weapon=TRICK_WEAPON){
 if(!TRICK_WEAPONS.includes(weapon))throw TypeError('Unknown original trick weapon');
 return Object.freeze(Object.entries(TRICK_WEAPON_SPECS[weapon])
  .map(([name,m])=>Object.freeze({name,...m,totalFrames:m.startup+m.active+m.recovery})));
}

const ATTACKS=new Set(Object.keys(TRICK_MOVES).filter(x=>TRICK_MOVES[x].damage>0));
const ORDINARY=new Set(['foldedLight','foldedHeavy','unfurledLight','unfurledHeavy',
 'airFoldedLight','airFoldedHeavy','airUnfurledLight','airUnfurledHeavy']);
const TRANSFORMS=new Set(['unfurl','refold']);
const total=s=>s.startup+s.active+s.recovery;
export const trickInput=()=>({x:0,y:0,act:'',guard:false});
export function canonicalTrickInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw TypeError('Input object required');
 const {x=0,y=0,act='',guard=false}=input;
 if(![-1,0,1].includes(x)||![-1,0,1].includes(y)||!TRICK_ACTIONS.includes(act)||
  typeof guard!=='boolean')throw TypeError('Invalid movement, action or guard input');
 return {x,y,act,guard};
}
export function trickFighter(slot,weapon=TRICK_WEAPON){
 if(!TRICK_WEAPONS.includes(weapon))throw TypeError('Unknown original trick weapon');
 return {x:slot?705:255,y:TRICK_FLOOR,vx:0,vy:0,dir:slot?-1:1,weapon,
  hp:100,st:100,ammo:3,focus:0,form:'folded',
  act:'',age:0,spent:false,hitConfirmed:false,guardAge:0,
  crouch:false,jumpHeld:false,jumps:0,airSteps:0,regen:0,
  combo:0,chain:0,queue:'',queueLife:0};
}
export function trickMatch({weapons=[TRICK_WEAPON,TRICK_WEAPON]}={}){
 if(!Array.isArray(weapons)||weapons.length!==2||weapons.some(x=>!TRICK_WEAPONS.includes(x)))
  throw TypeError('Two original trick weapons required');
 return {rules:TRICK_RULESET,tick:0,clock:65*TRICK_HZ,ready:90,end:0,round:1,
  winner:null,over:false,score:[0,0],p:[trickFighter(0,weapons[0]),trickFighter(1,weapons[1])]};
}
export const trickCanAct=p=>!p.act||p.age>=total(trickMoveSpec(p));
export const trickPhase=p=>{
 if(p.guardAge)return 'guard';
 if(p.crouch)return 'crouch';
 if(!p.act)return p.y<TRICK_FLOOR?'airborne':'neutral';
 const m=trickMoveSpec(p);
 return p.age<m.startup?'startup':p.age<m.startup+m.active?'active':'recovery';
};
const motion=(p,input)=>{
 const airborne=p.y<TRICK_FLOOR;
 const form=p.form==='folded'
  ?(airborne?'Folded':'folded'):(airborne?'Unfurled':'unfurled');
 if(input==='light'||input==='heavy')
  return (airborne?'air':'')+form+input[0].toUpperCase()+input.slice(1);
 if(input==='trick')
  return !p.act?(p.form==='folded'?'shiftOut':'shiftIn'):
   (p.form==='folded'?'unfurl':'refold');
 if(input==='step')return p.y<TRICK_FLOOR?'airStep':'step';
 return input;
};
export function trickHurtbox(p){
 return {left:p.x-18,right:p.x+18,top:p.y-(p.crouch?58:111),bottom:p.y-8};
}
export function trickAttackbox(p){
 const m=trickMoveSpec(p);
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
function starts(p,other,requested){
 if(!requested)return false;
 const m=trickMoveSpec(p,requested);
 if(!m||p.st<m.cost)return false;
 if(requested==='shot'&&!p.ammo)return false;
 if(requested==='airStep'&&p.airSteps>=1)return false;
 if((requested==='shiftOut'||requested==='shiftIn')&&p.y<TRICK_FLOOR)return false;
 const old=trickMoveSpec(p);
 const wasAttacking=ATTACKS.has(p.act);
 let chained=false;
 if(!p.act||trickCanAct(p)){
  if(requested==='feint'||requested==='sync')return false;
  p.chain=0;
 }else if(requested==='feint'&&p.act.endsWith('Heavy')&&
   p.age>=5&&p.age<old.startup-3){
  chained=true;
 }else if(TRANSFORMS.has(requested)&&
   (ORDINARY.has(p.act)||p.act==='step'||p.act==='airStep')&&
   p.age>=old.startup+1&&p.age<total(old)-6&&p.chain<4){
  // Form-cancel permitted on contact or whiff, but costs real stamina.
  chained=true;
 }else if(wasAttacking&&ORDINARY.has(requested)&&
   p.hitConfirmed&&p.age>=old.startup+old.active-1&&
   p.age<total(old)-6&&p.chain<4){
  // Regular follow-up only after confirmed contact, not free whiff cancels.
  chained=true;
 }else if(requested==='sync'&&p.focus>=60&&wasAttacking&&
   p.age>=old.startup+old.active&&p.age<total(old)-3){
  chained=true;
 }else{
  return false;
 }
 if(requested==='sync')p.focus-=60;
 p.act=requested;p.age=0;p.spent=false;p.hitConfirmed=false;
 p.chain=chained?p.chain+1:1;
 p.st=clamp(p.st-m.cost,0,100);p.regen=27;
 p.crouch=false;p.guardAge=0;
 if(requested==='shot')p.ammo--;
 if(requested==='step'||requested==='airStep'){
  const sign=other.x>=p.x?1:-1;
  const travel=p.dir===sign?p.dir:(p.dir||sign);
  p.vx=(requested==='step'?10.6:9.2)*travel;
  if(requested==='airStep')p.airSteps++;
 }
 return true;
}
function drive(p,q,input,events,tick,actor){
 const wasGround=p.y>=TRICK_FLOOR;
 if(trickCanAct(p)){p.act='';p.age=0;p.chain=0;p.hitConfirmed=false;}
 if(!p.act)p.dir=q.x>=p.x?1:-1;
 const jumping=input.y===-1;
 p.crouch=wasGround&&input.y===1&&!p.act;
 if(jumping&&!p.jumpHeld&&p.jumps<2&&!p.act&&p.st>=6){
  p.vy=p.jumps===0?-12.6:-10.9;
  p.y-=.01;p.jumps++;p.st-=6;p.regen=15;p.crouch=false;
  events?.push({tick,kind:p.jumps===2?'doubleJump':'jump',actor,x:p.x,y:p.y});
 }
 p.jumpHeld=jumping;
 buffer(p,input);
 const guarding=input.guard&&wasGround&&!p.act&&!jumping&&!p.crouch&&p.st>=3;
 p.guardAge=guarding?Math.min(999,p.guardAge+1):0;
 if(guarding){p.st=Math.max(0,p.st-.18);p.regen=8;}
 if(p.queue&&!guarding){
  const requested=motion(p,p.queue);
  // One queued attack is consumed only when permitted. No free neutral inputs.
  // A transform queued during an attack is morph; otherwise it's a slow shift.
  if(starts(p,q,requested)){
   events?.push({tick,kind:'action',actor,move:requested,form:p.form,x:p.x,y:p.y-80});
   p.queue='';p.queueLife=0;
  }
 }
 const m=trickMoveSpec(p);
 if(m&&(TRANSFORMS.has(p.act)||p.act==='shiftOut'||p.act==='shiftIn')&&p.age===m.startup-1){
  p.form=p.form==='folded'?'unfurled':'folded';
  events?.push({tick,kind:'transform',actor,form:p.form,move:p.act,x:p.x,y:p.y-72});
 }
 if(p.act==='step'||p.act==='airStep')p.vx*=.89;
 else if(p.act){
  p.vx*=.74;
  if(m.damage&&p.age===m.startup-1)p.vx+=p.dir*(p.act.includes('Heavy')?4.0:2.4);
 }else{
  const speed=guarding?0:p.crouch?1.15:wasGround?3.9:3.5;
  const accel=wasGround?.33:.14;
  p.vx+=(input.x*speed-p.vx)*accel;
 }
 p.x=clamp(p.x+p.vx,65,TRICK_W-65);
 if(p.y<TRICK_FLOOR||p.vy<0){
  p.vy=Math.min(15,p.vy+.75);p.y=Math.min(TRICK_FLOOR,p.y+p.vy);
  if(p.y===TRICK_FLOOR){
   p.vy=0;p.jumps=0;p.airSteps=0;
  }
 }else{p.y=TRICK_FLOOR;p.vy=0;}
 if(p.regen)p.regen--;
 else if(!p.act&&!guarding)p.st=Math.min(100,p.st+.69);
}
function canStrike(p,q){
 const m=trickMoveSpec(p);
 if(!m?.damage||p.spent||p.age<m.startup||p.age>=m.startup+m.active)return false;
 if(q.act==='step'&&q.age>=1&&q.age<7)return false;
 const attack=trickAttackbox(p),hurt=trickHurtbox(q);
 return attack.left<hurt.right&&attack.right>hurt.left&&
  attack.top<hurt.bottom&&attack.bottom>hurt.top;
}
function resolveHit(s,actor,target,moveName,events){
 const a=s.p[actor],b=s.p[target],m=trickMoveSpec(a,moveName);
 a.spent=true;
 const guard=b.guardAge>0&&b.dir===-a.dir&&b.y===TRICK_FLOOR;
 const parry=guard&&b.guardAge<=4&&b.st>=10&&moveName!=='shot';
 if(parry){
  a.act='stun';a.age=0;a.queue='';a.queueLife=0;a.chain=0;a.hitConfirmed=false;
  a.vx=-a.dir*4.5;
  b.focus=Math.min(100,b.focus+24);b.st=Math.min(100,b.st+6);
  events?.push({tick:s.tick,kind:'parry',actor:target,target:actor,move:moveName,damage:0});
  return;
 }
 a.hitConfirmed=true;
 a.focus=Math.min(100,a.focus+(guard?5:9));
 let damage=m.damage;
 if(guard){
  damage=Math.min(4,Math.ceil(damage*.1));
  b.st=Math.max(0,b.st-(m.damage>=27?22:13));
  if(b.st===0){b.act='guardBreak';b.age=0;b.guardAge=0;b.queue='';b.queueLife=0;}
  events?.push({tick:s.tick,kind:'block',actor,target,move:moveName,damage});
 }else{
  const combo=b.act==='stun'?b.combo+1:1;
  b.combo=combo;damage=Math.max(5,Math.ceil(damage*Math.max(.45,1-.13*(combo-1))));
  b.act='stun';b.age=0;b.crouch=false;b.guardAge=0;
  b.queue='';b.queueLife=0;b.chain=0;b.hitConfirmed=false;
  b.vx=a.dir*(m.damage>=27?6.1:4.4);
  events?.push({tick:s.tick,kind:'hit',actor,target,move:moveName,damage,combo});
 }
 b.hp=Math.max(0,b.hp-damage);
}
export function trickStep(s,inputs=[trickInput(),trickInput()],events){
 if(s?.rules!==TRICK_RULESET||!Array.isArray(s.p)||s.p.length!==2)
  throw TypeError('Incompatible versioned trick lab state');
 const commands=[canonicalTrickInput(inputs[0]),canonicalTrickInput(inputs[1])];
 s.tick++;
 if(s.over)return s;
 if(s.end){
  if(!--s.end){s.p=[trickFighter(0,s.p[0].weapon),trickFighter(1,s.p[1].weapon)];
   s.clock=65*TRICK_HZ;s.ready=90;s.round++;s.winner=null;}
  return s;
 }
 if(s.ready){s.ready--;return s;}
 const a=s.p[0],b=s.p[1];
 drive(a,b,commands[0],events,s.tick,0);
 drive(b,a,commands[1],events,s.tick,1);
 if(Math.abs(a.y-b.y)<55&&Math.abs(a.x-b.x)<38){
  const dir=a.x<=b.x?-1:1,d=(38-Math.abs(a.x-b.x))/2;
  a.x=clamp(a.x+dir*d,65,TRICK_W-65);b.x=clamp(b.x-dir*d,65,TRICK_W-65);
 }
 const hits=[canStrike(a,b),canStrike(b,a)];
 const names=[a.act,b.act];
 for(let slot=0;slot<2;slot++)if(hits[slot])
  resolveHit(s,slot,1-slot,names[slot],events);
 for(let slot=0;slot<2;slot++){
  const p=s.p[slot],m=trickMoveSpec(p);
  if(p.act==='shot'&&p.age===trickMoveSpec(p,'shot').startup)
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
export function trickInspector(state,slot=0){
 if(state?.rules!==TRICK_RULESET||![0,1].includes(slot))throw TypeError('Wrong ruleset or player slot');
 const p=state.p[slot],moveInfo=trickMoveSpec(p);
 return Object.freeze({tick:state.tick,weapon:p.weapon,form:p.form,action:p.act,
  phase:trickPhase(p),startup:moveInfo?.startup??0,active:moveInfo?.active??0,
  recovery:moveInfo?.recovery??0,age:p.age,chain:p.chain,
  hitConfirmed:p.hitConfirmed,queued:p.queue,bufferFrames:p.queueLife,
  jumps:p.jumps,focus:p.focus,health:p.hp,stamina:p.st,ammo:p.ammo});
}
