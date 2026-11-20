// Standalone 60 Hz side-view fighting prototype. Pure deterministic simulation.
// No browser, audio, rendering, wall-clock or network dependencies.
// Kept separate from the existing authoritative 2D-plane ruleset until its
// replays, AI and online service have an independently verified migration.
export const SIDE_HZ=60, SIDE_W=960, SIDE_H=540, SIDE_FLOOR=436;
export const SIDE_RULESET='seamless-side/1';
export const SIDE_MOVES=Object.freeze({
 cut:Object.freeze({startup:9,active:5,recovery:15,cost:16,reach:97,damage:19,top:-104,bottom:-29}),
 hew:Object.freeze({startup:21,active:7,recovery:24,cost:31,reach:126,damage:34,top:-119,bottom:-32}),
 shot:Object.freeze({startup:9,active:1,recovery:25,cost:24,reach:268,damage:10,top:-112,bottom:-72}),
 step:Object.freeze({startup:0,active:9,recovery:12,cost:20,reach:0,damage:0,top:0,bottom:0}),
 feint:Object.freeze({startup:0,active:0,recovery:14,cost:0,reach:0,damage:0,top:0,bottom:0}),
 stun:Object.freeze({startup:0,active:0,recovery:22,cost:0,reach:0,damage:0,top:0,bottom:0}),
 guardBreak:Object.freeze({startup:0,active:0,recovery:28,cost:0,reach:0,damage:0,top:0,bottom:0})
});
export const SIDE_FEINT=Object.freeze({start:5,end:15,cost:8});
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const sideInput=()=>({x:0,y:0,act:'',guard:false});
export function sideFighter(slot){
 return {x:slot?705:255,y:SIDE_FLOOR,vx:0,vy:0,dir:slot?-1:1,
  hp:100,st:100,ammo:3,act:'',age:0,spent:false,
  crouch:false,jumpHeld:false,guardAge:0,regen:0,combo:0};
}
export function sideMatch(){
 return {rules:SIDE_RULESET,tick:0,clock:65*SIDE_HZ,ready:90,end:0,
  round:1,score:[0,0],winner:null,over:false,p:[sideFighter(0),sideFighter(1)]};
}
export const sideCanAct=p=>!p.act||p.age>=SIDE_MOVES[p.act].startup+SIDE_MOVES[p.act].active+SIDE_MOVES[p.act].recovery;
export const sideCanFeint=p=>p.act==='hew'&&p.age>=SIDE_FEINT.start&&p.age<SIDE_FEINT.end&&p.st>=SIDE_FEINT.cost;
export function sideHurtbox(p){
 return {left:p.x-18,right:p.x+18,top:p.y-(p.crouch?58:111),bottom:p.y-8};
}
export function sideAttackbox(p){
 const m=SIDE_MOVES[p.act];
 if(!m?.damage)return null;
 return {left:p.dir>0?p.x+8:p.x-m.reach,right:p.dir>0?p.x+m.reach:p.x-8,
  top:p.y+m.top,bottom:p.y+m.bottom};
}
export function sidePhase(p){
 if(p.guardAge)return 'guard';
 if(p.crouch)return 'crouch';
 if(!p.act)return p.y<SIDE_FLOOR?'airborne':'neutral';
 const m=SIDE_MOVES[p.act];
 if(p.age<m.startup)return 'startup';
 if(p.age<m.startup+m.active)return 'active';
 return 'recovery';
}
function drive(p,q,i){
 const x=i?.x===1?1:i?.x===-1?-1:0;
 const jump=i?.y===-1,crouch=i?.y===1;
 const act=typeof i?.act==='string'&&Object.hasOwn(SIDE_MOVES,i.act)?i.act:'';
 const ground=p.y>=SIDE_FLOOR;
 if(sideCanAct(p)){p.act='';p.age=0;}
 if(act==='feint'&&sideCanFeint(p)){
  p.act='feint';p.age=0;p.st-=SIDE_FEINT.cost;p.regen=28;p.spent=false;
 }
 if(!p.act)p.dir=q.x>=p.x?1:-1;
 p.crouch=ground&&crouch&&!p.act;
 if(!p.act&&jump&&!p.jumpHeld&&ground){
  p.vy=-12.6;p.y-=.01;p.crouch=false;
 }
 p.jumpHeld=jump;
 const guarding=Boolean(i?.guard)&&ground&&!p.act&&!jump&&!p.crouch&&p.st>=3;
 p.guardAge=guarding?Math.min(p.guardAge+1,999):0;
 if(guarding){p.st=Math.max(0,p.st-.18);p.regen=8;}
 if(!p.act&&!guarding&&Object.hasOwn(SIDE_MOVES,act)&&
    !['feint','stun','guardBreak'].includes(act)&&p.st>=SIDE_MOVES[act].cost&&
    (act!=='shot'||p.ammo>0)){
  p.act=act;p.age=0;p.spent=false;p.crouch=false;p.guardAge=0;
  p.st-=SIDE_MOVES[act].cost;p.regen=30;
  if(act==='shot')p.ammo--;
  if(act==='step')p.vx=(x||-p.dir)*10.1;
 }
 if(p.act==='step')p.vx*=.89;
 else if(p.act){p.vx*=.65;const m=SIDE_MOVES[p.act];if(m.damage&&p.age===m.startup-1)p.vx=p.dir*(p.act==='hew'?5.2:3.2);}
 else {
  const speed=guarding?0:p.crouch?1.05:ground?3.7:3;
  p.vx+=(x*speed-p.vx)*(ground?.33:.15);
 }
 p.x=clamp(p.x+p.vx,65,SIDE_W-65);
 if(p.y<SIDE_FLOOR||p.vy<0){
  p.vy=Math.min(15,p.vy+.75);
  p.y=Math.min(SIDE_FLOOR,p.y+p.vy);
  if(p.y===SIDE_FLOOR)p.vy=0;
 }else{p.y=SIDE_FLOOR;p.vy=0;}
 if(p.regen)p.regen--;
 else if(!p.act&&!guarding)p.st=Math.min(100,p.st+.67);
}
function strike(p,q){
 const m=SIDE_MOVES[p.act];
 if(!m?.damage||p.spent||p.age<m.startup||p.age>=m.startup+m.active)return false;
 const a=sideAttackbox(p),h=sideHurtbox(q);
 return Boolean(a.left<h.right&&a.right>h.left&&a.top<h.bottom&&a.bottom>h.top);
}
function hit(s,attacker,target,event,events){
 const a=s.p[attacker],b=s.p[target],m=SIDE_MOVES[event];
 a.spent=true;
 const guarding=b.guardAge>0&&b.dir===-a.dir&&b.y===SIDE_FLOOR;
 const parry=guarding&&b.guardAge<=4&&b.st>=10;
 if(parry){
  a.act='stun';a.age=0;a.vx=-a.dir*4.5;
  b.st=Math.min(100,b.st+6);b.regen=15;
  events?.push({tick:s.tick,kind:'parry',actor:target,target:attacker,move:event,damage:0,x:a.x,y:a.y-78});
  return;
 }
 let damage=m.damage;
 if(guarding){
  damage=Math.min(4,Math.ceil(damage*.1));b.st=Math.max(0,b.st-(m.damage>=30?22:13));b.regen=22;
  if(!b.st){b.act='guardBreak';b.age=0;b.guardAge=0;}
  events?.push({tick:s.tick,kind:'block',actor:attacker,target,move:event,damage,x:b.x,y:b.y-84});
 }else{
  const combo=b.act==='stun'?b.combo+1:1;
  damage=Math.max(5,Math.ceil(damage*Math.max(.55,1-.12*(combo-1))));
  b.combo=combo;b.act='stun';b.age=0;b.crouch=false;b.guardAge=0;
  b.vx=a.dir*(event==='hew'?6.8:4.5);
  events?.push({tick:s.tick,kind:'hit',actor:attacker,target,move:event,damage,x:b.x,y:b.y-81,combo});
 }
 b.hp=Math.max(0,b.hp-damage);
}
export function sideStep(s,inputs=[sideInput(),sideInput()],events){
 if(!s||s.rules!==SIDE_RULESET)throw TypeError('Incompatible side-view duel state.');
 s.tick++;
 if(s.over)return s;
 if(s.end){
  if(!--s.end){s.p=[sideFighter(0),sideFighter(1)];s.clock=65*SIDE_HZ;s.ready=90;s.round++;s.winner=null;}
  return s;
 }
 if(s.ready){s.ready--;return s;}
 const a=s.p[0],b=s.p[1];
 drive(a,b,inputs[0]);drive(b,a,inputs[1]);
 if(Math.abs(a.y-b.y)<55&&Math.abs(a.x-b.x)<38){
  const dir=a.x<=b.x?-1:1,d=(38-Math.abs(a.x-b.x))/2;
  a.x=clamp(a.x+dir*d,65,SIDE_W-65);b.x=clamp(b.x-dir*d,65,SIDE_W-65);
 }
 // Snapshot both hit decisions before stun/block alters the other attack.
 const hits=[strike(a,b),strike(b,a)],names=[a.act,b.act];
 for(let side=0;side<2;side++)if(hits[side])hit(s,side,1-side,names[side],events);
 if(events)for(let side=0;side<2;side++){
  const p=s.p[side],m=SIDE_MOVES[p.act];
  if(m?.damage&&!p.spent&&p.age===m.startup+m.active-1)
   events.push({tick:s.tick,kind:'whiff',actor:side,move:p.act,damage:0,x:p.x,y:p.y-78});
 }
 for(const p of s.p)if(p.act)p.age++;
 if(--s.clock<=0||!a.hp||!b.hp){
  const winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;
  s.winner=winner;if(winner!==-1)s.score[winner]++;
  s.over=s.score.includes(2)||s.round>=6;
  if(s.over&&s.score.every(v=>v<2))s.winner=s.score[0]===s.score[1]?-1:s.score[0]>s.score[1]?0:1;
  s.end=s.over?0:115;
  events?.push({tick:s.tick,kind:'round',winner:s.winner,over:s.over});
 }
 return s;
}
