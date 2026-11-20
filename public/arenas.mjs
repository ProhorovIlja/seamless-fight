// Presentation only: both arenas share engine bounds, spawns and rules.
export const ARENAS=Object.freeze({lantern:'Lantern Court',cistern:'The Drowned Cistern'});
export const arenaId=value=>typeof value==='string'&&Object.hasOwn(ARENAS,value)?value:'lantern';
export function paintCistern(ctx,W,H){
 let seed=82733;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const mist=ctx.createLinearGradient(0,0,0,H);
 mist.addColorStop(0,'#0c131a');mist.addColorStop(.39,'#34454a');mist.addColorStop(1,'#121922');
 ctx.fillStyle=mist;ctx.fillRect(0,0,W,H);
 for(let x=-24;x<W;x+=126){
   ctx.fillStyle='#101b22';ctx.fillRect(x,0,17,112);
   ctx.beginPath();ctx.arc(x+67,63,52,Math.PI,0);ctx.lineTo(x+119,0);ctx.lineTo(x+15,0);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#586463';ctx.lineWidth=3;
   ctx.beginPath();ctx.arc(x+67,63,47,Math.PI,0);ctx.stroke();
   ctx.fillStyle='#829488';ctx.fillRect(x+64,55,5,17);
   const glow=ctx.createRadialGradient(x+66,63,0,x+66,63,36);
   glow.addColorStop(0,'#a0cbbb7a');glow.addColorStop(1,'#a0cbbb00');
   ctx.fillStyle=glow;ctx.fillRect(x+30,27,72,72);
 }
 ctx.fillStyle='#243038';ctx.fillRect(44,85,W-88,H-132);
 for(let y=89,row=0;y<490;y+=22,row++)for(let x=48+row%2*17;x<W-48;x+=34){
   const v=34+Math.floor(random()*10);
   ctx.fillStyle='rgb('+v+','+(v+7)+','+(v+11)+')';ctx.fillRect(x,y,Math.min(31,W-48-x),19);
   ctx.fillStyle='#8daca416';ctx.fillRect(x+1,y,Math.min(28,W-48-x),1);
 }
 ctx.strokeStyle='#69807a';ctx.lineWidth=2;ctx.strokeRect(58,96,W-116,H-151);
 ctx.strokeStyle='#87968b29';
 for(const r of [54,73,105]){ctx.beginPath();ctx.ellipse(W/2,H/2+11,r,r*.65,0,0,Math.PI*2);ctx.stroke();}
 for(let x=12;x<W;x+=24){
   ctx.fillStyle='#88adb629';ctx.fillRect(x,514+random()*15,5+random()*22,1);
 }
}
