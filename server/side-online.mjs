import {WebSocketServer} from 'ws';
import {randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {SIDE_RULESET,sideMatch,sideStep,sideInput,sideCanAct,sideCanFeint} from '../public/side-engine.mjs';
import {SIDE_TAPE_LIMIT,packSideTick} from '../public/side-replay.mjs';
import {SIDE_STAGES} from '../public/side-art.mjs';
import {outfit} from '../public/wardrobe.mjs';

// Side-view only. The legacy duel transport and replay rules are untouched.
// No persistent user identity, rated play, global queue or region claims.
export function createSideHub(expectedOrigin,{maxRooms=64}={}){
 if(!Number.isSafeInteger(maxRooms)||maxRooms<1||maxRooms>64)
  throw new RangeError('Side-room capacity must be 1..64');
 const ws=new WebSocketServer({noServer:true,maxPayload:512,perMessageDeflate:false});
 const rooms=new Map(),token=()=>randomBytes(9).toString('base64url');
 let stopping=false,simTicks=0;
 const send=(c,m)=>{if(c.readyState!==1)return;if(c.bufferedAmount>65536){c.terminate();return;}c.send(JSON.stringify(m));};
 function createRoom(stage,look){
  let code;do{code=token();}while(rooms.has(code));
  const r={code,stage:Object.hasOwn(SIDE_STAGES,stage)?stage:'reliquary',
   looks:[outfit(look),outfit()],s:sideMatch(),peers:[],acks:[0,0],
   tape:[],events:[],votes:new Set(),created:performance.now()};
  rooms.set(code,r);return r;
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
    if(room.peers.length===2){reset(room);for(const peer of room.peers)send(peer,{t:'start',rules:SIDE_RULESET,looks:room.looks,s:room.s});}
    return;
   }
   if(m.t==='ping'&&Number.isFinite(m.id)){send(c,{t:'pong',id:m.id});return;}
   if(m.t==='replay'){
    if(!room.s.over){send(c,{t:'notice',message:'Replay unlocks at the end of the bout.'});return;}
    if(now-(c.lastReplay??-Infinity)<1500)return;c.lastReplay=now;
    send(c,{t:'replay',rules:SIDE_RULESET,stage:room.stage,looks:room.looks,tape:room.tape.join('')});return;
   }
   if(m.t==='rematch'&&room.s.over){
    room.votes.add(slot);
    if(room.votes.size===2){reset(room);for(const peer of room.peers)send(peer,{t:'start',rules:SIDE_RULESET,looks:room.looks,s:room.s});}
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
   if(!room||!rooms.delete(room.code)||stopping)return;
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
     r.events.length=0;
    }
   }
  },
  shutdown(){
   if(stopping)return;stopping=true;
   for(const c of ws.clients){send(c,{t:'error',message:'Side-view server restarting. Rooms are not retained.'});c.close(1012,'restarting');}
   setTimeout(()=>{for(const c of ws.clients)c.terminate();},1500).unref();
  },
  stats(){return {rooms:rooms.size,clients:ws.clients.size};}
 };
}
