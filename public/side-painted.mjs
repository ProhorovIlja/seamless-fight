// Original manually reviewed painted environments. Use high-resolution
// source art as a backing texture, never a game-state or hitbox input.
// A failed decode reverts to the original 100% self-contained procedural stage.
export const PAINTED_STAGES=Object.freeze({
 reliquary:Object.freeze({src:'/fight/art/reliquary-painted.webp',width:1600,height:900,bytesMax:420000,credit:'Seamless Fight — original generated cathedral painting'})
});
export function checkPaintedStage(img,id='reliquary'){
 const meta=PAINTED_STAGES[id];
 return Boolean(meta&&img&&Number(img.naturalWidth)===meta.width&&Number(img.naturalHeight)===meta.height);
}
export function drawPaintedStage(g,img,id='reliquary',width=960,height=540){
 if(!checkPaintedStage(img,id))return false;
 g.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,0,0,width,height);
 return true;
}
export async function loadPaintedStage(id,ImageConstructor=globalThis.Image){
 const meta=PAINTED_STAGES[id];
 if(!meta||typeof ImageConstructor!=='function')return null;
 const img=new ImageConstructor();
 img.decoding='async';
 img.src=meta.src;
 try{
  if(typeof img.decode==='function')await img.decode();
  else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
  return checkPaintedStage(img,id)?img:null;
 }catch{return null;}
}
// Bounded filmic overlay instead of primitive fake architectural lines over
// commissioned/generated artwork. Everything is presentation-only.
export function paintIllustratedAir(g,now=0,reduced=false,quality='balanced'){
 if(quality==='performance')return;
 const t=reduced?0:now,high=quality==='cinematic';
 g.save();g.beginPath();g.rect(0,92,960,448);g.clip();
 // Slow ground mist stays below chest height.
 const pulse=reduced?1:.88+.12*Math.sin(t/2800);
 const mist=g.createLinearGradient(0,345,0,540);
 mist.addColorStop(0,'rgba(104,113,126,0)');
 mist.addColorStop(.5,'rgba(81,88,101,'+(.052*pulse).toFixed(4)+')');
 mist.addColorStop(1,'rgba(45,55,68,'+(.16*pulse).toFixed(4)+')');
 g.fillStyle=mist;g.fillRect(0,350,960,190);
 const n=high?30:12;
 for(let i=0;i<n;i++){
  const seed=(Math.imul(i+7,2654435761)>>>0);
  const dx=reduced?0:t*(.003+i%3*.003);
  const x=((seed%1101+dx)%1060+1060)%1060-50;
  const y=125+Math.floor(seed/43)%310+(reduced?0:Math.sin(t/(1700+i*51)+i)*5);
  g.globalAlpha=.08+i%4*.035;
  g.fillStyle=i%4===0?'#f0c791':'#d4c8b2';
  g.beginPath();g.arc(x,y,high?1.1+(i%3)*.55:1.1,0,Math.PI*2);g.fill();
 }
 g.restore();
}
