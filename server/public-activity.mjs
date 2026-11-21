// Public, privacy-scoped, read-only activity projection for /fight/hub/.
// Never call socket counts "unique players"; no account or rated database exists.
export const ACTIVITY_SCHEMA='sf-public-activity/1';
export const ACTIVITY_MODE='1v1';
export const MAX_PUBLIC_GALLERIES=32;
const SIDE_RULE_LABEL='seamless-side/1';
const ONLINE_RULE_LABEL='legacy-overhead/1';
const CODE=/^[-_A-Za-z0-9]{12}$/;
const number=(v)=>Number.isSafeInteger(v)&&v>=0?v:0;
const SIDE_STAGE_NAMES=new Set(['reliquary','cistern','lantern']);
export function projectFightActivity({rooms,galleries,queued,mainConnections,sideStats,sidePublicGalleries=[],limit=24}={}){
 if(!(rooms instanceof Map)||!(galleries instanceof Map)||
    !Number.isInteger(limit)||limit<1||limit>MAX_PUBLIC_GALLERIES)
  throw new TypeError('Live activity requires local room state and a bounded gallery limit');
 const all=[...rooms.values()];
 const side=sideStats&&typeof sideStats==='object'?sideStats:{};
 if(!Array.isArray(sidePublicGalleries)||sidePublicGalleries.length>64)throw TypeError('Bounded side gallery listing required');
 const activeMain=all.filter(r=>r?.peers?.length===2&&!r?.s?.over).length;
 const activeSide=number(side.duels);
 const waitingMain=all.filter(r=>r?.peers?.length===1).length;
 const viewing=all.reduce((n,r)=>n+number(r?.viewers?.size),0);
 const lobbies=[];
 for(const [code,r] of galleries){
  // Watch codes exist ONLY after the host explicitly opens a public gallery.
  // Never disclose the room invitation code, player IP, account, replay or name.
  if(!CODE.test(code)||r?.watchCode!==code||r?.queued===true||
      !Array.isArray(r?.peers)||r.peers.length<1||r.peers.length>2||
      !r.viewers||number(r.viewers.size)>=6)continue;
  lobbies.push({
   watchCode:code,
   watchPath:'/fight/?watch='+encodeURIComponent(code),
   arena:String(r.arena??'').slice(0,40),
   format:r.format==='set-preview'?'unrated-set-preview':'casual-1v1',
   status:r.peers.length<2?'waiting':r.s?.over?'complete':'in-progress',
   fighters:r.peers.length,
   spectators:number(r.viewers.size),
   spectatorCapacity:6
  });
 }
 // Public side-view watchers are independently authorized by host opt-in.
 // Only include bounded public watch tokens from the trusted side Hub.
 for(const entry of sidePublicGalleries){
  if(!entry||!CODE.test(entry.watchCode)||entry.protocol!==SIDE_RULE_LABEL||
     entry.watchPath!=='/fight/side/?watch='+entry.watchCode||
     !['waiting','in-progress','complete'].includes(entry.status)||
     !Number.isSafeInteger(entry.fighters)||entry.fighters<1||entry.fighters>2||
     !Number.isSafeInteger(entry.spectators)||entry.spectators<0||entry.spectators>=6||
     !SIDE_STAGE_NAMES.has(entry.arena))continue;
  lobbies.push({
   watchCode:entry.watchCode,watchPath:entry.watchPath,
   arena:entry.arena,format:'casual-1v1',status:entry.status,
   fighters:entry.fighters,spectators:entry.spectators,
   spectatorCapacity:6,protocol:SIDE_RULE_LABEL
  });
 }
 lobbies.sort((a,b)=>a.watchCode.localeCompare(b.watchCode,'en'));
 const main=number(mainConnections),sideClients=number(side.clients);
 return {
  schema:ACTIVITY_SCHEMA,gameMode:ACTIVITY_MODE,language:'en',
  service:'legacy-duel-preview',
  status:'online',
  // These represent live WebSocket connections, not real distinct account owners.
  connectedClients:main+sideClients,
  uniqueAuthenticatedPlayers:null,
  fightersInRooms:all.reduce((n,r)=>n+number(r?.peers?.length),0)+number(side.fighters),
  mainDuels:activeMain,sideDuels:activeSide,duels:activeMain+activeSide,
  mainRooms:all.length,sideRooms:number(side.rooms),
  waitingLobbies:waitingMain,
  queuedConnections:number(queued),
  spectators:viewing+number(side.spectators),
  ranked:{available:false,verifiedMatches:0,entries:[],reason:'Verified competitive accounts and ranked ledger are not connected.'},
  friends:{available:false,reason:'Independent authenticated friend service is not connected.'},
  publicGalleries:lobbies.slice(0,limit),
  publicGalleryCount:lobbies.length,
  rules:{currentOnline:ONLINE_RULE_LABEL,side: SIDE_RULE_LABEL,hunt:'sf-hunt-lab/3 (offline prototype only)'}
 };
}
export function projectRankedUnavailable(){
 return {schema:'sf-leaderboard/1',mode:ACTIVITY_MODE,language:'en',
  active:false,verified:false,entries:[],
  reason:'Ranked 1v1 results require authenticated accounts, anti-cheat and a verified match ledger.'};
}
