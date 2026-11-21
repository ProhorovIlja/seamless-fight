import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_WEAPONS,huntMatch,huntStep,huntInput,huntHurtbox,huntMoveSpec,
 huntInspector
} from '../public/side-hunt-lab.mjs';
import {huntFrameMeter} from '../public/hunt-practice-suite.mjs';

const press=act=>({x:0,y:0,act,guard:false});
const frame=s=>huntStep(s,[huntInput(),huntInput()]);

test('all 60Hz whiffed heavy recovery ages expose EXACT bounded arm geometry in training',()=>{
 for(const weapon of HUNT_WEAPONS){
  const s=huntMatch({weapons:[weapon,'mournweave']});s.ready=0;
  huntStep(s,[press('heavy'),huntInput()]);
  const p=s.p[0],spec=huntMoveSpec(p);
  const until=spec.startup+spec.active+spec.recovery;
  const extension=Math.min(24,Math.floor(spec.reach/5));
  let advertised=0;
  for(let age=1;age<=until;age++){
   const d=huntFrameMeter(s);
   assert.equal(d.frames.age,age,weapon+' authoring tick mismatch');
   const actual=age>=spec.startup+spec.active&&age<until;
   assert.equal(d.whiffRecoveryArmExposed,actual,weapon+' age='+age);
   assert.equal(d.whiffRecoveryArmUnits,actual?extension:0,weapon+' arm '+age);
   assert.equal(huntInspector(s).whiffRecoveryArmExposed,actual);
   const box=huntHurtbox(p);
   assert.equal(box.right-p.x,18+(actual?extension:0),
    weapon+' right-facing recovering arm tracks real collision');
   assert.equal(box.left,p.x-18);
   if(actual)advertised++;
   if(age<until)frame(s);
  }
  assert.equal(advertised,spec.recovery,weapon+' all but terminal recovery age');
  frame(s);
  assert.equal(huntFrameMeter(s).whiffRecoveryArmExposed,false);
  assert.equal(huntFrameMeter(s).whiffRecoveryArmUnits,0);
 }
});

test('a confirmed successful hit never exposes a bonus limb, even as recovery becomes actionable later',()=>{
 for(const weapon of HUNT_WEAPONS){
  const s=huntMatch({weapons:[weapon,'mournweave']});s.ready=0;
  s.p[1].x=s.p[0].x+90;
  huntStep(s,[press('heavy'),huntInput()]);
  let contact=false,checked=0;
  for(let i=0;i<95;i++){
   if(s.p[0].spent)contact=true;
   const d=huntFrameMeter(s);
   const attack=s.p[0].act==='foldedHeavy';
   const spec=attack?huntMoveSpec(s.p[0]):null;
   if(contact&&attack&&d.frames.phase==='recovery'&&
      d.frames.age<spec.startup+spec.active+spec.recovery){
    checked++;
    assert.equal(d.whiffRecoveryArmExposed,false,
      weapon+' landed heavy cannot be called a whiff');
    assert.equal(d.whiffRecoveryArmUnits,0);
    assert.equal(huntHurtbox(s.p[0]).right-s.p[0].x,18,
      'torso is STILL hittable, but no invented 24U limb extension');
   }
   frame(s);
  }
  assert.equal(contact,true,weapon+' actual melee contact required');
  assert(checked>0,weapon+' real success recovery must be inspected');
 }
});

test('whiff limb evidence is never available for shots, backstep, quickstep, idle or stagger',()=>{
 const s=huntMatch();s.ready=0;
 const p=s.p[0];
 for(const action of ['','shot','airShot','backstep','step','stagger','heal','blood']){
  p.act=action;p.age=10;p.spent=false;
  assert.equal(huntFrameMeter(s).whiffRecoveryArmExposed,false,action);
  assert.equal(huntFrameMeter(s).whiffRecoveryArmUnits,0,action);
 }
});
