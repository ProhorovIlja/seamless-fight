// Delay-bounded offline AI: makes decisions from observed fighter state,
// never reads opponent inputs, future actions or replay tapes.
import {sideCanAct,sideCanFeint,sideInput,SIDE_MOVES} from './side-engine.mjs';
const difficulties=Object.freeze({
 easy:{delay:22,close:93,attack:52,heavy:113,gun:false,parry:false},
 normal:{delay:13,close:99,attack:37,heavy:88,gun:true,parry:false},
 hard:{delay:8,close:102,attack:28,heavy:67,gun:true,parry:true}
});
export const SIDE_AI_LEVELS=Object.freeze(Object.keys(difficulties));
export function createSideBot(level='normal',slot=1){
 if(![0,1].includes(slot))throw RangeError('Bot slot must be Veil or Cinder.');
 const p=difficulties[level]||difficulties.normal,ring=Array(p.delay+1);
 let previous=-1,round=-1,handled=-1;
 return function sideBot(s){
  if(s.tick!==previous+1||s.round!==round||s.ready||s.end||s.over){
   ring.fill(null);handled=-1;
  }
  previous=s.tick;round=s.round;
  if(s.ready||s.end||s.over)return sideInput();
  const q=s.p[slot],other=s.p[1-slot];
  ring[s.tick%ring.length]={x:other.x,y:other.y,act:other.act,age:other.age,dir:other.dir};
  const at=s.tick-p.delay,seen=at>=0?ring[at%ring.length]:null;
  if(!seen)return sideInput();
  const dist=Math.abs(seen.x-q.x),toward=seen.x>q.x?1:-1;
  const attack=SIDE_MOVES[seen.act],incoming=attack?.damage>0&&seen.age<attack.startup;
  const newMove=incoming&&handled!==at-seen.age;
  if(newMove){
   handled=at-seen.age;
   if(p.gun&&seen.act==='hew'&&q.ammo&&q.st>26&&dist<210)return {x:0,y:0,act:'shot',guard:false};
   if(dist<attack.reach+9&&q.st>24){
    if(p.parry&&seen.act==='hew'&&seen.age<attack.startup-8)
     return {x:0,y:0,act:'',guard:true};
    if(s.tick%3!==1)return {x:-toward,y:0,act:'step',guard:false};
   }
  }
  if(sideCanFeint(q)&&seen.act==='step')return {x:0,y:0,act:'feint',guard:false};
  if(!sideCanAct(q))return sideInput();
  if(q.st<16)return {x:-toward,y:0,act:'',guard:false};
  if(incoming&&dist<attack.reach+14&&p.parry)
   return {x:0,y:0,act:'',guard:true};
  if(dist<94&&s.tick%p.attack===0&&q.st>19)
   return {x:0,y:0,act:'cut',guard:false};
  if(dist<124&&s.tick%p.heavy===0&&q.st>36)
   return {x:0,y:0,act:'hew',guard:false};
  if(p.gun&&dist>115&&dist<220&&s.tick%101===0&&q.ammo&&q.st>26)
   return {x:0,y:0,act:'shot',guard:false};
  if(dist>p.close+8)return {x:toward,y:0,act:'',guard:false};
  if(dist<p.close-19)return {x:-toward,y:0,act:'',guard:false};
  return sideInput();
 };
}
