import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { WebSocketServer } from 'ws';
import { HZ, blank, match, step } from './public/engine.mjs';

const assets = new Map([
  ['', ['index.html','text/html; charset=utf-8']],
  ['style.css',['style.css','text/css']],
  ['game.mjs',['game.mjs','text/javascript']],
  ['engine.mjs',['engine.mjs','text/javascript']]
].map(([path,[file,type]])=>['/fight/'+path,[readFileSync(new URL('./public/'+file,import.meta.url)),type]]));
const rooms=new Map();
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
function send(c,o){if(c.readyState===1){if(c.bufferedAmount>65536)c.terminate();else c.send(JSON.stringify(o));}}
function reset(r){r.s=match();r.votes.clear();for(const c of r.peers){c.input=blank();c.actions=[];}}
ws.on('connection',c=>{
  let room, slot, quota=0, quotaAt=performance.now();
  c.alive=true;c.input=blank();c.actions=[];c.at=0;
  c.on('error',()=>c.terminate());c.on('pong',()=>c.alive=true);
  const deadline=setTimeout(()=>c.close(1008,'join timeout'),10000);
  c.on('message',(data,binary)=>{
    const now=performance.now();
    if(now-quotaAt>=1000){quotaAt=now;quota=0;}
    if(binary||++quota>150){c.close(1008,'input limit');return;}
    let m;try{m=JSON.parse(data);}catch{return;}
    if(!m||typeof m!=='object')return;
    if(!room){
      if(m.t!=='hello')return;
      if(m.code==null){
        if(rooms.size>=96){send(c,{t:'error',message:'Arena capacity reached.'});c.close(1013);return;}
        let code;do{code=randomBytes(9).toString('base64url');}while(rooms.has(code));
        room={code,peers:[],votes:new Set(),s:match(),at:now};rooms.set(code,room);
      }else{
        const existing=typeof m.code==='string'&&rooms.get(m.code);
        if(!existing||existing.peers.length!==1){send(c,{t:'error',message:'Room is full or no longer exists.'});c.close(1008);return;}
        room=existing;
      }
      clearTimeout(deadline);slot=room.peers.length;room.peers.push(c);send(c,{t:'room',code:room.code,slot});
      if(room.peers.length===2)reset(room);
      return;
    }
    if(m.t==='ping'&&Number.isFinite(m.id)){send(c,{t:'pong',id:m.id});return;}
    if(m.t==='rematch'&&room.s.over){room.votes.add(slot);if(room.votes.size===2)reset(room);else for(const p of room.peers)send(p,{t:'vote',slot});return;}
    if(m.t!=='input'||![-1,0,1].includes(m.x)||![-1,0,1].includes(m.y))return;
    c.input={x:m.x,y:m.y,act:''};c.at=now;
    if(['cut','hew','shot','step'].includes(m.act)&&c.actions.length<3)c.actions.push({act:m.act,until:now+110});
  });
  c.on('close',()=>{
    clearTimeout(deadline);if(!room||!rooms.delete(room.code))return;
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
          const p=r.s.p[i], idle=!p.act;
          const act=idle&&!r.s.ready&&!r.s.end?c.actions.shift()?.act||'':'';
          return {...(now-c.at<260?c.input:blank()),act};
        });
        step(r.s,inputs);
      }
      if(ticks%3===0)for(const c of r.peers)send(c,{t:'state',s:r.s});
    }
  }
  if(now-next>dt*4)next=now+dt;
},8).unref();
http.listen(Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1');
