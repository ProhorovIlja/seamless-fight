// Seamless Fight — deterministic input-normalization reference for Hunt v3.
// Device-neutral logic only. OS enumeration and Godot/SDL device support are separate;
// do NOT infer actual hardware certification from these pure data tests.
import {canonicalHuntInput,HUNT_ACTIONS} from './side-hunt-lab.mjs';

export const HUNT_INPUT_SCHEMA='sf-hunt-input-profile/1';
export const HUNT_DEVICE_LAYOUTS=Object.freeze([
 'keyboard-mouse','gamepad','fightstick','leverless','fightpad','accessibility'
]);
export const HUNT_BINDABLE=Object.freeze([
 'left','right','jump','crouch',...HUNT_ACTIONS.filter(x=>x!=='')
]);
export const HUNT_ACTION_PRIORITY=Object.freeze([
 'visceral','shot','step','trick','charge','heavy','light','heal','blood','feint','sync'
]);
const DEFAULT_BINDS=Object.freeze({
 'keyboard-mouse':{
  left:['key:KeyA','key:ArrowLeft'],right:['key:KeyD','key:ArrowRight'],
  jump:['key:Space'],crouch:['key:KeyS','key:ArrowDown'],
  light:['mouse:0'],heavy:['mouse:2'],charge:['key:KeyH'],
  trick:['key:KeyQ'],shot:['key:KeyE'],step:['key:ShiftLeft'],
  visceral:['key:KeyF'],heal:['key:KeyR'],blood:['key:KeyB'],
  feint:['key:KeyT'],sync:['key:KeyG']
 },
 gamepad:{
  left:['pad:dpad-left','pad:left-x-'],right:['pad:dpad-right','pad:left-x+'],
  jump:['pad:south'],crouch:['pad:dpad-down','pad:left-y+'],
  light:['pad:west'],heavy:['pad:north'],charge:['pad:right-trigger'],
  trick:['pad:left-shoulder'],shot:['pad:right-shoulder'],
  step:['pad:east'],visceral:['pad:left-trigger'],heal:['pad:dpad-up'],
  blood:['pad:right-stick'],feint:['pad:left-stick'],sync:['pad:select']
 },
 fightstick:{
  left:['pad:dpad-left','pad:left-x-'],right:['pad:dpad-right','pad:left-x+'],
  jump:['pad:dpad-up'],crouch:['pad:dpad-down'],
  light:['pad:west'],heavy:['pad:north'],charge:['pad:right-trigger'],
  trick:['pad:left-shoulder'],shot:['pad:right-shoulder'],
  step:['pad:south'],visceral:['pad:east'],heal:['pad:left-trigger'],
  blood:['pad:right-stick'],feint:['pad:left-stick'],sync:['pad:select']
 },
 leverless:{
  left:['pad:dpad-left'],right:['pad:dpad-right'],
  jump:['pad:dpad-up'],crouch:['pad:dpad-down'],
  light:['pad:west'],heavy:['pad:north'],charge:['pad:right-trigger'],
  trick:['pad:left-shoulder'],shot:['pad:right-shoulder'],
  step:['pad:south'],visceral:['pad:east'],heal:['pad:left-trigger'],
  blood:['pad:right-stick'],feint:['pad:left-stick'],sync:['pad:select']
 },
 fightpad:{
  left:['pad:dpad-left'],right:['pad:dpad-right'],
  jump:['pad:south'],crouch:['pad:dpad-down'],
  light:['pad:west'],heavy:['pad:north'],charge:['pad:right-trigger'],
  trick:['pad:left-shoulder'],shot:['pad:right-shoulder'],
  step:['pad:east'],visceral:['pad:left-trigger'],heal:['pad:dpad-up'],
  blood:['pad:right-stick'],feint:['pad:left-stick'],sync:['pad:select']
 },
 accessibility:{
  left:['switch:left'],right:['switch:right'],
  jump:['switch:jump'],crouch:['switch:crouch'],
  light:['switch:light'],heavy:['switch:heavy'],charge:['switch:charge'],
  trick:['switch:trick'],shot:['switch:shot'],step:['switch:step'],
  visceral:['switch:visceral'],heal:['switch:heal'],blood:['switch:blood'],
  feint:['switch:feint'],sync:['switch:sync']
 }
});
const prefixFor=layout=>layout==='keyboard-mouse'?['key:','mouse:']:
 layout==='accessibility'?['switch:']:['pad:'];
