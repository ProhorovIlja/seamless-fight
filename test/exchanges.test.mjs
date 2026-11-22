import test from 'node:test';
import assert from 'node:assert/strict';
import {match,step,blank} from '../public/engine.mjs';
const input=(act)=>({...blank(),act});
const setup=(x=70)=>{const s=match();s.ready=0;s.p[0].x=400;s.p[1].x=400+x;return s;};
test('analysis observes misses and whiff punishes without affecting the engine state',()=>{
 const s=setup(), plain=structuredClone(s), events=[];
 Object.assign(s.p[0],{act:'hew',age:28,fx:-1,fy:0});Object.assign(plain.p[0],s.p[0]);
 for(let i=0;i<13;i++){const pair=[blank(),i===1?input('cut'):blank()];step(s,pair,events);step(plain,pair);}
 assert.deepEqual(s,plain);
 assert.deepEqual(events.map(x=>x.kind),['miss','whiff punish']);
 assert.equal(events[1].damage,19);
});
test('pistol interrupt is distinct from a hit and a canceled heavy is not a miss',()=>{
 const s=setup(),events=[];
 Object.assign(s.p[0],{act:'shot',age:8,fx:1,fy:0});
 Object.assign(s.p[1],{act:'hew',age:15,fx:-1,fy:0});
 step(s,[blank(),blank()],events);assert.equal(events[0].kind,'interrupt');assert.equal(s.p[1].act,'stun');
 const q=setup();Object.assign(q.p[0],{act:'hew',age:8});events.length=0;
 for(let i=0;i<35;i++)step(q,[i===0?input('feint'):blank(),blank()],events);
 assert.deepEqual(events,[]);
});