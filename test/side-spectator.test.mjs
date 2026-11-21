import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import WebSocket from 'ws';
import {SIDE_RULESET} from '../public/side-engine.mjs';

test('2.5D private 1v1 duel supports six host-approved read-only public spectators',{timeout:24000},async t=>{
 const probe=createServer().listen(0,'127.0.0.1');await once(probe,'listening');
 const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin='http://127.0.0.1:'+port,wsUrl=origin.replace('http','ws')+'/fight/side/socket';
 const child=spawn(process.execPath,['server.mjs'],{env:{
  ...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin
 },stdio:'ignore'});t.after(()=>child.kill());
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/fight/health')).ok)break;}catch{}await sleep(40);}
 assert((await fetch(origin+'/fight/health')).ok);
 async function connect(){
  const c=new WebSocket(wsUrl,{origin});t.after(()=>c.terminate());
  const pending=[];c.on('message',buf=>{try{pending.push(JSON.parse(buf.toString()));}catch{}});
  await once(c,'open');
  return {c,send:body=>c.send(JSON.stringify(body)),get:async fn=>{
   for(let i=0;i<160;i++){const at=pending.findIndex(fn);
    if(at>=0)return pending.splice(at,1)[0];await sleep(22);}
   throw Error('Expected spectator message never received');
  }};
 }
 const status=async()=> (await (await fetch(origin+'/fight/status.json')).json());
 const listing=async()=> (await (await fetch(origin+'/fight/lobbies.json')).json());
 const host=await connect();host.send({t:'hello',stage:'cistern'});
 const hostRoom=await host.get(m=>m.t==='room');
 assert.equal(hostRoom.slot,0);assert.equal(hostRoom.rules,SIDE_RULESET);
 const roomCode=hostRoom.code;
 assert.deepEqual((await listing()).lobbies,[],'side 1v1 must be private by default');
 const unauthorized=await connect();
 unauthorized.send({t:'watch',code:roomCode});
 assert.match((await unauthorized.get(m=>m.t==='error')).message,/closed or full/);
 host.send({t:'gallery',open:true});
 const gallery=await host.get(m=>m.t==='gallery');
 assert.match(gallery.code,/^[A-Za-z0-9_-]{12}$/);
 assert.notEqual(gallery.code,roomCode);
 let publicRooms=(await listing()).lobbies;
 assert.equal(publicRooms.length,1);
 assert.equal(publicRooms[0].watchCode,gallery.code);
 assert.equal(publicRooms[0].watchPath,'/fight/side/?watch='+gallery.code);
 assert.equal(publicRooms[0].fighters,1);
 assert(!JSON.stringify(publicRooms).includes(roomCode),'private join secret must not appear in public JSON');
 const watcher=await connect();
 watcher.send({t:'watch',code:gallery.code});
 const started=await watcher.get(m=>m.t==='watching');
 assert.equal(started.rules,SIDE_RULESET);
 assert.equal(started.s.p.length,2);
 assert.equal(started.s.tick,0);
 assert.equal(started.viewerCount,1);
 const audience=await host.get(m=>m.t==='audience'&&m.viewers===1);
 assert.equal(audience.limit,6);
 const before=(await status());
 assert.equal(before.connectedClients,3,'host, rejected watcher, and approved viewer are active sockets until close');
 assert.equal(before.spectators,1);
 assert.equal(before.sideDuels,0);
 // No one can use a watch token as the private invite for the second fighter.
 const invalidFighter=await connect();
 invalidFighter.send({t:'hello',code:gallery.code});
 assert.match((await invalidFighter.get(m=>m.t==='error')).message,/invite expired or full/);
 const guest=await connect();
 guest.send({t:'hello',code:roomCode,stage:'cistern'});
 assert.equal((await guest.get(m=>m.t==='room')).slot,1);
 const first=await watcher.get(m=>m.t==='start');
 assert.equal(first.rules,SIDE_RULESET);
 assert.equal(first.s.p.length,2);
 assert.equal((await host.get(m=>m.t==='start')).s.p.length,2);
 assert.equal((await guest.get(m=>m.t==='start')).s.p.length,2);
 await watcher.get(m=>m.t==='state'&&m.s.tick>=3);
 let active=await status();
 assert.equal(active.sideDuels,1);
 assert.equal(active.duels,1);
 assert.equal(active.spectators,1);
 publicRooms=(await listing()).lobbies;
 assert.equal(publicRooms.length,1);
 assert.equal(publicRooms[0].status,'in-progress');
 assert.equal(publicRooms[0].fighters,2);
 // A spectator can transmit a forged input packet, but the server MUST ignore it.
 const spectatorBefore=active.fightersInRooms;
 watcher.send({t:'input',seq:100000,x:1,y:0,act:'hew',guard:true});
 watcher.send({t:'gallery',open:false});
 watcher.send({t:'rematch'});
 watcher.send({t:'replay'});
 await watcher.get(m=>m.t==='state'&&m.s.tick>=6);
 active=await status();
 assert.equal(active.fightersInRooms,spectatorBefore);
 assert.equal(active.sideDuels,1);
 assert.equal((await listing()).publicGalleryCount,1);
 host.send({t:'gallery',open:false});
 assert.equal((await host.get(m=>m.t==='gallery')).code,null);
 assert.match((await watcher.get(m=>m.t==='error')).message,/closed/);
 assert.deepEqual((await listing()).lobbies,[]);
 const post=await status();
 assert.equal(post.spectators,0);
 guest.c.close();
 assert.match((await host.get(m=>m.t==='error')).message,/disconnected/);
});
