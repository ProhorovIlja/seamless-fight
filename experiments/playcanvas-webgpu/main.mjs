// Standalone browser-first GPU trial. Does NOT add a second gameplay engine,
// create low-poly substitute characters, or modify existing /fight/ routes.
import * as pc from 'playcanvas';
import {snapshotProjections} from './bridge.mjs';

const start=performance.now();
const canvas=document.querySelector('#gpu-canvas');
const label=document.querySelector('#gpu-backend');
const timing=document.querySelector('#gpu-startup');
try {
 // An explicit preference for WebGPU with engine-managed WebGL2 fallback.
 const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGPU,pc.DEVICETYPE_WEBGL2]});
 const app=new pc.Application(canvas,{graphicsDevice:device});
 app.setCanvasFillMode(pc.FILLMODE_NONE);
 app.setCanvasResolution(pc.RESOLUTION_AUTO);
 // Cache the 3D stage as a single original painted material, not hundreds of
 // dynamically fabricated fake high-poly cathedral meshes.
 const camera=new pc.Entity('LockedSideCamera');
 camera.addComponent('camera',{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:4.5,
   clearColor:new pc.Color(.047,.053,.068),nearClip:.05,farClip:50});
 camera.setPosition(0,0,12);
 app.root.addChild(camera);
 const veil=new pc.Entity('VeilOriginalRigSocket');
 const cinder=new pc.Entity('CinderOriginalRigSocket');
 app.root.addChild(veil);app.root.addChild(cinder);
 const asset=new pc.Asset('Original Painted Reliquary','texture',{url:'./art/reliquary-painted.webp'});
 app.assets.add(asset);
 const load=new Promise((resolve,reject)=>{
   asset.once('load',resolve);asset.once('error',reject);
 });
 app.assets.load(asset);
 await load;
 if(!asset.resource)throw new Error('Painted cathedral source did not decode');
 const material=new pc.StandardMaterial();
 material.diffuseMap=asset.resource;
 material.emissiveMap=asset.resource;
 material.useLighting=false;
 material.update();
 const backdrop=new pc.Entity('OriginalPaintedGothicReliquary');
 backdrop.addComponent('render',{type:'plane',material});
 backdrop.setLocalScale(16,1,9);
 backdrop.setLocalEulerAngles(90,0,0);
 backdrop.setLocalPosition(0,0,-8);
 app.root.addChild(backdrop);
 const initial={rules:'seamless-side/1',tick:0,p:[
  {x:255,y:436,dir:1},{x:705,y:436,dir:-1}
 ]};
 let last=-1;
 function readOnlyState(state){
  const mapped=snapshotProjections(state,last);
  if(!mapped)return false;
  for(let i=0;i<2;i++){
   const socket=i===0?veil:cinder,pose=mapped.poses[i];
   socket.setLocalPosition(pose.x,pose.y,0);
   socket.setLocalEulerAngles(0,pose.rotationY,0);
  }
  last=mapped.tick;
  return true;
 }
 readOnlyState(initial);
 app.start();
 const elapsed=Math.round(performance.now()-start);
 label.textContent='PlayCanvas · '+app.graphicsDevice.deviceType.toUpperCase();
 timing.textContent=' · '+elapsed+' ms JS/asset startup';
 // Expose only read-only metrics and a serializable state bridge for QA.
 Object.defineProperty(window,'__rendererQA',{value:{
  engine:'PlayCanvas',gpu:app.graphicsDevice.deviceType,initMs:elapsed,
  originalPaintingLoaded:true, world:'seamless-side/1',
  applyServerSnapshot:readOnlyState
 }});
 canvas.dataset.engineReady='true';
 canvas.dataset.backend=app.graphicsDevice.deviceType;
} catch (err) {
 label.textContent='GPU renderer unavailable';
 timing.textContent=' · '+String(err.message);
 canvas.dataset.engineReady='failed';
 throw err;
}
