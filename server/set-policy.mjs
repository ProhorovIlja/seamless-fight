// A best-of-three *decisions* is not three guaranteed games: drawn games
// replay, with a hard cap to avoid indefinite stalls / free rating farming.
// This is a pure policy module. The casual server does NOT assign rating points.
export const SET_TARGET=2;
export const SET_MAX_GAMES=5;
export const SET_PAUSE_MS=8000;
export function newSet(){
 return {games:0,wins:[0,0],draws:0,complete:false,winner:null,reason:'in-progress'};
}
export function recordGame(previous,result){
 if(!previous||previous.complete||!Number.isSafeInteger(previous.games)||previous.games<0||previous.games>=SET_MAX_GAMES
   ||!Array.isArray(previous.wins)||previous.wins.length!==2||previous.wins.some(n=>!Number.isSafeInteger(n)||n<0||n>=SET_TARGET)
   ||!Number.isSafeInteger(previous.draws)||previous.draws<0||previous.draws+previous.wins[0]+previous.wins[1]!==previous.games)
   throw Error('Invalid or completed competitive set.');
 if(result!==0&&result!==1&&result!==-1)throw RangeError('Only an authoritative match winner or draw can advance a set.');
 const wins=previous.wins.slice(),draws=previous.draws+(result===-1?1:0);
 if(result!==-1)wins[result]++;
 const games=previous.games+1,decisive=wins.some(n=>n===SET_TARGET);
 const complete=decisive||games===SET_MAX_GAMES;
 const winner=decisive?wins.indexOf(SET_TARGET):null;
 return {games,wins,draws,complete,winner,reason:!complete?'in-progress':decisive?'two-wins':'draw-limit'};
}
// Rating updates are eligible *only* at the end of a decided set; an
// unfinished set, a drawn-out set or a single match has no rating outcome.
export function setScore(set){
 if(!set?.complete||set.reason!=='two-wins'||(set.winner!==0&&set.winner!==1)
   ||!Array.isArray(set.wins)||set.wins[set.winner]!==SET_TARGET
   ||set.wins[1-set.winner]>=SET_TARGET)return null;
 return set.winner===0?[1,0]:[0,1];
}

// Casual and private-player rooms have unlimited consensual rematches.
// Competitive sets never reset by client vote; they advance automatically.
export const mayVoteRematch=(format,gameOver)=>Boolean(gameOver)&&(format==='casual'||format==='player');
