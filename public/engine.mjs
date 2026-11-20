const engine = function engine(){
 const W=960,H=540,HZ=60, LIMIT=75*HZ, MAX_ROUNDS=6;
 const FEINT={from:5,until:15,cost:8};
 const moves={cut:[10,5,16,18,86,19],hew:[22,7,24,30,114,33],shot:[8,1,25,24,190,8],step:[0,10,12,22,0,0],stun:[0,0,31,0,0,0],feint:[0,0,13,0,0,0]};
 const clamp=(x,a,b)=>Math.min(b,Math.max(x,a));
 const blank=()=>({x:0,y:0,act:''});
 const fighter=(i)=>({x:i?688:272,y:270,vx:0,vy:0,fx:i?-1:1,fy:0,hp:100,st:100,act:'',age:0,spent:false,regen:0,ammo:3});
 const match=()=>({p:[fighter(0),fighter(1)],tick:0,clock:LIMIT,ready:120,score:[0,0],winner:null,round:1,end:0,over:false});
 const canFeint=p=>p.act==='hew'&&p.age>=FEINT.from&&p.age<FEINT.until&&p.st>=FEINT.cost;
 const canAct=p=>!p.act||p.age>=moves[p.act][0]+moves[p.act][1]+moves[p.act][2];
 function motion(p,input,q){
   if(canAct(p))p.act='';
   if(input.act==='feint'&&canFeint(p)){p.act='feint';p.age=0;p.st-=FEINT.cost;p.regen=34;}
   let {x,y,act}=input;const n=Math.max(1,Math.hypot(x,y));x/=n;y/=n;
   if(!p.act){
     const d=Math.hypot(q.x-p.x,q.y-p.y)||1;p.fx=(q.x-p.x)/d;p.fy=(q.y-p.y)/d;
     if(Object.hasOwn(moves,act)&&act!=='stun'&&act!=='feint'&&p.st>=moves[act][3]&&(act!=='shot'||p.ammo)){
       p.act=act;p.age=0;p.spent=false;p.st-=moves[act][3];p.regen=34;
       if(act==='shot')p.ammo--;
       if(act==='step'){const d=Math.hypot(x,y);p.vx=(d?x/d:-p.fx)*8.2;p.vy=(d?y/d:-p.fy)*8.2;}
     }
   }
   if(!p.act){const f=x||y?.27:.32;p.vx+=(x*3.1-p.vx)*f;p.vy+=(y*3.1-p.vy)*f;}
   else if(p.act==='step'){p.vx*=.9;p.vy*=.9;}
   else {p.vx*=.65;p.vy*=.65;if(p.act==='cut'||p.act==='hew'){const t=moves[p.act][0];if(p.age===t){p.vx=p.fx*5;p.vy=p.fy*5;}}}
   p.x=clamp(p.x+p.vx,58,W-58);p.y=clamp(p.y+p.vy,96,H-55);
   if(p.regen)p.regen--;else if(!p.act)p.st=Math.min(100,p.st+.72);
 }
 function predictMotion(p,input,opponent){
   if(!p.act)motion(p,{x:input.x,y:input.y,act:''},opponent);
   return p;
 }
 function strike(p,q){
   const m=moves[p.act]; if(!m||!m[5]||p.spent||p.age<m[0]||p.age>=m[0]+m[1])return null;
   const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
   if(d>m[4]||(dx*p.fx+dy*p.fy)<d*(p.act==='shot'?.88:.45))return null;
   if(q.act==='step'&&q.age>=1&&q.age<9)return null;
   p.spent=true;
   return {damage:m[5],stun:p.act==='shot'&&(q.act==='cut'||q.act==='hew')&&q.age<moves[q.act][0]};
 }
 function step(s,inputs,events,cues,legacy=false){
   s.tick++;
   if(s.over)return;
   if(s.end){if(!--s.end){s.p=[fighter(0),fighter(1)];s.clock=LIMIT;s.ready=120;s.round++;s.winner=null;}return;}
   if(s.ready){s.ready--;return;}
   const [a,b]=s.p;const priorA={x:a.x,y:a.y};motion(a,inputs[0],b);motion(b,inputs[1],priorA);
   const d=Math.hypot(a.x-b.x,a.y-b.y);
   if(d<34){const dx=d?(a.x-b.x)/d:-1,dy=d?(a.y-b.y)/d:0;for(const [p,k] of [[a,1],[b,-1]]){p.x=clamp(p.x+dx*(34-d)*.5*k,58,W-58);p.y=clamp(p.y+dy*(34-d)*.5*k,96,H-55);}}
   if(cues)for(let i=0;i<2;i++){
     const p=s.p[i];if(p.act==='shot'&&p.age===moves.shot[0])cues.push({name:'shot',x:p.x,actor:i,muzzle:i});
   }
   const hits=[strike(b,a),strike(a,b)];
   if(cues)for(let i=0;i<2;i++)if(hits[i]){
     const p=s.p[i],q=s.p[1-i];
     cues.push({name:hits[i].stun?'interrupt':'hit',x:p.x,actor:i,index:i,angle:Math.atan2(p.y-q.y,p.x-q.x)});
   }
   if(events)for(let i=0;i<2;i++){
     const p=s.p[i],attacker=s.p[1-i],hit=hits[i],move=moves[p.act];
     if(hit){
       const recovering=move?.[5]&&p.age>=move[0]+move[1];
       const kind=hit.stun?'interrupt':recovering&&!p.spent?'whiff punish':recovering||p.act==='feint'?'recovery punish':'hit';
       events.push({tick:s.tick,kind,actor:1-i,target:i,move:attacker.act,damage:Math.min(p.hp,hit.damage)});
     }
     if(move?.[5]&&!p.spent&&p.age===move[0]+move[1]-1)
       events.push({tick:s.tick,kind:'miss',actor:i,move:p.act});
   }
   for(let i=0;i<2;i++)if(hits[i]){const p=s.p[i];p.hp=Math.max(0,p.hp-hits[i].damage);if(hits[i].stun){p.act='stun';p.age=0;}}
   for(const p of s.p)if(p.act)p.age++;
   if(--s.clock<=0||!a.hp||!b.hp){s.winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;if(s.winner>=0)s.score[s.winner]++;s.over=s.score.includes(2)||(!legacy&&s.round>=MAX_ROUNDS);if(s.over&&s.score.every(n=>n<2)){s.winner=s.score[0]===s.score[1]?-1:s.score[0]>s.score[1]?0:1;}s.end=s.over?0:150;}
 }
 return {W,H,HZ,MAX_ROUNDS,blank,match,step,moves,predictMotion,FEINT,canFeint,canAct};
};
export const {W,H,HZ,MAX_ROUNDS,blank,match,step,moves,predictMotion,FEINT,canFeint,canAct}=engine();
