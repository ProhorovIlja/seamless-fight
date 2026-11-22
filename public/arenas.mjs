// Presentation only: both arenas share engine bounds, spawns and rules.
export const ARENAS=Object.freeze({lantern:'Lantern Court',cistern:'The Drowned Cistern',reliquary:'Ashen Reliquary'});
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


// Original, deterministic Canvas stage. All decorative detail is behind the
// fighting plane and deliberately subdued for competitive telegraph clarity.
export function paintReliquary(g,W,H){
 const sky=g.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#090e15');sky.addColorStop(.55,'#28303b');sky.addColorStop(1,'#13151c');
 g.fillStyle=sky;g.fillRect(0,0,W,H);
 const halo=g.createRadialGradient(W*.5,68,8,W*.5,68,270);
 halo.addColorStop(0,'#d7c6a75c');halo.addColorStop(.32,'#80786c29');halo.addColorStop(1,'#161b2500');
 g.fillStyle=halo;g.fillRect(0,0,W,300);
 // Cathedral silhouette, rose window and three Gothic vertical bays.
 g.fillStyle='#0e151e';
 for(const x of [70,250,710,890]){
  g.beginPath();g.moveTo(x-29,110);g.lineTo(x-29,24);g.lineTo(x,0);g.lineTo(x+29,24);g.lineTo(x+29,110);g.closePath();g.fill();
 }
 g.strokeStyle='#9b886351';g.lineWidth=2;
 for(const x of [140,480,820]){
  g.beginPath();g.moveTo(x-74,117);g.lineTo(x-74,58);g.quadraticCurveTo(x-74,29,x,8);
  g.quadraticCurveTo(x+74,29,x+74,58);g.lineTo(x+74,117);g.stroke();
  g.strokeStyle='#a9987940';
  g.beginPath();g.moveTo(x,14);g.lineTo(x,112);g.moveTo(x-68,69);g.lineTo(x+68,69);g.stroke();
  g.strokeStyle='#9b886351';
 }
 g.fillStyle='#cdb9897d';g.beginPath();g.arc(W/2,60,26,0,Math.PI*2);g.fill();
 g.strokeStyle='#121a26';g.lineWidth=2;
 for(let r=6;r<26;r+=8){g.beginPath();g.arc(W/2,60,r,0,Math.PI*2);g.stroke();}
 for(let n=0;n<12;n++){const a=n*Math.PI/6;g.beginPath();g.moveTo(W/2,60);g.lineTo(W/2+Math.cos(a)*26,60+Math.sin(a)*26);g.stroke();}
 // The arena uses the same collision boundaries as both other stages.
 g.fillStyle='#1b2029';g.fillRect(44,86,W-88,H-134);
 const floor=g.createLinearGradient(0,90,0,H);
 floor.addColorStop(0,'#292c34');floor.addColorStop(.6,'#1f232b');floor.addColorStop(1,'#14171f');
 g.fillStyle=floor;g.fillRect(48,98,W-96,H-156);
 let seed=0x4ca51c39;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let row=0,y=102;y<H-62;y+=27,row++)for(let x=51+(row%2)*22;x<W-50;x+=44){
  const value=32+Math.floor(random()*15),width=Math.min(41,W-51-x);
  g.fillStyle='rgb('+value+','+(value+2)+','+(value+6)+')';g.fillRect(x,y,width,25);
  g.fillStyle='#c5b59315';g.fillRect(x+2,y+1,Math.max(0,width-4),1);
 }
 g.strokeStyle='#ae966e35';g.lineWidth=1;
 for(let r=37;r<=154;r+=22){g.beginPath();g.ellipse(480,299,r,r*.64,0,0,Math.PI*2);g.stroke();}
 for(let i=0;i<16;i++){const a=i*Math.PI/8;g.beginPath();g.moveTo(480+Math.cos(a)*24,299+Math.sin(a)*15);g.lineTo(480+Math.cos(a)*157,299+Math.sin(a)*102);g.stroke();}
 const torch=(x)=>{
  const glow=g.createRadialGradient(x,138,0,x,138,95);
  glow.addColorStop(0,'#e0bc7266');glow.addColorStop(1,'#e0bc7200');
  g.fillStyle=glow;g.fillRect(x-95,43,190,190);
  g.fillStyle='#0c0e15';g.fillRect(x-3,151,6,52);g.fillStyle='#f2dba0';g.beginPath();g.ellipse(x,140,5,11,0,0,Math.PI*2);g.fill();
 };
 for(const x of [92,868])torch(x);
 g.strokeStyle='#b6a0788c';g.lineWidth=2;g.strokeRect(48,98,W-96,H-156);
 const shade=g.createRadialGradient(W/2,H/2,120,W/2,H/2,540);
 shade.addColorStop(0,'#060a1200');shade.addColorStop(1,'#070a11c9');
 g.fillStyle=shade;g.fillRect(0,0,W,H);
}
