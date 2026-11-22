// Reusable authenticated social domain for the future independent game account service.
// Not routed or connected to the live server: no authentication provider exists yet.
// Never pass user-supplied identity claims into resolveIdentity/resolveOwnedLobby.
import {randomBytes} from 'node:crypto';
export const SOCIAL_SCHEMA='sf-social-1v1/1';
export const SOCIAL_INVITE_TTL_MS=10*60*1000;
export const SOCIAL_MAX_FRIENDS=200;
const ID=/^[a-zA-Z0-9_-]{3,48}$/;
const ROOM=/^[a-zA-Z0-9_-]{12}$/;
function valid(id){return typeof id==='string'&&ID.test(id);}
export function createSocialCore({resolveIdentity,resolveOwnedLobby,now=()=>Date.now(),token=()=>randomBytes(18).toString('base64url')}={}){
 if(typeof resolveIdentity!=='function'||typeof resolveOwnedLobby!=='function'||
    typeof now!=='function'||typeof token!=='function')
  throw new TypeError('Authenticated identity resolver, room ownership resolver and clock required');
 const friends=new Map(),requests=new Map(),blocked=new Map(),presence=new Map(),invites=new Map();
 const set=(m,k)=>{if(!m.has(k))m.set(k,new Set());return m.get(k);};
 const identity=session=>{
  const id=resolveIdentity(session);
  if(!valid(id))throw Error('Authentication required');
  return id;
 };
 const have=(a,b)=>friends.get(a)?.has(b)===true;
 const deny=(a,b)=>blocked.get(a)?.has(b)||blocked.get(b)?.has(a);
 const removeReq=(a,b)=>{requests.get(a)?.delete(b);requests.get(b)?.delete(a);};
 const rejectInvitePair=(a,b)=>{
  for(const [key,val] of invites){
   if(val.from===a&&val.to===b||val.from===b&&val.to===a)invites.delete(key);
  }
 };
 function requestFriend(session,to){
  const from=identity(session);
  if(!valid(to)||from===to||deny(from,to)||have(from,to))return false;
  const sent=set(requests,to);
  if(sent.has(from)||sent.size>=SOCIAL_MAX_FRIENDS)return false;
  if((friends.get(from)?.size||0)>=SOCIAL_MAX_FRIENDS)return false;
  sent.add(from);
  return true;
 }
 function acceptFriend(session,from){
  const to=identity(session);
  if(!valid(from)||from===to||deny(from,to)||!requests.get(to)?.has(from))return false;
  if((friends.get(to)?.size||0)>=SOCIAL_MAX_FRIENDS||
     (friends.get(from)?.size||0)>=SOCIAL_MAX_FRIENDS)return false;
  removeReq(to,from);
  set(friends,to).add(from);set(friends,from).add(to);
  return true;
 }
 function removeFriend(session,other){
  const from=identity(session);
  if(!have(from,other))return false;
  friends.get(from).delete(other);friends.get(other)?.delete(from);
  removeReq(from,other);rejectInvitePair(from,other);
  return true;
 }
 function blockUser(session,other){
  const from=identity(session);
  if(!valid(other)||from===other)return false;
  set(blocked,from).add(other);
  friends.get(from)?.delete(other);friends.get(other)?.delete(from);
  removeReq(from,other);rejectInvitePair(from,other);
  return true;
 }
 function unblockUser(session,other){
  return blocked.get(identity(session))?.delete(other)===true;
 }
 function markOnline(session){
  const id=identity(session);set(presence,id).add(session);return true;
 }
 function markOffline(session){
  const id=identity(session),sessions=presence.get(id);
  if(!sessions)return false;
  const removed=sessions.delete(session);
  if(!sessions.size)presence.delete(id);
  return removed;
 }
 function friendList(session){
  const id=identity(session);
  return Object.freeze([...(friends.get(id)||[])].sort().map(userId=>Object.freeze({
   userId,online:(presence.get(userId)?.size||0)>0
  })));
 }
 function incomingRequests(session){
  const id=identity(session);
  return Object.freeze([...(requests.get(id)||[])].filter(x=>!deny(id,x)).sort());
 }
 function canSpectate(session,owner,visibility='private'){
  const id=identity(session);
  if(!valid(owner)||deny(id,owner))return false;
  if(id===owner)return true;
  if(visibility==='public')return true;
  return visibility==='friends'&&have(id,owner);
 }
 function invite(session,to,{roomCode,role='fighter'}={}){
  const from=identity(session);
  if(!valid(to)||from===to||!have(from,to)||deny(from,to)||
   !ROOM.test(roomCode||'')||!['fighter','spectator'].includes(role))
   throw Error('Invalid friend invitation');
  const lobby=resolveOwnedLobby(from,roomCode);
  if(!lobby||lobby.ownerId!==from||lobby.roomCode!==roomCode||
   lobby.mode!=='1v1'||!Array.isArray(lobby.fighters)||
   lobby.fighters.length<1||lobby.fighters.length>2||
   !lobby.fighters.includes(from)||
   (role==='fighter'&&lobby.fighters.length>=2))
   throw Error('No eligible owned 1v1 room');
  if(role==='spectator'&&!canSpectate(session,from,'friends'))
   throw Error('Spectating is not allowed');
  for(const [key,old] of invites)
   if(old.from===from&&old.to===to&&old.roomCode===roomCode&&old.role===role)
    invites.delete(key);
  const code=token();
  if(typeof code!=='string'||!/^[a-zA-Z0-9_-]{20,80}$/.test(code)||invites.has(code))
   throw Error('Secure unique invitation token required');
  const value={from,to,roomCode,role,expiresAt:now()+SOCIAL_INVITE_TTL_MS};
  invites.set(code,value);
  return Object.freeze({code,expiresAt:value.expiresAt,role});
 }
 function redeem(session,code){
  const id=identity(session),record=invites.get(code);
  if(!record||record.to!==id)return null;
  // Consume after a matching owner/recipient check; stale/broken codes are destroyed.
  invites.delete(code);
  if(now()>=record.expiresAt||!have(record.from,id)||deny(record.from,id))return null;
  const room=resolveOwnedLobby(record.from,record.roomCode);
  if(!room||room.ownerId!==record.from||room.mode!=='1v1'||
      !Array.isArray(room.fighters)||room.fighters.length<1||room.fighters.length>2||
      !room.fighters.includes(record.from)||
      (record.role==='fighter'&&room.fighters.length>=2))return null;
  return Object.freeze({roomCode:record.roomCode,role:record.role,from:record.from});
 }
 function inbox(session){
  const id=identity(session);
  return Object.freeze([...invites.entries()]
   .filter(([,x])=>x.to===id&&x.expiresAt>now()&&!deny(id,x.from))
   .map(([code,x])=>Object.freeze({code,from:x.from,role:x.role,expiresAt:x.expiresAt}))
   .sort((a,b)=>a.expiresAt-b.expiresAt));
 }
 return Object.freeze({requestFriend,acceptFriend,removeFriend,blockUser,unblockUser,
  markOnline,markOffline,friendList,incomingRequests,canSpectate,invite,redeem,inbox,
  stats:()=>Object.freeze({schema:SOCIAL_SCHEMA,connectedProfiles:presence.size,
   pendingInvitations:invites.size,readyForPublicAPI:false})});
}
