import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,sideStep} from '../public/side-engine.mjs';
import {canonicalSideInput,createSideRollback,sideStateFingerprint} from '../public/side-rollback.mjs';

const neutral=()=>({x:0,y:0,act:'',guard:false});
function scripted(t,slot){
 const x=slot?(t%43<22?-1:1):(t%51<28?1:-1);
 const act=t%59===(slot?13:9)?'cut':t%107===(slot?24:40)?'hew':
  t%83===(slot?34:70)?'shot':'';
 return {x,y:t%71===9?-1:t%47===12?1:0,act,guard:t%37>=26&&t%37<=31};
}
test('rollback catches delayed/reordered authenticated inputs and reproduces uninterrupted reference',()=>{
 const rb=createSideRollback({maxRollback:20});
 const reference=sideMatch(), deliveries=[];
 let corrected=0;
 for(let tick=0;tick<420;tick++){
  const local=scripted(tick,0),remote=scripted(tick,1);
  sideStep(reference,[local,remote]);
  rb.advance(local);
  deliveries.push({tick,remote,delivery:tick+2+(tick*7)%8});
  for(const item of deliveries.filter(x=>x.delivery===tick).reverse()){
   if(rb.confirm(item.tick,item.remote).rolledBack)corrected++;
  }
 }
 for(const item of deliveries.filter(x=>x.delivery>=420).reverse())
  if(rb.confirm(item.tick,item.remote).rolledBack)corrected++;
 assert.deepEqual(rb.getState(),reference);
 assert.equal(rb.getStats().fingerprint,sideStateFingerprint(reference));
 assert.equal(rb.getStats().pending,0);
 assert(corrected>0,'expected actual speculative rollback corrections');
 assert(rb.getStats().resimulated>corrected);
 assert(rb.getStats().retained<=20,'history must remain capped after confirmations');
});
test('remote inputs that arrive before their frame are used without correction',()=>{
 const rb=createSideRollback({maxRollback:4});
 rb.confirm(0,{x:1,y:0,act:'cut',guard:false});
 const result=rb.advance(neutral());
 assert.equal(result.predicted,false);
 assert.equal(rb.getStats().corrections,0);
 assert.equal(rb.getStats().pending,0);
});
test('prediction cap pauses rather than silently committing uncorrectable combat',()=>{
 const rb=createSideRollback({maxRollback:3});
 for(let i=0;i<3;i++)rb.advance(neutral());
 assert.throws(()=>rb.advance(neutral()),/Prediction window exhausted/);
 assert.equal(rb.getStats().tick,3);
 assert.equal(rb.confirm(0,neutral()).rolledBack,false);
 rb.advance(neutral());
 assert.throws(()=>rb.confirm(0,{...neutral(),x:1}),/Conflicting/);
 assert.throws(()=>rb.confirm(1,{...neutral(),act:'stun'}),/Invalid/);
});
test('defensive copies and strict input validation protect deterministic snapshots',()=>{
 const rb=createSideRollback({maxRollback:5});
 assert.throws(()=>canonicalSideInput({x:0.1}),/Invalid/);
 assert.throws(()=>canonicalSideInput({act:'guardBreak'}),/Invalid/);
 assert.throws(()=>canonicalSideInput({guard:1}),/Invalid/);
 assert.throws(()=>rb.confirm(200,neutral()),/too far ahead/);
 const copy=rb.getState();copy.p[0].hp=0;copy.score[0]=999;
 assert.equal(rb.getState().p[0].hp,100);
 assert.equal(rb.getState().score[0],0);
 assert.notEqual(sideStateFingerprint(copy),rb.getStats().fingerprint);
});
test('duplicate confirms are idempotent but contradictory authenticated frames are rejected',()=>{
 const rb=createSideRollback({maxRollback:5});
 rb.advance(neutral());
 rb.confirm(0,{...neutral(),x:1});
 const hash=rb.getStats().fingerprint;
 rb.confirm(0,{...neutral(),x:1});
 assert.equal(rb.getStats().fingerprint,hash);
 assert.throws(()=>rb.confirm(0,{...neutral(),x:-1}),/Conflicting/);
});
