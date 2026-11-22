import {HZ} from './engine.mjs';
const MS=1000/HZ, LIMIT=8;
const live=s=>!s.ready&&!s.end&&!s.over;
const walking=s=>s.p.every(p=>!p.act);

// Buffer only neutral footwork. Never delay health, telegraphs, or hit cues.
export function footwork(){
 let frames=[], cursor=null, last=null, variation=0, target=0;
 function clear(){frames=[];cursor=null;last=null;variation=0;target=0;}
 return {
  clear,
  push(s,at){
   if(!live(s)||!walking(s)){clear();return;}
   const prev=frames.at(-1);
   if(prev&&s.tick<=prev.tick)return;
   if(prev&&(prev.round!==s.round||s.tick-prev.tick>12||at-prev.at>250))clear();
   const base=frames.at(-1);
   if(base){
    const error=Math.abs((at-base.at)-(s.tick-base.tick)*MS);
    variation+=.2*(Math.min(error,50)-variation);
   }
   frames.push({tick:s.tick,round:s.round,at,p:s.p.map(({x,y})=>({x,y}))});
   if(frames.length>LIMIT)frames.shift();
  },
  sample(now){
   const a=frames[0], z=frames.at(-1);
   if(!a)return null;
   const span=Math.max(0,now-z.at), delay=3+Math.min(3,variation/MS*2);
   target=delay;
   const goal=Math.max(a.tick,Math.min(z.tick,z.tick+span/MS-delay));
   // Never rewind when arrivals bunch up; converge without a jump.
   if(cursor===null)cursor=goal;
   else cursor=Math.min(z.tick,Math.max(a.tick,cursor+Math.min(Math.max(0,goal-cursor),Math.max(0,now-last)/MS*1.35)));
   last=now;
   let i=1;while(i<frames.length&&frames[i].tick<cursor)i++;
   const q=frames[i]||z, p=frames[i-1]||a;
   const t=q.tick===p.tick?0:(cursor-p.tick)/(q.tick-p.tick);
   return p.p.map((v,j)=>({x:v.x+(q.p[j].x-v.x)*t,y:v.y+(q.p[j].y-v.y)*t}));
  },
  delayMs(){return target?target*MS:null;}
 };
}
