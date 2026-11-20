import test from 'node:test';
import assert from 'node:assert/strict';
import {newSet,recordGame,setScore,SET_TARGET,SET_MAX_GAMES,SET_PAUSE_MS} from '../server/set-policy.mjs';
test('ranked rules require two won matches; first game never awards anything',()=>{
 const start=newSet();
 assert.equal(SET_TARGET,2);assert.equal(SET_MAX_GAMES,5);assert.equal(SET_PAUSE_MS,8000);
 let set=recordGame(start,0);
 assert.deepEqual(set.wins,[1,0]);assert.equal(set.games,1);
 assert.equal(set.complete,false);assert.equal(setScore(set),null);
 set=recordGame(set,1);
 assert.deepEqual(set.wins,[1,1]);assert.equal(setScore(set),null);
 set=recordGame(set,0);
 assert.deepEqual(set.wins,[2,1]);
 assert.equal(set.complete,true);assert.equal(set.winner,0);
 assert.deepEqual(setScore(set),[1,0]);
 assert.throws(()=>recordGame(set,1),/completed/);
 assert.deepEqual(start,newSet(),'policy does not mutate incoming state');
});
test('2-0 sweep ends in two matches; draws are replays, not a free win',()=>{
 let set=recordGame(newSet(),1);
 assert.equal(setScore(set),null);
 set=recordGame(set,1);
 assert.equal(set.games,2);assert.deepEqual(setScore(set),[0,1]);
 let draws=newSet();
 for(const result of [-1,0,-1,1,-1])draws=recordGame(draws,result);
 assert.equal(draws.games,5);assert.equal(draws.draws,3);
 assert.equal(draws.complete,true);assert.equal(draws.winner,null);
 assert.equal(draws.reason,'draw-limit');
 assert.equal(setScore(draws),null);
});
test('late decisive win after a draw counts once, while malformed results fail closed',()=>{
 let set=newSet();for(const result of [-1,0,-1,0])set=recordGame(set,result);
 assert.equal(set.games,4);assert.equal(set.winner,0);assert.deepEqual(setScore(set),[1,0]);
 assert.throws(()=>recordGame(newSet(),{winner:0}),RangeError);
 assert.throws(()=>recordGame(newSet(),null),RangeError);
 assert.throws(()=>recordGame({...newSet(),games:1},0),/Invalid/);
 assert.equal(setScore({...set,reason:'in-progress'}),null);
 assert.equal(setScore({...set,wins:[1,0]}),null);
});
