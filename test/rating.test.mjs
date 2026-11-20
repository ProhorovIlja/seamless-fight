import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_RATING,ratePeriod,winProbability} from '../server/rating.mjs';
const player={rating:1500,rd:200,volatility:.06};
const opponent=(rating,rd)=>({rating,rd,volatility:.06});
test('reproduces the original published Glicko-2 rating-period example',()=>{
 const results=[
  {opponent:opponent(1400,30),score:1},
  {opponent:opponent(1550,100),score:0},
  {opponent:opponent(1700,300),score:0}
 ];
 const copy=structuredClone(results),result=ratePeriod(player,results);
 assert(Math.abs(result.rating-1464.06)<.03);
 assert(Math.abs(result.rd-151.52)<.03);
 assert(Math.abs(result.volatility-.059996)<.000005);
 assert.deepEqual(results,copy,'rating update must never mutate result history');
 assert.deepEqual(player,{rating:1500,rd:200,volatility:.06});
});
test('rating reflects wins, losses, draws, uncertainty and inactive periods',()=>{
 const p={...DEFAULT_RATING,rd:200};
 const q={...DEFAULT_RATING,rd:120};
 const win=ratePeriod(p,[{opponent:q,score:1}]);
 const loss=ratePeriod(p,[{opponent:q,score:0}]);
 const draw=ratePeriod(p,[{opponent:q,score:.5}]);
 assert(win.rating>p.rating&&loss.rating<p.rating);
 assert(Math.abs(draw.rating-p.rating)<1e-9);
 assert(win.rd<p.rd&&loss.rd<p.rd);
 assert(ratePeriod(p,[]).rd>p.rd);
 assert.equal(ratePeriod(DEFAULT_RATING,[]).rd,350);
 assert.equal(winProbability(p,p),.5);
 assert(winProbability({...p,rating:1750},q)>.5);
});
test('wrong ratings, corrupted opponents, unbounded history and invalid tau fail closed',()=>{
 for(const args of [
  [{...player,volatility:0},[]],
  [player,[{opponent:opponent(1600,0),score:1}]],
  [player,[{opponent:opponent(1600,50),score:-1}]],
  [player,Array(251).fill({opponent:opponent(1600,50),score:1})],
  [player,[],1.5],
  [player,[{opponent:opponent(1600,50),score:NaN}]]
 ])assert.throws(()=>ratePeriod(...args),RangeError);
});
