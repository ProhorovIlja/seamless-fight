const TAU=Math.PI*2;
export function drawMail(g,color,stun){
 g.fillStyle='#68626d';g.beginPath();g.moveTo(-3,-8);g.quadraticCurveTo(13,-10,14,-2);g.lineTo(12,7);g.lineTo(-3,8);g.closePath();g.fill();
 g.fillStyle='#24232d';g.beginPath();g.moveTo(-2,-5);g.lineTo(13,-4);g.lineTo(12,3);g.lineTo(-2,5);g.closePath();g.fill();
 g.strokeStyle=stun?'#ffe7a8':color;g.lineWidth=1.6;g.beginPath();g.moveTo(9,-5);g.lineTo(10,4);g.stroke();
}
export function paintAtmosphere(g,arena,now,reduced){
 if(reduced)return;
 g.save();g.strokeStyle=arena==='cistern'?'#9dd5d32a':'#ffce9521';g.lineWidth=1;
 for(let i=0;i<9;i++){
   const x=62+i*103,y=518+(i%3)*5, phase=now/800+i*2.1;
   g.globalAlpha=.4+.3*Math.sin(phase);
   g.beginPath();g.ellipse(x,y,11+5*Math.cos(phase),1.8,0,0,TAU);g.stroke();
 }
 g.restore();
}
export function drawImpact(g,x,y,life,reduced,slot,heading=null){
 g.save();g.translate(x,y+4);
 const q=1-life;
 g.globalAlpha=reduced?.63:life*.85;g.strokeStyle='#ffe2a9';g.lineWidth=1.4;
 g.beginPath();g.ellipse(0,0,23+(reduced?0:17*q),13+(reduced?0:7*q),0,0,TAU);g.stroke();
 if(!reduced)for(let i=0;i<8;i++){
   const a=heading===null?i*TAU/8+slot*.21:heading+(i-3.5)*.32,r=14+q*(23+i%3*4);
   const xx=Math.cos(a),yy=Math.sin(a);
   g.beginPath();g.moveTo(xx*r,yy*r*.6);g.lineTo(xx*(r+6*life),yy*(r+6*life)*.6);g.stroke();
 }
 g.restore();
}
export function drawHUD(g,s,local,timer,contrast,helm,huntFont=false,trail=null,theme=null){
 g.save();
 for(let i=0;i<2;i++){
   const p=s.p[i],x=i?620:24,c=i?(contrast?'#ffc36b':'#e39774'):(contrast?'#a1fff1':'#8fc8c0');
   g.fillStyle='#14171cef';g.beginPath();g.moveTo(x,9);g.lineTo(x+298,9);g.lineTo(x+316,23);g.lineTo(x+316,69);g.lineTo(x+16,69);g.lineTo(x,56);g.closePath();g.fill();
   g.strokeStyle='#c9a86a86';g.lineWidth=1;g.stroke();
   g.fillStyle='#302631';g.fillRect(x+15,15,19,17);
   if(helm?.complete&&helm.naturalWidth)g.drawImage(helm,x+16,15,17,17);
   g.textAlign='left';g.fillStyle=c;g.font='bold 15px system-ui';g.fillText((i?'CINDER':'VEIL')+(i===local?'  /  YOU':''),x+42,30);
   const bar=(yy,hh,v,color,after=v)=>{
     g.fillStyle='#302432';g.fillRect(x+16,yy,250,hh);
     const fill=(n,paint)=>{const w=2.5*Math.max(0,Math.min(100,n));g.fillStyle=paint;g.fillRect(i?x+266-w:x+16,yy,w,hh);};
     if(after>v)fill(after,'#d9b878ad');fill(v,color);
     g.strokeStyle='#f6dfc02b';g.strokeRect(x+16,yy,250,hh);
   };
   bar(36,11,p.hp,c,trail?.[i]??p.hp);bar(52,5,p.st,'#d3b368');
   icon(g,theme?.vial,x+251,15,17);
   g.textAlign='right';g.fillStyle='#f5e4c7';g.font='bold 11px system-ui';g.fillText(Math.ceil(p.hp)+' HP',x+300,45);
   for(let n=0;n<3;n++){g.fillStyle=n<p.ammo?'#e8ba70':'#443447';g.fillRect(x+272+n*10,51,6,7);}
   for(let n=0;n<2;n++){g.fillStyle=n<s.score[i]?c:'#423342';g.beginPath();g.arc(x+278+n*13,24,4,0,TAU);g.fill();}
 }
 g.textAlign='center';g.fillStyle='#0d0f13';g.beginPath();g.moveTo(417,8);g.lineTo(543,8);g.lineTo(532,48);g.lineTo(428,48);g.closePath();g.fill();
 g.strokeStyle='#ae8958';g.stroke();g.fillStyle=timer<=10?'#ffb190':'#f0e2c2';g.font=huntFont?'30px "Hunt Garamond", Georgia':'28px Georgia';g.fillText(String(timer),480,38);
 g.restore();
}

