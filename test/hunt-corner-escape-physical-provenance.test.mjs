import test from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntInput,huntStep,HUNT_FLOOR,HUNT_W}
 from '../public/side-hunt-lab.mjs';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';

const cmd=(act='',x=0)=>({...huntInput(),act,x});

function crossingByOpponent({wall,defenderSlot}){
 const s=huntMatch();s.ready=0;
 const p=s.p[defenderSlot],q=s.p[1-defenderSlot];
 const left=wall==='left',direction=left?1:-1;
 p.x=left?65:HUNT_W-65;
 p.y=HUNT_FLOOR;
 p.act='step';p.age=1;p.dir=direction;p.vx=10.6*direction;p.st=75;
 q.x=left?107:HUNT_W-107;
 // A quick airborne overpass on THIS frame reverses their ordering without
 // the defender ever reaching the rival's original 38-unit body footprint.
 q.y=350;q.jumps=1;q.vy=0;q.act='';q.vx=-95*direction;
 const before={px:p.x,qx:q.x};
 const events=[];
 const inputs=[huntInput(),huntInput()];
 inputs[1-defenderSlot]=cmd('',-direction);
 huntStep(s,inputs,events);
 return {s,events,before,p,q};
}

test('opponent crossing over a paid step cannot manufacture a cornerEscape event',()=>{
 for(const wall of ['left','right'])for(const defenderSlot of [0,1]){
  const {s,events,before,p,q}=crossingByOpponent({wall,defenderSlot});
  const oldOrder=Math.sign(before.px-before.qx);
  const newOrder=Math.sign(p.x-q.x);
  assert.equal(newOrder,-oldOrder,'rival overpass must truly reverse side order');
  assert.equal(p.act,'step','hunter actually quicksteps during same tick');
  assert(p.vx*p.dir>0,'defender quickstep is physically forward');
  const entered=before.px<before.qx?
   p.x>=before.qx-19:p.x<=before.qx+19;
  assert.equal(entered,false,
   'rival moved over hunter, hunter never entered rival prior body footprint');
  assert.equal(events.some(e=>e.kind==='cornerEscape'&&e.actor===defenderSlot),
   false,'side change caused by the rival must not grant escape training points');
  assert(s.p.every(x=>Number.isFinite(x.x)&&Number.isFinite(x.y)));
 }
});

test('real left and right corner pressure escapes still earn physical quickstep cross events',()=>{
 for(const wall of ['left','right']){
  const session=huntPracticeSession({
   drill:wall==='left'?'corner-escape':'corner-escape-right'
  });
  for(let t=1;t<=66;t++){
   const direction=wall==='left'?1:-1;
   assert(session.append(t===48?cmd('step',direction):huntInput()));
  }
  const crossing=session.eventHistory(400).find(x=>
   x.kind==='cornerEscape'&&x.actor===0&&x.side===wall);
  assert(crossing,'a legitimate 38U body crossing under real gun/attack physics remains possible');
  assert.equal(session.goal().successes,1);
 }
});
