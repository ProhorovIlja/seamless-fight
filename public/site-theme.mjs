// Paths are fixed to known artwork from the host site's static export.
const paths={
 crest:'/art/icon-blades.webp',lantern:'/art/icon-lantern.webp',
 divider:'/art/divider.webp',skyline:'/art/skyline-near.webp',helm:'/art/icon-tricorn.webp',
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
 for(const key of ['divider','skyline']){
   const candidate=image(key);
   candidate.decode().then(()=>{root.dataset[key+'Ready']='true';}).catch(()=>{});
 }
 if(win.FontFace&&doc.fonts){
   const face=new win.FontFace('Hunt Garamond','url('+paths.font+')',{display:'swap'});
   face.load().then(font=>{doc.fonts.add(font);root.dataset.huntFont='true';}).catch(()=>{});
 }
 return image('helm');
}
