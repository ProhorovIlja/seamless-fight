import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITY_SCHEMA,ACTIVITY_MODE,MAX_PUBLIC_GALLERIES,
 projectFightActivity,projectRankedUnavailable} from '../server/public-activity.mjs';
import {HUB_SCHEMA,HUB_LANGUAGE,HUB_DUEL_SIZE,validateCourtStatus,validatePublicGallery}
 from '../public/hub.mjs';
const code='123456789abc';
const fake=(over=false)=>({
 code:'PRIVATE12345',watchCode:code,arena:'cistern',format:'player',queued:false,
 peers:[{},{}],viewers:new Set(),s:{over},at:55
});
const project=(r=fake())=>projectFightActivity({
 rooms:new Map([['secret',r]]),
 galleries:new Map([[code,r]]),queued:0,mainConnections:2,
 sideStats:{rooms:0,clients:0,duels:0,fighters:0}
});
test('only 1v1 public opt-in gallery codes appear; private room join codes never leak',()=>{
 const r=fake(),p=project(r);
 assert.equal(ACTIVITY_SCHEMA,HUB_SCHEMA);
 assert.equal(ACTIVITY_MODE,'1v1');
 assert.equal(HUB_LANGUAGE,'en');
 assert.equal(HUB_DUEL_SIZE,2);
 assert.equal(MAX_PUBLIC_GALLERIES,32);
 assert.equal(p.publicGalleryCount,1);
 assert.equal(p.publicGalleries.length,1);
 assert(validatePublicGallery(p.publicGalleries[0]));
 assert.equal(p.publicGalleries[0].watchPath,'/fight/?watch='+code);
 assert.equal(p.publicGalleries[0].status,'in-progress');
 assert.equal(p.duels,1);
 assert.equal(p.connectedClients,2);
 assert.equal(p.uniqueAuthenticatedPlayers,null);
 assert.equal(p.ranked.available,false);
 assert.equal(p.friends.available,false);
 assert(validateCourtStatus(p));
 assert(!JSON.stringify(p).includes('PRIVATE12345'));
 assert(!JSON.stringify(p).includes('192.168.'));
 const hidden=projectFightActivity({
  rooms:new Map([['secret',r]]),galleries:new Map(),queued:0,
  mainConnections:2,sideStats:{rooms:0,duels:0,clients:0,fighters:0}
 });
 assert.equal(hidden.publicGalleryCount,0);
 assert.equal(hidden.mainRooms,1,'private room still counts toward game resource telemetry');
});
test('gallery listings remain read-only, stop when hosts revoke or spectator capacity filled',()=>{
 const r=fake();
 r.viewers=new Set([1,2,3,4,5,6]);
 assert.equal(project(r).publicGalleryCount,0,'no watchers may exceed 6 slots');
 r.viewers.delete(6);
 assert.equal(project(r).publicGalleries[0].spectators,5);
 r.watchCode=null;
 assert.equal(project(r).publicGalleryCount,0);
 r.watchCode=code;
 r.queued=true;
 assert.equal(project(r).publicGalleryCount,0);
 r.queued=false;
 r.peers=[{}];
 assert.equal(project(r).publicGalleries[0].status,'waiting');
 r.peers.push({});
 r.s.over=true;
 assert.equal(project(r).publicGalleries[0].status,'complete');
});
test('online player activity counts active sockets and side rooms, never unique accounts',()=>{
 const a=fake(),b={...fake(),watchCode:null,peers:[{}],viewers:new Set()};
 const p=projectFightActivity({
  rooms:new Map([['a',a],['b',b]]),galleries:new Map([[code,a]]),
  queued:3,mainConnections:7,sideStats:{clients:6,rooms:4,duels:2,fighters:6}
 });
 assert.equal(p.connectedClients,13);
 assert.equal(p.fightersInRooms,9);
 assert.equal(p.mainRooms,2);
 assert.equal(p.mainDuels,1);
 assert.equal(p.sideDuels,2);
 assert.equal(p.duels,3);
 assert.equal(p.waitingLobbies,1);
 assert.equal(p.queuedConnections,3);
 assert.equal(p.uniqueAuthenticatedPlayers,null);
 assert(validateCourtStatus(p));
 assert.equal(p.publicGalleries.length,1);
});
test('reject malformed or leaked spectator URLs and fabricated ranked tables',()=>{
 const p=project();
 assert.equal(validatePublicGallery({...p.publicGalleries[0],watchPath:'https://evil.test/'}),false);
 assert.equal(validatePublicGallery({...p.publicGalleries[0],watchCode:'../../path'}),false);
 assert.equal(validatePublicGallery({...p.publicGalleries[0],fighters:4}),false);
 assert.equal(validateCourtStatus({...p,uniqueAuthenticatedPlayers:13}),false);
 assert.equal(validateCourtStatus({...p,ranked:{available:true}}),false);
 assert.equal(validateCourtStatus({...p,language:'ru'}),false);
 assert.throws(()=>projectFightActivity({rooms:{},galleries:new Map()}),/bounded/);
 assert.throws(()=>projectFightActivity({rooms:new Map(),galleries:new Map(),limit:33}),/bounded/);
 const ranked=projectRankedUnavailable();
 assert.equal(ranked.active,false);
 assert.deepEqual(ranked.entries,[]);
 assert.match(ranked.reason,/authenticated/);
});


test('side-view host opt-in galleries appear in the same English Court and count real spectators',()=>{
 const room=fake();
 const side=[{watchCode:'SideWatch123',watchPath:'/fight/side/?watch=SideWatch123',
  arena:'cistern',format:'casual-1v1',status:'in-progress',fighters:2,
  spectators:3,spectatorCapacity:6,protocol:'seamless-side/1'}];
 const snapshot=projectFightActivity({
  rooms:new Map([['a',room]]),galleries:new Map([[code,room]]),
  queued:0,mainConnections:3,sideStats:{clients:5,rooms:1,duels:1,fighters:2,spectators:3},
  sidePublicGalleries:side
 });
 assert.equal(snapshot.connectedClients,8);
 assert.equal(snapshot.duels,2);
 assert.equal(snapshot.spectators,3);
 assert.equal(snapshot.publicGalleryCount,2);
 assert.equal(snapshot.publicGalleries.length,2);
 assert(snapshot.publicGalleries.some(g=>g.watchPath==='/fight/side/?watch=SideWatch123'));
 assert(snapshot.publicGalleries.every(g=>validatePublicGallery(g)));
 assert(!JSON.stringify(snapshot).includes('PRIVATE12345'));
 assert(validateCourtStatus(snapshot));
 const malicious={...side[0],watchPath:'https://evil.invalid/watch',arena:'unverified'};
 const tampered=projectFightActivity({
  rooms:new Map(),galleries:new Map(),queued:0,mainConnections:0,
  sideStats:{clients:0},sidePublicGalleries:[malicious]
 });
 assert.deepEqual(tampered.publicGalleries,[]);
 assert.throws(()=>projectFightActivity({rooms:new Map(),galleries:new Map(),
  sidePublicGalleries:Array(65).fill(side[0])}),/Bounded/);
});
