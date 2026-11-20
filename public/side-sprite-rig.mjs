// Authored high-resolution character atlas adapter. Unlike the legacy
// procedural prototype, a rig asset is a real sprite sheet with deterministic
// clip/pivot metadata. This module renders only; it never owns collision,
// attack timing, damage, animation authority or prediction.
import {SIDE_FLOOR} from './side-engine.mjs';

export const SIDE_SPRITE_CLIPS=Object.freeze([
 'idle','run','jump','crouch','guard','step','cut','hew','shot','stun','feint'
]);
export const SIDE_SPRITE_MAX_TEXELS=4096*2048; // 32 MiB RGBA8 decode budget
export const SIDE_SPRITE_MAX_FRAMES=400;
const finite=n=>Number.isFinite(n);
const natural=n=>Number.isInteger(n)&&n>=0;
const positive=n=>Number.isInteger(n)&&n>0;
const acceptedSrc=s=>typeof s==='string'&&/^\/fight\/art\/hunters\/[a-z0-9-]+\.webp$/.test(s);
const isPlain=o=>o&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype;

export function validateSideSpriteManifest(raw){
 const problems=[];
 if(!isPlain(raw)){return ['Manifest must be a plain object'];}
 if(raw.version!==1)problems.push('Unsupported sprite manifest version');
 if(typeof raw.character!=='string'||!/^[a-z0-9-]{3,48}$/.test(raw.character))problems.push('Invalid character identifier');
 if(!acceptedSrc(raw.texture))problems.push('Sprite textures must be bundled same-origin WebP');
 const w=raw.width,h=raw.height;
 if(!positive(w)||!positive(h)||w>4096||h>4096||w*h>SIDE_SPRITE_MAX_TEXELS)problems.push('Atlas dimensions exceed the decoded texture budget');
 if(!finite(raw.scale)||raw.scale<.15||raw.scale>3.5)problems.push('Unreasonable sprite world scale');
 if(!isPlain(raw.clips))problems.push('Missing clip list');
 else{
  let count=0;
  for(const key of SIDE_SPRITE_CLIPS){
   const clip=raw.clips[key];
   if(!isPlain(clip)||!Array.isArray(clip.frames)||!clip.frames.length||clip.frames.length>96){
    problems.push('Missing or invalid clip '+key);continue;
   }
   if(typeof clip.loop!=='boolean')problems.push('Clip loop missing for '+key);
   count+=clip.frames.length;
   let ticks=0;
   for(const f of clip.frames){
    if(!isPlain(f)||!natural(f.x)||!natural(f.y)||!positive(f.w)||!positive(f.h)||
       f.x+f.w>w||f.y+f.h>h||!finite(f.px)||!finite(f.py)||
       f.px<0||f.px>f.w||f.py<0||f.py>f.h||
       !positive(f.ticks)||f.ticks>60){
       problems.push('Out-of-bounds frame in '+key);continue;
    }
    ticks+=f.ticks;
   }
   if(ticks>360)problems.push('Too many ticks per '+key+' clip');
  }
  if(count>SIDE_SPRITE_MAX_FRAMES)problems.push('Too many authored frames');
  for(const key of Object.keys(raw.clips))if(!SIDE_SPRITE_CLIPS.includes(key))problems.push('Unexpected animation clip '+key);
 }
 if(typeof raw.license!=='string'||raw.license.length<3||raw.license.length>128)problems.push('Missing license provenance');
 if(typeof raw.creator!=='string'||raw.creator.length<2||raw.creator.length>128)problems.push('Missing artist provenance');
 return problems;
}
export function sideSpriteClip(p,rig){
 if(p.act){
  if(p.act==='guardBreak')return 'stun';
  if(p.act in rig.clips)return p.act;
 }
 if(p.guardAge>0)return 'guard';
 if(p.crouch)return 'crouch';
 if(p.y<SIDE_FLOOR-2)return 'jump';
 return Math.abs(p.vx)>=1.3?'run':'idle';
}
export function sideSpriteFrame(p,rig,now=0){
 const id=sideSpriteClip(p,rig),clip=rig.clips[id];
 if(!clip?.frames?.length)return null;
 const ticks=clip.frames.reduce((n,f)=>n+f.ticks,0);
 // Committed moves advance only with the same authoritative age as attacks;
 // neutral loops use presentation time, not buffered or speculative state.
 const committed=Boolean(p.act)&&id!=='idle'&&id!=='run';
 const elapsed=committed?p.age:Math.max(0,Math.floor(now*60/1000));
 const t=clip.loop?Math.max(0,elapsed)%ticks:Math.min(Math.max(0,elapsed),ticks-1);
 let remaining=t;
 for(const f of clip.frames){if(remaining<f.ticks)return {clip:id,frame:f};remaining-=f.ticks;}
 return {clip:id,frame:clip.frames.at(-1)};
}
export function paintSideSprite(g,p,atlas,rig,now=0){
 if(!rig||!atlas||atlas.naturalWidth!==rig.width||atlas.naturalHeight!==rig.height)return false;
 const result=sideSpriteFrame(p,rig,now);
 if(!result)return false;
 const f=result.frame,scale=rig.scale,dir=p.dir===-1?-1:1;
 g.save();
 g.translate(p.x,p.y);
 g.scale(dir*scale,scale);
 g.drawImage(atlas,f.x,f.y,f.w,f.h,-f.px,-f.py,f.w,f.h);
 g.restore();
 return true;
}
export async function decodeSideSpriteRig(manifest,fetcher=globalThis.fetch,ImageClass=globalThis.Image){
 if(validateSideSpriteManifest(manifest).length)throw TypeError('Invalid authored sprite manifest');
 if(typeof ImageClass!=='function')return null;
 const img=new ImageClass();img.src=manifest.texture;img.decoding='async';
 try{
  if(typeof img.decode==='function')await img.decode();
  else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
  if(img.naturalWidth!==manifest.width||img.naturalHeight!==manifest.height)return null;
  return {manifest,img};
 }catch{return null;}
}
