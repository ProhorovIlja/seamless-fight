import test from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntStep,HUNT_MOVES} from '../public/side-hunt-lab.mjs';

// Source-simulation evidence, not a fabricated event inserted into a scorekeeper.
function meleeContactDuringQuickstepAge(age,attackerSlot=0){
 const s=huntMatch();
 s.ready=0;
 s.p[0].x=attackerSlot===0?430:500;
 s.p[1].x=attackerSlot===0?500:430;
 const attacker=s.p[attackerSlot],defender=s.p[1-attackerSlot];
 attacker.act='foldedLight';
 attacker.age=HUNT_MOVES.foldedLight.startup;
 defender.act='step';
 defender.age=age;
 defender.vx=0;
 const events=[];
 huntStep(s,[{x:0,y:0,act:'',guard:false},{x:0,y:0,act:'',guard:false}],events);
 return {s,hit:events.find(e=>e.kind==='hit'&&e.actor===attackerSlot&&e.target===1-attackerSlot)};
}

test('genuine dodge punish labels begin at recovery, not at the end of invulnerable frames',()=>{
 const step=HUNT_MOVES.step;
 assert.equal(step.startup,0);
 assert.equal(step.active,9);
 assert.equal(step.recovery,12);
 const firstRecovery=step.startup+step.active;
 const lastRecovery=firstRecovery+step.recovery-1;
 for(const slot of [0,1]){
  // Quickstep age 1-6 cannot be struck through existing source i-frames.
  for(const age of [1,6]){
   const {hit}=meleeContactDuringQuickstepAge(age,slot);
   assert.equal(hit,undefined,`slot ${slot} age ${age} is invulnerable`);
  }
  // Age 7/8 is vulnerable, but belongs to the ACTIVE quickstep phase.
  for(const age of [7,8]){
   const {hit}=meleeContactDuringQuickstepAge(age,slot);
   assert(hit,`slot ${slot} age ${age} can be hit`);
   assert.equal(hit.punishedDodgeVulnerableTail,true);
   assert.equal(hit.punishedDodgeRecovery,false);
   assert.equal(hit.dodgeRecoveryFrames,0);
   assert.equal(hit.punishedRecovery,false);
  }
  for(const age of [firstRecovery,firstRecovery+1,lastRecovery]){
   const {hit}=meleeContactDuringQuickstepAge(age,slot);
   assert(hit,`slot ${slot} age ${age} can be hit`);
   assert.equal(hit.punishedDodgeVulnerableTail,false);
   assert.equal(hit.punishedDodgeRecovery,true);
   assert.equal(hit.dodgeRecoveryFrames,step.startup+step.active+step.recovery-age);
   assert.equal(hit.punishedRecovery,false);
  }
  // Once the old step has ended, a hit is ordinary damage, not a step punish.
  const {hit}=meleeContactDuringQuickstepAge(lastRecovery+1,slot);
  assert(hit);
  assert.equal(hit.punishedDodgeRecovery,false);
  assert.equal(hit.punishedDodgeVulnerableTail,false);
  assert.equal(hit.dodgeRecoveryFrames,0);
 }
});
