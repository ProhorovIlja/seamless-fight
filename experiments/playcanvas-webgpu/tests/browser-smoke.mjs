import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:19765';
const server=spawn('python3',['-m','http.server','19765','--bind','127.0.0.1','--directory','artifacts/playcanvas-webgpu'],{stdio:'inherit'});
let browser;
try{
 let ready=false;
 for(let i=0;i<80;i++){
  try{if((await fetch(base+'/index.html')).ok){ready=true;break;}}catch{}
  await sleep(100);
 }
 assert(ready,'Static GPU test server must start');
 const bundle=await stat('artifacts/playcanvas-webgpu/main.js');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:770}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
 const started=performance.now();
 await page.goto(base+'/index.html');
 await page.waitForFunction(()=>document.getElementById('gpu-canvas')?.dataset.engineReady==='true',null,{timeout:35000});
 await page.locator('#gpu-canvas').screenshot({path:'artifacts/playcanvas-stage-browser-capture.png'});
 const screenshot=await stat('artifacts/playcanvas-stage-browser-capture.png');
 const metrics=await page.evaluate(()=>({gpu:window.__rendererQA?.gpu,ms:window.__rendererQA?.initMs,
   valid:window.__rendererQA?.applyServerSnapshot({
    rules:'seamless-side/1',tick:1,p:[{x:280,y:436,dir:1},{x:680,y:436,dir:-1}]
   }),invalid:window.__rendererQA?.applyServerSnapshot({
    rules:'wrong',tick:2,p:[{x:280,y:436,dir:1},{x:680,y:436,dir:-1}]
   })}));
 assert(['webgl2','webgpu'].includes(metrics.gpu));
 assert.equal(metrics.valid,true);assert.equal(metrics.invalid,false);
 assert(screenshot.size>45000,'Original painting must actually fill the GPU viewport');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PLAYCANVAS_GPU_BROWSER_RENDER_PASSED',
  backend:metrics.gpu,jsBundleBytes:bundle.size,firstGpuReadyMs:Math.round(performance.now()-started),
  appInitMs:metrics.ms,screenshotBytes:screenshot.size}));
}finally{await browser?.close();server.kill();}