// Easing is presentation-only; arc endpoints and the active timing still use the move table.
export function bladeAngle(act,age,move){
 if(act==='shot')return 0;
 if(act==='feint')return -.9*(1-Math.min(1,age/move[2]));
 if(act!=='cut'&&act!=='hew')return .42;
 const [start,active,recover]=move, arc=Math.acos(.45), ease=t=>t*t*(3-2*t);
 if(age<start)return -.35-(arc-.35)*ease(age/start);
 if(age<start+active)return -arc+2*arc*ease((age-start+1)/active);
 return arc+(.42-arc)*ease(Math.min(1,(age-start-active)/recover));
}
export function drawBladeWake(g,act,sweep,reach){
 const width=act==='hew'?.62:.43;
 g.save();g.translate(7,10);
 g.strokeStyle='#fff2cd96';g.lineWidth=2;
 g.beginPath();g.arc(0,0,reach+1,sweep-width,sweep);g.stroke();
 g.strokeStyle='#e7b17a4a';g.lineWidth=3;
 g.beginPath();g.arc(0,0,reach-4,sweep-width*.9,sweep);g.stroke();
 g.restore();
}
// Sparse, seeded material weathering is baked into the stage once, not every frame.
export function textureFloor(g,arena,W,H){
 let state=arena==='cistern'?39877:71037;
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 g.save();g.beginPath();g.rect(48,97,W-96,H-156);g.clip();
 for(let i=0;i<460;i++){
   const x=48+random()*(W-96),y=97+random()*(H-156),n=2+random()*8;
   g.fillStyle=i%3===0?'#c9bdaa18':'#05050d31';
   g.fillRect(x,y,n,1);
   if(i%13===0){g.strokeStyle='#07070f42';g.beginPath();g.moveTo(x,y);g.lineTo(x+n*.4,y+3);g.lineTo(x+n,y+5);g.stroke();}
 }
 g.restore();
}

// Display-only health afterimage. Explicit resets handle local seeks and mode swaps;
// round/tick checks handle countdowns and online rematches.
export function damageTrail(){
 const hp=[100,100], trail=[100,100], hold=[0,0];
 let tick=-1, round=-1;
 return {
  clear(){tick=-1;round=-1;},
  update(s,ms,reduced){
   const reset=reduced||s.round!==round||s.tick<tick||s.ready>0;
   for(let i=0;i<2;i++){
     const next=s.p[i].hp;
     if(reset||next>hp[i]){trail[i]=next;hold[i]=0;}
     else if(next<hp[i]){trail[i]=Math.max(hp[i],trail[i]);hold[i]=145;}
     else{
       const decay=Math.max(0,ms-hold[i]);hold[i]=Math.max(0,hold[i]-ms);
       trail[i]=Math.max(next,trail[i]-decay*.095);
     }
     hp[i]=next;
   }
   tick=s.tick;round=s.round;return trail;
  }
 };
}
function icon(g,img,x,y,w,h=w){
 if(img?.complete&&img.naturalWidth){g.drawImage(img,x,y,w,h);return true;}
 return false;
}
export function drawRoundPlate(g,msg,kind,theme,huntFont){
 g.save();g.translate(480,258);
 g.fillStyle='#12151af2';g.strokeStyle='#c9a86a';g.lineWidth=1;
 g.beginPath();g.moveTo(-220,-42);g.lineTo(220,-42);g.lineTo(233,-28);g.lineTo(233,28);g.lineTo(220,42);
 g.lineTo(-220,42);g.lineTo(-233,28);g.lineTo(-233,-28);g.closePath();g.fill();g.stroke();
 const art=kind==='result'?theme?.skull:theme?.bell;
 if(!icon(g,art,-13,-36,26)){
   g.strokeStyle='#c9a86aa6';g.beginPath();g.moveTo(0,-31);g.lineTo(7,-24);g.lineTo(0,-17);g.lineTo(-7,-24);g.closePath();g.stroke();
 }
 g.fillStyle='#f0e2c2';g.textAlign='center';g.font=huntFont?'34px "Hunt Garamond", Georgia':'30px Georgia';g.fillText(msg,0,22,420);
 g.restore();
}

export function backingSize(cssWidth,dpr,w,h){
 const ratio=Number.isFinite(dpr)?Math.max(1,Math.min(2,dpr)):1;
 const logical=Number.isFinite(cssWidth)&&cssWidth>0?cssWidth:w;
 const width=Math.max(320,Math.min(2*w,Math.round(logical*ratio)));
 return {width,height:Math.round(width*h/w)};
}

export function duelMessage(s,mode,slot,watching=false,exhibition=false,hz=60){
 if(mode==='connecting')return 'Waiting for challenger';
 if(mode==='spectate'&&s.tick===0)return 'Waiting for fighters';
 if(!mode||mode==='lab'||mode==='review')return '';
 const neutral=watching||exhibition;
 const winner=s.winner===0?'Veil':'Cinder';
 if(s.over)return s.winner<0?'Draw':neutral?winner+' wins':s.winner===slot?'Victory':'Defeat';
 if(s.end)return s.winner<0?'Draw':neutral?winner+' takes the round':s.winner===slot?'Round won':'Round lost';
 if(s.ready)return 'Round '+s.round+'  /  '+Math.ceil(s.ready/hz);
 return '';
}

export function setBadgeText(set){
 if(!set||!Array.isArray(set.wins)||set.wins.length!==2)return '';
 const [veil,cinder]=set.wins;
 if(!Number.isSafeInteger(veil)||!Number.isSafeInteger(cinder))return '';
 return set.complete?'SET FINISHED · '+veil+' – '+cinder:
   'GAME '+(set.games+1)+' · '+veil+' – '+cinder;
}
export function drawSetBadge(g,set,huntFont=false){
 const text=setBadgeText(set);
 if(!text)return;
 g.save();
 const x=480,y=72;
 g.fillStyle='#10151de8';g.strokeStyle='#c9a86ab3';g.lineWidth=1;
 g.beginPath();g.moveTo(x-106,y-11);g.lineTo(x+106,y-11);g.lineTo(x+113,y);
 g.lineTo(x+106,y+11);g.lineTo(x-106,y+11);g.lineTo(x-113,y);g.closePath();g.fill();g.stroke();
 g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f0e2c2';
 g.font=huntFont?'16px "Hunt Garamond", Georgia':'bold 12px Georgia';
 g.fillText(text,x,y,198);
 g.restore();
}
