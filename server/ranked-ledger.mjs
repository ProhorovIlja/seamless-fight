// An offline, transaction-safe ranked-set ledger candidate for a future
// authenticated server. NO HTTP/WS route imports this module.
import {DatabaseSync} from 'node:sqlite';
import {DEFAULT_RATING} from './rating.mjs';
import {projectSetRating} from './rated-set-projection.mjs';
import {setScore,SET_MAX_GAMES} from './set-policy.mjs';

const seasonId=/^[a-z0-9-]{1,32}$/;
const playerId=/^[a-zA-Z0-9_-]{8,64}$/;
const setIdRule=/^[a-zA-Z0-9_-]{16,96}$/;
function validated(competition,season,players,set){
 if(!seasonId.test(season)||!setIdRule.test(competition)
    ||!Array.isArray(players)||players.length!==2
    ||players.some(p=>typeof p!=='string'||!playerId.test(p))||players[0]===players[1])
   throw RangeError('Invalid season, set ID or player identity.');
 const score=setScore(set);
 if(!score||set.reason!=='two-wins'||!Number.isInteger(set.games)||set.games<2||set.games>SET_MAX_GAMES
   ||!Number.isInteger(set.draws)||set.draws<0
   ||!Array.isArray(set.wins)||set.wins.some(x=>!Number.isInteger(x)||x<0)
   ||set.wins[0]+set.wins[1]+set.draws!==set.games)
   throw RangeError('Only a complete server-confirmed first-to-two set can be recorded.');
 return {season,setId:competition,players:players.slice(),wins:set.wins.slice(),draws:set.draws,winner:set.winner};
}
const asJSON=JSON.stringify;
export function openRankedLedger(path=':memory:'){
 const db=new DatabaseSync(path);
 db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;");
 if(path!==':memory:')db.exec('PRAGMA journal_mode=WAL;');
 db.exec(`CREATE TABLE IF NOT EXISTS season_rating(
    season TEXT NOT NULL, player_id TEXT NOT NULL,
    rating REAL NOT NULL, rd REAL NOT NULL, volatility REAL NOT NULL,
    sets INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(season,player_id)
  );
  CREATE TABLE IF NOT EXISTS completed_set(
    season TEXT NOT NULL, set_id TEXT NOT NULL,
    canonical TEXT NOT NULL, result_json TEXT NOT NULL,
    recorded_at INTEGER NOT NULL,
    PRIMARY KEY(season,set_id)
  );
  -- A server-authored physical match must never be credited to two seasons.
  CREATE UNIQUE INDEX IF NOT EXISTS completed_set_global_id ON completed_set(set_id);`);
 const getSet=db.prepare('SELECT canonical,result_json FROM completed_set WHERE season=? AND set_id=?');
 const getSetSeason=db.prepare('SELECT season FROM completed_set WHERE set_id=?');
 const getRating=db.prepare('SELECT rating,rd,volatility,sets FROM season_rating WHERE season=? AND player_id=?');
 const upsert=db.prepare(`INSERT INTO season_rating(season,player_id,rating,rd,volatility,sets)
 VALUES(?,?,?,?,?,1) ON CONFLICT(season,player_id) DO UPDATE SET
 rating=excluded.rating, rd=excluded.rd,volatility=excluded.volatility,sets=season_rating.sets+1`);
 const insert=db.prepare('INSERT INTO completed_set(season,set_id,canonical,result_json,recorded_at) VALUES(?,?,?,?,?)');
 const listing=db.prepare('SELECT player_id,rating,rd,volatility,sets FROM season_rating WHERE season=? AND sets>=? ORDER BY rating DESC,rd ASC,player_id ASC LIMIT ?');
 const getSeasonProfile=(season,id)=>{
  const row=getRating.get(season,id);
  return row?{rating:row.rating,rd:row.rd,volatility:row.volatility}: {...DEFAULT_RATING};
 };
 function settle({season,setId,players,set}){
  const normalized=validated(setId,season,players,set),key=asJSON(normalized);
  // Transaction makes the pair of ratings and one immutable set row atomic.
  db.exec('BEGIN IMMEDIATE');
  try{
   // Season rollovers must not allow the same physical match to settle twice.
   const priorSeason=getSetSeason.get(setId);
   if(priorSeason&&priorSeason.season!==season)throw Error('Conflicting season for an already committed set.');
   const prior=getSet.get(season,setId);
   if(prior){
     if(prior.canonical!==key)throw Error('Conflicting result for an already committed set.');
     db.exec('COMMIT');
     return {...JSON.parse(prior.result_json),duplicate:true};
   }
   const before=players.map(id=>getSeasonProfile(season,id));
   const after=projectSetRating(set,before);
   if(!after)throw Error('Set is ineligible for rating.');
   const record={season,setId,players:players.slice(),winner:set.winner,
     wins:set.wins.slice(),draws:set.draws,before,after};
   for(let i=0;i<2;i++){
     const a=after[i];
     upsert.run(season,players[i],a.rating,a.rd,a.volatility);
   }
   insert.run(season,setId,key,asJSON(record),Date.now());
   db.exec('COMMIT');
   return {...record,duplicate:false};
  }catch(error){
    db.exec('ROLLBACK');
    throw error;
  }
 }
 return {
  settle,
  rating(season,id){
    if(!seasonId.test(season)||!playerId.test(id))throw RangeError('Invalid identity.');
    return getSeasonProfile(season,id);
  },
  standings(season,minSets=5,limit=50){
    if(!seasonId.test(season)||!Number.isInteger(minSets)||minSets<1||minSets>1000
       ||!Number.isInteger(limit)||limit<1||limit>100)throw RangeError('Invalid leaderboard query.');
    return listing.all(season,minSets,limit);
  },
  close(){db.close();}
 };
}
