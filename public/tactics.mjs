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
