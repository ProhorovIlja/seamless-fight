import {W,H,HZ,match,step,blank,moves} from './engine.mjs';
const $=id=>document.getElementById(id), canvas=$('arena'), g=canvas.getContext('2d');
const bg=document.createElement('canvas');bg.width=W;bg.height=H;
const b=bg.getContext('2d'), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed=42731;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const sky=b.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#221923');sky.addColorStop(.42,'#352c3b');sky.addColorStop(1,'#12161c');b.fillStyle=sky;b.fillRect(0,0,W,H);
b.fillStyle='#a69183';b.beginPath();b.arc(714,59,33,0,Math.PI*2);b.fill();
for(let layer=0;layer<2;layer++)for(let x=-10;x<W;x+=20+rand()*38){const y=28+rand()*102,w=12+rand()*30;b.fillStyle=layer?'#201c27':'#3c303d';b.fillRect(x,y,w,145);b.beginPath();b.moveTo(x-5,y);b.lineTo(x+w/2,y-12-rand()*35);b.lineTo(x+w+5,y);b.fill();}
b.fillStyle='#191b24';b.fillRect(30,139,900,368);
for(let y=139;y<506;y+=15)for(let x=31+(y%2)*18;x<925;x+=31){const v=32+Math.floor(rand()*15);b.fillStyle='rgb('+v+','+(v-2)+','+(v+4)+')';b.fillRect(x,y,28,12);}
b.strokeStyle='#65564d';b.lineWidth=2;b.strokeRect(41,140,878,365);b.strokeStyle='#43343c';b.strokeRect(48,147,864,351);
for(let i=0;i<7;i++){b.beginPath();b.ellipse(480,325,67+i*11,46+i*8,0,0,Math.PI*2);b.stroke();}
for(const x of [81,230,730,879]){const p=b.createRadialGradient(x,156,0,x,156,110);p.addColorStop(0,'#eb9a5264');p.addColorStop(1,'#e9753800');b.fillStyle=p;b.fillRect(x-110,46,220,220);b.fillStyle='#0f1017';b.fillRect(x-2,153,4,50);b.fillStyle='#ffce87';b.fillRect(x-4,149,8,12);}
const vignette=b.createRadialGradient(480,280,150,480,280,540);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#07050cb9');b.fillStyle=vignette;b.fillRect(0,0,W,H);

