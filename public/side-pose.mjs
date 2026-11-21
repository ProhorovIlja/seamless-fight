// Secondary 2.5D character pose controls: cosmetic-only sub-frame
// animation. Authoritative movement, hurtboxes, damage and windups remain in
// side-engine.mjs. Can be replaced by 3D-baked character rig frames later.
import {sidePhase} from './side-engine.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function sideVisualPose(p,now=0,reduced=false){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw TypeError('Invalid side-view visual pose.');
 const tick=Number.isFinite(now)?Math.max(0,now):0,phase=sidePhase(p);
 const speed=clamp(Math.abs(p.vx||0)/3.7,0,2.8);
 const action=p.act||'',active=phase==='active';
 const violent=action==='stun'||action==='guardBreak';
 const stride=reduced?0:Math.sin(tick/82+p.x*.009)*clamp(speed,0,1.7);
 const breathing=reduced||p.crouch||violent||action==='step'?0:Math.sin(tick/1050+p.x*.007)*1.25;
 const recoil=action==='shot'&&active?-5:action==='shot'&&phase==='recovery'?-1.5:0;
 const shoulder=action==='hew'&&active?-8:action==='cut'&&active?-4:p.guardAge?3:0;
 const coatTrail=reduced?0:clamp(Math.abs(p.vx||0)*1.35,0,17);
 const flutter= reduced?0:(Math.sin(tick/130+p.x*.018)*.7+Math.sin(tick/240+p.x*.003)*.3)*2.5;
 const blink=!reduced&&!violent&&(Math.floor((tick+Math.round(p.x*5.4))%4310)<115);
 const footBob=reduced||p.y<436||p.crouch||action?0:Math.abs(stride)*.55;
 return {stride,breathing,recoil,shoulder,coatTrail,flutter,blink,footBob,phase};
}
