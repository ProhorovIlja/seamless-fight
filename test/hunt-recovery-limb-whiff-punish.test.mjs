import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_MOVES,HUNT_WEAPONS,huntMatch,huntMoveSpec,huntHurtbox,
 huntAttackbox,huntStep,huntInput
} from '../public/side-hunt-lab.mjs';

// Original 2.5D melee geometry, mirrored at both sides of a single arena.
// Defender's attack stops SHORT of the opponent's body by 14 game units.
// Only the modest exposed recovery arm is reachable; never the whole blade.
function exchange(weapon,mirror=false,phase='recovery',spent=false){
 const state=huntMatch({weapons:['mournweave',weapon]});state.ready=0;
 const a=state.p[0],b=state.p[1];
 a.x=mirror?580:380;
 a.dir=mirror?-1:1;
 b.x=mirror?460:500;
 b.dir=-a.dir;
 a.act='foldedLight';
 a.age=HUNT_MOVES.foldedLight.startup;
 b.act='unfurledHeavy';
 const m=huntMoveSpec(b);
 b.age=phase==='startup'?m.startup-1:
  phase==='active'?m.startup:
  phase==='done'?m.startup+m.active+m.recovery:
  m.startup+m.active;
 b.spent=spent;
 const initial=huntHurtbox(b);
 const aBox=huntAttackbox(a);
 const body=mirror?b.x+18:b.x-18;
 const attackTip=mirror?aBox.left:aBox.right;
 assert.equal(Math.abs(attackTip-body),14,
  'source attack must miss the unextended torso by fourteen units');
 const events=[];
 huntStep(state,[huntInput(),huntInput()],events);
 return {state,events,initial,body,attackTip,extension:
  Math.min(24,Math.floor(m.reach/5))};
}

test('recovery arm enables true short-range whiff punish for BOTH original weapons and both sides',()=>{
 for(const weapon of HUNT_WEAPONS)for(const mirror of [false,true]){
  const e=exchange(weapon,mirror);
  assert.equal(e.extension,24);
  assert.equal(mirror?e.initial.right:e.initial.left,
   mirror?e.body+24:e.body-24);
  const punish=e.events.find(x=>x.kind==='hit'&&x.actor===0&&x.target===1);
  assert(punish,`${weapon}, mirror=${mirror}: recovery-arm contact missed`);
  assert.equal(punish.punishedRecovery,true);
  assert.equal(punish.punishedMove,'unfurledHeavy');
  assert(punish.remainingRecovery>0);
  assert.equal(e.events.some(x=>x.kind==='gunParry'),false);
 }
});

test('arm extension is never active in startup, active phase or after recovery',()=>{
 for(const phase of ['startup','active','done']){
  const e=exchange('mournweave',false,phase);
  assert.equal(e.initial.left,e.body,`no extended hurtbox during ${phase}`);
  assert.equal(e.events.some(x=>x.kind==='hit'&&x.actor===0),false,
   `no fabricated whiff punish in ${phase}`);
 }
});

test('a SUCCESSFUL heavy swing gets no fictional whiff arm; genuine body stays hittable',()=>{
 for(const weapon of HUNT_WEAPONS)for(const mirror of [false,true]){
  const noWhiff=exchange(weapon,mirror,'recovery',true);
  assert.equal(mirror?noWhiff.initial.right:noWhiff.initial.left,noWhiff.body,
   weapon+' successful attack must not expose the extra recovering arm');
  assert.equal(noWhiff.events.some(e=>e.kind==='hit'&&e.actor===0),false,
   'the 14-unit real torso miss cannot magically connect after a landed heavy');
  const s=huntMatch({weapons:['mournweave',weapon]});s.ready=0;
  const a=s.p[0],b=s.p[1],m=huntMoveSpec({weapon,act:'unfurledHeavy'});
  a.x=mirror?560:420;a.dir=mirror?-1:1;
  b.x=mirror?480:500;b.dir=-a.dir;
  a.act='foldedLight';a.age=HUNT_MOVES.foldedLight.startup;
  b.act='unfurledHeavy';b.age=m.startup+m.active;b.spent=true;
  const h=huntHurtbox(b);
  assert.equal(h.right-h.left,36,'successful contact must retain normal torso dimensions');
  const events=[];
  huntStep(s,[huntInput(),huntInput()],events);
  const hit=events.find(e=>e.kind==='hit'&&e.actor===0&&e.target===1);
  assert(hit,'real successful-attack recovery torso remains damageable');
  assert.equal(hit.punishedRecovery,false,
   'hit on recovery after the prior attack landed is NOT a whiff punish');
  assert.equal(hit.punishedMove,'');
 }
});

test('hurtbox never extends for neutral footsies, firearm or ordinary quickstep',()=>{
 const s=huntMatch();s.ready=0;
 const p=s.p[1];
 for(const action of ['', 'shot','airShot','step','backstep']){
  p.act=action;
  p.age=action?10:0;
  const h=huntHurtbox(p);
  assert.equal(h.left,p.x-18,action+' left');
  assert.equal(h.right,p.x+18,action+' right');
 }
});
