import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const origin='http://127.0.0.1:18771', url=origin+'/fight/';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'18771',PUBLIC_ORIGIN:origin},stdio:'inherit'});
let browser;
const errors=[];
async function until(fn,label){
 for(let i=0;i<160;i++){if(await fn())return;await sleep(50);}
 throw Error('Timed out: '+label);
}
try{
 await until(async()=>{try{return (await fetch(url+'health')).ok;}catch{return false;}},'server health');
 browser=await chromium.launch();
 const host=await browser.newPage(), guest=await browser.newPage();
 for(const page of [host,guest]){
   page.on('pageerror',err=>errors.push(err.message));
   page.on('response',res=>{if(res.url().startsWith(url)&&res.status()>=400)errors.push(res.status()+' '+res.url());});
 }
 const status=(page,pattern)=>until(async()=>pattern.test(await page.locator('#status').textContent()),String(pattern));
 let snapshot;
 host.on('websocket',ws=>ws.on('framereceived',frame=>{const m=JSON.parse(frame.payload);if(m.t==='state')snapshot=m.s;}));
 await host.goto(url);
 await host.locator('summary').filter({hasText:'Duel lab'}).click();
 await host.locator('#record').click();
 await host.keyboard.down('ArrowLeft');
 await sleep(300);
 await host.keyboard.up('ArrowLeft');
 await host.keyboard.press('r');
 await status(host,/Recording saved/);
 assert.equal(await host.locator('#script').inputValue(),'custom');
 await host.keyboard.press('t');
 await status(host,/Respond to Cinder/);
 assert(await host.locator('#lab-meter').isVisible());
 await host.locator('#online').click();
 await status(host,/Waiting for an opponent/);
 const invite=await host.locator('#invite').inputValue();
 assert.equal(new URL(invite).origin,origin);
 await guest.goto(invite);
 await status(host,/Online duel/);
 await status(guest,/Online duel/);
 await until(()=>snapshot?.ready===0,'round live');
 const x=snapshot.p[0].x;
 await host.keyboard.down('ArrowRight');
 try{await until(()=>snapshot?.p[0].x>x+12,'authoritative movement from browser keyboard');}
 finally{await host.keyboard.up('ArrowRight');}
 await guest.close();
 await status(host,/Opponent disconnected/);
 assert.deepEqual(errors,[]);
 console.log('Chromium passed: record, replay, browser invites, authoritative movement and disconnect.');
}finally{try{await browser?.close();}finally{server.kill();}}
