import test from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntStep,huntInput}
 from '../public/side-hunt-lab.mjs';
const move=x=>({x,y:0,act:'',guard:false});
function pointBlank(swap=false){
 const s=huntMatch();s.ready=0;
 s.p[0].x=swap?480.5:479.5;
 s.p[1].x=swap?479.5:480.5;
 s.p[0].vx=0;s.p[1].vx=0;
 s.p[0].act='';s.p[1].act='';
 const events=[];
 huntStep(s,swap?[huntInput(),move(1)]:[move(1),huntInput()],events);
 return {s,events};
}
test('neutral auto-facing follows final body-separation coordinates for both player slots',()=>{
 for(const swap of [false,true]){
  const {s,events}=pointBlank(swap);
  const a=s.p[0],b=s.p[1];
  assert(swap?a.x<b.x:a.x>b.x,
   'the movement and collision solver must actually reverse fighter sides');
  assert.equal(a.dir,b.x>=a.x?1:-1,'player 0 faces final opponent position');
  assert.equal(b.dir,a.x>=b.x?1:-1,'player 1 faces final opponent position');
  assert.equal(a.dir,-b.dir,'neutral fighters cannot both face away or same way');
  assert.equal(events.some(e=>e.kind==='cornerEscape'),false,
   'point-blank collision does not trigger a fake corner escape');
  assert.equal(Math.abs(a.x-b.x)>=37.999,true,
   'body separation must still stop uninvincible overlap');
 }
});
test('committed attack direction is not retroactively flipped by neutral facing fix',()=>{
 const s=huntMatch();s.ready=0;
 s.p[0].x=479.5;s.p[1].x=480.5;
 s.p[0].act='foldedHeavy';s.p[0].age=1;s.p[0].dir=1;
 s.p[1].act='';s.p[1].vx=-15;s.p[1].dir=-1;
 huntStep(s,[huntInput(),move(-1)]);
 assert.equal(s.p[0].act,'foldedHeavy');
 assert.equal(s.p[0].dir,1,
  'committed heavy must retain physical orientation even if rival crosses');
 assert.equal(s.p[1].dir,s.p[0].x>=s.p[1].x?1:-1,
  'non-committed hunter must auto-face the settled target');
});
test('identical neutral crossing snapshots deterministically replay',()=>{
 for(const swap of [false,true]){
  assert.deepEqual(pointBlank(swap),pointBlank(swap));
 }
});