const legalToken=token=>typeof token==='string'&&token.length>=4&&token.length<=55&&
 /^(?:key:[A-Za-z0-9]+|mouse:[0-4]|pad:[a-z0-9+-]+|switch:[a-z-]+)$/.test(token)&&
 !['key:Escape','key:Enter','key:F1','key:F2','key:F3'].includes(token);
function checkBinds(layout,binds){
 if(!binds||typeof binds!=='object'||Array.isArray(binds))throw TypeError('Input bindings required');
 if(Object.keys(binds).length!==HUNT_BINDABLE.length||
    Object.keys(binds).some(x=>!HUNT_BINDABLE.includes(x)))throw TypeError('Unknown or missing bindable action');
 const taken=new Map();
 for(const action of HUNT_BINDABLE){
  const tokens=binds[action];
  if(!Array.isArray(tokens)||tokens.length<1||tokens.length>4)
   throw TypeError('Each action must have 1–4 physical inputs');
  for(const token of tokens){
   if(!legalToken(token)||!prefixFor(layout).some(x=>token.startsWith(x)))
    throw TypeError('Unsupported device token for '+action);
   if(taken.has(token))throw TypeError('Ambiguous or duplicate physical input '+token);
   taken.set(token,action);
  }
 }
}
export function huntDeviceProfile(layout='keyboard-mouse'){
 if(!HUNT_DEVICE_LAYOUTS.includes(layout))throw TypeError('Unknown input device layout');
 const binds=Object.fromEntries(Object.entries(DEFAULT_BINDS[layout]).map(([k,v])=>[k,[...v]]));
 const profile={schema:HUNT_INPUT_SCHEMA,layout,socd:'neutral',binds};
 validateHuntDeviceProfile(profile);
 return profile;
}
export function validateHuntDeviceProfile(profile){
 if(!profile||typeof profile!=='object'||Array.isArray(profile)||
  Object.keys(profile).sort().join(',')!=='binds,layout,schema,socd'||
  profile.schema!==HUNT_INPUT_SCHEMA||!HUNT_DEVICE_LAYOUTS.includes(profile.layout)||
  profile.socd!=='neutral')throw TypeError('Invalid or unsupported input profile');
 checkBinds(profile.layout,profile.binds);
 return true;
}
export function rebindHuntDeviceProfile(profile,action,tokens){
 validateHuntDeviceProfile(profile);
 if(!HUNT_BINDABLE.includes(action)||!Array.isArray(tokens))throw TypeError('Unknown action or tokens');
 const replacement={
  ...profile,binds:Object.fromEntries(Object.entries(profile.binds).map(([k,v])=>[k,[...v]]))
 };
 replacement.binds[action]=[...tokens];
 validateHuntDeviceProfile(replacement);
 return replacement;
}
export function createHuntInputAdapter(profile=huntDeviceProfile()){
 validateHuntDeviceProfile(profile);
 const bindings=Object.fromEntries(Object.entries(profile.binds).map(([k,v])=>[k,[...v]]));
 const physical=new Set();
 let lastActions=new Set(),tick=0;
 function sample(frame){
  if(!frame||typeof frame!=='object'||Array.isArray(frame)||
   !Array.isArray(frame.down)||frame.down.length>128||
   frame.down.some(x=>!legalToken(x))||
   (frame.connected!==undefined&&typeof frame.connected!=='boolean'))
    throw TypeError('Invalid physical controller sample');
  physical.clear();
  if(frame.connected!==false)for(const x of frame.down)physical.add(x);
  const now=new Set();
  for(const action of HUNT_BINDABLE){
   if(bindings[action].some(x=>physical.has(x)))now.add(action);
  }
  // Neutral SOCD: no last-input advantage for leverless, stick + D-pad or KBM.
  const x=Number(now.has('right'))-Number(now.has('left'));
  const y=Number(now.has('crouch'))-Number(now.has('jump'));
  let act='';
  for(const action of HUNT_ACTION_PRIORITY){
   if(now.has(action)&&!lastActions.has(action)){act=action;break;}
  }
  lastActions=now;tick++;
  return canonicalHuntInput({x,y,act,guard:false});
 }
 function reset(){lastActions.clear();physical.clear();tick=0;}
 return Object.freeze({sample,reset,stats:()=>Object.freeze({tick,layout:profile.layout})});
}
