import test from 'node:test';
import assert from 'node:assert/strict';
import {
 huntMatch,huntInput,huntStep,huntMoveSpec,HUNT_WEAPONS,
 HUNT_WHIFF_HEAVY_TRANSFORM_RECOVERY,huntInspector
} from '../public/side-hunt-lab.mjs';
import {huntFrameMeter} from '../public/hunt-practice-suite.mjs';
const trick=()=>({...huntInput(),act:'trick'});
function seeded({weapon,slot,form='folded',move='heavy',caseType='early'}){
 const s=huntMatch({weapons:[weapon,weapon]});s.ready=0;
 s.p[0].x=360;s.p[1].x=800;
 s.p[0].vx=0;s.p[1].vx=0;
 s.p[0].dir=1;s.p[1].dir=-1;
 const p=s.p[slot];
 p.form=form;
 p.act=form+(move==='heavy'?'Heavy':'Light');
 const spec=huntMoveSpec(p);
 p.age=caseType==='early'?spec.startup+spec.active+3:
  caseType==='late'?spec.startup+spec.active+HUNT_WHIFF_HEAVY_TRANSFORM_RECOVERY:
  caseType==='hit'?spec.startup+spec.active-1:spec.startup+1;
 p.hitConfirmed=caseType==='hit';p.spent=caseType==='hit';
 p.st=100;p.chain=1;
 return {s,p,previous:p.act,age:p.age};
}
test('missed heavy and charged commitments expose four REAL recovery frames before trick coverage',()=>{
 assert.equal(HUNT_WHIFF_HEAVY_TRANSFORM_RECOVERY,4);
 for(const weapon of HUNT_WEAPONS)for(const form of ['folded','unfurled'])
  for(const slot of [0,1]){
   for(const action of ['heavy','charge']){
    const caseEarly=seeded({weapon,form,slot,caseType:'early'});
    if(action==='charge'){
     caseEarly.p.act=form+'Charged';
     const spec=huntMoveSpec(caseEarly.p);
     caseEarly.p.age=spec.startup+spec.active+3;
    }
    const beforeSt=caseEarly.p.st;
    const inputs=[huntInput(),huntInput()];inputs[slot]=trick();
    const events=[];
    huntStep(caseEarly.s,inputs,events);
    assert.equal(caseEarly.p.act,caseEarly.previous==='foldedHeavy'&&action==='charge'?
     'foldedCharged':caseEarly.previous==='unfurledHeavy'&&action==='charge'?
     'unfurledCharged':caseEarly.previous,
     'R2 whiff does not instantly cover its recovery via L1');
    assert.equal(caseEarly.p.st,beforeSt,'no stamina spent on denied early morph');
    assert.equal(events.filter(x=>x.kind==='action'&&x.actor===slot&&
     ['unfurl','refold'].includes(x.move)).length,0);
    const caseLate=seeded({weapon,form,slot,caseType:'late'});
    if(action==='charge'){
     caseLate.p.act=form+'Charged';
     const spec=huntMoveSpec(caseLate.p);
     caseLate.p.age=spec.startup+spec.active+HUNT_WHIFF_HEAVY_TRANSFORM_RECOVERY;
    }
    const lateEvent=[];
    huntStep(caseLate.s,inputs,lateEvent);
    assert.equal(caseLate.p.act,form==='folded'?'unfurl':'refold',
     'after real R2 whiff recovery the paid trick attack is still permitted');
    assert(caseLate.p.st<100,'paid transform attack must cost stamina');
    assert(lateEvent.some(x=>x.kind==='action'&&x.actor===slot&&
     x.move===caseLate.p.act));
   }
  }
});
test('confirmed heavy hit still converts into L1, fast whiffed light and paid grounded step retain routes',()=>{
 for(const weapon of HUNT_WEAPONS)for(const form of ['folded','unfurled'])
  for(const slot of [0,1]){
   for(const config of [{caseType:'hit',move:'heavy'},{caseType:'light',move:'light'}]){
    const {s,p}=seeded({weapon,form,slot,...config});
    const input=[huntInput(),huntInput()];input[slot]=trick();
    const before=p.st;
    huntStep(s,input);
    assert.equal(p.act,form==='folded'?'unfurl':'refold');
    assert(p.st<before);
   }
  }
});

