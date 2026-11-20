// Training-only collision diagnostics. This is an honest visualization of
// current engine rules: damage checks the defender's CENTER, not a mesh or
// visual body polygon. It never changes match state or online hit detection.
import {moves} from './engine.mjs';

const TAU=Math.PI*2;
const ANGLE_COS=Object.freeze({shot:.88,cut:.45,hew:.45});
const names=Object.freeze({cut:'Cut',hew:'Heavy',shot:'Pistol'});
export function threatState(s,slot){
 if(!s||!Array.isArray(s.p)||![0,1].includes(slot))throw TypeError('Invalid duel state or slot.');
 const attacker=s.p[slot],defender=s.p[1-slot],move=moves[attacker.act];
 const attack=Boolean(move?.[5]);
 const dx=defender.x-attacker.x,dy=defender.y-attacker.y;
 const distance=Math.hypot(dx,dy),reach=attack?move[4]:0;
 const facing=attack?(dx*attacker.fx+dy*attacker.fy)>=distance*ANGLE_COS[attacker.act]:false;
 const inRange=attack&&distance<=reach&&facing;
 const phase=!attack?'none':attacker.age<move[0]?'startup':attacker.age<move[0]+move[1]?'active':'recovery';
 const active=phase==='active'&&!s.ready&&!s.end&&!s.over;
 const invulnerable=defender.act==='step'&&defender.age>=1&&defender.age<9;
 return {attack,move:attacker.act,phase,active,inRange,invulnerable,
   canHit:active&&!attacker.spent&&inRange&&!invulnerable,
   distance,reach,halfAngle:attack?Math.acos(ANGLE_COS[attacker.act]):0,
   center:{x:attacker.x,y:attacker.y},facingAngle:Math.atan2(attacker.fy,attacker.fx)};
}
export function trainingReadout(s){
 const d=Math.hypot(s.p[0].x-s.p[1].x,s.p[0].y-s.p[1].y);
 const describe=i=>{
  const t=threatState(s,i),who=i?'Cinder':'Veil';
  if(!t.attack)return who+': neutral';
  const contact=t.canHit?'center in hit zone':t.invulnerable?'target evading':t.inRange?'not yet active / already spent':'out of range / angle';
  return who+': '+names[t.move]+' '+t.phase+' · '+contact;
 };
 return 'Center spacing '+Math.round(d)+' arena units · '+describe(0)+' · '+describe(1);
}
export function drawTrainingGeometry(g,s){
 g.save();
 g.lineWidth=1.5;
 for(let i=0;i<2;i++){
  const p=s.p[i],t=threatState(s,i),c=i?'#ffc36b':'#8fc8c0';
  // Center marker matches actual damage target exactly. Body meshes do not.
  g.strokeStyle=c;g.beginPath();g.moveTo(p.x-7,p.y);g.lineTo(p.x+7,p.y);
  g.moveTo(p.x,p.y-7);g.lineTo(p.x,p.y+7);g.stroke();
  const evade=p.act==='step'&&p.age>=1&&p.age<9;
  if(evade){g.strokeStyle='#f5e4c7';g.setLineDash([3,3]);g.beginPath();g.arc(p.x,p.y,19,0,TAU);g.stroke();g.setLineDash([]);}
  if(t.attack&&t.phase!=='recovery'){
   g.save();g.translate(p.x,p.y);g.rotate(t.facingAngle);
   g.strokeStyle=t.active?'#f9bf75':'#bda98a';g.setLineDash(t.active?[]:[5,5]);g.beginPath();
   g.moveTo(0,0);g.arc(0,0,t.reach,-t.halfAngle,t.halfAngle);g.closePath();g.stroke();g.restore();
  }
  g.fillStyle='#f0e2c2';g.font='11px system-ui';g.textAlign='center';
  g.fillText(evade?'EVADE':t.phase==='none'?'CENTER':t.phase.toUpperCase(),p.x,p.y-28);
 }
 g.restore();
}
