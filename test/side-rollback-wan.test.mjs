import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,sideStep} from '../public/side-engine.mjs';
import {createSideRollback,sideStateFingerprint} from '../public/side-rollback.mjs';

function generator(seed){
 let n=seed>>>0;
 return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
function input(rng){
 const x=rng()<.34?-1:rng()<.56?0:1;
 const y=rng()<.04?-1:rng()<.10?1:0;
 const roll=rng();
 const act=roll<.018?'cut':roll<.035?'hew':roll<.048?'shot':
  roll<.064?'step':roll<.075?'feint':'';
 return {x,y,act,guard:rng()<.20};
}
function scenario(seed,frames){
 const rng=generator(seed),reference=sideMatch(),rollback=createSideRollback({maxRollback:24});
 const arrivals=[];
 let packetsLost=0,duplicates=0,corrected=0;
 for(let tick=0;tick<frames;tick++){
  const local=input(rng),remote=input(rng);
  sideStep(reference,[local,remote]);
  rollback.advance(local);
  let delay=1+Math.floor(rng()*10);
  // A first send can be lost. This models bounded retransmission after a
  // synthetic recovery interval, NOT an actual network or packet stack.
  if(rng()<.15){packetsLost++;delay+=6+Math.floor(rng()*7);}
  arrivals.push({tick,input:remote,at:tick+delay});
  if(rng()<.05){
   duplicates++;
   arrivals.push({tick,input:remote,at:tick+delay+1});
  }
  const due=arrivals.filter(p=>p.at===tick).reverse();
  for(const p of due)if(rollback.confirm(p.tick,p.input).rolledBack)corrected++;
  assert(rollback.getStats().retained<=24,'bounded history must not grow with match length');
 }
 for(const packet of arrivals.filter(p=>p.at>=frames).sort((a,b)=>b.tick-a.tick)){
  if(rollback.confirm(packet.tick,packet.input).rolledBack)corrected++;
 }
 assert.deepEqual(rollback.getState(),reference,'corrected game must equal full confirmed execution');
 assert.equal(rollback.getStats().pending,0);
 assert.equal(rollback.getStats().fingerprint,sideStateFingerprint(reference));
 return {seed,frames,packetsLost,duplicates,corrected,stats:rollback.getStats()};
}
test('synthetic WAN jitter, loss/retransmission, duplicates and reordering preserve final combat determinism',()=>{
 const cases=[0x12345678,0x87654321,0x51c0ffee,0x9ad14722,0x75432010,0xdeadbeef];
 const results=cases.map(seed=>scenario(seed,510));
 assert(results.every(x=>x.corrected>0),'stress scenarios must exercise rollback');
 assert(results.some(x=>x.packetsLost>0&&x.duplicates>0));
 assert(results.every(x=>x.stats.retained<=24));
});
