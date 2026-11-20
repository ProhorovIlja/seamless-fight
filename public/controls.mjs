import {outfit} from './wardrobe.mjs';
export const DEFAULT_KEYS={cut:'KeyJ',hew:'KeyK',shot:'KeyL',feint:'KeyI',step:'Space'};
export const STORAGE_KEY='seamless-fight.settings.v1';
export const allowed=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Enter|ShiftLeft|ShiftRight)$/.test(code)&&!['KeyW','KeyA','KeyS','KeyD','KeyR','KeyT'].includes(code);
export function settings(raw){
 const keys={...DEFAULT_KEYS}, values=Object.keys(keys).map(a=>raw?.keys?.[a]);
 if(values.every(allowed)&&new Set(values).size===values.length)Object.keys(keys).forEach((a,i)=>keys[a]=values[i]);
 const clamp=(v,d,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;
 return {keys,outfit:outfit(raw?.outfit),classic:raw?.classic===true,captions:raw?.captions===true,deadzone:clamp(raw?.deadzone,30,15,65),sfx:clamp(raw?.sfx,65,0,100),ambience:clamp(raw?.ambience,15,0,100),music:clamp(raw?.music,22,0,100),voice:clamp(raw?.voice,35,0,100),reduce:raw?.reduce===true,contrast:raw?.contrast===true};
}
const buttons=[[1,'step'],[2,'cut'],[3,'hew'],[5,'shot'],[4,'feint']];
export function samplePad(pad,prior,threshold){
 if(!pad?.connected||pad.mapping!=='standard')return {x:0,y:0,act:'',next:null};
 const down=i=>pad.buttons[i]?.pressed===true;
 const mask=buttons.reduce((m,[i])=>m|(down(i)?1<<i:0),0);
 const edges=prior?.index===pad.index?mask&~prior.mask:0;
 const axis=n=>Number.isFinite(n)&&Math.abs(n)>=threshold?Math.sign(n):0;
 const dpad=[12,13,14,15].some(down);
 return {x:dpad?+down(15)-down(14):axis(pad.axes[0]),y:dpad?+down(13)-down(12):axis(pad.axes[1]),act:buttons.find(([i])=>edges&(1<<i))?.[1]||'',next:{index:pad.index,mask}};
}

export function touchDirection(dx,dy,radius=34){
 const distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||distance<radius*.24)return {x:0,y:0};
 return {x:Math.abs(dx)/distance>=.383?Math.sign(dx):0,y:Math.abs(dy)/distance>=.383?Math.sign(dy):0};
}
