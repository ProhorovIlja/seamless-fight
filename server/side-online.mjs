import {WebSocketServer} from 'ws';
import {randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {SIDE_RULESET,sideMatch,sideStep,sideInput,sideCanAct,sideCanFeint} from '../public/side-engine.mjs';
import {SIDE_TAPE_LIMIT,packSideTick} from '../public/side-replay.mjs';
import {SIDE_STAGES} from '../public/side-art.mjs';
import {outfit} from '../public/wardrobe.mjs';

// Legacy side-view rules unchanged; only host-opt-in, read-only observers added.
// No persistent identity, ranked accounts, rollback or spectator chat.
export function createSideHub(expectedOrigin,{maxRooms=64}={}){
 if(!Number.isSafeInteger(maxRooms)||maxRooms<1||maxRooms>64)
  throw new RangeError('Side-room capacity must be 1..64');
 const ws=new WebSocketServer({noServer:true,maxPayload:512,perMessageDeflate:false});
 const rooms=new Map(),galleries=new Map(),token=()=>randomBytes(9).toString('base64url');
 const MAX_VIEWERS=6;
 let stopping=false,simTicks=0;
 const send=(c,m)=>{if(c.readyState!==1)return;if(c.bufferedAmount>65536){c.terminate();return;}c.send(JSON.stringify(m));};
 function createRoom(stage,look){
  let code;do{code=token();}while(rooms.has(code)||galleries.has(code));
  const r={code,stage:Object.hasOwn(SIDE_STAGES,stage)?stage:'reliquary',
   looks:[outfit(look),outfit()],s:sideMatch(),peers:[],acks:[0,0],
   tape:[],events:[],votes:new Set(),viewers:new Set(),watchCode:null,created:performance.now()};
  rooms.set(code,r);return r;
 }
 function closeGallery(r,message='The host closed this spectator gallery.'){
  if(r.watchCode)galleries.delete(r.watchCode);
  r.watchCode=null;
  for(const viewer of r.viewers){send(viewer,{t:'error',message});viewer.close(1000,'gallery closed');}
  r.viewers.clear();
 }
 function announceViewers(r){
  if(r.peers[0])send(r.peers[0],{t:'audience',viewers:r.viewers.size,limit:MAX_VIEWERS});
 }
 function reset(r){
  r.s=sideMatch();r.tape=[];r.events=[];r.acks=[0,0];r.votes.clear();
  for(const c of r.peers){c.input=sideInput();c.queue=[];c.seq=0;c.ack=0;c.lastInput=0;}
 }
 ws.on('connection',c=>{
  let room=null,slot=-1,rate=0,rateAt=performance.now();
  c.input=sideInput();c.queue=[];c.seq=0;c.ack=0;c.lastInput=0;c.alive=true;
  c.on('error',()=>c.terminate());c.on('pong',()=>{c.alive=true;});
  const timeout=setTimeout(()=>c.close(1008,'join timeout'),10000);
  c.on('message',(data,binary)=>{
   const now=performance.now();
   if(now-rateAt>=1000){rateAt=now;rate=0;}
   if(binary||++rate>110){c.close(1008,'rate limit');return;}
   let m;try{m=JSON.parse(data);}catch{return;}
   if(!m||typeof m!=='object'||Array.isArray(m))return;
   if(!room){
    if(m.t==='watch'){
     const target=typeof m.code==='string'&&galleries.get(m.code);
     if(!target||target.viewers.size>=MAX_VIEWERS||target.watchCode!==m.code){
      send(c,{t:'error',message:'This 1v1 gallery is closed or full.'});c.close(1008);return;
     }
     clearTimeout(timeout);room=target;slot=-1;room.viewers.add(c);
     send(c,{t:'watching',rules:SIDE_RULESET,stage:room.stage,looks:room.looks,
      s:room.s,viewerCount:room.viewers.size});
     announceViewers(room);
     return;
    }
    if(m.t!=='hello')return;
    const look=outfit(m.look);
    if(m.code==null){
     if(rooms.size>=maxRooms){send(c,{t:'error',message:'Side-view capacity reached.'});c.close(1013);return;}
     room=createRoom(m.stage,look);
    }else{
     const target=typeof m.code==='string'&&rooms.get(m.code);
     if(!target||target.peers.length!==1){send(c,{t:'error',message:'Side-view invite expired or full.'});c.close(1008);return;}
     room=target;
    }
    clearTimeout(timeout);
    slot=room.peers.length;room.peers.push(c);room.looks[slot]=look;
    send(c,{t:'room',slot,code:room.code,stage:room.stage,looks:room.looks,rules:SIDE_RULESET});
    if(room.peers.length===2){reset(room);for(const peer of [...room.peers,...room.viewers])send(peer,{t:'start',rules:SIDE_RULESET,looks:room.looks,s:room.s});}
    return;
   }
   if(m.t==='ping'&&Number.isFinite(m.id)){send(c,{t:'pong',id:m.id});return;}
   // Observers cannot become fighters, vote, open a gallery or fetch private
   // replays. They only receive server-controlled frames.
   if(slot===-1)return;
   if(slot===0&&m.t==='gallery'&&typeof m.open==='boolean'){
    if(m.open&&!room.watchCode){
     let code;do{code=token();}while(galleries.has(code)||rooms.has(code));
     room.watchCode=code;galleries.set(code,room);
    }else if(!m.open&&room.watchCode)closeGallery(room);
    send(c,{t:'gallery',code:room.watchCode});
    return;
   }
   if(m.t==='replay'){
    if(!room.s.over){send(c,{t:'notice',message:'Replay unlocks at the end of the bout.'});return;}
    if(now-(c.lastReplay??-Infinity)<1500)return;c.lastReplay=now;
    send(c,{t:'replay',rules:SIDE_RULESET,stage:room.stage,looks:room.looks,tape:room.tape.join('')});return;
   }
   if(m.t==='rematch'&&room.s.over){
    room.votes.add(slot);
    if(room.votes.size===2){reset(room);for(const peer of [...room.peers,...room.viewers])send(peer,{t:'start',rules:SIDE_RULESET,looks:room.looks,s:room.s});}
    else for(const peer of room.peers)send(peer,{t:'notice',message:'Rematch requested. Waiting for opponent.'});
    return;
   }
   if(m.t!=='input'||![-1,0,1].includes(m.x)||![-1,0,1].includes(m.y)||
      typeof m.guard!=='boolean'||!Number.isSafeInteger(m.seq)||m.seq<=c.seq||
      m.seq>Number.MAX_SAFE_INTEGER-1024||typeof m.act!=='string'||
      !['','cut','hew','shot','step','feint'].includes(m.act))return;
   c.seq=m.seq;c.input={x:m.x,y:m.y,guard:m.guard,act:''};c.lastInput=now;
   if(m.act&&c.queue.length<2)c.queue.push({act:m.act,until:now+110});
  });
  c.on('close',()=>{
   clearTimeout(timeout);
   if(!room)return;
   if(slot===-1){
    room.viewers.delete(c);announceViewers(room);return;
   }
   if(!rooms.delete(room.code)||stopping)return;
   closeGallery(room,'The duel ended because a fighter disconnected.');
   for(const other of room.peers)if(other!==c){
    send(other,{t:'error',message:'Opponent disconnected. Create a new room.'});other.close(1000);
   }
  });
 });
 return {
  upgrade(req,socket,head,origin){
   if(stopping||req.url!=='/fight/side/socket'||req.headers.origin!==(expectedOrigin||origin)||ws.clients.size>=128){
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;
   }
   ws.handleUpgrade(req,socket,head,c=>ws.emit('connection',c));
  },
  heartbeat(){for(const c of ws.clients){if(!c.alive)c.terminate();else if(c.readyState===1){c.alive=false;c.ping();}}},
  tick(now){
   if(stopping)return;simTicks++;
   for(const r of rooms.values()){
    if(r.peers.length!==2){
     if(now-r.created>300000)for(const c of r.peers)c.close(1000,'room expired');
     continue;
    }
    if(!r.s.over){
     const inputs=r.peers.map((c,i)=>{
      while(c.queue.length&&c.queue[0].until<now)c.queue.shift();
      c.ack=c.seq;r.acks[i]=c.ack;
      const live=!r.s.ready&&!r.s.end,p=r.s.p[i];
      let act='';
      if(live&&c.queue.length){
       const next=c.queue[0].act;
       if(next==='feint'){if(sideCanFeint(p))act='feint';c.queue.shift();}
       else if(sideCanAct(p))act=c.queue.shift().act;
      }
      if(!live)c.queue.length=0;
      const motion=now-c.lastInput<260?c.input:sideInput();
      return {x:motion.x,y:motion.y,guard:motion.guard,act};
     });
     if(r.tape.length<SIDE_TAPE_LIMIT)r.tape.push(packSideTick(inputs));
     sideStep(r.s,inputs,r.events);
    }
    if(simTicks%3===0){
     const frame={t:'state',rules:SIDE_RULESET,s:r.s,events:r.events};
     for(let i=0;i<r.peers.length;i++)send(r.peers[i],{...frame,ack:r.acks[i]});
     for(const viewer of r.viewers)send(viewer,frame);
     r.events.length=0;
    }
   }
  },
  shutdown(){
   if(stopping)return;stopping=true;
   for(const c of ws.clients){send(c,{t:'error',message:'Side-view server restarting. Rooms are not retained.'});c.close(1012,'restarting');}
   setTimeout(()=>{for(const c of ws.clients)c.terminate();},1500).unref();
  },
  stats(){return {rooms:rooms.size,clients:ws.clients.size,
   duels:[...rooms.values()].filter(r=>r.peers.length===2&&!r.s.over).length,
   fighters:[...rooms.values()].reduce((n,r)=>n+r.peers.length,0),
   spectators:[...rooms.values()].reduce((n,r)=>n+r.viewers.size,0),
   publicGalleries:galleries.size};},
  publicGalleries(){
   return [...galleries.entries()].filter(([code,r])=>r.watchCode===code&&r.viewers.size<MAX_VIEWERS)
    .map(([code,r])=>({
     watchCode:code,watchPath:'/fight/side/?watch='+encodeURIComponent(code),
     arena:r.stage,format:'casual-1v1',
     status:r.peers.length<2?'waiting':r.s.over?'complete':'in-progress',
     fighters:r.peers.length,spectators:r.viewers.size,
     spectatorCapacity:MAX_VIEWERS,protocol:'seamless-side/1'
    })).slice(0,32);
  }
 };
}
