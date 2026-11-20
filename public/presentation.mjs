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
export function drawImpact(g,x,y,life,reduced,slot){
 g.save();g.translate(x,y+4);
 const q=1-life;
 g.globalAlpha=reduced?.63:life*.85;g.strokeStyle='#ffe2a9';g.lineWidth=1.4;
 g.beginPath();g.ellipse(0,0,23+(reduced?0:17*q),13+(reduced?0:7*q),0,0,TAU);g.stroke();
 if(!reduced)for(let i=0;i<8;i++){
   const a=i*TAU/8+slot*.21,r=14+q*(23+i%3*4);
   const xx=Math.cos(a),yy=Math.sin(a);
   g.beginPath();g.moveTo(xx*r,yy*r*.6);g.lineTo(xx*(r+6*life),yy*(r+6*life)*.6);g.stroke();
 }
 g.restore();
}
export function drawHUD(g,s,local,timer,contrast){
 g.save();
 for(let i=0;i<2;i++){
   const p=s.p[i],x=i?620:24,c=i?(contrast?'#ffc36b':'#e39774'):(contrast?'#a1fff1':'#8fc8c0');
   g.fillStyle='#110e18ec';g.beginPath();g.moveTo(x,9);g.lineTo(x+298,9);g.lineTo(x+316,23);g.lineTo(x+316,69);g.lineTo(x+16,69);g.lineTo(x,56);g.closePath();g.fill();
   g.strokeStyle='#aa84596f';g.lineWidth=1;g.stroke();
   g.textAlign='left';g.fillStyle=c;g.font='bold 15px system-ui';g.fillText((i?'CINDER':'VEIL')+(i===local?'  /  YOU':''),x+16,30);
   const bar=(yy,hh,v,color)=>{
     g.fillStyle='#302432';g.fillRect(x+16,yy,250,hh);
     g.fillStyle=color;g.fillRect(x+16,yy,250*Math.max(0,Math.min(100,v))/100,hh);
     g.strokeStyle='#f6dfc02b';g.strokeRect(x+16,yy,250,hh);
   };
   bar(36,11,p.hp,c);bar(52,5,p.st,'#d3b368');
   g.textAlign='right';g.fillStyle='#f5e4c7';g.font='bold 11px system-ui';g.fillText(Math.ceil(p.hp)+' HP',x+300,45);
   for(let n=0;n<3;n++){g.fillStyle=n<p.ammo?'#e8ba70':'#443447';g.fillRect(x+272+n*10,51,6,7);}
   for(let n=0;n<2;n++){g.fillStyle=n<s.score[i]?c:'#423342';g.beginPath();g.arc(x+278+n*13,24,4,0,TAU);g.fill();}
 }
 g.textAlign='center';g.fillStyle='#130f19';g.beginPath();g.moveTo(417,8);g.lineTo(543,8);g.lineTo(532,48);g.lineTo(428,48);g.closePath();g.fill();
 g.strokeStyle='#ae8958';g.stroke();g.fillStyle=timer<=10?'#ffb190':'#f4dfb6';g.font='bold 28px Georgia';g.fillText(String(timer),480,38);
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
