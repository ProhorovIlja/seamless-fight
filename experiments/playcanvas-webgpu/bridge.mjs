// Authoritative-side-state rendering bridge shared only by the GPU trial.
// No combat decisions, hitboxes, inputs, mouse polling or packet scheduling.
export const SIDE_RULES="seamless-side/1";
export const SIDE_WORLD_WIDTH=960,SIDE_WORLD_HEIGHT=540;
const finite=Number.isFinite;
export function projectFighter2_5D(p){
 if(!p||!finite(p.x)||!finite(p.y)||![-1,1].includes(p.dir)||
   p.x<0||p.x>SIDE_WORLD_WIDTH||p.y<-500||p.y>436)return null;
 return {x:(p.x-480)/60,y:(270-p.y)/60,z:0,rotationY:p.dir===-1?180:0};
}
export function snapshotProjections(snapshot,lastTick=-1){
 if(snapshot?.rules!==SIDE_RULES||!Number.isSafeInteger(snapshot.tick)||
   snapshot.tick<=lastTick||!Array.isArray(snapshot.p)||snapshot.p.length!==2)return null;
 const poses=snapshot.p.map(projectFighter2_5D);
 return poses.every(Boolean)?{tick:snapshot.tick,poses}:null;
}