const status=t=>{$('status').textContent=t;};
let s=match(), prev=null, at=0, mode='', ws, slot=0, action='', vote=false, ping=0, lastSound=null, audio;
const pressed=new Set(), keys={KeyJ:'cut',KeyK:'hew',KeyL:'shot',Space:'step'};
const moveKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
function read(){const on=(a,b)=>Number(pressed.has(a)||pressed.has(b));const i={x:on('KeyD','ArrowRight')-on('KeyA','ArrowLeft'),y:on('KeyS','ArrowDown')-on('KeyW','ArrowUp'),act:action};action='';return i;}
function flush(){pressed.clear();action='';if(ws?.readyState===1)ws.send(JSON.stringify({t:'input',...blank()}));}
addEventListener('blur',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
addEventListener('keydown',e=>{if(e.target.matches?.('input,button')||!mode)return;if(moveKeys.includes(e.code)||keys[e.code])e.preventDefault();if(!e.repeat&&keys[e.code])action=keys[e.code];pressed.add(e.code);});
addEventListener('keyup',e=>pressed.delete(e.code));
function leave(){const c=ws;ws=null;c?.close();flush();s=match();prev=null;slot=0;vote=false;lastSound=null;$('copy').hidden=$('invite').hidden=$('rematch').hidden=true;}
function practice(){leave();mode='practice';status('Practice · first to two round wins.');document.activeElement?.blur();}
function online(code){
 leave();mode='connecting';status('Connecting to Lantern Court…');
 const url=new URL('./socket',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
 const c=ws=new WebSocket(url);
 c.onopen=()=>c.send(JSON.stringify({t:'hello',code}));
 c.onmessage=e=>{
   if(c!==ws)return;const m=JSON.parse(e.data);
   if(m.t==='room'){
     slot=m.slot;const invite=new URL('./',location.href);invite.searchParams.set('room',m.code);$('invite').value=invite.href;$('copy').hidden=$('invite').hidden=false;status(slot?'Opponent found.':'Waiting for an opponent. Share the invite link.');
   }
   if(m.t==='state'){prev=m.s.tick>=s.tick&&m.s.round===s.round?s:null;at=performance.now();if(mode!=='online')status('Online duel · first to two round wins.');if(!m.s.over){vote=false;$('rematch').textContent='Rematch';}mode='online';s=m.s;}
   if(m.t==='pong')ping=Math.round(performance.now()-m.id);
   if(m.t==='vote'&&m.slot!==slot)$('rematch').textContent='Accept rematch';
   if(m.t==='error'){leave();mode='';status(m.message);}
 };
 c.onclose=()=>{if(c===ws){leave();mode='';status('Connection closed. Create a new room.');}};
 document.activeElement?.blur();
}
$('practice').onclick=practice;$('online').onclick=()=>online(null);
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('invite').value);status('Invite copied.');}catch{$('invite').focus();$('invite').select();}};
$('rematch').onclick=()=>{document.activeElement?.blur();if(mode==='practice')practice();else if(ws?.readyState===1&&!vote){vote=true;$('rematch').textContent='Waiting for opponent';ws.send('{"t":"rematch"}');}};
$('sound').onclick=async()=>{const btn=$('sound');if(audio?.state==='running'){await audio.suspend();btn.textContent='Sound off';btn.setAttribute('aria-pressed','false');return;}audio??=new AudioContext();await audio.resume();btn.textContent='Sound on';btn.setAttribute('aria-pressed','true');};
function impact(){if(audio?.state!=='running')return;const t=audio.currentTime,o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(137,t);o.frequency.exponentialRampToValueAtTime(44,t+.15);v.gain.setValueAtTime(.18,t);v.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(v).connect(audio.destination);o.start(t);o.stop(t+.19);}
const invite=new URLSearchParams(location.search).get('room');if(invite&&/^[\w-]{12}$/.test(invite))online(invite);
setInterval(()=>{if(ws?.readyState===1)ws.send(JSON.stringify({t:'ping',id:performance.now()}));},2000);
function bot(){
 const [p,q]=s.p,dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),sign=x=>Math.abs(x)>9?Math.sign(x):0;
 if(q.act)return blank();
 if((p.act==='hew'||p.act==='cut')&&p.age===5&&d<125&&q.st>24)return {x:sign(-dy),y:sign(dx),act:'step'};
 if(d<165&&q.ammo&&p.act==='hew'&&p.age>=9&&p.age<13)return {...blank(),act:'shot'};
 if(d<105&&d>71&&s.tick%41===0)return {...blank(),act:'hew'};
 if(d<81&&s.tick%23===0)return {...blank(),act:'cut'};
 return d>67?{x:sign(dx),y:sign(dy),act:''}:blank();
}
let prevFrame=performance.now(),acc=0;
function drawFighter(p,i,x,y,time){
 const color=i?'#e39774':'#8fc8c0', f=Math.atan2(p.fy,p.fx), m=moves[p.act], active=m&&p.age>=m[0]&&p.age<m[0]+m[1];
 g.save();g.translate(x,y);
 g.fillStyle='#09090dcc';g.beginPath();g.ellipse(0,8,26,12,0,0,Math.PI*2);g.fill();
 g.rotate(f);
 if(p.act==='step'&&active)g.globalAlpha=.56;
 if(m&&m[5]){
   g.beginPath();g.moveTo(0,0);g.arc(0,0,m[4],p.act==='shot'?-.11:-.85,p.act==='shot'?.11:.85);g.closePath();g.fillStyle=active?color+'6b':color+'15';g.fill();g.strokeStyle=active?color:color+'68';g.lineWidth=active?2:1;g.stroke();
 }
 const stride=reduced?0:Math.sin(time/55)*Math.min(4,Math.hypot(p.vx,p.vy));
 g.fillStyle='#12131a';g.fillRect(-12+stride,-12,15,8);g.fillRect(-12-stride,5,15,8);
 g.fillStyle='#312d3a';g.beginPath();g.moveTo(9,-13);g.lineTo(-7,-18);g.lineTo(-23,-15);g.lineTo(-19,15);g.lineTo(-7,18);g.lineTo(9,12);g.closePath();g.fill();
 g.strokeStyle=color;g.lineWidth=2;g.stroke();
 g.fillStyle='#12141b';g.beginPath();g.ellipse(3,0,11,10,0,0,Math.PI*2);g.fill();
 g.fillStyle=color;g.fillRect(8,-5,3,10);
 g.strokeStyle=p.act==='stun'?'#ffe7a8':'#e7d9be';g.lineWidth=3;g.beginPath();g.moveTo(3,14);g.lineTo(p.act==='hew'?23:32,p.act==='cut'?9:17);g.stroke();
 g.restore();
}
function bar(x,y,w,v,color){g.fillStyle='#171420';g.fillRect(x,y,w,8);g.fillStyle=color;g.fillRect(x,y,w*Math.max(0,v)/100,8);}
function render(now){
 const elapsed=Math.min(100,now-prevFrame);prevFrame=now;acc+=elapsed;
 let budget=5;
 while(acc>=1000/HZ&&budget-->0){acc-=1000/HZ;if(mode==='practice')step(s,[read(),bot()]);else if(mode==='online'&&ws?.readyState===1&&ws.bufferedAmount<2048)ws.send(JSON.stringify({t:'input',...read()}));}
 if(acc>100)acc=0;
 const hp=s.p.map(p=>p.hp);if(lastSound&&hp.some((v,i)=>v<lastSound[i]))impact();lastSound=hp;
 g.drawImage(bg,0,0);
 if(!reduced){for(let i=0;i<27;i++){const x=(i*157+now*.013)%W,y=153+(i*71)%335;g.fillStyle=i%3?'#e3d6dc1d':'#e7a16082';g.fillRect(x,y,2,2);}}
 const blend=mode==='online'&&prev?Math.min(1,(now-at)/50):1;
 const poses=s.p.map((p,i)=>({p,i,x:prev?prev.p[i].x+(p.x-prev.p[i].x)*blend:p.x,y:prev?prev.p[i].y+(p.y-prev.p[i].y)*blend:p.y})).sort((a,b)=>a.y-b.y);
 for(const {p,i,x,y} of poses)drawFighter(p,i,x,y,now);
 for(let i=0;i<2;i++){const p=s.p[i],x=i?674:36,c=i?'#e39774':'#8fc8c0';g.fillStyle=c;g.font='15px system-ui';g.textAlign='left';g.fillText((i?'CINDER':'VEIL')+' · '+s.score[i]+'   /   '+p.ammo+' SHOTS'+(i===slot&&mode?'   /   YOU':''),x,27);bar(x,35,250,p.hp,c);bar(x,47,250,p.st,'#d1aa60');}
 g.textAlign='center';g.fillStyle='#eee1c8';g.font='24px Georgia';g.fillText(String(Math.ceil(s.clock/HZ)),480,38);
 if(mode==='online'){g.font='13px system-ui';g.fillText(ping?ping+' ms RTT':'ONLINE',480,59);}
 let msg='';
 if(mode==='connecting')msg='Waiting for challenger';
 else if(mode){if(s.over)msg=s.winner===slot?'Victory':'Defeat';else if(s.end)msg=s.winner<0?'Draw':s.winner===slot?'Round won':'Round lost';else if(s.ready)msg='Round '+s.round+'  /  '+Math.ceil(s.ready/HZ);}
 if(msg){g.fillStyle='#13101bd4';g.fillRect(250,222,460,76);g.fillStyle='#f5ddaf';g.font='36px Georgia';g.fillText(msg,480,270);}
 $('rematch').hidden=!s.over;
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
