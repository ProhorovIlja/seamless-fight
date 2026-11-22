// Seamless Fight offline Hunt replay import adapter. English-only UI.
// Normalize the one-shot research export into an existing exact-version
// Hunt input capture; the existing practice.load/loadHuntReplay validates
// every canonical action, the full input history and final fingerprint.
// Never trust or display a research summary as an actual ranked result.
import {HUNT_CAPTURE_SCHEMA} from './side-hunt-replay.mjs';
export const HUNT_NEUTRAL_STUDY_SCHEMA='sf-hunt-neutral-study/1';
export function huntReplayImportPayload(data){
 if(!data||typeof data!=='object'||Array.isArray(data))
  throw TypeError('An offline Hunt replay JSON object is required');
 if(data.schema===HUNT_CAPTURE_SCHEMA)
  return Object.freeze({capture:data,study:false});
 if(data.schema!==HUNT_NEUTRAL_STUDY_SCHEMA||
    data.mode!=='offline-unrated'||
    !data.replayCapture||
    data.replayCapture.schema!==HUNT_CAPTURE_SCHEMA||
    data.summary?.finalFingerprint!==data.replayCapture.fingerprint)
  throw TypeError('Unknown or inconsistent offline Hunt replay study');
 return Object.freeze({capture:data.replayCapture,study:true});
}
