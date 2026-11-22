import test from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,sideInput,sideStep} from '../public/side-engine.mjs';
import {reconcileSide,SIDE_PREDICTION_LIMIT} from '../public/side-prediction.mjs';
const live=()=>{const s=sideMatch();s.ready=0;return s;};
test('side neutral prediction reproduces authoritative movement exactly outside combat',()=>{
 const s=live(),sim=structuredClone(s);
 const pending=Array.from({length:6},(_,i)=>({seq:i+1,x:1,y:0,act:'',guard:false}));
 const result=reconcileSide(s,0,pending,0);
 for(const cmd of pending)sideStep(sim,[cmd,sideInput()]);
 assert.equal(result.predicted,true);
 assert.deepEqual(result.p,sim.p[0]);
 assert.deepEqual(result.pending.map(x=>x.seq),[1,2,3,4,5,6]);
 assert.deepEqual(s,live(),'prediction never modifies the authoritative snapshot');
});
test('side prediction refuses melee proximity, attacks, guarding and transitions',()=>{
 const s=live(),pending=[{seq:1,x:1,y:0,act:'',guard:false}];
 s.p[1].x=s.p[0].x+110;
 assert.equal(reconcileSide(s,0,pending,0).predicted,false);
 s.p[1].x=705;s.p[0].act='cut';
 assert.equal(reconcileSide(s,0,pending,0).predicted,false);
 s.p[0].act='';
 assert.equal(reconcileSide(s,0,[{...pending[0],act:'cut'}],0).predicted,false);
 assert.equal(reconcileSide(s,0,[{...pending[0],guard:true}],0).predicted,false);
 s.ready=20;assert.equal(reconcileSide(s,0,pending,0).predicted,false);
 assert.throws(()=>reconcileSide(s,3,pending,0),TypeError);
});
test('bounded unacknowledged history replays only safe frames and drops acknowledged ticks',()=>{
 const s=live(),inputs=Array.from({length:50},(_,i)=>({seq:i+1,x:-1,y:0,act:'',guard:false}));
 const r=reconcileSide(s,1,inputs,39);
 assert.equal(r.pending.length,11);assert.deepEqual(r.pending.map(v=>v.seq),inputs.slice(39).map(v=>v.seq));
 assert(r.pending.length<=SIDE_PREDICTION_LIMIT);
 const x=reconcileSide(s,1,inputs,0);
 assert.equal(x.pending.length,SIDE_PREDICTION_LIMIT);
 assert.equal(reconcileSide(s,1,inputs,50).predicted,false);
});
