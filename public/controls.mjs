import {queueOptions} from './queue-policy.mjs';
import {outfit} from './wardrobe.mjs';
export const DEFAULT_KEYS={cut:'KeyJ',hew:'KeyK',shot:'KeyL',feint:'KeyI',step:'Space'};
export const DEFAULT_MOVE=Object.freeze({up:'KeyW',left:'KeyA',down:'KeyS',right:'KeyD'});
export const DEFAULT_PAD=Object.freeze({step:1,cut:2,hew:3,shot:5,feint:4});
export const MOUSE_BUTTONS=Object.freeze([0,1,2,3,4]);
export const mouseAction=(mapping,button)=>mapping[button]||'';
export const PAD_LABELS=Object.freeze(['South · A / Cross','East · B / Circle','West · X / Square','North · Y / Triangle','Left bumper','Right bumper','Left trigger','Right trigger']);
const movementKey=code=>typeof code==='string'&&/^Key[A-Z]$/.test(code)&&!['KeyR','KeyT'].includes(code);
export function swapBinding(map,action,value){
 const other=Object.keys(map).find(a=>map[a]===value);
 if(other&&other!==action)map[other]=map[action];
 map[action]=value;
}
export const STORAGE_KEY='seamless-fight.settings.v1';
export const allowed=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Enter|ShiftLeft|ShiftRight)$/.test(code)&&!['KeyW','KeyA','KeyS','KeyD','KeyR','KeyT'].includes(code);
export function settings(raw){
 const keys={...DEFAULT_KEYS}, values=Object.keys(keys).map(a=>raw?.keys?.[a]);
 if(values.every(allowed)&&new Set(values).size===values.length)Object.keys(keys).forEach((a,i)=>keys[a]=values[i]);
 const move={...DEFAULT_MOVE}, directions=Object.keys(move).map(a=>raw?.move?.[a]);
 if(directions.every(movementKey)&&new Set(directions).size===4&&!directions.some(code=>Object.values(keys).includes(code)))Object.keys(move).forEach((a,i)=>move[a]=directions[i]);
 const pad={...DEFAULT_PAD}, buttons=Object.keys(pad).map(a=>raw?.pad?.[a]);
 if(buttons.every(i=>Number.isInteger(i)&&i>=0&&i<PAD_LABELS.length)&&new Set(buttons).size===5)Object.keys(pad).forEach((a,i)=>pad[a]=buttons[i]);
 const clamp=(v,d,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;
 const mouse={}, used=new Set();
 for(const i of MOUSE_BUTTONS){
   const act=raw?.mouse?.[i];
   if(typeof act==='string'&&Object.hasOwn(DEFAULT_KEYS,act)&&!used.has(act)){mouse[i]=act;used.add(act);}
 }
 return {keys,move,pad,mouse,queue:queueOptions(raw?.queue),stick:raw?.stick==='right'?'right':'left',outfit:outfit(raw?.outfit),classic:raw?.classic===true,captions:raw?.captions===true,ghostAuto:raw?.ghostAuto===true,rangeAudio:raw?.rangeAudio===true,centerCues:raw?.centerCues===true,rangeVolume:clamp(raw?.rangeVolume,26,0,100),deadzone:clamp(raw?.deadzone,30,15,65),sfx:clamp(raw?.sfx,65,0,100),ambience:clamp(raw?.ambience,15,0,100),music:clamp(raw?.music,22,0,100),voice:clamp(raw?.voice,35,0,100),reduce:raw?.reduce===true,contrast:raw?.contrast===true};
}
export function samplePad(pad,prior,threshold,bindings=DEFAULT_PAD,stick='left'){
 if(!pad?.connected||pad.mapping!=='standard')return {x:0,y:0,act:'',next:null};
 const down=i=>pad.buttons[i]?.pressed===true;
 let mask=0;for(let i=0;i<PAD_LABELS.length;i++)if(down(i))mask|=1<<i;
 const offset=stick==='right'?2:0;
 const edges=prior?.index===pad.index?mask&~prior.mask:0;
 const axis=n=>Number.isFinite(n)&&Math.abs(n)>=threshold?Math.sign(n):0;
 const dpad=[12,13,14,15].some(down);
 return {x:dpad?+down(15)-down(14):axis(pad.axes[offset]),y:dpad?+down(13)-down(12):axis(pad.axes[offset+1]),act:Object.keys(DEFAULT_PAD).find(a=>edges&(1<<bindings[a]))||'',next:{index:pad.index,mask}};
}

export function touchDirection(dx,dy,radius=34){
 const distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||distance<radius*.24)return {x:0,y:0};
 return {x:Math.abs(dx)/distance>=.383?Math.sign(dx):0,y:Math.abs(dy)/distance>=.383?Math.sign(dy):0};
}
