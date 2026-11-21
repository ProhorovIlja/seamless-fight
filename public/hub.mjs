// Live, privacy-scoped status for the existing experimental browser duel server.
// This is not a native Windows launcher, persistent friend account or rank service.
export const HUB_SCHEMA='sf-public-activity/1';
export const HUB_LANGUAGE='en';
export const HUB_DUEL_SIZE=2;
export const HUB_UPDATE_MS=15000;
export const WATCH_PATH=/^\/fight\/\?watch=[-A-Za-z0-9_]{12}$/;
export function validateCourtStatus(value){
 if(!value||typeof value!=='object'||value.schema!==HUB_SCHEMA||
    value.gameMode!=='1v1'||value.language!=='en'||value.service!=='legacy-duel-preview')
  return false;
 for(const key of ['connectedClients','duels','spectators','publicGalleryCount']){
  if(!Number.isSafeInteger(value[key])||value[key]<0||value[key]>100000)return false;
 }
 return value.uniqueAuthenticatedPlayers===null&&
  value.ranked?.available===false&&value.friends?.available===false;
}
export function validatePublicGallery(value){
 return Boolean(value&&typeof value==='object'&&
  /^[A-Za-z0-9_-]{12}$/.test(value.watchCode)&&
  ['/fight/?watch=','/fight/side/?watch='].some(prefix=>
    value.watchPath===prefix+value.watchCode)&&
  ['waiting','in-progress','complete'].includes(value.status)&&
  value.fighters>=1&&value.fighters<=HUB_DUEL_SIZE&&
  Number.isInteger(value.spectators)&&value.spectators>=0&&value.spectators<=6&&
  value.spectatorCapacity===6&&
  ['casual-1v1','unrated-set-preview'].includes(value.format)&&
  typeof value.arena==='string'&&value.arena.length>0&&value.arena.length<=40);
}
const $=id=>document.getElementById(id);
const numbers={connectedClients:'metric-connections',duels:'metric-duels',
 spectators:'metric-spectators',publicGalleryCount:'metric-lobbies'};
function setMessage(message){
 const el=$('connection-indicator');
 el.textContent=message;
 el.classList.toggle('online',message==='Live connection');
 el.classList.toggle('unavailable',message==='Status unavailable');
}
function setGalleryMessage(message){
 const row=document.createElement('p');
 row.className='empty';row.textContent=message;
 $('gallery-list').replaceChildren(row);
}
function renderGalleries(data){
 const list=$('gallery-list');list.replaceChildren();
 if(!Array.isArray(data.lobbies)||data.lobbies.length===0){
  setGalleryMessage('No publicly shared duels right now. Hosts can choose to enable spectating.');
  return;
 }
 let valid=0;
 for(const lobby of data.lobbies.slice(0,32)){
  if(!validatePublicGallery(lobby))continue;
  const row=document.createElement('article');row.className='gallery-row';
  const info=document.createElement('div');info.className='row-info';
  const state=document.createElement('span');state.className='status';
  state.textContent=lobby.status==='in-progress'?'Live now':lobby.status==='waiting'?'Waiting':'Complete';
  const title=document.createElement('h3');title.textContent=lobby.arena;
  const stats=document.createElement('p');
  stats.textContent=lobby.fighters+' / 2 fighters · '+lobby.spectators+' / 6 spectators · '+
   (lobby.watchPath.startsWith('/fight/side/')?'2.5D side-view · ':'Overhead prototype · ')+
   (lobby.format==='casual-1v1'?'Casual 1v1':'Unrated set');
  const action=document.createElement('a');
  action.href=lobby.watchPath;action.textContent='Watch duel';
  action.setAttribute('aria-label','Spectate the '+lobby.arena+' duel');
  info.append(state,title,stats);row.append(info,action);list.append(row);
  valid++;
 }
 if(!valid)setGalleryMessage('No publicly available galleries.');
}
let requestInFlight=false;
export async function refreshCourt(){
 if(requestInFlight)return;
 requestInFlight=true;
 $('refresh').disabled=true;
 try{
  const [statusResponse,galleryResponse,rankedResponse]=await Promise.all([
   fetch('/fight/status.json',{cache:'no-store'}),
   fetch('/fight/lobbies.json',{cache:'no-store'}),
   fetch('/fight/leaderboard.json',{cache:'no-store'})
  ]);
  if(!statusResponse.ok||!galleryResponse.ok||!rankedResponse.ok)
   throw Error('The activity service is unavailable');
  const [activity,galleries,leaderboard]=await Promise.all([
   statusResponse.json(),galleryResponse.json(),rankedResponse.json()
  ]);
  if(!validateCourtStatus(activity)||!Array.isArray(galleries.lobbies)||
    galleries.schema!==HUB_SCHEMA||galleries.language!=='en'||
    leaderboard.schema!=='sf-leaderboard/1'||leaderboard.active!==false||
    !Array.isArray(leaderboard.entries)||leaderboard.entries.length!==0)
   throw Error('Invalid server activity response');
  for(const [key,id] of Object.entries(numbers))$(id).textContent=String(activity[key]);
  $('ranked-state').textContent=leaderboard.reason;
  renderGalleries(galleries);
  $('updated').textContent='Latest activity refreshed at '+new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  setMessage('Live connection');
 }catch{
  for(const id of Object.values(numbers))$(id).textContent='—';
  setGalleryMessage('The Court is offline or activity data is unavailable. No counts are estimated.');
  $('updated').textContent='Live activity could not be retrieved.';
  setMessage('Status unavailable');
 }finally{
  requestInFlight=false;
  $('refresh').disabled=false;
 }
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 $('refresh').addEventListener('click',refreshCourt);
 refreshCourt();
 window.setInterval(()=>{if(!document.hidden)refreshCourt();},HUB_UPDATE_MS);
}
