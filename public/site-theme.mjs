// Paths are fixed to known artwork from the host site's static export.
const paths={
 crest:'/art/icon-blades.webp',lantern:'/art/icon-lantern.webp',
 divider:'/art/divider.webp',skyline:'/art/skyline-near.webp',helm:'/art/icon-tricorn.webp',
 bell:'/art/icon-bell.webp',vial:'/art/icon-vial.webp',skull:'/art/icon-skull.webp',
 far:'/art/skyline-far.webp',moon:'/art/moon.webp',fog:'/art/fog.webp',
 font:'/_next/static/media/e4505858a30c79c2-s.p.0tlhhw_qyyfys.woff2'
};
export function applySiteTheme(doc=document,win=window){
 const root=doc.documentElement;
 if(root.dataset.siteArt!=='on')return null;
 const image=(key,selector)=>{
   const candidate=new win.Image();candidate.decoding='async';candidate.src=paths[key];
   if(selector)candidate.decode().then(()=>{
     const target=doc.querySelector(selector);
     if(target)target.src=candidate.src;
   }).catch(()=>{});
   return candidate;
 };
 image('crest','.duel-crest');image('lantern','.arena-badge img');
 const skyline=image('skyline');
 for(const key of ['divider','skyline']){
   const candidate=key==='skyline'?skyline:image(key);
   candidate.decode().then(()=>{root.dataset[key+'Ready']='true';}).catch(()=>{});
 }
 if(win.FontFace&&doc.fonts){
   const face=new win.FontFace('Hunt Garamond','url('+paths.font+')',{display:'swap'});
   face.load().then(font=>{doc.fonts.add(font);root.dataset.huntFont='true';}).catch(()=>{});
 }
 const helm=image('helm');
 const keys=['far','moon','skyline','fog'];
 const scenes=keys.map(key=>key==='skyline'?skyline:image(key));
 const scenery=Promise.all(scenes.map(candidate=>candidate.decode().then(()=>candidate).catch(()=>null)));
 return {helm,scenery,bell:image('bell'),vial:image('vial'),skull:image('skull')};
}

export function bakeSiteSky(ctx,images,width){
 if(!images.some(Boolean))return false;
 ctx.save();ctx.beginPath();ctx.rect(0,0,width,86);ctx.clip();
 const sky=ctx.createLinearGradient(0,0,0,86);
 sky.addColorStop(0,'#111720');sky.addColorStop(1,'#373843');
 ctx.fillStyle=sky;ctx.fillRect(0,0,width,86);
 const [far,moon,near,fog]=images;
 const city=(image,height,alpha)=>{
   if(!image)return;
   const w=Math.max(width,image.naturalWidth/image.naturalHeight*height);
   ctx.globalAlpha=alpha;ctx.drawImage(image,(width-w)/2,86-height,w,height);
 };
 if(moon){ctx.globalAlpha=.68;ctx.drawImage(moon,width*.69,2,75,75);}
 city(far,104,.75);city(near,72,.91);city(fog,48,.29);
 const shade=ctx.createLinearGradient(0,43,0,86);
 shade.addColorStop(0,'#12151a00');shade.addColorStop(1,'#12151ac4');
 ctx.globalAlpha=1;ctx.fillStyle=shade;ctx.fillRect(0,43,width,43);
 ctx.restore();return true;
}
