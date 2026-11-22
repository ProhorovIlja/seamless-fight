// All UI copy is deliberately original. Mechanics keep the Hunt v3 rules.
// Production title is a WORKING TITLE until legal/storefront clearance.
import {HUNT_ACTIONS,HUNT_RULESET,HUNT_WEAPONS} from './side-hunt-lab.mjs';
export const HUNT_IDENTITY_SCHEMA='sf-hunt-identity/1';
export const HUNT_WORKING_TITLE='Seamless Fight';
export const HUNT_PUBLIC_LOCALES=Object.freeze(['en']);
const copy={
 en:{
  title:'Seamless Fight',tagline:'The night remembers every duel.',
  modeDuel:'Duel',modeTraining:'Practice',modeSpectate:'Witness',
  ready:'The Court Awaits',round:'Round',victory:'Duel Concluded',
  playerOne:'First Hunter',playerTwo:'Second Hunter',
  life:'Vitality',stamina:'Endurance',ammo:'Silver Rounds',
  bloodAmmo:'Crimson Rounds',vials:'Restorative Vials',
  rally:'Reclaim',focus:'Pursuit',visceral:'Rending Strike',
  parry:'Firearm Counter',rearStagger:'Rear Stagger',hitstun:'Hitstun',
  stagger:'Exposed',whiff:'Missed Strike',
  intro:'Entrance',outro:'Departure',taunts:'Gestures',
  weaponMournweave:'Mournweave',weaponThornwake:'Thornwake',
  formFolded:'Sealed',formUnfurled:'Unbound',
  practiceRecord:'Record Dummy',practiceReplay:'Play Recording',
  practiceReversal:'Reversal',practiceStep:'Advance One Frame',
  practiceRewind:'Rewind',practiceFrameData:'Frame Data',
  practiceInputHistory:'Input History',practiceReset:'Restart',
  practiceFrameStartup:'Startup',practiceFrameActive:'Active',
  practiceFrameRecovery:'Recovery',practiceTick:'Simulation Frame',
  practiceCounterWindow:'Counter Window',practiceDodgeEscape:'Dodge Recovery',
  audioMaster:'Master Volume',audioEffects:'Effects',audioMusic:'Music',
  audioVoices:'Voices',audioDynamicRange:'Dynamic Range',
  videoFramerate:'Display FPS',videoVsync:'Vertical Synchronization',
  videoMotion:'Reduce Camera Motion',videoFrameGraph:'Frame-time Graph',
  inputKeyboard:'Keyboard & Mouse',inputController:'Controller',
  inputFightstick:'Arcade Stick',inputLeverless:'Leverless',
  inputFightpad:'Fightpad',inputAccessible:'Adaptive Inputs',
  inputRebind:'Rebind Controls',inputSocd:'Opposite Directions: Neutral',
  onlinePrivate:'Private Duel',onlineUnrated:'Unrated',
  onlineRanked:'Ranked (Unavailable)',
  noticeNotNative:'Hunt research mode; native Windows integration pending.',
  noticeUnavailable:'This feature is not available in the current build.',
  noticeNoRig:'The original hunter rig has not passed asset review.',
  noticeAssetReview:'Original or properly licensed assets only.',
  noticeRollback:'Rollback verification is required for competitive play.',
  noticeTesting:'Controller compatibility requires actual hardware testing.',
  noticeLoading:'Preparing the court',
  mode1v1:'1v1 Only',modeTeamsUnavailable:'Team combat is not part of this game.',
  launcherTitle:'The Court',launcherOnline:'Online Connections',
  launcherDuels:'Live Duels',launcherWatch:'Watch Live Duels',
  launcherLobbies:'Open Galleries',launcherPractice:'Practice Offline',
  launcherGuest:'Guest Session',launcherAccount:'Account',
  launcherUnverified:'Online identity unavailable',
  launcherPending:'Not Connected',launcherConnection:'Connection Status',
  lobbyTitle:'Duel Lobbies',lobbyHost:'Host Private Duel',
  lobbyJoin:'Join Duel',lobbyWatch:'Spectate',lobbyVisibility:'Gallery Visibility',
  lobbyPublic:'Public Spectating',lobbyPrivate:'Invite Only',
  lobbyEmpty:'No publicly shared duels right now.',
  lobbySpectators:'Spectators',lobbyFighters:'Fighters',
  lobbyRoom:'Duel Room',lobbyWaiting:'Waiting for Opponent',
  lobbyInProgress:'In Progress',lobbyFinished:'Match Complete',
  lobbyInvite:'Share Invitation',lobbyCopy:'Copy Link',
  socialFriends:'Friends',socialAddFriend:'Add Friend',
  socialInvite:'Invite Friend',socialWatchFriend:'Watch Friend',
  socialOnline:'Online',socialAway:'Away',socialOffline:'Offline',
  socialBlocked:'Blocked',socialPrivacy:'Privacy',
  socialUnavailable:'Friend accounts are not connected in this build.',
  rankedLeaderboard:'Ranked Leaderboard',rankedNoData:'No verified ranked results available.',
  rankedStats:'Player Statistics',rankedPending:'Ranked Play Not Available',
  rankedWins:'Wins',rankedLosses:'Losses',rankedMatches:'Matches Played',
  rankedRating:'Skill Rating',rankedSeason:'Season',
  rankedWinrate:'Win Rate',rankedStreak:'Win Streak',
  rankedHistory:'Match History',rankedProvisional:'Unrated Preview',
  privacyFriendsOnly:'Friends Only',privacyPublic:'Public',
  privacyInviteOnly:'Invite Link Required',
  noticeConnections:'Connected clients, not verified unique players.',
  noticeLegacy:'Legacy duel rules are active; Hunt v3 is not yet online.',
  noticeNoFakeRanks:'Leaderboard data requires a verified ranked account service.'
 },


};
const ACTION_NAMES={
 light:'Light Strike',heavy:'Heavy Strike',charge:'Charged Strike',
 trick:'Transform Arm',shot:'Fire',step:'Quickstep',
 feint:'Feint',sync:'Follow-up',visceral:'Rending Strike',
 heal:'Use Vial',blood:'Create Crimson Rounds'
};
export const HUNT_COPY=Object.freeze(Object.fromEntries(
 Object.entries(copy).map(([locale,strings])=>[locale,Object.freeze({...strings})])));
