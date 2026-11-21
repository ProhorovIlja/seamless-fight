import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialCore,SOCIAL_SCHEMA,SOCIAL_INVITE_TTL_MS} from '../server/social-core.mjs';
function fixture(){
 let time=100000,sequence=0;
 const ids=new Map([['session-a','alice_01'],['session-b','bob_002'],
  ['session-c','eve_003'],['session-b2','bob_002']]);
 const lobbies=new Map([['ROOM12345678',{roomCode:'ROOM12345678',ownerId:'alice_01',
  mode:'1v1',fighters:['alice_01']}]]);
 const core=createSocialCore({
  resolveIdentity:session=>ids.get(session),
  resolveOwnedLobby:(owner,room)=>lobbies.get(room)?.ownerId===owner?lobbies.get(room):null,
  now:()=>time,
  token:()=>('Z'+String(++sequence).padStart(23,'0'))
 });
 return {core,ids,lobbies,advance:ms=>time+=ms};
}
test('no unauthenticated caller can enumerate friends, invites, or presence',()=>{
 const {core}=fixture();
 for(const fn of [
  ()=>core.friendList('fake'),()=>core.inbox('fake'),
  ()=>core.requestFriend('fake','alice_01'),()=>core.markOnline('fake'),
  ()=>core.invite('fake','bob_002',{roomCode:'ROOM12345678'})
 ])assert.throws(fn,/Authentication required/);
 assert.equal(core.stats().schema,SOCIAL_SCHEMA);
 assert.equal(core.stats().readyForPublicAPI,false);
});
test('friend requests require mutual acceptance and reject strangers, self and duplicates',()=>{
 const {core}=fixture();
 assert.equal(core.requestFriend('session-a','bob_002'),true);
 assert.deepEqual(core.incomingRequests('session-b'),['alice_01']);
 assert.deepEqual(core.friendList('session-a'),[]);
 assert.equal(core.requestFriend('session-a','bob_002'),false);
 assert.equal(core.requestFriend('session-a','alice_01'),false);
 assert.equal(core.acceptFriend('session-c','alice_01'),false);
 assert.equal(core.acceptFriend('session-b','alice_01'),true);
 assert.deepEqual(core.friendList('session-a'),[{userId:'bob_002',online:false}]);
 assert.deepEqual(core.friendList('session-b'),[{userId:'alice_01',online:false}]);
 assert.deepEqual(core.incomingRequests('session-b'),[]);
});
test('presence is tied to independently authenticated sessions, including multiple devices',()=>{
 const {core}=fixture();
 core.requestFriend('session-a','bob_002');core.acceptFriend('session-b','alice_01');
 assert(core.markOnline('session-b'));
 assert(core.markOnline('session-b2'));
 assert.equal(core.stats().connectedProfiles,1);
 assert.equal(core.friendList('session-a')[0].online,true);
 assert(core.markOffline('session-b'));
 assert.equal(core.friendList('session-a')[0].online,true);
 assert(core.markOffline('session-b2'));
 assert.equal(core.friendList('session-a')[0].online,false);
});
test('spectator privacy allows public, mutual friends, and self but blocks strangers',()=>{
 const {core}=fixture();
 assert.equal(core.canSpectate('session-b','alice_01','private'),false);
 assert.equal(core.canSpectate('session-b','alice_01','public'),true);
 assert.equal(core.canSpectate('session-b','alice_01','friends'),false);
 core.requestFriend('session-a','bob_002');core.acceptFriend('session-b','alice_01');
 assert.equal(core.canSpectate('session-b','alice_01','friends'),true);
 assert.equal(core.canSpectate('session-b','alice_01','private'),false);
 assert.equal(core.canSpectate('session-c','alice_01','friends'),false);
 assert.equal(core.canSpectate('session-c','alice_01','public'),true);
 core.blockUser('session-a','eve_003');
 assert.equal(core.canSpectate('session-c','alice_01','public'),false);
});
test('friend-only fighter and spectator invitations are opaque, single-use, and room-ownership checked',()=>{
 const {core,lobbies}=fixture();
 assert.throws(()=>core.invite('session-a','eve_003',{roomCode:'ROOM12345678'}),/Invalid/);
 core.requestFriend('session-a','bob_002');core.acceptFriend('session-b','alice_01');
 const fighting=core.invite('session-a','bob_002',{roomCode:'ROOM12345678',role:'fighter'});
 const watching=core.invite('session-a','bob_002',{roomCode:'ROOM12345678',role:'spectator'});
 assert.equal(core.inbox('session-b').length,2);
 assert.equal(core.redeem('session-c',fighting.code),null,'stranger cannot consume another recipient token');
 assert.deepEqual(core.redeem('session-b',fighting.code),
  {roomCode:'ROOM12345678',role:'fighter',from:'alice_01'});
 assert.equal(core.redeem('session-b',fighting.code),null);
 assert.deepEqual(core.redeem('session-b',watching.code),
  {roomCode:'ROOM12345678',role:'spectator',from:'alice_01'});
 assert.equal(core.inbox('session-b').length,0);
 lobbies.get('ROOM12345678').fighters.push('bob_002');
 assert.throws(()=>core.invite('session-a','bob_002',{roomCode:'ROOM12345678'}),/No eligible/);
 const watch=core.invite('session-a','bob_002',{roomCode:'ROOM12345678',role:'spectator'});
 assert.equal(core.redeem('session-b',watch.code).role,'spectator');
 assert.throws(()=>core.invite('session-b','alice_01',{roomCode:'ROOM12345678'}),/No eligible/);
});
test('friend removal and blocking revoke pending invites immediately',()=>{
 const {core}=fixture();
 core.requestFriend('session-a','bob_002');core.acceptFriend('session-b','alice_01');
 const invite=core.invite('session-a','bob_002',{roomCode:'ROOM12345678'});
 assert.equal(core.removeFriend('session-b','alice_01'),true);
 assert.equal(core.inbox('session-b').length,0);
 assert.equal(core.redeem('session-b',invite.code),null);
 core.requestFriend('session-a','bob_002');core.acceptFriend('session-b','alice_01');
 const second=core.invite('session-a','bob_002',{roomCode:'ROOM12345678'});
 assert.equal(core.blockUser('session-a','bob_002'),true);
 assert.equal(core.redeem('session-b',second.code),null);
 assert.equal(core.canSpectate('session-b','alice_01','public'),false);
 assert.equal(core.requestFriend('session-b','alice_01'),false);
 assert.equal(core.unblockUser('session-a','bob_002'),true);
 assert.equal(core.requestFriend('session-b','alice_01'),true);
});
test('expiry and authoritative change of fighter slots fail closed',()=>{
 const {core,lobbies,advance}=fixture();
 core.requestFriend('session-a','bob_002');core.acceptFriend('session-b','alice_01');
 let invite=core.invite('session-a','bob_002',{roomCode:'ROOM12345678'});
 assert.equal(SOCIAL_INVITE_TTL_MS,600000);
 advance(SOCIAL_INVITE_TTL_MS);
 assert.deepEqual(core.inbox('session-b'),[]);
 assert.equal(core.redeem('session-b',invite.code),null);
 invite=core.invite('session-a','bob_002',{roomCode:'ROOM12345678'});
 lobbies.get('ROOM12345678').fighters.push('eve_003');
 assert.equal(core.redeem('session-b',invite.code),null,'full 1v1 lobby cannot admit a third fighter');
 assert.throws(()=>core.invite('session-a','bob_002',{roomCode:'BADCODE',role:'spectator'}),/Invalid/);
 assert.throws(()=>core.invite('session-a','bob_002',{roomCode:'ROOM12345678',role:'2v2'}),/Invalid/);
});
