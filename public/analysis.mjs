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
