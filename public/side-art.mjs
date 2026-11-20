// Original procedural side-view presentation. World geometry is NEVER
// sampled by combat; every stage uses the same engine floor and attack boxes.
import {SIDE_HZ,SIDE_FLOOR,SIDE_MOVES,sideAttackbox,sideHurtbox,sidePhase} from './side-engine.mjs';
import {dyes,outfit} from './wardrobe.mjs';
const TAU=Math.PI*2;
const palettes={
 lantern:{sky:'#191923',upper:'#38303c',haze:'#745767',stone:'#262630',trim:'#8e7665',light:'#d9b878'},
 cistern:{sky:'#101a24',upper:'#284354',haze:'#436d74',stone:'#222e35',trim:'#79918e',light:'#9dcbd2'},
 reliquary:{sky:'#151924',upper:'#34313a',haze:'#7d685e',stone:'#28262d',trim:'#9d8371',light:'#e3bc85'}
};
export const SIDE_STAGES=Object.freeze({lantern:'Lantern Court',cistern:'Drowned Cloister',reliquary:'Ashen Reliquary'});
const palette=id=>palettes[Object.hasOwn(palettes,id)?id:'lantern'];
const seedFor=id=>id==='cistern'?0x32d116: id==='reliquary'?0x12e3c7:0x71a115;
function random(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function arch(g,x,y,w,h){
 g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y+w*.36);
 g.bezierCurveTo(x,y-w*.08,x+w*.5,y-w*.15,x+w*.5,y);
 g.bezierCurveTo(x+w*.5,y-w*.15,x+w,y-w*.08,x+w,y+w*.36);
 g.lineTo(x+w,y+h);g.closePath();
}
function spire(g,x,roof,height,w){
 g.beginPath();g.moveTo(x-w/2,roof+height);g.lineTo(x-w/2,roof+12);
 g.lineTo(x,roof-19);g.lineTo(x+w/2,roof+12);g.lineTo(x+w/2,roof+height);g.closePath();
}
export function paintSideStage(g,stage='lantern',W=960,H=540){
 const p=palette(stage),rand=random(seedFor(stage));
 g.save();
 const sky=g.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,p.sky);sky.addColorStop(.55,p.upper);sky.addColorStop(1,'#11141d');
 g.fillStyle=sky;g.fillRect(0,0,W,H);
 const glow=g.createRadialGradient(W*.76,104,8,W*.76,104,340);
 glow.addColorStop(0,p.light+'6b');glow.addColorStop(.3,p.haze+'39');glow.addColorStop(1,p.sky+'00');
 g.fillStyle=glow;g.fillRect(0,0,W,390);
 g.fillStyle='#e9dfc5c6';g.beginPath();g.arc(W*.76,105,34,0,TAU);g.fill();
 g.fillStyle=p.upper+'c2';g.beginPath();g.arc(W*.74,98,33,0,TAU);g.fill();
 // Distant crenellated skyline: all widths and window placements are seeded.
 for(let band=0;band<3;band++){
  const floor=342+band*34;
  g.fillStyle=band===0?'#151b29bb':band===1?'#151b26de':'#1a1e28';
  for(let x=-38;x<W+80;){
   const w=24+Math.floor(rand()*45),top=floor-45-rand()*(65+band*10);
   g.fillRect(x,top,w,floor-top);
   if(rand()>.46){spire(g,x+w*.5,top-9,29,w*.6);g.fill();}
   if(band===0){
    g.fillStyle=p.light+'25';
    for(let y=top+16;y<floor-6;y+=18)for(let dx=9;dx<w-4;dx+=13)
      if(rand()>.6)g.fillRect(x+dx,y,2,5);
    g.fillStyle='#151b29bb';
   }
   x+=w+rand()*14;
  }
 }
 // Layer of monumental arches and masonry around the playable flat ground.
 g.fillStyle=p.stone;
 for(let col=0;col<=5;col++){
  const x=col*207-52;
  g.fillRect(x,130,28,298);
  g.fillStyle=p.trim+'4a';g.fillRect(x+2,130,3,294);g.fillRect(x+22,130,2,294);
  g.fillStyle=p.stone;
  g.fillRect(x-9,152,45,13);
 }
 for(let n=0;n<5;n++){
  const x=n*207-25;
  g.fillStyle='#0e141fe8';arch(g,x,168,156,214);g.fill();
  g.strokeStyle=p.trim+'56';g.lineWidth=5;arch(g,x+5,177,147,207);g.stroke();
  g.strokeStyle=p.trim+'2a';g.lineWidth=2;arch(g,x+17,190,123,185);g.stroke();
 }
 // Rose window and tall Gothic cut-stone tracery at eye-level.
 const wx=W*.5,wy=236;
 g.fillStyle='#0a1016d9';g.beginPath();g.arc(wx,wy,66,0,TAU);g.fill();
 g.strokeStyle=p.light+'7e';g.lineWidth=3;g.beginPath();g.arc(wx,wy,62,0,TAU);g.stroke();
 for(let i=0;i<12;i++){
  const a=TAU*i/12;
  g.strokeStyle=p.light+(i%3?'51':'94');g.lineWidth=2;
  g.beginPath();g.moveTo(wx+Math.cos(a)*15,wy+Math.sin(a)*15);
  g.lineTo(wx+Math.cos(a)*60,wy+Math.sin(a)*60);g.stroke();
 }
 for(let ring=22;ring<=55;ring+=16){
  g.beginPath();g.arc(wx,wy,ring,0,TAU);g.strokeStyle=p.trim+'5a';g.stroke();
 }
 // Full-size flat 2D platform and its handcrafted repeatable stone pattern.
 const stone=g.createLinearGradient(0,SIDE_FLOOR,0,H);
 stone.addColorStop(0,'#45404a');stone.addColorStop(.15,p.stone);stone.addColorStop(1,'#0a0d13');
 g.fillStyle=stone;g.fillRect(0,SIDE_FLOOR,W,H-SIDE_FLOOR);
 g.fillStyle=p.light+'56';g.fillRect(0,SIDE_FLOOR,W,3);
 g.fillStyle='#080d13';g.fillRect(0,SIDE_FLOOR+9,W,4);
 for(let row=0,y=SIDE_FLOOR+14;y<H;y+=22,row++){
  for(let x=-(row%2)*33;x<W;x+=66){
   const variation=Math.floor(rand()*10);
   g.fillStyle='rgba('+(35+variation)+','+(34+variation)+','+(43+variation)+',.68)';
   g.fillRect(x+2,y,62,20);
   g.fillStyle=p.trim+'33';g.fillRect(x+6,y+3,22+rand()*28,1);
   if(rand()>.76){g.strokeStyle='#080a12a0';g.lineWidth=1;g.beginPath();g.moveTo(x+11,y+1);g.lineTo(x+23,y+8);g.lineTo(x+18,y+17);g.stroke();}
  }
 }
 // Decorative old-gold lamp light stays behind the fighter silhouettes.
 for(const x of [90,870]){
  const lamp=g.createRadialGradient(x,314,0,x,314,152);
  lamp.addColorStop(0,p.light+'5a');lamp.addColorStop(1,p.light+'00');
  g.fillStyle=lamp;g.fillRect(x-152,162,304,304);
  g.strokeStyle='#080d14';g.lineWidth=8;g.beginPath();g.moveTo(x,319);g.lineTo(x,395);g.stroke();
  g.fillStyle=p.light;g.beginPath();g.ellipse(x,303,6,13,0,0,TAU);g.fill();
  g.strokeStyle=p.trim;g.lineWidth=3;g.strokeRect(x-11,290,22,35);
 }
 const shade=g.createRadialGradient(W*.5,H*.5,130,W*.5,H*.5,650);
 shade.addColorStop(0,'#03040a00');shade.addColorStop(1,'#03040aba');
 g.fillStyle=shade;g.fillRect(0,0,W,H);
 g.restore();
}
export function paintSideWeather(g,now,stage,reduced=false){
 if(reduced)return;
 const color=stage==='cistern'?'#b5d8de':'#e6b984';
 g.save();
 for(let j=0;j<22;j++){
  const x=(j*163.7+now*(j%3?-.008:.011)+960)%960;
  const y=124+(j*79)%292,alpha=.12+.18*(.5+.5*Math.sin(now/940+j*2));
  g.fillStyle=color;g.globalAlpha=alpha;
  g.fillRect(x,y,j%4?1.5:2.5,j%4?1.5:2.5);
 }
 g.restore();
}
function polygon(g,vertices){g.beginPath();vertices.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();}
function segment(g,x,y,x2,y2,w,stroke){g.lineWidth=w;g.strokeStyle=stroke;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();}
function swordAngle(p){
 const m=SIDE_MOVES[p.act],phase=sidePhase(p);
 if(p.act==='hew'){
  if(phase==='startup')return -1.2+Math.min(1,p.age/m.startup)*-.4;
  if(phase==='active')return -1.6+Math.min(1,(p.age-m.startup)/m.active)*2.75;
  return .35;
 }
 if(p.act==='cut'){
  if(phase==='startup')return -.7+Math.min(1,p.age/m.startup)*-.5;
  if(phase==='active')return -1.2+Math.min(1,(p.age-m.startup)/m.active)*2.05;
 }
 return -.25;
}
export function paintSideFighter(g,p,look={},now=0,reduced=false,contrast=false){
 const spec=outfit(look),[,cloth,trim]=dyes[spec.dye],phase=sidePhase(p);
 const moving=Math.min(1,Math.abs(p.vx)/3.7),swing=(!reduced&&phase==='neutral')?Math.sin(now/85+p.x*.005)*moving:0;
 const crouch=p.crouch?27:0,leap=SIDE_FLOOR-p.y,step=p.act==='step';
 const blade=p.act==='cut'||p.act==='hew',active=blade&&phase==='active';
 const stun=p.act==='stun'||p.act==='guardBreak',guard=p.guardAge>0;
 const coatLift=reduced?0:Math.min(13,Math.abs(p.vx)*1.25);
 g.save();
 // Dynamic shadow at true feet, even when the hunter is airborne.
 g.fillStyle='#05070d8a';g.beginPath();g.ellipse(p.x,SIDE_FLOOR+3,29+leap*.1,6+leap*.035,0,0,TAU);g.fill();
 g.translate(p.x,p.y);g.scale(p.dir,1);
 if(step&&!reduced)for(let n=3;n>=1;n--){
  g.globalAlpha=.045+n*.03;g.fillStyle=trim;g.beginPath();g.ellipse(-n*19,-64,21,54,0,0,TAU);g.fill();
 }
 g.globalAlpha=1;
 // Back leg, boot, trouser, back hand.
 const knees=crouch?16:0;
 segment(g,-7,-50+crouch,-13+swing*6,-22+knees,10,'#0d1019');
 segment(g,-13+swing*6,-22+knees,-19+swing*8,0,13,'#12141e');
 segment(g,-19+swing*8,-2,-10+swing*8,1,6,'#3f3330');
 g.strokeStyle=trim;g.lineWidth=2;g.beginPath();g.moveTo(-19+swing*8,-6);g.lineTo(-9+swing*8,-5);g.stroke();
 // Long forked coat, with perspective folds; the side outline stays coherent.
 g.fillStyle='#121319';
 polygon(g,[[-20,-96+crouch],[-8,-112+crouch],[19,-97+crouch],[26,-62+crouch],[31+coatLift,-6],[6,-11],[-6+coatLift,-1],[-24,-17]]);
 g.fill();
 g.fillStyle=cloth;
 polygon(g,[[-19,-91+crouch],[-7,-104+crouch],[18,-91+crouch],[19,-58+crouch],[23+coatLift,-13],[7,-16],[-7+coatLift,-5],[-21,-17]]);
 g.fill();
 g.fillStyle=trim+'8a';
 polygon(g,[[10,-88+crouch],[20,-70+crouch],[23+coatLift,-13],[14+coatLift,-15],[7,-63+crouch]]);g.fill();
 // Chest armor in brass/silver. Ridges stay below hand/weapon rendering.
 const plate=g.createLinearGradient(-17,0,18,0);
 plate.addColorStop(0,'#252932');plate.addColorStop(.52,'#565260');plate.addColorStop(1,'#24242e');
 g.fillStyle=plate;polygon(g,[[-13,-102+crouch],[10,-104+crouch],[22,-80+crouch],[13,-60+crouch],[-14,-68+crouch]]);
 g.fill();
 g.strokeStyle=contrast?'#f2e0ad':trim;g.lineWidth=2;g.stroke();
 segment(g,-9,-89+crouch,13,-83+crouch,3,'#b1a394');
 segment(g,-6,-67+crouch,16,-70+crouch,3,'#9b7757');
 g.fillStyle='#080c12';g.fillRect(-12,-61+crouch,31,9);
 g.fillStyle=trim;g.fillRect(6,-61+crouch,4,10);
 // Front leg and boot.
 segment(g,7,-52+crouch,10-swing*7,-26+knees,13,'#151924');
 segment(g,10-swing*7,-26+knees,17-swing*8,-3,13,'#212331');
 segment(g,17-swing*8,-2,29-swing*8,0,7,'#514039');
 g.strokeStyle=trim;g.lineWidth=2;g.beginPath();g.moveTo(17-swing*8,-5);g.lineTo(28-swing*8,-4);g.stroke();
 // Back collar, scarf, side profile, pale face and one luminous eye.
 g.fillStyle='#161b23';polygon(g,[[-12,-106+crouch],[-10,-123+crouch],[2,-132+crouch],[18,-115+crouch],[10,-102+crouch]]);g.fill();
 g.fillStyle='#afa498';g.beginPath();g.ellipse(4,-123+crouch,11,14,0,0,TAU);g.fill();
 g.fillStyle='#37313a';polygon(g,[[8,-130+crouch],[15,-126+crouch],[17,-120+crouch],[11,-114+crouch],[6,-115+crouch]]);g.fill();
 g.fillStyle=stun?'#ffe3a0':'#b7e6df';g.fillRect(9,-123+crouch,3,2);
 // Hunter's broad side-on hat with taper, layered band and nose-brim.
 g.fillStyle='#090d14';polygon(g,[[-17,-135+crouch],[-8,-153+crouch],[4,-158+crouch],[16,-143+crouch],[26,-135+crouch],[20,-133+crouch],[-17,-131+crouch]]);g.fill();
 g.strokeStyle=trim;g.lineWidth=2;g.beginPath();g.moveTo(-8,-144+crouch);g.lineTo(16,-141+crouch);g.stroke();
 polygon(g,[[-23,-133+crouch],[26,-136+crouch],[31,-131+crouch],[-15,-129+crouch]]);g.fillStyle='#181b22';g.fill();
 g.strokeStyle=contrast?'#f4dca5':trim+'a5';g.lineWidth=1.5;g.stroke();
 // Forearm stays readable as it drives the blade or pistol.
 const armY=-90+crouch,ang=swordAngle(p),raise=blade?(active?12:16):guard?-2:0;
 segment(g,12,armY,25,armY+14-raise,12,'#12151d');
 segment(g,12,armY,25,armY+14-raise,5,trim);
 if(p.act==='shot'){
  segment(g,25,armY+14,46,armY+7,9,'#14161d');
  segment(g,32,armY+9,60,armY+9,5,'#bdab96');
  g.fillStyle='#d0b17b';g.fillRect(37,armY+4,16,3);
  if(phase==='active'&&!reduced){
   const flare=g.createRadialGradient(66,armY+8,0,66,armY+8,25);
   flare.addColorStop(0,'#fff2c9e6');flare.addColorStop(.35,'#e9ad648c');flare.addColorStop(1,'#e9ad6400');
   g.fillStyle=flare;g.fillRect(41,armY-17,50,50);
   g.strokeStyle='#ffe3b4';g.lineWidth=2;g.beginPath();g.moveTo(64,armY+8);g.lineTo(85,armY+4);g.stroke();
  }
 }else{
  // A real articulated sword originates from the front hand rather than
  // from the fighter's world center or the camera.
  const hx=30,hy=armY+12-raise,reach=p.act==='hew'?82:71;
  const tipX=hx+Math.cos(ang)*reach,tipY=hy+Math.sin(ang)*reach;
  segment(g,hx,hy,tipX,tipY,7,'#090d15');
  segment(g,hx+Math.cos(ang)*12,hy+Math.sin(ang)*12,tipX,tipY,3,active?'#f6d79f':'#c5cbd0');
  segment(g,hx-4,hy-6,hx+8,hy+6,5,'#95795c');
  if(active&&!reduced){
   g.strokeStyle=p.act==='hew'?'#e5ab73a8':'#f8e7cbb0';g.lineWidth=p.act==='hew'?8:5;
   g.beginPath();g.arc(hx,hy,reach,ang-.65,ang+.22);g.stroke();
   g.strokeStyle='#fff3d98c';g.lineWidth=2;g.beginPath();g.arc(hx,hy,reach+8,ang-.5,ang+.08);g.stroke();
  }
 }
 if(guard){
  g.strokeStyle='#dfc18b';g.lineWidth=2;g.beginPath();g.ellipse(12,-80+crouch,26,42,-.2,0,TAU);g.stroke();
  g.strokeStyle='#dfc18b4c';g.beginPath();g.ellipse(12,-80+crouch,31,47,-.2,0,TAU);g.stroke();
 }
 if(spec.sigil!=='none'){
  g.strokeStyle='#efddb9';g.lineWidth=1.5;
  if(spec.sigil==='moon'){g.beginPath();g.arc(-3,-83+crouch,6,-1.4,1.4);g.stroke();}
  else if(spec.sigil==='lantern'){g.strokeRect(-8,-89+crouch,9,12);}
  else if(spec.sigil==='eye'){g.beginPath();g.ellipse(-3,-84+crouch,8,4,0,0,TAU);g.stroke();}
  else if(spec.sigil==='crown'){polygon(g,[[-10,-80+crouch],[-9,-87+crouch],[-5,-83+crouch],[-2,-90+crouch],[2,-83+crouch],[6,-87+crouch],[7,-80+crouch]]);g.stroke();}
  else {segment(g,-8,-89+crouch,0,-78+crouch,2,'#efddb9');segment(g,-8,-78+crouch,0,-89+crouch,2,'#efddb9');}
 }
 if(contrast){
  g.strokeStyle='#e5d7bc';g.lineWidth=1.2;g.beginPath();g.ellipse(0,-88+crouch,22,51,0,0,TAU);g.stroke();
 }
 g.restore();
}
export function drawSideTraining(g,s){
 g.save();g.font='12px ui-monospace,monospace';g.lineWidth=1.5;
 for(let i=0;i<2;i++){
  const p=s.p[i],h=sideHurtbox(p),a=sideAttackbox(p),phase=sidePhase(p);
  g.strokeStyle=i?'#f3b68b':'#9ae1d6';g.setLineDash([4,3]);
  g.strokeRect(h.left,h.top,h.right-h.left,h.bottom-h.top);
  g.setLineDash([]);
  if(a&&phase!=='recovery'){
   g.strokeStyle=phase==='active'?'#ffe19d':'#bba480';
   g.strokeRect(a.left,a.top,a.right-a.left,a.bottom-a.top);
  }
  g.fillStyle='#f2dfbd';g.textAlign='center';g.fillText(phase.toUpperCase(),p.x,p.y-167);
 }
 g.restore();
}
export function drawSideHUD(g,s,local=0){
 g.save();g.textBaseline='middle';
 for(let i=0;i<2;i++){
  const x=i?597:19,p=s.p[i],flip=i===1;
  g.fillStyle='#10141de8';g.fillRect(x,10,344,65);
  g.strokeStyle='#b69b747a';g.lineWidth=1.5;g.strokeRect(x+.5,10.5,343,64);
  g.textAlign=flip?'right':'left';g.fillStyle='#ecdcbf';g.font='bold 17px Georgia';
  g.fillText((i?'CINDER':'VEIL')+(i===local?'  • YOU':''),flip?x+326:x+18,30);
  const yy=43,xx=x+16,w=312;
  g.fillStyle='#3d2b36';g.fillRect(xx,yy,w,12);
  g.fillStyle=i?'#d89079':'#a0c9bd';const hp=w*s.p[i].hp/100;
  g.fillRect(flip?xx+w-hp:xx,yy,hp,12);
  g.fillStyle='#c9a76e';g.fillRect(xx,60,w*s.p[i].st/100,4);
  for(let n=0;n<3;n++){
   g.fillStyle=n<p.ammo?'#e3bd78':'#4e3e46';
   g.fillRect(flip?xx+10+n*13:xx+w-45+n*13,66,9,4);
  }
  g.fillStyle='#e9ddc8';g.font='11px ui-monospace,monospace';g.textAlign=flip?'left':'right';
  g.fillText(Math.ceil(p.hp)+' HP',flip?xx:xx+w,50);
 }
 const secs=Math.ceil(s.clock/SIDE_HZ);
 g.fillStyle='#10151de9';g.fillRect(417,9,126,63);
 g.strokeStyle='#b69b7485';g.strokeRect(417.5,9.5,125,62);
 g.fillStyle=secs<10?'#ffb48f':'#ebdcc2';g.textAlign='center';
 g.font='bold 28px Georgia';g.fillText(String(secs),480,38);
 g.font='11px ui-monospace,monospace';g.fillText('ROUND '+s.round+'  ·  '+s.score.join(' : '),480,62);
 g.restore();
}
export function drawSideImpact(g,event,life,reduced=false){
 if(!event||life<=0)return;
 g.save();g.translate(event.x,event.y);
 const r=10+(1-life)*25;
 g.globalAlpha=reduced?.7:Math.min(1,life+.1);
 g.strokeStyle=event.kind==='parry'?'#a7e8e3':event.kind==='block'?'#c7a46c':'#f5c38f';
 g.lineWidth=event.kind==='hit'?3:2;
 g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();
 if(!reduced)for(let i=0;i<9;i++){
  const a=i*TAU/9+event.tick*.17,rr=r+5+i%3*4;
  g.beginPath();g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);
  g.lineTo(Math.cos(a)*(rr+life*12),Math.sin(a)*(rr+life*12));g.stroke();
 }
 g.restore();
}
