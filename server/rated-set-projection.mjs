import {ratePeriod} from './rating.mjs';
import {setScore} from './set-policy.mjs';

// Produces an inspectable **simulation**, never a persisted transaction.
// No client or live casual WebSocket path imports this module.
export function projectSetRating(set,ratings){
 const scores=setScore(set);
 if(scores===null)return null;
 if(!Array.isArray(ratings)||ratings.length!==2)throw RangeError('A complete rated set needs two prior rating profiles.');
 const [a,b]=ratings;
 // Every outcome uses both PRE-set ratings. Do not apply one player's update
 // before computing their opponent's, which would skew the second update.
 return [
   ratePeriod(a,[{opponent:b,score:scores[0]}]),
   ratePeriod(b,[{opponent:a,score:scores[1]}])
 ];
}
