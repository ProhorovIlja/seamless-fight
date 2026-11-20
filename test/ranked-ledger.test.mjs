import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openRankedLedger} from '../server/ranked-ledger.mjs';
import {newSet,recordGame} from '../server/set-policy.mjs';
const a='account_alpha_123',b='account_beta_987';
const setId='set_server_nonce_00001';
const decided=(...games)=>games.reduce((state,result)=>recordGame(state,result),newSet());
test('verified first-to-two outcome settles only once and survives a database reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'seamless-fight-ledger-'));const path=join(dir,'ratings.sqlite');
 try{
  let ledger=openRankedLedger(path);
  const incomplete=decided(0);
  assert.throws(()=>ledger.settle({season:'season-1',setId,players:[a,b],set:incomplete}),RangeError);
  assert.equal(ledger.rating('season-1',a).rating,1500);
  const set=decided(0,1,0);
  const first=ledger.settle({season:'season-1',setId,players:[a,b],set});
  assert.equal(first.duplicate,false);
  assert(first.after[0].rating>1500&&first.after[1].rating<1500);
  assert.deepEqual(ledger.standings('season-1'),[],'provisional competitors are hidden by default');
  const replay=ledger.settle({season:'season-1',setId,players:[a,b],set});
  assert.equal(replay.duplicate,true);
  assert.deepEqual(replay.after,first.after);
  assert.throws(()=>ledger.settle({season:'season-1',setId,players:[a,b],set:decided(1,1)}),/Conflicting/);
  assert.deepEqual(ledger.rating('season-1',a),first.after[0]);
  ledger.close();
  ledger=openRankedLedger(path);
  assert.deepEqual(ledger.rating('season-1',a),first.after[0]);
  assert.deepEqual(ledger.rating('season-2',a),{rating:1500,rd:350,volatility:.06});
  assert.equal(ledger.standings('season-1',1,2)[0].player_id,a);
  ledger.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('no-contest, malformed identities and duplicate participants cannot update ledger',()=>{
 const ledger=openRankedLedger();
 try{
  for(const set of [newSet(),decided(0),decided(-1,-1,-1,-1,-1)])
   assert.throws(()=>ledger.settle({season:'s1',setId,players:[a,b],set}),RangeError);
  const valid=decided(1,1);
  for(const players of [[a,a],['x',b],[a,''],[a]])assert.throws(()=>ledger.settle({season:'s1',setId,players,set:valid}),RangeError);
  assert.throws(()=>ledger.settle({season:'s1',setId:'bad',players:[a,b],set:valid}),RangeError);
  assert.deepEqual(ledger.standings('s1',1),[]);
  assert.throws(()=>ledger.standings('s1',0),RangeError);
 }finally{ledger.close();}
});
