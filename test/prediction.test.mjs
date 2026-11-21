import test from 'node:test';
import assert from 'node:assert/strict';
import {match,step,blank} from '../public/engine.mjs';
import {reconcile,HISTORY_LIMIT} from '../public/prediction.mjs';
const live=()=>{const s=match();s.ready=0;return s;};
const input=(seq)=>({x:1,y:0,seq,act:'hew'});
test('a delayed snapshot is replayed using only unacknowledged input',()=>{
 const initial=live(), server=structuredClone(initial);
 const commands=Array.from({length:6},(_,i)=>input(i+1));
 for (const cmd of commands.slice(0,3)) step(server,[{...cmd,act:''},blank()]);
 const next=reconcile(server,0,commands,3);
 assert.deepEqual(next.pending.map(i=>i.seq),[4,5,6]);
 for (const cmd of commands.slice(3)) step(server,[{...cmd,act:''},blank()]);
 assert.equal(next.p.x,server.p[0].x);
 assert.equal(next.p.act,'');
 assert.equal(next.p.hp,100);
});
test('history is bounded; round transitions discard outstanding inputs',()=>{
 const s=live(), commands=Array.from({length:40},(_,i)=>input(i+1));
 assert.equal(reconcile(s,0,commands,0).pending.length,HISTORY_LIMIT);
 s.ready=30;const next=reconcile(s,0,commands,0);
 assert.deepEqual(next.pending,[]);assert.equal(next.p.x,s.p[0].x);
});
test('prediction leaves melee proximity and committed actions to the server',()=>{
 const s=live();s.p[1].x=s.p[0].x+42;
 assert.equal(reconcile(s,0,[input(1)],0).p.x,s.p[0].x);
 s.p[1].x+=200;s.p[0].act='step';
 assert.equal(reconcile(s,0,[input(1)],0).p.x,s.p[0].x);
});
