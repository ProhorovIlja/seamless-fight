import test from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_MOVES,sideMatch,sideHurtbox} from '../public/side-engine.mjs';
import {sideDescribe,sideContact,sideReadout} from '../public/side-inspector.mjs';

const live=()=>{const s=sideMatch();s.ready=0;s.p[0].x=400;s.p[1].x=470;return s;};
test('frame inspector reports actual side-view gap and phase timing',()=>{
 const s=live();
 assert.equal(sideReadout(s).gap,34,'70 centers less 36 combined hurtbox half widths');
 assert.equal(sideDescribe(s.p[0]),'Neutral · ready');
 s.p[0].act='cut';s.p[0].age=5;
 assert.match(sideDescribe(s.p[0]),/startup · 4 frames left/);
 assert.equal(sideContact(s,0).contact,false);
 s.p[0].age=SIDE_MOVES.cut.startup;
 assert.match(sideDescribe(s.p[0]),/active · 5 frames left/);
 assert.equal(sideContact(s,0).contact,true);
 s.p[0].spent=true;
 assert.equal(sideContact(s,0).contact,false);
 assert.match(sideContact(s,0).status,/Already hit/);
 s.p[0].age=SIDE_MOVES.cut.startup+SIDE_MOVES.cut.active;
 assert.match(sideDescribe(s.p[0]),/recovery/);
 assert.equal(sideContact(s,0).contact,false);
});
test('side inspector distinguishes guard deflect and ducking below gun',()=>{
 const s=live();
 s.p[1].guardAge=2;assert.match(sideDescribe(s.p[1]),/deflect window/);
 s.p[1].guardAge=7;assert.match(sideDescribe(s.p[1]),/sustained block/);
 s.p[1].guardAge=0;s.p[1].crouch=true;
 assert.equal(sideHurtbox(s.p[1]).top,436-58);
 assert.match(sideDescribe(s.p[1]),/Crouching/);
 s.p[0].act='shot';s.p[0].age=SIDE_MOVES.shot.startup;
 assert.equal(sideContact(s,0).contact,false);
 assert.match(sideContact(s,0).status,/Outside actual hit/);
 s.p[1].crouch=false;
 assert.equal(sideContact(s,0).contact,true);
 s.p[1].act='step';s.p[1].age=4;
 assert.equal(sideContact(s,0).contact,false);
 assert.match(sideContact(s,0).status,/invulnerable/);
});
test('inspector remains read-only across arbitrary match and aerial state',()=>{
 const s=live(),original=structuredClone(s);
 for(const i of [0,1]){sideDescribe(s.p[i]);sideContact(s,i);}
 sideReadout(s);assert.deepEqual(s,original);
 s.p[0].y-=64;assert.match(sideDescribe(s.p[0]),/Airborne/);
});
