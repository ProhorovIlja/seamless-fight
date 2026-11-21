import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_MOVES,huntMatch,huntStep,huntInspector,huntInput
} from '../public/side-hunt-lab.mjs';

const command=(act='',x=0)=>({act,x,y:0,guard:false});
const fresh=()=>{
 const state=huntMatch();state.ready=0;
 return state;
};
const step=(s,a=command(),b=huntInput())=>huntStep(s,[a,b]);

test('60 Hz training inspector distinguishes i-frames, vulnerable tail and true quickstep recovery',()=>{
 const s=fresh();
 step(s,command('step',1));
 const move=HUNT_MOVES.step;
 const total=move.startup+move.active+move.recovery;
 for(let age=1;age<=total;age++){
  if(age>1)step(s);
  const d=huntInspector(s);
  assert.equal(d.age,age);
  assert.equal(d.quickstepIframes,age>=1&&age<7,`i-frames age=${age}`);
  assert.equal(d.quickstepVulnerableTail,age>=7&&age<9,`tail age=${age}`);
  assert.equal(d.quickstepRecoveryPunishable,age>=9&&age<total,
   `true step recovery age=${age}`);
  assert.equal(d.quickstepRemainingRecovery,age>=9&&age<total?total-age:0);
  assert.equal(d.firearmCounterWindowOpen,false,'movement is never firearm-parryable');
  assert.equal(d.groundedHitstunEscapeReady,false);
 }
 step(s);
 const neutral=huntInspector(s);
 assert.equal(neutral.action,'');
 assert.equal(neutral.quickstepIframes,false);
 assert.equal(neutral.quickstepVulnerableTail,false);
 assert.equal(neutral.quickstepRecoveryPunishable,false);
 assert.equal(neutral.quickstepRemainingRecovery,0);
});

test('source inspector never labels noninvincible backstep as invincible or gun-parryable',()=>{
 const s=fresh();step(s,command('step'));
 assert.equal(huntInspector(s).action,'backstep');
 for(let t=0;t<HUNT_MOVES.backstep.active+HUNT_MOVES.backstep.recovery;t++){
  const d=huntInspector(s);
  assert.equal(d.quickstepIframes,false);
  assert.equal(d.quickstepVulnerableTail,false);
  assert.equal(d.quickstepRecoveryPunishable,false);
  assert.equal(d.firearmCounterWindowOpen,false);
  step(s);
 }
});

test('gun counter indicator tracks exact committed heavy windows, not every attack phase',()=>{
 for(const weapon of ['mournweave','thornwake']){
  const s=huntMatch({weapons:[weapon,'mournweave']});s.ready=0;
  const heavy=weapon==='mournweave'?HUNT_MOVES.foldedHeavy:
   // The actual canonical per-weapon move data owns the parry boundary.
   null;
  step(s,command('heavy'));
  const startup=huntInspector(s).startup;
  const active=huntInspector(s).active;
  const from=Math.max(2,startup-6),through=startup+active;
  const max=through+3;
  for(let age=1;age<=max;age++){
   if(age>1)step(s);
   const d=huntInspector(s);
   assert.equal(d.firearmCounterWindowOpen,age>=from&&age<through,
    `${weapon} age=${age}`);
   assert.equal(d.quickstepIframes,false);
  }
  if(heavy)assert.equal(heavy.startup,startup);
 }
});
