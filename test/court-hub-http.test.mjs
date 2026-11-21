import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import WebSocket from 'ws';
import {validateCourtStatus,validatePublicGallery} from '../public/hub.mjs';

test('real English-only Court hub serves honest live 1v1 status and opt-in spectator entry',{timeout:24000},async t=>{
 const probe=createServer().listen(0,'127.0.0.1');
 await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin,NODE_ENV:'development'},
  stdio:'ignore'
 });
 t.after(()=>child.kill('SIGTERM'));
 let ready=false;
 for(let i=0;i<90;i++){
  try{ready=(await fetch(origin+'/fight/health')).ok;if(ready)break;}catch{}
  await sleep(45);
 }
 assert(ready,'reference game process must bind loopback');
 const status=async()=>{const r=await fetch(origin+'/fight/status.json');assert.equal(r.status,200);return r.json();};
 const lobbies=async()=>{const r=await fetch(origin+'/fight/lobbies.json');assert.equal(r.status,200);return r.json();};
 const before=await status();
 assert(validateCourtStatus(before));
 assert.equal(before.connectedClients,0);
 assert.equal(before.duels,0);
 assert.equal(before.publicGalleries.length,0);
 assert.equal(before.uniqueAuthenticatedPlayers,null);
 assert.equal(before.language,'en');
 assert.equal((await fetch(origin+'/fight/status.json')).headers.get('cache-control'),'no-store, max-age=0');
 const lead=await (await fetch(origin+'/fight/leaderboard.json')).json();
 assert.equal(lead.active,false);
 assert.deepEqual(lead.entries,[]);
 assert.equal((await fetch(origin+'/fight/hub/')).status,200);
 const html=await (await fetch(origin+'/fight/hub/')).text();
 assert.match(html,/lang="en"/);
 assert.match(html,/1V1 ONLY/);
 assert.match(html,/not verified unique accounts/);
 assert.doesNotMatch(html,/2v2|2vs2|Team Battle|lang="ru"/i);
 for(const file of ['hub.mjs','hub.css']){
  const asset=await fetch(origin+'/fight/'+file);
  assert.equal(asset.status,200);
  assert(asset.headers.get('content-length')>500);
 }
 const redirect=await fetch(origin+'/fight/hub',{redirect:'manual'});
 assert.equal(redirect.status,308);
 assert.equal(redirect.headers.get('location'),'/fight/hub/');
 const head=await fetch(origin+'/fight/status.json',{method:'HEAD'});
 assert.equal(head.status,200);
 assert.equal((await head.text()).length,0);
 const connect=async()=>{
  const ws=new WebSocket(origin.replace('http','ws')+'/fight/socket',{origin});
  t.after(()=>ws.terminate());
  const msgs=[];
  ws.on('message',buffer=>{try{msgs.push(JSON.parse(buffer.toString()));}catch{}});
  await once(ws,'open');
  return {ws,send:body=>ws.send(JSON.stringify(body)),get:async pred=>{
   for(let i=0;i<140;i++){
    const k=msgs.findIndex(pred);if(k>=0)return msgs.splice(k,1)[0];await sleep(25);
   }
   throw Error('Court packet not received');
  }};
 };
 const host=await connect();
 host.send({t:'hello',arena:'cistern'});
 const room=await host.get(m=>m.t==='room');
 assert.match(room.code,/^[-_a-zA-Z0-9]{12}$/);
 assert.equal((await status()).connectedClients,1);
 const hidden=await lobbies();
 assert.deepEqual(hidden.lobbies,[],'private room must never be listed');
 assert(!JSON.stringify(hidden).includes(room.code));
 host.send({t:'gallery',open:true});
 const open=await host.get(m=>m.t==='gallery');
 assert.match(open.code,/^[-_a-zA-Z0-9]{12}$/);
 assert.notEqual(open.code,room.code);
 const publicList=await lobbies();
 assert.equal(publicList.lobbies.length,1);
 assert.equal(publicList.publicGalleryCount,1);
 assert.equal(publicList.lobbies[0].watchCode,open.code);
 assert.equal(publicList.lobbies[0].fighters,1);
 assert(validatePublicGallery(publicList.lobbies[0]));
 assert(!JSON.stringify(publicList).includes(room.code),'never publish private fighter-join token');
 const watcher=await connect();
 watcher.send({t:'watch',code:open.code});
 assert.equal((await watcher.get(m=>m.t==='watching')).format,'player');
 const watching=await status();
 assert.equal(watching.connectedClients,2);
 assert.equal(watching.spectators,1);
 watcher.send({t:'input',seq:99,x:1,y:0,act:'hew',guard:false}); // read only
 const guest=await connect();
 guest.send({t:'hello',code:room.code});
 assert.equal((await guest.get(m=>m.t==='room')).slot,1);
 const active=await status();
 assert.equal(active.duels,1);
 assert.equal(active.fightersInRooms,2);
 const joined=await lobbies();
 assert.equal(joined.lobbies.length,1);
 assert.equal(joined.lobbies[0].fighters,2);
 assert.equal(joined.lobbies[0].status,'in-progress');
 await watcher.get(m=>m.t==='state'&&m.s.p.length===2);
 host.send({t:'gallery',open:false});
 assert.equal((await host.get(m=>m.t==='gallery')).code,null);
 assert.deepEqual((await lobbies()).lobbies,[]);
 guest.ws.close();
});
