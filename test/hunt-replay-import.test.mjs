import test from 'node:test';
import assert from 'node:assert/strict';
import {huntReplayImportPayload,HUNT_NEUTRAL_STUDY_SCHEMA}
 from '../public/hunt-replay-import.mjs';
import {huntFullWhiffTrial} from '../scripts/hunt-whiff-from-neutral.mjs';
import {HUNT_CAPTURE_SCHEMA,loadHuntReplay}
 from '../public/side-hunt-replay.mjs';
import {huntPracticeSession} from '../public/hunt-practice-suite.mjs';

test('one-shot original whiff-study JSON directly opens as a verified English offline practice replay',()=>{
 const r=huntFullWhiffTrial({
  attackerWeapon:'thornwake',defenderWeapon:'mournweave',
  attackerForm:'unfurled',attackerHeavy:'Charged',arenaSide:'left',
  answer:'light',responseDelay:12,
  approach:'postWhiffWalk',recordReplay:true
 });
 const {replayCapture,sourceEvents,...summary}=r;
 const wrapped={schema:HUNT_NEUTRAL_STUDY_SCHEMA,
  mode:'offline-unrated',summary,replayCapture};
 const result=huntReplayImportPayload(wrapped);
 assert.equal(result.study,true);
 assert.equal(result.capture,replayCapture);
 assert(Object.isFrozen(result));
 assert.equal(loadHuntReplay(result.capture).stats().fingerprint,
  r.finalFingerprint);
 const session=huntPracticeSession();
 session.load(result.capture);
 assert.equal(session.stats().tick,125);
 assert.equal(session.stats().paused,true);
 assert.equal(session.save().fingerprint,result.capture.fingerprint);
 // Existing native/browser training replay remains fully editable locally.
 const raw=huntReplayImportPayload(session.save());
 assert.equal(raw.study,false);
 assert.equal(raw.capture.schema,HUNT_CAPTURE_SCHEMA);
});

test('unverified study summary, unknown ranked/guard schema or fake source capture cannot bypass replay importer',()=>{
 const captured=huntFullWhiffTrial({recordReplay:true});
 const {replayCapture,sourceEvents,...summary}=captured;
 const good={schema:HUNT_NEUTRAL_STUDY_SCHEMA,
  mode:'offline-unrated',summary,replayCapture};
 for(const invalid of [
  null,[],{}, {schema:'sf-online-ranked/1'},
  {...good,mode:'ranked'},
  {...good,schema:'sf-hunt-no-guard-block/1'},
  {...good,summary:{...summary,finalFingerprint:'00000000'}},
  {...good,replayCapture:{...replayCapture,schema:'other'}},
  {...good,replayCapture:null},
  {...good,summary:null}
 ])assert.throws(()=>huntReplayImportPayload(invalid),TypeError);
 const tampered=structuredClone(good);
 tampered.replayCapture.frames[0][1].act='light';
 const imported=huntReplayImportPayload(tampered);
 assert.throws(()=>loadHuntReplay(imported.capture),
  /diverged|fingerprint|mismatch/i,
  'the normal versioned replay validator must still reject tampering');
});
