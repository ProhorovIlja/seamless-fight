import test from 'node:test';
import assert from 'node:assert/strict';
import {match} from '../public/engine.mjs';
import {threatState,trainingReadout,drawTrainingGeometry} from '../public/training-geometry.mjs';

function duel(){
 const s=match();s.ready=0;
 s.p[0].x=440;s.p[0].y=270;s.p[0].fx=1;s.p[0].fy=0;
 s.p[1].x=510;s.p[1].y=270;
 s.p[0].act='cut';s.p[0].age=10;s.p[0].spent=false;
 return s;
}
test('training attack cone agrees with center-distance, facing and exact active ticks',()=>{
 const s=duel();
 let p=threatState(s,0);
 assert.deepEqual([p.phase,p.active,p.inRange,p.canHit,p.distance,p.reach],['active',true,true,true,70,86]);
 s.p[0].age=9;p=threatState(s,0);
 assert.deepEqual([p.phase,p.active,p.canHit],['startup',false,false]);
 s.p[0].age=15;p=threatState(s,0);
 assert.deepEqual([p.phase,p.canHit],['recovery',false]);
 s.p[0].age=10;s.p[1].x=530;assert.equal(threatState(s,0).canHit,false,'beyond cut reach');
 s.p[1].x=400;assert.equal(threatState(s,0).canHit,false,'behind attacker');
 s.p[1].x=510;s.p[1].y=360;assert.equal(threatState(s,0).canHit,false,'outside both distance and arc');
 s.p[1].y=270;s.ready=15;assert.equal(threatState(s,0).canHit,false,'countdown cannot hit');
 assert.throws(()=>threatState(s,3),TypeError);
});
test('quickstep invulnerability, spent attacks, and pistol narrow cone are explicit',()=>{
 const s=duel();
 s.p[1].act='step';s.p[1].age=5;
 assert.equal(threatState(s,0).invulnerable,true);assert.equal(threatState(s,0).canHit,false);
 s.p[1].age=9;assert.equal(threatState(s,0).canHit,true);
 s.p[0].spent=true;assert.equal(threatState(s,0).canHit,false);
 s.p[0].spent=false;s.p[0].act='shot';s.p[0].age=8;s.p[1].x=560;
 assert.equal(threatState(s,0).canHit,true);
 s.p[1].x=530;s.p[1].y=365;
 assert.equal(threatState(s,0).canHit,false,'side-angle is outside pistol cone');
 assert.match(trainingReadout(s),/Center spacing/);
});
test('draw training geometry is render-only and leaves authoritative state unchanged',()=>{
 const s=duel(),original=structuredClone(s),calls=[];
 const g=new Proxy({}, {
  get(_,key){return (...args)=>{calls.push([key,...args]);};},
  set(){return true;}
 });
 drawTrainingGeometry(g,s);
 assert.deepEqual(s,original);
 assert(calls.some(c=>c[0]==='arc'),'range cone is drawn');
 assert(calls.some(c=>c[0]==='moveTo'),'center target is drawn');
 assert(calls.some(c=>c[0]==='fillText'),'non-color phase marker is drawn');
});
