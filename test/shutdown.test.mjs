import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import WebSocket from 'ws';

test('SIGTERM tells websocket peers a service restart is occurring and exits', {timeout:12000},async t=>{
 const portProbe=createServer().listen(0,'127.0.0.1');
 await once(portProbe,'listening');
 const port=portProbe.address().port;
 await new Promise(resolve=>portProbe.close(resolve));
 const origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin},
  stdio:'ignore'
 });
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 let ready=false;
 for(let i=0;i<120;i++){
   try{ready=(await fetch(origin+'/fight/health')).ok;if(ready)break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,30));
 }
 assert(ready,'server became ready');
 const socket=new WebSocket(origin.replace('http','ws')+'/fight/socket',{origin});
 t.after(()=>socket.terminate());
 await once(socket,'open');
 const closed=once(socket,'close');
 const exit=once(child,'exit');
 assert(child.kill('SIGTERM'));
 const [code,reason]=await closed;
 assert.equal(code,1012);
 assert.equal(reason.toString(),'server restarting');
 const [status,signal]=await exit;
 assert.equal(status,0);
 assert.equal(signal,null);
});
