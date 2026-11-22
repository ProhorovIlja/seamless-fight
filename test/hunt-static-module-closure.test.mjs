import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const root=resolve(projectRoot,'public');
function huntModuleGraph(){
 const entry=resolve(root,'hunt.mjs'),pending=[entry],visited=new Set();
 while(pending.length){
  const path=pending.pop();
  assert(path.startsWith(root+'/'),'relative import must stay inside public/');
  if(visited.has(path))continue;
  visited.add(path);
  const body=readFileSync(path,'utf8');
  const imports=[...body.matchAll(/\\bfrom\\s*['"]([^'"]+\\.mjs)['"]/g),
   ...body.matchAll(/\\bimport\\s*['"]([^'"]+\\.mjs)['"]/g)];
  for(const [,spec] of imports)if(spec.startsWith('.')){
   const target=resolve(dirname(path),spec);
   assert(target.startsWith(root+'/'),'unexpected public source path: '+spec);
   pending.push(target);
  }
 }
 return [...visited].map(path=>relative(root,path)).sort();
}
test('whole browser Hunt ESM dependency graph is explicitly served, never 404',{timeout:18000},async t=>{
 const modules=huntModuleGraph();
 assert(modules.includes('hunt-punish-provenance.mjs'),
  'shared no-block whiff attribution must be part of the browser dependency closure');
 assert(modules.includes('hunt-match-analytics.mjs'));
 assert(modules.includes('hunt-practice-suite.mjs'));
 const probe=createServer().listen(0,'127.0.0.1');
 await once(probe,'listening');
 const port=probe.address().port;
 await new Promise(resolve=>probe.close(resolve));
 const origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{
  cwd:projectRoot,
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin,
   NODE_ENV:'development'},
  stdio:'ignore'
 });
 t.after(()=>child.kill('SIGTERM'));
 let ready=false;
 for(let i=0;i<90;i++){
  try{ready=(await fetch(origin+'/fight/health')).ok;if(ready)break;}catch{}
  await sleep(45);
 }
 assert(ready,'source server did not bind loopback');
 for(const module of modules){
  const url=origin+'/fight/'+module;
  const res=await fetch(url);
  assert.equal(res.status,200,'missing public ESM dependency: '+module);
  assert.match(res.headers.get('content-type')??'',/javascript/,
   'incorrect ESM MIME: '+module);
  const body=await res.text();
  assert.equal(body,readFileSync(resolve(root,module),'utf8'),
   'served module must match versioned GitHub source: '+module);
  const head=await fetch(url,{method:'HEAD'});
  assert.equal(head.status,200,'HEAD route missing: '+module);
  assert.equal((await head.text()).length,0);
 }
 for(const hidden of ['package.json','server.mjs','../../server.mjs',
  'hunt-punish-provenance.mjs/hidden']){
  const res=await fetch(origin+'/fight/'+hidden);
  assert.equal(res.status,404,'do not expose unexpected source: '+hidden);
 }
});
