import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import WebSocket from 'ws';

test('side-view 1v1 observer seats cap at six and rematch remains host and guest only',{timeout:24000},async t=>{
 const probe=createServer().listen(0,'127.0.0.1');await once(probe,'listening');
 const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin},stdio:'ignore'});
 t.after(()=>child.kill());
 let ready=false;
 for(let i=0;i<100;i++){try{ready=(await fetch(origin+'/fight/health')).ok;if(ready)break;}catch{}await sleep(40);}
 assert(ready,'Node 1v1 hub must start');
 async function connect(){
  const ws=new WebSocket(origin.replace('http','ws')+'/fight/side/socket',{origin});t.after(()=>ws.terminate());
  const incoming=[];ws.on('message',buf=>{try{incoming.push(JSON.parse(buf.toString()))}catch{}});
  await once(ws,'open');
  return {ws,send:m=>ws.send(JSON.stringify(m)),get:async fn=>{
   for(let i=0;i<160;i++){let index=incoming.findIndex(fn);if(index>=0)return incoming.splice(index,1)[0];await sleep(20);}
   throw Error('Missing expected capped gallery response');
  }};
 }
 const host=await connect();host.send({t:'hello',stage:'reliquary'});
 const fighter=await host.get(m=>m.t==='room');host.send({t:'gallery',open:true});
 const open=await host.get(m=>m.t==='gallery');assert.match(open.code,/^[A-Za-z0-9_-]{12}$/);
 const watchers=[];
 for(let i=0;i<6;i++){
  const c=await connect();c.send({t:'watch',code:open.code});
  const initial=await c.get(m=>m.t==='watching');
  assert.equal(initial.viewerCount,i+1);
  watchers.push(c);
 }
 assert.equal((await (await fetch(origin+'/fight/status.json')).json()).spectators,6);
 assert.equal((await (await fetch(origin+'/fight/lobbies.json')).json()).lobbies.length,0,
  'Full gallery must not be advertised as available');
 const overflow=await connect();overflow.send({t:'watch',code:open.code});
 assert.match((await overflow.get(m=>m.t==='error')).message,/closed or full/);
 const joining=await connect();joining.send({t:'hello',code:fighter.code});
 assert.equal((await joining.get(m=>m.t==='room')).slot,1);
 for(const w of watchers){
  assert.equal((await w.get(m=>m.t==='start')).s.p.length,2);
 }
 const state=await watchers[0].get(m=>m.t==='state'&&m.s.tick>=3);
 assert.equal(state.s.p.length,2);
 watchers[0].ws.close();
 // Earlier audience messages (1..6) can remain buffered in the host client.
 // Do not mistake a stale historical 'viewers: 5' event for proof that the
 // server has processed the actual WebSocket close handshake.
 let roomListing=[];
 for(let i=0;i<120;i++){
  roomListing=(await (await fetch(origin+'/fight/lobbies.json')).json()).lobbies;
  if(roomListing.length===1&&roomListing[0].spectators===5)break;
  await sleep(20);
 }
 assert.equal(roomListing.length,1,'one vacated watch seat must restore public discoverability');
 assert.equal(roomListing[0].watchPath,'/fight/side/?watch='+open.code);
 assert.equal(roomListing[0].spectators,5);
 // No observer may become the third fighter or claim fighter's rematch vote.
 for(const w of watchers.slice(1))w.send({t:'rematch'});
 await sleep(30);
 assert.equal((await (await fetch(origin+'/fight/status.json')).json()).fightersInRooms,2);
 host.send({t:'gallery',open:false});
 assert.equal((await host.get(m=>m.t==='gallery')).code,null);
 for(const w of watchers.slice(1))
  assert.match((await w.get(m=>m.t==='error')).message,/closed/);
});
