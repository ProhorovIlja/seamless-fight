import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntMatch,huntStep,huntMoveSpec,huntInput
} from '../public/side-hunt-lab.mjs';

// Both hitboxes are genuinely active and colliding in the same deterministic
// 60 Hz simulation tick. No success events or damage values are forged.
function trade(weapons=['mournweave','mournweave'],rally=0){
 const s=huntMatch({weapons});s.ready=0;
 s.p[0].x=430;s.p[1].x=500;
 s.p[0].dir=1;s.p[1].dir=-1;
 for(const p of s.p){
  p.act='foldedLight';
  p.age=huntMoveSpec(p).startup;
  p.hp=rally>0?80:100;
  p.rally=rally;
  p.rallyLife=rally>0?50:0;
 }
 const events=[];
 huntStep(s,[huntInput(),huntInput()],events);
 const hits=events.filter(e=>e.kind==='hit');
 assert.equal(hits.length,2,'both physical attacks must connect');
 assert.deepEqual(hits.map(x=>x.actor).sort(),[0,1]);
 assert.equal(hits[0].tick,hits[1].tick,'trade is simultaneous');
 return {s,events};
}

test('mirrored same-frame R1 trades do not grant player-two instant Rally privilege',()=>{
 const {s,events}=trade();
 assert.deepEqual(s.p.map(x=>x.hp),[85,85],
  'first and second input slots must take identical real contact damage');
 assert.deepEqual(s.p.map(x=>x.rally),[15,15],
  'both players accumulate the same future Rally opportunity');
 assert.deepEqual(s.p.map(x=>x.hitConfirmed),[false,false],
  'neither stunned fighter may retain a phantom hit-confirm');
 assert.deepEqual(s.p.map(x=>x.act),['stun','stun']);
 assert.equal(events.filter(x=>x.kind==='rally').length,0,
  'newly earned Rally is never used retroactively within its own trade tick');
});

test('only pre-existing Rally may be regained on a simultaneous trade, independent of slot',()=>{
 const {s,events}=trade(['mournweave','mournweave'],10);
 assert.deepEqual(s.p.map(x=>x.hp),[75,75],
  'pre-hit Rally 10 offsets one 15-damage hit for each fighter');
 assert.deepEqual(s.p.map(x=>x.rally),[15,15]);
 const regain=events.filter(x=>x.kind==='rally');
 assert.equal(regain.length,2);
 assert.deepEqual(regain.map(x=>x.health),[10,10]);
});

test('different weapon trade damage mirrors correctly when the fighter slots are swapped',()=>{
 const first=trade(['mournweave','thornwake']).s;
 const mirror=trade(['thornwake','mournweave']).s;
 assert.deepEqual(first.p.map(x=>x.hp),[88,85]);
 assert.deepEqual(mirror.p.map(x=>x.hp),[85,88]);
 assert.equal(first.p[0].hp,mirror.p[1].hp);
 assert.equal(first.p[1].hp,mirror.p[0].hp);
 assert.deepEqual(first.p.map(x=>x.hitConfirmed),[false,false]);
 assert.deepEqual(mirror.p.map(x=>x.hitConfirmed),[false,false]);
});

test('source-simulated trade repeats byte-for-byte from an identical snapshot',()=>{
 const a=trade(['thornwake','mournweave'],10);
 const b=trade(['thornwake','mournweave'],10);
 assert.deepEqual(a.s,b.s);
 assert.deepEqual(a.events,b.events);
});
