// Actual exported Godot 4.7.2 WebGL2 runtime smoke, separate from the
// current playable browser fighting game. This is a renderer-engine trial.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {stat, mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const dir=new URL('../../../artifacts/godot-web/',import.meta.url).pathname;
const base='http://127.0.0.1:19764';
const python=spawn('python3',['-m','http.server','19764','--bind','127.0.0.1','--directory',dir],{stdio:'inherit'});
let browser;
try{
 let alive=false;
 for(let i=0;i<80;i++){
  try{const response=await fetch(base+'/index.html');if(response.ok){alive=true;break;}}catch{}
  await sleep(100);
 }
 assert(alive,'Godot experiment must serve as a real local HTTP page');
 await mkdir('artifacts',{recursive:true});
 const original=await stat(new URL('../../../artifacts/godot-web/index.wasm',import.meta.url));
 assert(original.size>15000000,'Actual Godot WebAssembly runtime missing');
 browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader'
 ]});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push('script: '+e.message));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 const started=performance.now();
 await page.goto(base+'/index.html',{waitUntil:'load',timeout:60000});
 try{
  await page.waitForFunction(()=>document.querySelector('#canvas')?.width>1000&&!document.getElementById('status'),null,{timeout:60000});
 }catch(e){
  const reason=await page.locator('#status-notice').textContent().catch(()=>null);
  throw new Error('Godot 4.7.2 web startup did not complete: '+JSON.stringify({reason,errors,original:original.size,cause:e.message}));
 }
 const ms=Math.round(performance.now()-started);
 const canvas=page.locator('#canvas');
 await canvas.screenshot({path:'artifacts/godot-472-painted-stage-runtime.png'});
 const size=await stat('artifacts/godot-472-painted-stage-runtime.png');
 assert(size.size>40000,'Runtime canvas looks empty or painting is not rendered');
 assert.deepEqual(errors,[],'No failed same-origin assets or fatal scripts');
 console.log(JSON.stringify({result:'GODOT_REAL_WEBGL2_BROWSER_RENDER_PASSED',
  startupMs:ms,wasmBytes:original.size,screenshotBytes:size.size,viewport:'1280x720'}));
}finally{
 await browser?.close();
 python.kill();
}
