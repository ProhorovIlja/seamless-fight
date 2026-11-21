import test from 'node:test';
import assert from 'node:assert/strict';
import {huntInput} from '../public/side-hunt-lab.mjs';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';

test('simultaneous defender movement never erases original LEFT or RIGHT corner pressure',()=>{
 for(const side of ['left','right']){
  const drill=side==='left'?'corner-escape':'corner-escape-right';
  const s=huntPracticeSession({drill});
  const atWall=side==='left'?65:895;
  assert.equal(s.inspect().p[0].x,atWall);
  const direction=side==='left'?1:-1;
  for(let tick=1;tick<=46;tick++){
   const input=tick===46?{...huntInput(),act:'step',x:direction}:huntInput();
   assert.equal(s.append(input),true);
  }
  assert.notEqual(s.inspect().p[0].x,atWall,
   'the actual defender moved off the wall on the same tick as R2 startup');
  const events=s.eventHistory(200);
  assert(events.some(e=>e.tick===46&&e.kind==='action'&&
   e.actor===1&&e.move==='foldedHeavy'));
  assert.equal(s.goal().attempts,1,
   'tick-start pressure must be recognized, even though defender already moved');
  assert.equal(s.goal().successes,0,
   'mere step input never awards a physical cross-through success');
  const saved=s.save();
  const imported=huntPracticeSession({drill});
  assert.equal(imported.load(saved),true);
  assert.equal(imported.goal().attempts,1,
   'verified replay import must regenerate identical tick-start provenance');
  assert.equal(imported.goal().successes,0);
  assert.equal(imported.rewind(1),true);
  assert.equal(imported.goal().attempts,0,
   'rewinding past the actual pressure action removes its objective evidence');
 }
});
