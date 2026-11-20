import {blank,canAct,canFeint,moves} from './engine.mjs';

export function trainingInput(s, style='duelist'){
 const [p,q]=s.p, dx=p.x-q.x, dy=p.y-q.y, d=Math.hypot(dx,dy);
 const sign=x=>Math.abs(x)>9?Math.sign(x):0;
 const strafe=(s.tick%180<90?1:-1);
 const circle={x:sign(-dy*strafe),y:sign(dx*strafe),act:''};
 if(style==='dummy')return blank();
 if(canFeint(q)&&q.age===9&&p.act==='step')return {...blank(),act:'feint'};
 if(!canAct(q))return blank();
 const melee=p.act==='cut'||p.act==='hew', m=moves[p.act];
 if(style==='evasions'){
   if(melee&&p.age===m[0]-3&&d<m[4]+15&&q.st>=22)return {...circle,act:'step'};
   return d>102?{x:sign(dx),y:sign(dy),act:''}:circle;
 }
 if(melee&&p.age===m[0]-3&&d<m[4]+8&&q.st>=22&&s.tick%3!==0)return {...circle,act:'step'};
 if(p.act==='hew'&&p.age===10&&q.ammo&&q.st>=24&&d<165)return {...blank(),act:'shot'};
 if(d<=83&&m&&p.age>=m[0]+m[1]&&m[5]&&q.st>=18)return {...blank(),act:'cut'};
 if(d<106&&d>72&&q.st>=43&&s.tick%33===0)return {...blank(),act:'hew'};
 if(d<=78&&q.st>=32&&s.tick%29===0)return {...blank(),act:'cut'};
 if(q.st<28&&d<105)return {x:-sign(dx),y:-sign(dy),act:''};
 return d>77?{x:sign(dx),y:sign(dy),act:''}:circle;
}

const profiles={
 duelist:{delay:12,range:81,cut:35,heavy:53,gun:true},
 pressure:{delay:16,range:69,cut:26,heavy:49,gun:false},
 sentinel:{delay:10,range:119,cut:42,heavy:61,gun:true}
};
// The sparring partner sees past positions and animation, never queued inputs.
// Sample at a fixed delay; reset on countdown, rewind or a round boundary.
export function createSparring(style='duelist',level='normal'){
 const base=Object.hasOwn(profiles,style)?profiles[style]:profiles.duelist;
 const rules=level==='easy'?{...base,delay:base.delay+8,cut:base.cut+12,heavy:base.heavy+16,gun:false}:level==='hard'?{...base,delay:Math.max(8,base.delay-4),cut:Math.max(19,base.cut-10),heavy:base.heavy-13}:base;
 const ring=new Array(rules.delay+1);
 let round=-1, previous=-1, seenTick=-1;
 return function spar(s){
   if(style==='dummy'||style==='lesson')return blank();
   if(s.round!==round||s.tick!==previous+1||s.ready||s.end||s.over){ring.fill(undefined);seenTick=-1;}
   previous=s.tick;round=s.round;
   if(s.ready||s.end||s.over)return blank();
   const [p,q]=s.p;
   ring[s.tick%ring.length]={x:p.x,y:p.y,act:p.act,age:p.age};
   const at=s.tick-rules.delay;
   const target=at>=0?ring[at%ring.length]:null;
   if(!target)return blank();
   if(!canAct(q))return blank();
   const dx=target.x-q.x,dy=target.y-q.y,d=Math.hypot(dx,dy);
   const axis=v=>Math.abs(v)>9?Math.sign(v):0;
   const dir=s.tick%144<72?1:-1;
   const circle={x:axis(-dy*dir),y:axis(dx*dir),act:''};
   const m=moves[target.act], startup=m?.[5]&&target.age<m[0];
   const fresh=startup&&seenTick!==at-target.age;
   if(fresh){
     seenTick=at-target.age;
     if(style!=='evasions'&&rules.gun&&target.act==='hew'&&d<=153&&d>=65&&q.ammo&&q.st>=24&&s.tick%4!==0)return {...blank(),act:'shot'};
     if(d<=m[4]+9&&q.st>=22&&s.tick%3===0)return {...circle,act:'step'};
   }
   if(style==='evasions')return d>102?{x:axis(dx),y:axis(dy),act:''}:circle;
   if(d<82&&q.st>=18&&(s.tick%rules.cut===0||m?.[5]&&target.age===m[0]+m[1]))return {...blank(),act:'cut'};
   if(d<=109&&q.st>=38&&s.tick%rules.heavy===0)return {...blank(),act:'hew'};
   if(q.st<24||style==='sentinel'&&d<89)return {x:-axis(dx),y:-axis(dy),act:''};
   return d>rules.range?{x:axis(dx),y:axis(dy),act:''}:circle;
 };
}

export const LESSONS=Object.freeze([
 ['move','Move across the court','Use the movement keys, stick, D-pad, or touch stick.'],
 ['cut','Make a light cut','Cuts start faster than heavy swings but reach less far.'],
 ['step','Quickstep','Hold a direction to step that way. Without a direction, you step back.'],
 ['shot','Fire the pistol','The shot has a short wind-up and spends one round of ammunition.'],
 ['feint','Feint a heavy swing','Start a heavy, then feint during its early wind-up. Try again after recovery if you miss the window.']
].map(Object.freeze));
export function lessonStep(stage,observation){
 const want=LESSONS[stage]?.[0];
 if(!want||!observation.live)return stage;
 if(want==='move')return stage+(observation.distance>=28?1:0);
 return stage+(observation.cues.some(c=>c.actor===0&&c.name===want)?1:0);
}
