// Display-only DPR/backing-store budget. Canvas world space is always
// 960x540; this module never changes the 60Hz simulation or attack rectangles.
export const SIDE_WORLD_WIDTH=960,SIDE_WORLD_HEIGHT=540;
const limits=Object.freeze({performance:1.35,balanced:2.15,cinematic:2.7});
export const SIDE_MAX_BACKING_PIXELS=Math.ceil(SIDE_WORLD_WIDTH*SIDE_WORLD_HEIGHT*2.7*2.7);
export function chooseSideBacking(cssWidth=960,dpr=1,quality='balanced'){
 const width=Number.isFinite(cssWidth)&&cssWidth>0?cssWidth:960;
 const pixelRatio=Number.isFinite(dpr)&&dpr>0?dpr:1;
 const max=limits[quality]||limits.balanced;
 const scale=Math.round(Math.max(1,Math.min(max,width/SIDE_WORLD_WIDTH*pixelRatio))*100)/100;
 const backingWidth=Math.round(SIDE_WORLD_WIDTH*scale),backingHeight=Math.round(SIDE_WORLD_HEIGHT*scale);
 return {scale,backingWidth,backingHeight};
}
