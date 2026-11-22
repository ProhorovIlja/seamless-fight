import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntWhiffResponseTrial,huntWhiffResponseMatrix,HUNT_NEUTRAL_ARENAS
} from '../scripts/hunt-whiff-response-matrix.mjs';
import {HUNT_WEAPONS,HUNT_FORMS} from '../public/side-hunt-lab.mjs';

test('foot­sies reads use the same physically mirrored risk outcome at LEFT and RIGHT arena walls',()=>{
 assert.deepEqual(HUNT_NEUTRAL_ARENAS,['center','left','right']);
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const defenderWeapon of HUNT_WEAPONS)
   for(const attackerForm of HUNT_FORMS)
    for(const attackerHeavy of ['Heavy','Charged'])
     for(const defenderSlot of [0,1])
      for(const answer of ['light','shot','step'])
       for(const responseDelay of [0,2,9]){
        const config={attackerWeapon,defenderWeapon,
         attackerForm,attackerHeavy,defenderSlot,answer,responseDelay};
        const left=huntWhiffResponseTrial({...config,arenaSide:'left'});
        const right=huntWhiffResponseTrial({...config,arenaSide:'right'});
        for(const field of ['category','whiffRecoveryPunish',
         'transformStartupInterrupt','gunParry','firearmChip','counterConnected',
         'counterTick','attackerStartedTrick','trickTick','opponentConnected',
         'defenderLostHp','attackerLostHp','defenderHp','attackerHp',
         'cornerEscaped'])
         assert.deepEqual(left[field],right[field],
          'LEFT/RIGHT wall rule bias in '+field+' '+JSON.stringify(config));
        assert.equal(left.arenaSide,'left');assert.equal(right.arenaSide,'right');
       }
});

test('a genuine stamina-paid quickstep crosses the old rival body in BOTH corners',()=>{
 for(const attackerWeapon of HUNT_WEAPONS)
  for(const attackerForm of HUNT_FORMS)
   for(const attackerHeavy of ['Heavy','Charged'])
    for(const defenderSlot of [0,1])
     for(const arenaSide of ['left','right']){
      const source=huntWhiffResponseTrial({
       attackerWeapon,defenderWeapon:'mournweave',
       attackerForm,attackerHeavy,defenderSlot,arenaSide,
       answer:'step',responseDelay:0,distance:42
      });
      assert(source.cornerEscaped,
       'real body crossing required at '+arenaSide+' '+attackerWeapon+' '+
        attackerForm+' '+attackerHeavy+' slot '+defenderSlot);
      assert(source.cornerEscapeTick!==null);
      assert(source.sourceEvents.some(e=>
       e.kind==='cornerEscape'&&e.actor===defenderSlot&&e.side===arenaSide));
      assert.equal(source.gunParry,false,
       'a directional dodge must not become a fictitious gun parry');
      assert.equal(source.whiffRecoveryPunish,false,
       'a position switch is not automatically a landed melee punish');
     }
});

test('replay matrix supports requested walls but rejects fake wall states',()=>{
 const rows=huntWhiffResponseMatrix({
  arenaSides:['left','right'],delays:[0,9],answers:['light','shot']
 });
 assert.equal(rows.length,2*2*2*2*2*2*2*2);
 assert(new Set(rows.map(r=>r.arenaSide)).has('left'));
 assert(new Set(rows.map(r=>r.arenaSide)).has('right'));
 for(const row of rows){
  assert.equal(row.distance,70);
  assert.equal(row.frames,45);
  assert.equal(row.cornerEscaped,false,
   'without a paid quickstep the matrix never invents wall passing');
 }
 assert.throws(()=>huntWhiffResponseTrial({arenaSide:'unknown'}),TypeError);
 assert.throws(()=>huntWhiffResponseMatrix({arenaSides:['crouch']}),TypeError);
});
