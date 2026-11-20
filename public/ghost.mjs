import {blank,match,step,moves,canAct,canFeint} from './engine.mjs';
import {createSparring} from './tactics.mjs';
import {RULESET} from './replay.mjs';

export const GHOST_KEY='seamless-fight.ghost.v1';
const DIR=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const actions=['','cut','hew','shot','step','feint'];
const limit=4096, contexts=24, width=54, DELAY=10;
const heading=(x,y)=>(Math.round(Math.atan2(y,x)*4/Math.PI)+8)%8;
function context(q,p){
 const d=Math.hypot(p.x-q.x,p.y-q.y);
 const range=d<=86?0:d<=114?1:d<=190?2:3;
 const m=moves[p.act], phase=m?.[5]?(p.age<m[0]?1:p.age<m[0]+m[1]?2:3):p.act==='step'?4:0;
 return range*6+(canFeint(q)?5:phase);
}
function encode(q,p,input){
 const relative=input.x||input.y?1+(heading(input.x,input.y)-heading(p.x-q.x,p.y-q.y)+8)%8:0;
 return relative*6+actions.indexOf(input.act);
}
function decode(q,p,n){
 const dir=Math.floor(n/6);
 const [x,y]=dir?DIR[(dir-1+heading(p.x-q.x,p.y-q.y))%8]:[0,0];
 return {x,y,act:actions[n%6]};
}
export function restoreGhost(raw){
 if(raw?.version!==1||!Array.isArray(raw.counts)||raw.counts.length!==contexts*width||!raw.counts.every(n=>Number.isInteger(n)&&n>=0&&n<=limit)||!Array.isArray(raw.sources)||!raw.sources.length||raw.sources.length>16||!raw.sources.every(x=>typeof x==='string'&&/^[0-9a-f]{8}:[01]$/.test(x)))return null;
 return {version:1,counts:raw.counts.slice(),sources:[...new Set(raw.sources)]};
}
function digest(view,slot){
 let n=2166136261;
 for(let i=0;i<view.total;i++)for(const a of view.inputs(i))n=Math.imul(n^encode({x:0,y:0},{x:1,y:0},a),16777619);
 return (n>>>0).toString(16).padStart(8,'0')+':'+slot;
}
function legal(p,act){
 if(act==='feint')return canFeint(p);
 if(!canAct(p))return false;
 return !act||p.st>=moves[act][3]&&(act!=='shot'||p.ammo>0);
}
export function trainGhost(view,slot,prior){
 if(slot!==0&&slot!==1)throw Error('Choose a replay fighter.');
 const id=digest(view,slot);
 if(prior?.sources.includes(id))throw Error('This fighter from that capture is already in the ghost.');
 const counts=prior?.counts.slice()||Array(contexts*width).fill(0);
 const s=match(), ring=Array(DELAY+1);
 let samples=0, active=0;
 for(let i=0;i<view.total;i++){
   const input=view.inputs(i), own=s.p[slot], other=s.p[1-slot], chosen=input[slot];
   if(s.ready||s.end||s.over)ring.fill(null);
   else{
     const seen=ring[(i+1)%ring.length];
     if(seen&&legal(own,chosen.act)&&(chosen.act||i%6===0)){
       const index=context(own,seen)*width+encode(own,seen,chosen);
       counts[index]=Math.min(limit,counts[index]+1);samples++;
       if(chosen.x||chosen.y||chosen.act)active++;
     }
     // Engine updates fighters in place.
     ring[i%ring.length]={x:other.x,y:other.y,act:other.act,age:other.age};
   }
   step(s,input);
 }
 if(samples<12||active<4)throw Error('Capture more live movement or combat before training a ghost.');
 return {version:1,counts,sources:[...(prior?.sources||[]),id].slice(-16)};
}
export function createGhost(model,slot=1){
 if(slot!==0&&slot!==1)throw RangeError('Invalid ghost slot.');
 if(!restoreGhost(model))throw TypeError('Invalid ghost model.');
 const fallback=createSparring('duelist','normal',slot), ring=Array(DELAY+1);
 let previous=-1, round=-1, seed=(0x17c4a35^Math.imul(slot+1,0x9e3779b9))>>>0, held=blank(), next=0;
 return s=>{
   const defaultInput=fallback(s);
   if(s.tick!==previous+1||s.round!==round||s.ready||s.end||s.over){ring.fill(null);held=blank();next=0;}
   previous=s.tick;round=s.round;
   if(s.ready||s.end||s.over)return blank();
   const p=s.p[1-slot],q=s.p[slot];ring[s.tick%ring.length]={x:p.x,y:p.y,act:p.act,age:p.age};
   const seen=ring[(s.tick+1)%ring.length];
   if(!seen||(!canAct(q)&&!canFeint(q)))return blank();
   if(s.tick<next&&!canFeint(q))return held;
   const offset=context(q,seen)*width;
   let total=0;
   for(let i=0;i<width;i++)if(legal(q,actions[i%6]))total+=model.counts[offset+i];
   if(total<4)return defaultInput;
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   let pick=seed%total;
   for(let i=0;i<width;i++)if(legal(q,actions[i%6])){
     pick-=model.counts[offset+i];
     if(pick<0){
       const input=decode(q,seen,i);held={x:input.x,y:input.y,act:''};
       next=s.tick+6;return input;
     }
   }
   return defaultInput;
 };
}

const fileKind='seamless-fight-ghost/1';
const maxGhostFile=48000;
// A portable ghost is an aggregate histogram, not raw inputs or player identity.
// Replay fingerprints are included to reject accidental duplicate training.
export function ghostInsights(model){
 const byAction=Object.fromEntries(actions.map(action=>[action||'neutral',0]));
 let samples=0,seenContexts=0;
 for(let j=0;j<contexts;j++){
   let contextCount=0;
   for(let i=0;i<width;i++){
     const n=model.counts[j*width+i];samples+=n;contextCount+=n;
     byAction[actions[i%6]||'neutral']+=n;
   }
   if(contextCount)seenContexts++;
 }
 const known=['cut','hew','shot','step','feint'].sort((a,b)=>byAction[b]-byAction[a]);
 return {samples,contexts:seenContexts,sourceCount:model.sources.length,byAction,signature:known.find(a=>byAction[a])||'none'};
}
export function serializeGhost(model){
 const normalized=restoreGhost(model);
 if(!normalized)throw Error('No valid ghost profile to export.');
 const result=JSON.stringify({kind:fileKind,rules:RULESET,model:normalized});
 if(result.length>maxGhostFile)throw Error('Ghost profile exceeds the portable size limit.');
 return result;
}
export function parseGhost(text){
 if(typeof text!=='string'||text.length>maxGhostFile)throw Error('Ghost file is too large.');
 let file;try{file=JSON.parse(text);}catch{throw Error('Ghost file is not valid JSON.');}
 if(file?.kind!==fileKind||file.rules!==RULESET)throw Error('This ghost file is not compatible with the current duel rules.');
 const model=restoreGhost(file.model);
 if(!model)throw Error('Invalid or corrupted ghost profile.');
 return model;
}
