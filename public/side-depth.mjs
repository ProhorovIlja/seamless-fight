// Original 2.5D presentation system: side-on fixed combat plane with
// authored multi-depth architecture, bounded cinematic parallax, volumetric
// light, moving scenery and translucent foreground. No input, wall clock,
// particles, camera or decorative shapes feed back into simulation.
import {SIDE_FLOOR} from './side-engine.mjs';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const palette=Object.freeze({
 reliquary:{mist:'#8f736a',glow:'#d6a979',glass:'#b6949f',trim:'#c2a075',sky:'#5a4650'},
 lantern:{mist:'#7b6268',glow:'#edc28a',glass:'#a58b9e',trim:'#c4a77e',sky:'#65445b'},
 cistern:{mist:'#567f91',glow:'#91cbd1',glass:'#739cb0',trim:'#92c6bd',sky:'#3e6b80'}
});
const colors=id=>palette[id]||palette.reliquary;
export const SIDE_DEPTH_QUALITY=Object.freeze(['performance','balanced','cinematic']);
export const SIDE_DEPTH_LIMITS=Object.freeze({
 performance:Object.freeze({dust:0,fog:1,rays:0,chains:2,glimmer:0}),
 balanced:Object.freeze({dust:14,fog:2,rays:2,chains:3,glimmer:5}),
 cinematic:Object.freeze({dust:30,fog:3,rays:4,chains:5,glimmer:13})
});
const tier=id=>SIDE_DEPTH_LIMITS[id]||SIDE_DEPTH_LIMITS.balanced;
export function sideDepthCamera(state){
 const p=state?.p;
 if(!Array.isArray(p)||p.length!==2)return Object.freeze({far:0,mid:0,near:0,focus:480});
 const left=Number.isFinite(p[0]?.x)?p[0].x:480,right=Number.isFinite(p[1]?.x)?p[1].x:480;
 const focus=clamp((left+right)*.5,120,840);
 const shift=focus-480;
 // Canonical +0 avoids needless camera differences in serialized tests.
 return {focus,far:shift===0?0:-shift*.045,mid:shift===0?0:-shift*.095,near:shift===0?0:-shift*.16};
}
function roundedVault(g,cx,top,w,h,stroke){
 g.beginPath();g.moveTo(cx-w/2,top+h);
 g.lineTo(cx-w/2,top+w*.46);
 g.quadraticCurveTo(cx-w/2,top,cx,top-25);
 g.quadraticCurveTo(cx+w/2,top,cx+w/2,top+w*.46);
 g.lineTo(cx+w/2,top+h);
 g.strokeStyle=stroke;g.stroke();
}
function stoneFiligree(g,x,y,w,h,ink){
 g.save();g.translate(x,y);g.strokeStyle=ink;g.lineWidth=1.5;
 g.beginPath();g.rect(0,0,w,h);g.stroke();
 for(let i=1;i<=3;i++){const xx=w*i/4;g.beginPath();g.moveTo(xx,6);g.quadraticCurveTo(xx-17,h*.45,xx+5,h-5);g.stroke();}
 g.beginPath();g.arc(w*.5,h*.35,Math.min(19,w*.19),0,TAU);g.stroke();
 g.restore();
}
export function paintSideDepthStatic(g,stage='reliquary',W=960,H=540){
 const c=colors(stage);g.save();
 // Far tier: pointed galleries and carved buttresses are baked once per stage.
 for(let side=0;side<2;side++){
  const x=side===0?159:801;
  const glass=g.createLinearGradient(x-65,156,x+62,374);
  glass.addColorStop(0,c.sky+'27');glass.addColorStop(.5,c.glass+'62');glass.addColorStop(1,'#080c16ac');
  g.fillStyle=glass;
  g.beginPath();g.moveTo(x-53,380);g.lineTo(x-53,211);
  g.quadraticCurveTo(x-52,167,x,147);
  g.quadraticCurveTo(x+52,167,x+53,211);
  g.lineTo(x+53,380);g.closePath();g.fill();
  g.strokeStyle=c.trim+'98';g.lineWidth=4;g.stroke();
  for(let ray=0;ray<5;ray++){
   const yy=185+ray*39;
   g.strokeStyle=c.trim+'4f';g.lineWidth=2;
   g.beginPath();g.moveTo(x-51,yy);g.lineTo(x+51,yy);g.stroke();
  }
  for(let rib=-1;rib<=1;rib++){
   g.beginPath();g.moveTo(x+rib*25,197);g.lineTo(x+rib*25,378);
   g.strokeStyle=c.trim+'58';g.lineWidth=rib===0?3:1.5;g.stroke();
  }
  roundedVault(g,x,151,112,245,c.trim+'b4');
  stoneFiligree(g,x-34,240,68,113,c.trim+'40');
 }
 // Upper vault and decorative ceiling edge read as a distinct raised plane.
 const top=g.createLinearGradient(0,91,0,168);
 top.addColorStop(0,'#0b1014bd');top.addColorStop(1,'#34303a31');
 g.fillStyle=top;g.fillRect(0,85,W,68);
 g.fillStyle=c.trim+'55';g.fillRect(0,119,W,3);
 for(let i=0;i<17;i++){
  const x=i*64;
  g.fillStyle=i%2?c.trim+'37':'#10161b95';
  g.fillRect(x,126,34,6);
  g.strokeStyle=c.trim+'36';g.lineWidth=2;
  g.beginPath();g.moveTo(x+16,133);g.lineTo(x+6,154);g.lineTo(x+28,154);g.stroke();
 }
 // Long, darker floor perspective lines add visible depth without creating
 // a second playable lane. They remain entirely beneath the simulation floor.
 for(let j=0;j<11;j++){
  const x=j*(W/10);
  g.strokeStyle=j%2?c.trim+'30':'#080c1470';g.lineWidth=j%3?1:2;
  g.beginPath();g.moveTo(x,SIDE_FLOOR+4);g.lineTo(480+(x-480)*1.27,H);g.stroke();
 }
 g.fillStyle=c.glow+'20';g.fillRect(0,SIDE_FLOOR+11,W,2);
 // Stage personalities: inundation line, hanging cenotaphs, reliquary marks.
 if(stage==='cistern'){
  const water=g.createLinearGradient(0,451,0,H);
  water.addColorStop(0,c.glass+'23');water.addColorStop(1,c.glass+'08');
  g.fillStyle=water;g.fillRect(0,450,W,H-450);
  g.strokeStyle=c.glow+'58';
  for(let n=0;n<7;n++){g.beginPath();g.ellipse(90+n*130,482+n%3*15,30+n%3*7,4,0,0,TAU);g.stroke();}
 }else if(stage==='lantern'){
  for(const x of [280,680]){
   stoneFiligree(g,x-21,183,42,92,c.trim+'60');
   g.fillStyle=c.glow+'3d';g.beginPath();g.arc(x,208,17,0,TAU);g.fill();
  }
 }else{
  for(const x of [290,669]){
   g.strokeStyle=c.trim+'51';g.lineWidth=3;roundedVault(g,x,202,70,145,c.trim+'70');
   g.beginPath();g.arc(x,288,14,0,TAU);g.stroke();
   g.beginPath();g.moveTo(x-14,288);g.lineTo(x+14,288);g.moveTo(x,274);g.lineTo(x,302);g.stroke();
  }
 }
 g.restore();
}
function pendulum(g,x,y,t,c,phase,quality){
 const swing=Math.sin(t/1450+phase)*(.06+(quality==='cinematic'?.04:0));
 g.save();g.translate(x,y);g.rotate(swing);
 g.strokeStyle='#0b111a';g.lineWidth=4;g.beginPath();g.moveTo(0,0);g.lineTo(0,85);g.stroke();
 g.strokeStyle=c.trim+'7f';g.lineWidth=1.4;g.beginPath();g.moveTo(0,0);g.lineTo(0,85);g.stroke();
 g.fillStyle='#0d1118';g.beginPath();g.moveTo(-17,85);g.lineTo(17,85);g.lineTo(23,110);g.lineTo(-23,110);g.closePath();g.fill();
 g.strokeStyle=c.trim;g.lineWidth=2;g.stroke();
 g.fillStyle=c.glow+'d0';g.fillRect(-4,88,8,18);
 g.strokeStyle=c.trim+'c0';g.lineWidth=1.8;g.strokeRect(-12,91,24,13);
 g.restore();
}
function rays(g,focus,t,c,count){
 g.save();g.beginPath();g.rect(0,84,960,SIDE_FLOOR-84);g.clip();
 g.globalCompositeOperation='screen';
 for(let i=0;i<count;i++){
  const x=121+i*233,wide=128+i%3*44,drift=Math.sin(t/2300+i)*6;
  const light=g.createLinearGradient(x,125,x+120,420);
  light.addColorStop(0,c.glow+'21');light.addColorStop(.5,c.glow+'0c');light.addColorStop(1,c.glow+'00');
  g.fillStyle=light;g.beginPath();g.moveTo(x-11,119);
  g.lineTo(x+15,119);g.lineTo(x+wide+drift,420);g.lineTo(x-wide*.55+drift,420);
  g.closePath();g.fill();
 }
 g.restore();
}
function floating(g,now,stage,focus,c,amount,reduced){
 const period=stage==='cistern'?38000:26000;
 const tint=stage==='cistern'?'#b5d4db':'#e2b581';
 g.save();
 for(let i=0;i<amount;i++){
  const seed=(Math.imul(i+1,7919)+Math.imul(stage.length,31337))>>>0;
  const drift=reduced?0:now*(.006+(seed%7)*.0019);
  const x=((seed%1081+drift-focus*.04)%1050+1050)%1050-45;
  const y=135+(Math.floor(seed/19)%284)+(reduced?0:Math.sin(now/(950+i*37)+i)*3.3);
  const alpha=(i%4+2)*.028;
  g.fillStyle=tint;g.globalAlpha=alpha;
  g.beginPath();g.arc(x,y,(i%3)*.7+1.1,0,TAU);g.fill();
 }
 g.restore();
}
export function paintSideDepthBack(g,stage='reliquary',now=0,state=null,quality='balanced',reduced=false){
 const c=colors(stage),limit=tier(quality),shift=sideDepthCamera(state);
 g.save();
 // In-plane camera never touches fighters, hitboxes or authoritative state.
 // These gradients drift at different apparent depths.
 for(let i=0;i<limit.fog;i++){
  const t=reduced?0:now*.012;
  const x=400+shift.far*(i+1)+Math.sin(t/640+i*2.1)*86;
  const y=254+i*70,rad=295+i*60;
  const fog=g.createRadialGradient(x,y,0,x,y,rad);
  fog.addColorStop(0,c.mist+(i===0?'12':'0d'));
  fog.addColorStop(1,c.mist+'00');
  g.fillStyle=fog;g.fillRect(0,90,960,SIDE_FLOOR-90);
 }
 if(limit.rays)rays(g,shift.focus, reduced?0:now,c,limit.rays);
 for(let i=0;i<limit.chains;i++){
  const at=limit.chains===2?[100,860][i]:limit.chains===3?[96,480,865][i]:[96,285,480,674,865][i];
  g.save();
  const drift=shift.mid;
  g.translate(drift,0);
  pendulum(g,at,82,reduced?0:now,c,i*1.91,quality);
  g.restore();
 }
 floating(g,now,stage,shift.focus,c,limit.dust,reduced);
 if(quality!=='performance'){
  if(stage==='cistern'){
   // Rain stays behind the collision plane and does not hide silhouettes.
   g.save();g.beginPath();g.rect(0,141,960,279);g.clip();
   g.strokeStyle='#a6dbe873';g.lineWidth=.8;g.globalAlpha=.22;
   for(let i=0;i<(quality==='cinematic'?45:19);i++){
    const seed=(Math.imul(i+13,9419)>>>0);
    const x=(seed%1090+(reduced?0:now*.09))%1050-45;
    const y=141+((Math.floor(seed/71)+(reduced?0:now*.18))%296);
    g.beginPath();g.moveTo(x,y);g.lineTo(x-8,y+25);g.stroke();
   }
   g.restore();
  }else if(stage==='lantern'){
   g.save();g.globalCompositeOperation='screen';
   for(let i=0;i<(quality==='cinematic'?6:3);i++){
    const x=120+i*148+shift.far,yy=177+(i*23)%96;
    const strength=reduced?1:Math.sin(now*.002+i*.9)*.18+1;
    const flame=g.createRadialGradient(x,yy,0,x,yy,23*strength);
    flame.addColorStop(0,'#eabd8660');flame.addColorStop(1,'#eabd8600');
    g.fillStyle=flame;g.fillRect(x-25,yy-25,50,50);
   }
   g.restore();
  }else{
   // Slow, radial refracted reflections from the reliquary rose window.
   g.save();g.globalCompositeOperation='screen';
   const shimmer=reduced?.085:.07+.025*Math.sin(now/1900);
   g.fillStyle='rgba(216,173,138,'+shimmer.toFixed(4)+')';
   for(let i=0;i<5;i++){
    const a=i*TAU/5+Math.PI/10;
    g.beginPath();g.moveTo(480+Math.cos(a)*52,236+Math.sin(a)*52);
    g.lineTo(480+Math.cos(a)*58,236+Math.sin(a)*58);
    g.lineTo(480+Math.cos(a+.15)*84,236+Math.sin(a+.15)*84);
    g.closePath();g.fill();
   }
   g.restore();
  }
 }
 g.restore();
}
export function paintSideDepthFront(g,stage='reliquary',now=0,state=null,quality='balanced',reduced=false){
 const c=colors(stage),limit=tier(quality),camera=sideDepthCamera(state);
 g.save();
 // Close-plane columns appear only at extreme edges so they never hide
 // either actual playable hunter (world X is clamped to 65..895).
 g.fillStyle='#0b1019d9';
 for(const x of [-14,944]){
  const offset=camera.near;
  // Clamp near columns to the non-playable screen margins; even at the
  // strongest parallax shift they cannot cover a legal fighter position.
  const pillarX=x<480?Math.min(0,x+offset):Math.max(931,x+offset);
  g.fillRect(pillarX,195,29,269);
  g.fillStyle=c.trim+'36';g.fillRect(pillarX+4,198,3,262);
  g.fillStyle='#0b1019d9';
 }
 // Stage-specific wet floor and foreground detail below feet only.
 const reflection=g.createLinearGradient(0,SIDE_FLOOR+4,0,540);
 reflection.addColorStop(0,c.glow+'19');reflection.addColorStop(1,c.mist+'00');
 g.fillStyle=reflection;g.fillRect(0,SIDE_FLOOR+4,960,104);
 for(let i=0;i<limit.glimmer;i++){
  const x=(Math.imul(i+7,191)+Math.floor((reduced?0:now)*.007))%928+16;
  const y=SIDE_FLOOR+11+(i*11)%86;
  const w=14+i%5*9;
  g.globalAlpha=.08+(i%3)*.035;
  g.fillStyle=c.glow;
  g.fillRect(x,y,w,1);
 }
 // A thin obscuring foreground mist veil never crosses hunter knees.
 const base=g.createLinearGradient(0,469,0,540);
 base.addColorStop(0,c.mist+'00');base.addColorStop(1,c.mist+'25');
 g.globalAlpha=1;g.fillStyle=base;g.fillRect(0,469,960,71);
 g.restore();
}
