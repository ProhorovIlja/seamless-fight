import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import {huntMatch,huntStep,HUNT_RULESET} from '../public/side-hunt-lab.mjs';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';

test('offline Hunt v3 1v1 practice has the correct version and no classic guard or 2v2',()=>{
 const session=huntPracticeSession({weapons:['mournweave','thornwake']});
 const state=session.inspect();
 assert.equal(state.rules,HUNT_RULESET);
 assert.equal(state.p.length,2);
 assert.equal(state.p[0].weapon,'mournweave');
 assert.equal(state.p[1].weapon,'thornwake');
 assert.equal(session.stats().simulationHz,60);
 assert.throws(()=>huntStep(state,[{x:0,y:0,act:'',guard:true},{x:0,y:0,act:'',guard:false}]),/guard/);
 assert.throws(()=>huntMatch({weapons:['mournweave','thornwake','mournweave']}),/Two/);
 session.append({x:1,y:0,act:'light',guard:false});
 assert.equal(session.stats().tick,1);
 assert.equal(session.metrics().verifiedCompetitiveResult,false);
});
test('real Node HTTP server exposes English-only interactive Hunt laboratory and exact versioned source modules',{timeout:22000},async t=>{
 const probe=createServer().listen(0,'127.0.0.1');await once(probe,'listening');
 const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['server.mjs'],{
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:origin,NODE_ENV:'development'},
  stdio:'ignore'
 });
 t.after(()=>server.kill());
 let ready=false;
 for(let i=0;i<110;i++){
  try{ready=(await fetch(origin+'/fight/health')).ok;if(ready)break;}catch{}
  await sleep(35);
 }
 assert(ready,'Hunt practice reference Node server failed to start');
 const redirect=await fetch(origin+'/fight/hunt',{redirect:'manual'});
 assert.equal(redirect.status,308);
 assert.equal(redirect.headers.get('location'),'/fight/hunt/');
 const page=await fetch(origin+'/fight/hunt/');
 assert.equal(page.status,200);
 assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);
 const html=await page.text();
 assert.match(html,/<html lang="en">/);
 assert.match(html,/ORIGINAL 1V1 · ENGLISH ONLY/);
 assert.match(html,/sf-hunt-lab\/3/);
 assert.match(html,/id="arena"/);
 assert.match(html,/id="dummy-mode"/);
 assert.match(html,/id="goal-progress"/);
 assert.match(html,/id="goal-description"/);
 assert.match(html,/id="goal-feedback"/);
 assert.match(html,/id="goal-timing"/);
 assert.match(html,/id="review-attempt"/);
 assert.match(html,/value="takeover" disabled/);
 assert.match(html,/id="display-cap"/);
 assert.match(html,/id="export"/);
 assert.match(html,/id="import"/);
 assert.doesNotMatch(html,/2v2|lang="ru"|Russian language/i);
 for(const asset of ['hunt.css','hunt.mjs','hunt-render.mjs','hunt-browser-input.mjs',
  'side-hunt-lab.mjs','side-hunt-replay.mjs','hunt-practice-suite.mjs',
  'hunt-match-analytics.mjs','hunt-input-device.mjs','hunt-identity.mjs',
  'hunt-training-goals.mjs']){
  const result=await fetch(origin+'/fight/'+asset);
  assert.equal(result.status,200,asset+' not served');
  assert.match(result.headers.get('content-type'),/text\/(?:javascript|css)/,asset);
  assert((await result.text()).length>160,asset+' unexpectedly empty');
 }
 const hub=await (await fetch(origin+'/fight/hub/')).text();
 assert.match(hub,/href="\.\.\/hunt\/"/,'Court menu must link directly to Hunt v3');
});
