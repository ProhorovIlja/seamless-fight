// Presentation-only source readout for the actual sf-hunt-lab/3 state.
// Canvas figures are original technical silhouettes, NOT approved final 3D rigs.
// No simulation ticks, hit detection, random sources, networking or game state writes.
import {HUNT_FLOOR,HUNT_W,huntHurtbox,huntAttackbox,huntPhase,huntMoveSpec}
 from './side-hunt-lab.mjs';

const lerp=(a,b,t)=>a+(b-a)*Math.min(1,Math.max(0,t));
function ground(ctx,t){
 ctx.save();
 const g=ctx.createLinearGradient(0,401,0,540);
 g.addColorStop(0,'rgba(10,13,16,0.00)');
 g.addColorStop(.36,'rgba(9,12,16,.54)');
 g.addColorStop(1,'rgba(6,9,13,.91)');
 ctx.fillStyle=g;ctx.fillRect(0,395,HUNT_W,145);
 ctx.strokeStyle='rgba(216,179,125,.19)';ctx.lineWidth=1.1;
 ctx.beginPath();ctx.moveTo(0,HUNT_FLOOR+6);ctx.lineTo(HUNT_W,HUNT_FLOOR+6);ctx.stroke();
 for(let x=-80;x<1040;x+=126){
  ctx.strokeStyle='rgba(178,153,117,.09)';
  ctx.beginPath();ctx.moveTo(x,HUNT_FLOOR+7);ctx.lineTo(x-96,540);ctx.stroke();
 }
 for(let y=HUNT_FLOOR+30;y<=540;y+=27){
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(HUNT_W,y);ctx.stroke();
 }
 ctx.restore();
}
function air(ctx,t,reduce){
 if(reduce)return;
 const time=t*.001;
 ctx.save();ctx.fillStyle='rgba(220,197,159,.18)';
 for(let i=0;i<22;i++){
  const x=((i*137+time*(i%3+1)*6)%1010+1010)%1010-25;
  const y=80+((i*73+Math.sin(time*.23+i*1.8)*11)%330);
  const r=i%5===0?1.65:.8;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function fighter(ctx,p,previous,alpha,t,slot){
 const deltaOk=previous&&previous.weapon===p.weapon&&Math.abs(previous.x-p.x)<70&&
  Math.abs(previous.y-p.y)<75;
 const x=deltaOk?lerp(previous.x,p.x,alpha):p.x;
 const y=deltaOk?lerp(previous.y,p.y,alpha):p.y;
 const weapon=p.form==='unfurled',m=huntMoveSpec(p);
 const phase=huntPhase(p);
 const busy=p.act&&m?.damage>0;
 const theta=busy?phase==='startup'?-1.2:phase==='active'?.12:.55:.35;
 const robe=slot===0?['#1b2732','#34434b','#a08d78']:['#32272c','#49383b','#a58472'];
 const time=t*.001;
 ctx.save();
 ctx.globalAlpha=p.hp<=0?.53:1;
 const shadow=ctx.createRadialGradient(x,HUNT_FLOOR+7,6,x,HUNT_FLOOR+7,83);
 shadow.addColorStop(0,'rgba(0,0,0,.65)');shadow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=shadow;ctx.fillRect(x-87,HUNT_FLOOR-10,174,46);
 ctx.translate(x,y);
 ctx.scale(p.dir,1);
 const sway=Math.sin(time*1.9+slot)*1.1;
 const walk=Math.abs(p.vx)>1.4?Math.sin(p.x*.043)*4:0;
 const airborne=y<HUNT_FLOOR;
 const lay=airborne?-5:0;
 // Legs are separated and articulated, not static rectangular placeholders.
 ctx.fillStyle='#171d25';
 ctx.beginPath();ctx.moveTo(-13,-37+lay);ctx.lineTo(-5,-35+lay);
 ctx.lineTo(-9+walk,1);ctx.lineTo(-23+walk,1);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(7,-38+lay);ctx.lineTo(18,-38+lay);
 ctx.lineTo(20-walk,1);ctx.lineTo(6-walk,1);ctx.closePath();ctx.fill();
 // Trailing jacket panels follow ground/air movement visually only.
 ctx.fillStyle=robe[0];ctx.beginPath();ctx.moveTo(-18,-84+lay);
 ctx.quadraticCurveTo(-33,-48+lay,-30-(p.vx*1.4),0);
 ctx.quadraticCurveTo(4,-15,24+(p.vx*.55),-3);
 ctx.lineTo(24,-83+lay);ctx.closePath();ctx.fill();
 const cloth=ctx.createLinearGradient(-25,-97,28,-26);
 cloth.addColorStop(0,robe[1]);cloth.addColorStop(.62,robe[0]);cloth.addColorStop(1,'#0b1018');
 ctx.fillStyle=cloth;
 ctx.beginPath();ctx.moveTo(-22,-95+lay);ctx.lineTo(20,-96+lay);
 ctx.quadraticCurveTo(32,-60+lay,21,-28+lay);
 ctx.lineTo(-21,-26+lay);ctx.quadraticCurveTo(-28,-56+lay,-22,-95+lay);ctx.fill();
 ctx.strokeStyle=robe[2];ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-20,-88+lay);ctx.lineTo(-10,-67+lay);ctx.lineTo(-11,-31+lay);ctx.stroke();
 // Armor shoulder, hood and original opaque visor.
 ctx.fillStyle='#2d353f';ctx.beginPath();
 ctx.ellipse(-13,-92+lay,15,10,-.2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#151a22';ctx.beginPath();
 ctx.moveTo(-14,-107+lay);ctx.lineTo(-10,-119+lay);ctx.lineTo(9,-120+lay);
 ctx.lineTo(17,-110+lay);ctx.lineTo(16,-99+lay);
 ctx.lineTo(-9,-96+lay);ctx.closePath();ctx.fill();
 ctx.fillStyle='#566470';ctx.beginPath();ctx.moveTo(-12,-112+lay);
 ctx.lineTo(15,-109+lay);ctx.lineTo(12,-102+lay);ctx.lineTo(-8,-105+lay);ctx.closePath();ctx.fill();
 ctx.fillStyle=slot===0?'#d3c18d':'#d69b8d';
 ctx.fillRect(3,-108+lay,10,1.8);
 // Weapon and folded/unbound silhouette share the authoritative source's form.
 ctx.save();ctx.translate(15,-78+lay);ctx.rotate(theta);
 ctx.strokeStyle='#141b24';ctx.lineWidth=8;ctx.beginPath();
 ctx.moveTo(0,0);ctx.lineTo(weapon?92:52,-17);ctx.stroke();
 ctx.strokeStyle='#b3b5b7';ctx.lineWidth=3.1;ctx.beginPath();
 ctx.moveTo(14,-4);ctx.lineTo(weapon?101:60,-20);ctx.stroke();
 ctx.strokeStyle='#e7c999';ctx.lineWidth=1.6;ctx.beginPath();
 ctx.moveTo(weapon?50:42,-13);ctx.lineTo(weapon?106:67,-23);ctx.stroke();
 if(weapon){ctx.strokeStyle='rgba(224,174,145,.59)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(70,-20);ctx.lineTo(111,-45);ctx.stroke();}
 ctx.restore();
 // Firearm, kept in opposite arm, pointed at opponent during shot timing.
 ctx.strokeStyle='#4a5054';ctx.lineWidth=6;ctx.beginPath();
 ctx.moveTo(-6,-83+lay);ctx.lineTo(-19,-70+lay);
 ctx.lineTo(-42,-68+lay);ctx.stroke();
 if(['shot','airShot'].includes(p.act)&&m&&p.age>=m.startup-1&&p.age<=m.startup+3){
  ctx.fillStyle='rgba(255,204,139,.85)';
  ctx.beginPath();ctx.arc(-47,-68+lay,8+(3-Math.min(3,p.age-m.startup+1))*2,0,Math.PI*2);ctx.fill();
 }
 if(p.exposed>0){
  ctx.strokeStyle='rgba(226,98,86,.85)';ctx.lineWidth=2.3;
  ctx.beginPath();ctx.arc(0,-105+lay,25+Math.sin(time*4)*2,0,Math.PI*2);ctx.stroke();
 }
 if(p.rally>0){
  ctx.strokeStyle='rgba(235,178,132,.85)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,-125+lay,15,Math.PI,2*Math.PI);ctx.stroke();
 }
 ctx.restore();
 // Mark gameplay states with legible semantic tags rather than fantasy combo tiers.
 if(p.exposed>0){ctx.textAlign='center';ctx.font='bold 11px system-ui';ctx.fillStyle='#f0a19a';ctx.fillText('VISCERAL OPENING',x,y-150);}
 else if(phase==='startup'&&busy){ctx.textAlign='center';ctx.font='bold 10px system-ui';ctx.fillStyle='#e9d4a9';ctx.fillText('WINDUP',x,y-152);}
}
function drawBoxes(ctx,s){
 for(let i=0;i<2;i++){
  const p=s.p[i];
  const box=huntHurtbox(p);
  ctx.save();ctx.strokeStyle=i===0?'#72d4df':'#df9d78';ctx.fillStyle=i===0?'#3daabb19':'#e6a0801b';
  ctx.lineWidth=1.5;ctx.fillRect(box.left,box.top,box.right-box.left,box.bottom-box.top);
  ctx.strokeRect(box.left,box.top,box.right-box.left,box.bottom-box.top);
  const m=huntMoveSpec(p);
  if(m?.damage&&p.age>=m.startup&&p.age<m.startup+m.active){
   const attack=huntAttackbox(p);
   if(attack){ctx.strokeStyle='#f0d074';ctx.fillStyle='#f0b75836';
    ctx.fillRect(attack.left,attack.top,attack.right-attack.left,attack.bottom-attack.top);
    ctx.strokeRect(attack.left,attack.top,attack.right-attack.left,attack.bottom-attack.top);}
  }
  ctx.restore();
 }
}
export function drawHuntArena(ctx,state,{previous=null,alpha=0,showBoxes=false,time=0,reduceMotion=false}={}){
 if(state?.rules!=='sf-hunt-lab/3'||!Array.isArray(state.p)||state.p.length!==2)
  throw TypeError('Only original Hunt v3 1v1 state can be rendered');
 ctx.clearRect(0,0,HUNT_W,540);
 air(ctx,time,reduceMotion);
 ground(ctx,time);
 fighter(ctx,state.p[0],previous?.p?.[0],alpha,time,0);
 fighter(ctx,state.p[1],previous?.p?.[1],alpha,time,1);
 if(showBoxes)drawBoxes(ctx,state);
 // Score is the true authoritative simulation state, never client-predicted rank.
 ctx.save();ctx.font='bold 12px system-ui';ctx.textAlign='center';
 ctx.fillStyle='rgba(241,218,180,.80)';
 ctx.fillText('ROUND '+state.round+'     '+state.score[0]+' : '+state.score[1],480,28);
 ctx.restore();
}
