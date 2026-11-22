// Pure offline frame inspector. Uses the same authoritative table and actual
// state exposed by the side-view simulation; no guessed frame advantage.
import {SIDE_FLOOR,SIDE_MOVES,sideHurtbox,sideAttackbox,sidePhase} from './side-engine.mjs';
export function sideDescribe(p){
 const phase=sidePhase(p);
 if(phase==='guard')return p.guardAge<=4?'Guard · deflect window ('+(5-p.guardAge)+' frames remaining)':'Guard · sustained block';
 if(phase==='crouch')return 'Crouching · lower hurtbox';
 if(phase==='airborne')return 'Airborne · '+Math.round(SIDE_FLOOR-p.y)+' units above floor';
 if(phase==='neutral')return 'Neutral · ready';
 const m=SIDE_MOVES[p.act];
 if(!m)throw TypeError('Unknown current action.');
 const remaining=phase==='startup'?m.startup-p.age:phase==='active'?m.startup+m.active-p.age:m.startup+m.active+m.recovery-p.age;
 return (p.act==='hew'?'Heavy':p.act[0].toUpperCase()+p.act.slice(1))+' · '+phase+' · '+Math.max(0,remaining)+' frames left'+(p.spent?' · already connected':'');
}
export function sideContact(s,attacker=0){
 const p=s.p[attacker],q=s.p[1-attacker],a=sideAttackbox(p),h=sideHurtbox(q),phase=sidePhase(p);
 if(!a)return {contact:false,phase,status:'No active attack selected'};
 const overlaps=a.left<h.right&&a.right>h.left&&a.top<h.bottom&&a.bottom>h.top;
 const dodge=q.act==='step'&&q.age>=1&&q.age<8;
 const active=phase==='active'&&!s.ready&&!s.end&&!s.over&&!p.spent;
 const status=phase!=='active'?phase==='startup'?'Windup visible · attack not active':'Recovery · cannot connect':
  !overlaps?'Outside actual hit / hurt intersection':dodge?'Quickstep invulnerable':p.spent?'Already hit this attack':'Hitboxes overlap · contact possible';
 return {contact:active&&overlaps&&!dodge,phase,status};
}
export function sideReadout(s){
 const [a,b]=s.p,gap=Math.max(0,Math.abs(a.x-b.x)-36);
 return {gap:Math.round(gap),distance:Math.round(Math.abs(a.x-b.x)),height:[Math.round(SIDE_FLOOR-a.y),Math.round(SIDE_FLOOR-b.y)],
  fighters:[sideDescribe(a),sideDescribe(b)],contact:[sideContact(s,0),sideContact(s,1)]};
}
