import { moves, canAct, FEINT } from './engine.mjs';
export const LIMIT=12;
const glyph=['↖','↑','↗','←','·','→','↙','↓','↘'];
const actionNames={cut:'Cut',hew:'Heavy',shot:'Pistol',step:'Quickstep',feint:'Feint',stun:'Stun'};
export function inputLabel(i){
 return glyph[(i.y+1)*3+i.x+1]+(i.act?' '+actionNames[i.act]:'');
}
export function logInput(history,tick,input){
 const label=inputLabel(input), last=history.at(-1);
 if(!input.act&&last?.label===label&&last.to+1===tick){last.to=tick;return;}
 history.push({from:tick,to:tick,label});
 if(history.length>LIMIT)history.shift();
}
export function describe(p){
 if(canAct(p))return 'Ready';
 const [start,active,recovery]=moves[p.act];
 const name=actionNames[p.act];
 if(p.act==='stun'||p.act==='feint')return name+' · '+(recovery-p.age)+' left';
 if(p.act==='step'&&p.age>=1&&p.age<9)return name+' · invulnerable · '+(9-p.age)+' left';
 if(p.age<start)return name+' · startup · '+(start-p.age)+' left'+(p.act==='hew'&&p.age>=FEINT.from&&p.age<FEINT.until&&p.st>=FEINT.cost?' · feint available':'');
 if(p.age<start+active)return name+' · active · '+(start+active-p.age)+' left';
 return name+' · recovery · '+(start+active+recovery-p.age)+' left';
}

export function eventLabel(event){
 const actor=event.actor?'Cinder':'Veil', move=actionNames[event.move];
 if(event.kind==='miss')return actor+' '+move+' missed';
 const target=event.target?'Cinder':'Veil';
 return actor+' '+move+' · '+event.kind+' · '+target+' −'+event.damage+' HP';
}

const replayActions=['cut','hew','shot','step','feint'];
export function replayReport(view){
 if(!view||!Number.isSafeInteger(view.total)||view.total<0||typeof view.inputs!=='function'||!Array.isArray(view.events)||typeof view.at!=='function')throw TypeError('Invalid review.');
 const fighters=Array.from({length:2},()=>({inputs:Object.fromEntries(replayActions.map(name=>[name,0])),movementTicks:0,hits:0,misses:0,damage:0,punishes:0,interrupts:0}));
 for(let t=0;t<view.total;t++){
   const inputs=view.inputs(t);
   for(let i=0;i<2;i++){
     const cmd=inputs[i],stat=fighters[i];
     if(cmd.x||cmd.y)stat.movementTicks++;
     if(Object.hasOwn(stat.inputs,cmd.act))stat.inputs[cmd.act]++;
   }
 }
 for(const event of view.events){
   if(!event.kind||![0,1].includes(event.actor))continue;
   const stat=fighters[event.actor];
   if(event.kind==='miss')stat.misses++;
   else{
     stat.hits++;stat.damage+=event.damage||0;
     if(event.kind==='interrupt')stat.interrupts++;
     if(event.kind==='whiff punish'||event.kind==='recovery punish')stat.punishes++;
   }
 }
 const s=view.at(view.total);
 return {ticks:view.total,seconds:view.total/60,complete:Boolean(s.over),winner:s.over?s.winner:null,rounds:s.round,score:s.score.slice(),fighters};
}
