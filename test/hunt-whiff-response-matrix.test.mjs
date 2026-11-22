import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntWhiffResponseTrial,huntWhiffResponseMatrix,
 HUNT_NEUTRAL_RESPONSE_DELAYS,HUNT_NEUTRAL_RESPONSE_ACTIONS
} from '../scripts/hunt-whiff-response-matrix.mjs';
import {HUNT_WEAPONS,HUNT_FORMS,HUNT_HZ} from '../public/side-hunt-lab.mjs';

const same=(x,y)=>{
 // The same exchange must resolve the same way after physically mirroring
 // both fighters and swapping player slots. Never reward a slot bias.
 for(const field of ['category','whiffRecoveryPunish',
  'transformStartupInterrupt','gunParry','firearmChip',
  'counterConnected','counterMove','counterTick','attackerStartedTrick',
  'trickTick','opponentConnected','defenderLostHp','attackerLostHp',
  'defenderHp','attackerHp'])
  assert.deepEqual(x[field],y[field],
   'mirrored slots diverged in '+field+' for '+x.attackerWeapon+' / '+
    x.defenderWeapon+' / '+x.attackerForm+' / '+x.answer+' @'+
    x.responseDelay+' frame');
};

test('both-source-weapons no-block R2 response sweeps are actual 60Hz mirror-fair exchanges',()=>{
 const all=huntWhiffResponseMatrix();
 assert.equal(all.length,2*2*2*2*2*3*4);
 assert.deepEqual(HUNT_NEUTRAL_RESPONSE_DELAYS,[0,2,5,9]);
 assert.deepEqual(HUNT_NEUTRAL_RESPONSE_ACTIONS,['light','shot','step']);
 assert(all.every(x=>x.hz===HUNT_HZ&&
  x.rules==='sf-hunt-lab/3'&&x.distance===70&&x.frames===45));
 for(let i=0;i<all.length;i+=2*3*4){
  // Input loop order: each slot enumerates all 3 answers and 4 delays.
  for(let j=0;j<3*4;j++)same(all[i+j],all[i+3*4+j]);
 }
 assert(all.every(x=>!Object.hasOwn(x,'sourceEvents')),
  'report projections must be compact, not fake raw frame telemetry');
});

test('pre-read R1 truly interrupts the NEW trick startup after early R2 whiff lock',()=>{
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const attackerHeavy of ['Heavy','Charged'])
     for(const defenderSlot of [0,1]){
      const v=huntWhiffResponseTrial({
       attackerWeapon,defenderWeapon,attackerForm,attackerHeavy,
       defenderSlot,answer:'light',responseDelay:0
      });
      assert.equal(v.attackerStartedTrick,true,
       'failed R2 must actually attempt its later legal L1');
      assert.equal(v.counterConnected,true);
      assert.equal(v.transformStartupInterrupt,true,
       'prediction R1 actually contacts the authored transformation startup');
      assert.equal(v.category,'transformStartupInterrupt');
      assert.equal(v.whiffRecoveryPunish,false,
       'do not mislabel an interrupt of NEW L1 startup as original R2 recovery');
      assert.equal(v.gunParry,false);
      assert(v.sourceEvents.some(e=>e.kind==='hit'&&
       e.actor===defenderSlot&&e.target===1-defenderSlot&&
       e.interruptedMove=== (attackerForm==='folded'?'unfurl':'refold')&&
       e.hitDuringStartup===true));
     }
});

test('two-frame gun timing reads a transforming attack; it cannot parry every arbitrary frame',()=>{
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const attackerHeavy of ['Heavy','Charged'])
     for(const defenderSlot of [0,1]){
      const result=huntWhiffResponseTrial({
       attackerWeapon,defenderWeapon,attackerForm,attackerHeavy,
       defenderSlot,answer:'shot',responseDelay:2
      });
      assert.equal(result.gunParry,true,
       'gun must collide inside a REAL vulnerable L1 opening');
      assert.equal(result.category,'gunParry');
      assert.equal(result.whiffRecoveryPunish,false);
      assert(result.sourceEvents.some(e=>e.kind==='gunParry'&&
       e.actor===defenderSlot&&e.target===1-defenderSlot));
     }
});

test('real late answers are recorded as misses, trades or interruptions; never awarded synthetic whiff rewards',()=>{
 const results=huntWhiffResponseMatrix();
 const values=new Set(results.map(x=>x.category));
 assert(values.has('transformStartupInterrupt'));
 assert(values.has('gunParry'));
 assert(results.every(row=>row.whiffRecoveryPunish?row.category==='realWhiffRecoveryHit':true));
 assert(results.some(x=>x.opponentConnected||x.defenderLostHp),
  'at least one delayed wrong read must suffer actual offensive consequence');
 for(const answer of ['light','shot','step']){
  assert(results.some(x=>x.answer===answer&&x.responseDelay===9));
 }
 for(const row of results.filter(x=>x.answer==='step'))
  assert.equal(row.gunParry,false,'a dodge cannot become an unearned gun parry');
});

test('matrix rejects fabricated inputs and never creates impossible unsupported combat modes',()=>{
 const bad=[
  {defenderSlot:2},{answer:'guard'},{answer:'grab'},
  {answer:'airStep'},{attackerWeapon:'bloodborne'},
  {attackerHeavy:'Low'},{attackerForm:'crouching'},
  {distance:10},{responseDelay:-1},{frames:10}
 ];
 for(const overrides of bad)
  assert.throws(()=>huntWhiffResponseTrial(overrides),TypeError);
 assert.throws(()=>huntWhiffResponseMatrix({delays:[-1]}),TypeError);
 assert.throws(()=>huntWhiffResponseMatrix({answers:['throw']}),TypeError);
});
