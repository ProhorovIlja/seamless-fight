import test from 'node:test';
import assert from 'node:assert/strict';
import {newSet,recordGame} from '../server/set-policy.mjs';
import {projectSetRating} from '../server/rated-set-projection.mjs';
import {DEFAULT_RATING} from '../server/rating.mjs';
const players=[{...DEFAULT_RATING,rd:160},{...DEFAULT_RATING,rd:230}];
test('ranked preview cannot calculate rating after one game or a tied set',()=>{
 let s=recordGame(newSet(),0);
 assert.equal(projectSetRating(s,players),null);
 s=recordGame(s,1);
 assert.equal(projectSetRating(s,players),null);
 s=recordGame(s,0);
 assert(s.complete&&s.winner===0);
 const [winner,loser]=projectSetRating(s,players);
 assert(winner.rating>players[0].rating);
 assert(loser.rating<players[1].rating);
 assert.deepEqual(players,[{...DEFAULT_RATING,rd:160},{...DEFAULT_RATING,rd:230}]);
});
test('the entire best-of-three set generates exactly one outcome per player',()=>{
 let s=newSet();
 for(const game of [-1,1,1])s=recordGame(s,game);
 const [a,b]=projectSetRating(s,players);
 assert(a.rating<players[0].rating&&b.rating>players[1].rating);
 assert.throws(()=>projectSetRating(s,[players[0]]),RangeError);
 let abandoned=newSet();
 for(const game of [-1,-1,-1,-1,-1])abandoned=recordGame(abandoned,game);
 assert.equal(projectSetRating(abandoned,players),null);
});
