import { HZ, blank, match, moves, step } from './engine.mjs';

export const MAX_TAPE = 6 * HZ;
export const TIMELINE = 96;
const phases = Object.freeze({idle:0, startup:1, active:2, recovery:3, evade:4, stun:5});

export function phase(p) {
 const m=moves[p.act];
 if(!m||p.age>=m[0]+m[1]+m[2])return phases.idle;
 if(p.act==='stun')return phases.stun;
 if(p.act==='step'&&p.age>=1&&p.age<9)return phases.evade;
 if(p.age<m[0])return phases.startup;
 if(p.age<m[0]+m[1])return phases.active;
 return phases.recovery;
}
export function makeLab(spacing='edge') {
 const s=match(), d=({close:70,edge:110,far:190})[spacing]||110;
 s.ready=0;s.p[0].x=480-d/2;s.p[1].x=480+d/2;
 return s;
}
export function practiceTick(s, inputs, events) {
 step(s,inputs,events);
 // End only on a KO; refresh time without touching cooldowns or resources.
 if(!s.end&&!s.over&&s.clock<2)s.clock=75*HZ;
}
export function writeTape(tape, input) {
 if(tape.length<MAX_TAPE)tape.push({x:input.x,y:input.y,act:input.act});
 return tape.length<MAX_TAPE;
}
export const tapeInput=(tape,tick)=>tape[tick]||blank();
export function preset(name) {
 const tape=Array.from({length:120},blank);
 if(name==='whiff')tape[18].act='hew';
 else if(name==='bait'){tape[18].act='hew';tape[28].act='feint';tape[54].act='cut';}
 else if(name==='interrupt')tape[36].act='shot';
 return tape;
}

export function restoreDrill(spacing, opponent, player, requested) {
 const state=makeLab(spacing), trace=[], recent=[];
 const limit=Math.min(opponent.length+HZ,MAX_TAPE+HZ);
 const target=Number.isSafeInteger(requested)?Math.max(0,Math.min(requested,limit)):0;
 let tick=0;
 while(tick<target&&!state.end&&!state.over){
   practiceTick(state,[tapeInput(player,tick),tapeInput(opponent,tick)],recent);
   if(recent.length>6)recent.splice(0,recent.length-6);
   trace.push(state.p.map(phase));if(trace.length>TIMELINE)trace.shift();
   tick++;
 }
 return {state,trace,tick,limit,recent};
}