export function huntText(key,locale='en'){
 if(!HUNT_PUBLIC_LOCALES.includes(locale))throw TypeError('Unsupported locale');
 if(!Object.hasOwn(HUNT_COPY[locale],key))throw RangeError('Unknown public UI string');
 return HUNT_COPY[locale][key];
}
export function huntActionName(action,locale='en'){
 if(!HUNT_PUBLIC_LOCALES.includes(locale))throw TypeError('Unsupported locale');
 if(!HUNT_ACTIONS.includes(action))throw RangeError('Unknown combat action');
 if(!action)return 'Neutral';
 return ACTION_NAMES[action];
}
export function huntPublicHud(state,slot=0,locale='en'){
 if(state?.rules!==HUNT_RULESET||!Array.isArray(state.p)||![0,1].includes(slot))
  throw TypeError('Incompatible source fight');
 if(!HUNT_PUBLIC_LOCALES.includes(locale))throw TypeError('Unsupported locale');
 const p=state.p[slot];
 if(!HUNT_WEAPONS.includes(p.weapon))throw TypeError('Unknown arsenal');
 const fmt={
  name:huntText(slot===0?'playerOne':'playerTwo',locale),
  weapon:huntText(p.weapon==='mournweave'?'weaponMournweave':'weaponThornwake',locale),
  form:huntText(p.form==='folded'?'formFolded':'formUnfurled',locale),
  health:p.hp,stamina:p.st,ammo:p.ammo,bloodAmmo:p.bloodAmmo,
  vials:p.vials,focus:p.focus,
  labels:Object.freeze({
   health:huntText('life',locale),stamina:huntText('stamina',locale),
   ammo:huntText('ammo',locale),bloodAmmo:huntText('bloodAmmo',locale),
   vials:huntText('vials',locale),focus:huntText('focus',locale)
  })
 };
 return Object.freeze(fmt);
}
