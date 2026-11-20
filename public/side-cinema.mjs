// Local-only cinematic camera and score response. Never delays or writes
// authoritative physics. Camera displacement is ≤4 px and disables itself
// when exact boxes or reduced-motion are requested.
import {SIDE_FLOOR} from './side-engine.mjs';
export const SIDE_SHAKE_MAX=4;
export function sideCameraImpact(effects,now,reduced=false,quality='balanced',boxes=false){
 if(reduced||boxes||quality==='performance'||!Array.isArray(effects))return {x:0,y:0,flash:0};
 let x=0,y=0,flash=0;
 for(let i=Math.max(0,effects.length-6);i<effects.length;i++){
  const e=effects[i],kind=e?.e?.kind,age=now-e?.at;
  if(!['hit','parry','block'].includes(kind)||!Number.isFinite(age)||age<0||age>=170)continue;
  const weight=kind==='parry'?1:kind==='hit'?.73:.19;
  const envelope=(1-age/170)**2,amplitude=SIDE_SHAKE_MAX*weight*envelope*(quality==='cinematic'?1:.75);
  const seed=Number.isFinite(e.e.tick)?e.e.tick:0;
  x+=Math.sin(seed*.79+age*.19+i)*amplitude;
  y+=Math.cos(seed*.41+age*.14+i*2.2)*amplitude*.7;
  flash=Math.max(flash,envelope*(kind==='parry'?.09:kind==='hit'?.045:.012));
 }
 return {x:Math.max(-SIDE_SHAKE_MAX,Math.min(SIDE_SHAKE_MAX,x)),
   y:Math.max(-SIDE_SHAKE_MAX,Math.min(SIDE_SHAKE_MAX,y)),
   flash:Math.min(.11,flash)};
}
export function sideScoreTension(s){
 if(!s?.p||s.p.length!==2||s.ready||s.over||s.end)return 0;
 const [a,b]=s.p,healthy=Math.min(a.hp,b.hp)/100;
 const hpPressure=1- Math.max(0,Math.min(1,healthy));
 const gap=Math.abs(a.x-b.x);
 const close=gap<=126?1:gap<=280?(280-gap)/154:0;
 const time=s.clock<=600?(600-s.clock)/600:0;
 const engaged=Number(a.act==='cut'||a.act==='hew'||a.act==='shot'||b.act==='cut'||b.act==='hew'||b.act==='shot');
 return Math.max(0,Math.min(1,.10+hpPressure*.43+close*.26+time*.13+engaged*.08));
}
export function sideIsFootstep(p){
 return p.y===SIDE_FLOOR&&!p.act&&!p.crouch&&!p.guardAge&&Math.abs(p.vx)>=2.25;
}
