import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { WebSocketServer } from 'ws';
import { HZ, blank, match, step, canFeint, canAct } from './public/engine.mjs';

import {RULESET,MAX_TICKS,packTick} from './public/replay.mjs';

import {arenaId} from './public/arenas.mjs';

import {outfit} from './public/wardrobe.mjs';

const assets = new Map([
  ['', ['index.html','text/html; charset=utf-8']],
  ['style.css',['style.css','text/css']],
  ['game.mjs',['game.mjs','text/javascript']],
  ['engine.mjs',['engine.mjs','text/javascript']],
  ['prediction.mjs',['prediction.mjs','text/javascript']],
  ['tactics.mjs',['tactics.mjs','text/javascript']],
  ['lab.mjs',['lab.mjs','text/javascript']],
  ['audio.mjs',['audio.mjs','text/javascript']],
  ['replay.mjs',['replay.mjs','text/javascript']],
  ['controls.mjs',['controls.mjs','text/javascript']],
  ['metrics.mjs',['metrics.mjs','text/javascript']],
  ['arenas.mjs',['arenas.mjs','text/javascript']],
  ['analysis.mjs',['analysis.mjs','text/javascript']],
  ['wardrobe.mjs',['wardrobe.mjs','text/javascript']],
  ['footwork.mjs',['footwork.mjs','text/javascript']]
].map(([path,[file,type]])=>['/fight/'+path,[readFileSync(new URL('./public/'+file,import.meta.url)),type]]));
const rooms=new Map(), galleries=new Map();
const MAX_VIEWERS=6;
const token=()=>randomBytes(9).toString('base64url');
const origin=process.env.PUBLIC_ORIGIN;
const http=createServer((req,res)=>{
  const path=req.url?.split('?')[0];
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  if(path==='/fight'){res.writeHead(308,{Location:'/fight/'+(req.url.includes('?')?'?'+req.url.split('?').slice(1).join('?'):'')}).end();return;}
  if(path==='/fight/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end('{"ok":true}');return;}
  const asset=assets.get(path);
  if(!asset){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"});
  res.end(req.method==='HEAD'?undefined:asset[0]);
});
const ws=new WebSocketServer({noServer:true,maxPayload:512,perMessageDeflate:false});
http.on('upgrade',(req,socket,head)=>{
  const allowed=origin||'http://'+req.headers.host;
  if(req.url!=='/fight/socket'||req.headers.origin!==allowed||ws.clients.size>=256){
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;
  }
  ws.handleUpgrade(req,socket,head,c=>ws.emit('connection',c));
});
function send(c,o){if(c.readyState===1){if(c.bufferedAmount>65536)c.terminate();else c.send(typeof o==='string'?o:JSON.stringify(o));}}
function closeGallery(r,message){
  if(r.watchCode)galleries.delete(r.watchCode);
  r.watchCode=null;
  for(const viewer of r.viewers){send(viewer,{t:'error',message});viewer.close(1000);}
  r.viewers.clear();
}
function reset(r){const tick=r.s.tick;r.s=match();r.s.tick=tick;r.tape=[];r.votes.clear();for(const c of r.peers){c.input=blank();c.actions=[];c.cancel=false;c.ack=c.seq;}}
ws.on('connection',c=>{
  let room, slot, quota=0, quotaAt=performance.now();
  c.alive=true;c.input=blank();c.actions=[];c.cancel=false;c.at=0;c.seq=0;c.ack=0;
  c.on('error',()=>c.terminate());c.on('pong',()=>c.alive=true);
  const deadline=setTimeout(()=>c.close(1008,'join timeout'),10000);
  c.on('message',(data,binary)=>{
    const now=performance.now();
    if(now-quotaAt>=1000){quotaAt=now;quota=0;}
    if(binary||++quota>150){c.close(1008,'input limit');return;}
    let m;try{m=JSON.parse(data);}catch{return;}
    if(!m||typeof m!=='object')return;
    if(!room){
      if(m.t==='watch'){
        const target=typeof m.code==='string'&&galleries.get(m.code);
        if(!target||target.viewers.size>=MAX_VIEWERS){send(c,{t:'error',message:'Gallery is full or closed.'});c.close(1008);return;}
        clearTimeout(deadline);room=target;slot=-1;room.viewers.add(c);
        send(c,{t:'watching',arena:room.arena,outfits:room.outfits});if(room.peers.length===2)send(c,{t:'state',s:room.s});
        return;
      }
      if(m.t!=='hello')return;
      if(m.code==null){
        if(rooms.size>=96){send(c,{t:'error',message:'Arena capacity reached.'});c.close(1013);return;}
        let code;do{code=token();}while(rooms.has(code)||galleries.has(code));
        room={code,arena:arenaId(m.arena),outfits:[outfit(),outfit()],peers:[],viewers:new Set(),watchCode:null,tape:[],votes:new Set(),s:match(),at:now};rooms.set(code,room);
      }else{
        const existing=typeof m.code==='string'&&rooms.get(m.code);
        if(!existing||existing.peers.length!==1){send(c,{t:'error',message:'Room is full or no longer exists.'});c.close(1008);return;}
        room=existing;
      }
      clearTimeout(deadline);slot=room.peers.length;room.outfits[slot]=outfit(m.outfit);room.peers.push(c);send(c,{t:'room',code:room.code,slot,arena:room.arena,outfits:room.outfits});
      if(room.peers.length===2){
        reset(room);
        const looks={t:'outfits',outfits:room.outfits};
        for(const peer of [...room.peers,...room.viewers])send(peer,looks);
      }
      return;
    }
    if(m.t==='ping'&&Number.isFinite(m.id)){send(c,{t:'pong',id:m.id});return;}
    if(slot===-1)return;
    if(m.t==='replay'){
      if(room.peers.length===2&&room.tape.length&&now-(c.lastReplay??-Infinity)>1500){
        c.lastReplay=now;send(c,{t:'replay',rules:RULESET,arena:room.arena,outfits:room.outfits,tape:room.tape.join('')});
      }
      return;
    }
    if(slot===0&&m.t==='gallery'&&typeof m.open==='boolean'){
      if(m.open&&!room.watchCode){
        let code;do{code=token();}while(galleries.has(code)||rooms.has(code));
        room.watchCode=code;galleries.set(code,room);
      }else if(!m.open&&room.watchCode)closeGallery(room,'The host closed the gallery.');
      send(c,{t:'gallery',code:room.watchCode});return;
    }
    if(m.t==='rematch'&&room.s.over){room.votes.add(slot);if(room.votes.size===2)reset(room);else for(const p of room.peers)send(p,{t:'vote',slot});return;}
    if(m.t!=='input'||![-1,0,1].includes(m.x)||![-1,0,1].includes(m.y)||!Number.isSafeInteger(m.seq)||m.seq<=c.seq)return;
    c.seq=m.seq;
    c.input={x:m.x,y:m.y,act:''};c.at=now;
    if(m.act==='feint')c.cancel=true;
    if(['cut','hew','shot','step'].includes(m.act)&&c.actions.length<3)c.actions.push({act:m.act,until:now+110});
  });
  c.on('close',()=>{
    clearTimeout(deadline);if(!room)return;
    if(slot===-1){room.viewers.delete(c);return;}
    if(!rooms.delete(room.code))return;
    closeGallery(room,'The duel ended because a fighter disconnected.');
    for(const other of room.peers)if(other!==c){send(other,{t:'error',message:'Opponent disconnected. Create a new room.'});other.close(1000);}
  });
});
setInterval(()=>{for(const c of ws.clients){if(!c.alive)c.terminate();else if(c.readyState===1){c.alive=false;c.ping();}}},15000).unref();
const dt=1000/HZ;
let next=performance.now(),ticks=0;
setInterval(()=>{
  const now=performance.now();let budget=4;
  while(now>=next&&budget-->0){
    next+=dt;ticks++;
    for(const r of rooms.values()){
      if(r.peers.length<2){if(now-r.at>300000)r.peers[0].close(1000,'room expired');continue;}
      if(!r.s.over){
        const inputs=r.peers.map((c,i)=>{
          while(c.actions.length&&c.actions[0].until<now)c.actions.shift();
          c.ack=c.seq;
          const p=r.s.p[i], live=!r.s.ready&&!r.s.end;
          const cancel=c.cancel;c.cancel=false;
          const act=live?(cancel&&canFeint(p)?'feint':canAct(p)?c.actions.shift()?.act||'':''):'';
          if(!live)c.actions.length=0;
          return {...(now-c.at<260?c.input:blank()),act};
        });
        if(r.tape.length<MAX_TICKS)r.tape.push(packTick(inputs));
        step(r.s,inputs);
      }
      if(ticks%3===0){
        for(const c of r.peers)send(c,{t:'state',s:r.s,ack:c.ack});
        if(r.viewers.size){const frame=JSON.stringify({t:'state',s:r.s});for(const viewer of r.viewers)send(viewer,frame);}
      }
    }
  }
  if(now-next>dt*4)next=now+dt;
},8).unref();
http.listen(Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1');
