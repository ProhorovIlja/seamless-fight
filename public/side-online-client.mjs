// Side-view-only online transport. Never send legacy lantern-court actions
// to this endpoint. It carries INPUTS and renders authoritative STATES.
import {SIDE_RULESET} from './side-engine.mjs';
export const SIDE_INVITE_PATTERN=/^[-_A-Za-z0-9]{12}$/;
export function createSideTransport(handlers={},Factory=globalThis.WebSocket){
 let socket=null,sequence=0,code='';
 const notify=(name,...values)=>handlers[name]?.(...values);
 function close(){
  const current=socket;socket=null;sequence=0;code='';
  if(current&&current.readyState<2)current.close(1000,'left side duel');
 }
 function connect(invitation,stage,look){
  if(invitation!=null&&!SIDE_INVITE_PATTERN.test(invitation))throw TypeError('Invalid side-view invite code.');
  close();
  const endpoint=new URL('/fight/side/socket',location.href);
  endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';
  const current=new Factory(endpoint.href);socket=current;sequence=0;
  current.onopen=()=>{
   if(socket===current)current.send(JSON.stringify({t:'hello',code:invitation,stage,look}));
  };
  current.onmessage=evt=>{
   if(socket!==current)return;
   if(typeof evt.data!=='string'||evt.data.length>160000)return;
   let m;try{m=JSON.parse(evt.data);}catch{return;}
   if(!m||typeof m!=='object'||m.rules&&m.rules!==SIDE_RULESET)return;
   if(m.t==='room'){
    if(!SIDE_INVITE_PATTERN.test(m.code)||![0,1].includes(m.slot))return;
    code=m.code;notify('room',m);
   }else if(m.t==='start'){sequence=0;notify('start',m);}
   else if(m.t==='state')notify('state',m);
   else if(m.t==='replay')notify('replay',m);
   else if(m.t==='pong'&&Number.isFinite(m.id))notify('pong',m);
   else if(m.t==='notice'||m.t==='error')notify('notice',m);
  };
  current.onerror=()=>{if(socket===current)notify('error');};
  current.onclose=e=>{if(socket===current){socket=null;notify('close',e);}};
  return current;
 }
 function send(m){
  if(!socket||socket.readyState!==Factory.OPEN||socket.bufferedAmount>=2048)return false;
  socket.send(JSON.stringify(m));return true;
 }
 return {
  connect,close,code:()=>code,connected:()=>socket?.readyState===Factory.OPEN,
  input(i){const next=sequence+1;
   if(!send({t:'input',x:i.x,y:i.y,act:i.act||'',guard:i.guard===true,seq:next}))return null;
   sequence=next;return next;
  },
  replay(){return send({t:'replay'});},rematch(){return send({t:'rematch'});},
  ping(id){return send({t:'ping',id});}
 };
}
