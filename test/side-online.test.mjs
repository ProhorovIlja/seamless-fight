import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import WebSocket from 'ws';
import {SIDE_RULESET} from '../public/side-engine.mjs';

test('experimental private side-view socket is authoritative, isolated, bounded and versioned',{timeout:20000},async t=>{
 const probe=createServer().listen(0,'127.0.0.1');await once(probe,'listening');
 const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin},stdio:'inherit'});
 t.after(()=>child.kill());
 let ready=false;
 for(let i=0;i<65;i++){try{ready=(await fetch(origin+'/fight/health')).ok;if(ready)break;}catch{}await sleep(40);}
 assert(ready);
 const socketUrl=origin.replace('http','ws')+'/fight/side/socket';
 const reject=new WebSocket(socketUrl,{origin:'https://invalid.example'});
 const [error]=await once(reject,'error');assert.match(error.message,/403/);
 const connect=async()=>{
  const c=new WebSocket(socketUrl,{origin});t.after(()=>c.terminate());
  const pending=[];c.on('message',raw=>{try{pending.push(JSON.parse(raw.toString()));}catch{}});
  await once(c,'open');
  return {c,send:m=>c.send(JSON.stringify(m)),get:async fn=>{
   for(let k=0;k<260;k++){
    const idx=pending.findIndex(fn);if(idx>=0)return pending.splice(idx,1)[0];await sleep(25);
   }
   throw Error('Side-view server packet timeout');
  }};
 };
 const host=await connect();
 host.send({t:'hello',stage:'cistern',look:{dye:'ivory',sigil:'eye'}});
 const room=await host.get(m=>m.t==='room');
 assert.match(room.code,/^[A-Za-z0-9_-]{12}$/);
 assert.equal(room.slot,0);assert.equal(room.stage,'cistern');assert.equal(room.rules,SIDE_RULESET);
 assert.deepEqual(room.looks[0],{dye:'ivory',sigil:'eye'});
 host.send({t:'ping',id:12345.5});
 assert.equal((await host.get(m=>m.t==='pong')).id,12345.5);
 const guest=await connect();
 guest.send({t:'hello',code:room.code,look:{dye:'garnet',sigil:'moon'}});
 const joined=await guest.get(m=>m.t==='room');
 assert.equal(joined.slot,1);assert.equal(joined.stage,'cistern');assert.equal(joined.rules,SIDE_RULESET);
 assert.deepEqual(joined.looks[1],{dye:'garnet',sigil:'moon'});
 assert.equal((await host.get(m=>m.t==='start')).s.rules,SIDE_RULESET);
 assert.equal((await guest.get(m=>m.t==='start')).s.p.length,2);
 host.send({t:'replay'});
 assert.match((await host.get(m=>m.t==='notice')).message,/unlocks/);
 const baseline=await host.get(m=>m.t==='state'&&m.s.ready===0);
 const start=baseline.s.p[0].x;
 assert.equal(baseline.s.rules,SIDE_RULESET);
 assert.equal(baseline.s.p[1].x,705);
 let seq=1;
 for(let i=0;i<25;i++){
  host.send({t:'input',x:1,y:0,act:'',guard:false,seq:seq++});
  await sleep(17);
 }
 const moved=await host.get(m=>m.t==='state'&&m.ack>=10&&m.s.p[0].x>start+20);
 assert(moved.s.p[0].x>start+20);
 assert.equal(moved.s.p[0].hp,100,'client cannot submit its own health value');
 host.send({t:'input',x:0,y:0,act:'cut',guard:false,seq:seq+1,hp:9999});
 const acknowledged=await host.get(m=>m.t==='state'&&m.ack>=seq+1);
 assert.equal(acknowledged.s.p[0].hp,100);
 host.send({t:'input',x:0,y:0,act:'teleport',guard:false,seq:seq+2});
 await sleep(80);
 const hostClosed=once(host.c,'close');
 guest.c.close();
 const disconnect=await host.get(m=>m.t==='error');
 assert.match(disconnect.message,/disconnected/);
 await hostClosed;
});