test('training exposes exactly four genuine unconfirmed heavy recovery frames without leaking nonexistent block state',()=>{
 for(const weapon of HUNT_WEAPONS)for(const form of ['folded','unfurled'])
  for(const slot of [0,1]){
   const {s,p}=seeded({weapon,slot,form,caseType:'early'});
   const m=huntMoveSpec(p);
   p.age=m.startup+m.active;
   for(let elapsed=0;elapsed<=5;elapsed++){
    const expected=Math.max(0,HUNT_WHIFF_HEAVY_TRANSFORM_RECOVERY-elapsed);
    assert.equal(huntInspector(s,slot).whiffHeavyMorphLockFrames,expected,
     weapon+' '+form+' '+slot+' recovery +'+elapsed);
    assert.equal(huntFrameMeter(s,slot).whiffHeavyMorphLockFrames,expected);
    huntStep(s,[huntInput(),huntInput()]);
   }
   p.age=m.startup+m.active;p.hitConfirmed=true;p.spent=true;
   assert.equal(huntFrameMeter(s,slot).whiffHeavyMorphLockFrames,0,
    'confirmed contact may morph normally without fictional whiff lock');
   p.act=form+'Light';p.hitConfirmed=false;p.spent=false;
   assert.equal(huntInspector(s,slot).whiffHeavyMorphLockFrames,0,
    'fast R1 still retains its original attack-linked transform route');
  }
});


test('real connected light attacks really punish a whiffed R2 attempting early L1 in either slot',()=>{
 for(const weapon of HUNT_WEAPONS)
  for(const form of ['folded','unfurled'])
   for(const attackerSlot of [0,1])
    for(const heavyType of ['Heavy','Charged']){
     const s=huntMatch({weapons:[weapon,weapon]});s.ready=0;
     s.p[0].x=430;s.p[1].x=500;
     for(const [slot,p] of s.p.entries()){
      p.vx=0;p.dir=slot===0?1:-1;p.st=100;
     }
     const defenderSlot=1-attackerSlot;
     const defender=s.p[defenderSlot],attacker=s.p[attackerSlot];
     defender.act='foldedLight';defender.age=huntMoveSpec(defender).startup;
     defender.form='folded';defender.spent=false;
     attacker.form=form;attacker.act=form+heavyType;
     const heavySpec=huntMoveSpec(attacker);
     attacker.age=heavySpec.startup+heavySpec.active;
     attacker.hitConfirmed=false;attacker.spent=false;attacker.chain=1;
     const inputs=[huntInput(),huntInput()];
     inputs[attackerSlot]=trick();
     const events=[];
     huntStep(s,inputs,events);
     const hit=events.find(e=>e.kind==='hit'&&
      e.actor===defenderSlot&&e.target===attackerSlot);
     assert(hit,weapon+' '+form+' '+heavyType+' slot '+attackerSlot+
      ' must connect a TRUE melee contact in the original missed R2 recovery');
     assert.equal(hit.punishedRecovery,true);
     assert.equal(hit.punishedMove,form+heavyType);
     assert(hit.remainingRecovery>0);
     assert.equal(hit.hitDuringStartup,false);
     assert.equal(attacker.act,'stun',
      'R2 whiff defender wins a real startup-safe R1 punish before L1');
     assert(!events.some(e=>e.kind==='action'&&e.actor===attackerSlot&&
      (e.move==='unfurl'||e.move==='refold')),
      'the failed trick input cannot create an active rescue hitbox');
     assert.equal(attacker.hitConfirmed,false);
     assert.equal(attacker.queue,'',
      'being hit clears the rejected trick request instead of replaying it later');
    }
});
