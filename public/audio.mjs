import {scorePCM,exertionPCM} from './score.mjs';
import {moves} from './engine.mjs';

// Original synthesized sound bank. No sample downloads or per-frame synthesis.
const recipes={
 cut:[.16,490,110,.52,1800],hew:[.29,390,54,.62,1100],
 cock:[.085,930,385,.58,2200],shot:[.24,160,43,.9,2400],step:[.14,200,72,.68,520],
 feint:[.13,620,250,.42,1900],hit:[.24,145,39,.61,760],
 interrupt:[.35,330,82,.67,2100],bell:[1.2,196,192,.025,1700],
};
export function synth(name,rate){
 const [duration,start,end,noise,cutoff]=recipes[name];
 const data=new Float32Array(Math.ceil(duration*rate));
 let seed=843721,lp=0,phase=0;
 const alpha=1-Math.exp(-2*Math.PI*cutoff/rate);
 for(let i=0;i<data.length;i++){
   const u=i/data.length;
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   lp+=alpha*(seed/2147483648-1-lp);
   phase+=2*Math.PI*start*(end/start)**u/rate;
   const tone=name==='bell'?.66*Math.sin(phase)+.22*Math.sin(phase*2.41)+.12*Math.sin(phase*4.08):.81*Math.sin(phase)+.19*Math.sin(phase*2.15);
   const env=Math.min(1,i/(rate*.006))*Math.exp(-5*u)*Math.min(1,(1-u)*12);
   if(i===0)continue;
   data[i]=env*(noise*lp+(1-noise)*tone);
 }
 return data;
}
export function soundChanges(before,after,withActor=false){
 if(!before||before.round!==after.round||after.tick<=before.tick)return [];
 const out=[];
 if(before.ready&&!after.ready&&!after.end)out.push({name:'bell',x:480});
 for(let i=0;i<2;i++){
   const p=after.p[i],q=before.p[i];
   const changed=p.act!==q.act||p.age<q.age;
   const actor=withActor?{actor:i}:{};
   if(p.act==='shot'){
     const startup=moves.shot[0];
     if(p.age>startup&&(changed||q.age<=startup))out.push({name:'shot',x:p.x,muzzle:i,...actor});
     else if(changed&&p.age<=startup)out.push({name:'cock',x:p.x,...actor});
   }else if(changed&&Object.hasOwn(recipes,p.act))out.push({name:p.act,x:p.x,...actor});
   if(p.hp<q.hp)out.push({name:p.act==='stun'?'interrupt':'hit',x:p.x,index:i,...actor});
 }
 return out;
}
export function createAudio(Context=globalThis.AudioContext){
 let ctx,master,effects,ambience,music,musicDuck,voice,pulseGain,wind,enabled=false,arena='lantern',score=[],intensity=0;
 const scores=new Map();
 const beds=new Map();
 const bank=new Map(),playing=new Set();
 const set=(node,value)=>node.gain.setTargetAtTime(value,ctx.currentTime,.025);
 function build(){
   ctx=new Context({latencyHint:'interactive'});
   master=ctx.createGain();effects=ctx.createGain();ambience=ctx.createGain();
   music=ctx.createGain();voice=ctx.createGain();pulseGain=ctx.createGain();
   musicDuck=ctx.createGain();pulseGain.connect(music);music.connect(musicDuck);musicDuck.connect(master);voice.connect(effects);
   music.gain.value=.22;voice.gain.value=.35;pulseGain.gain.value=intensity;
   const compressor=ctx.createDynamicsCompressor();
   compressor.threshold.value=-16;compressor.ratio.value=5;
   effects.connect(compressor);ambience.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
   master.gain.value=0;effects.gain.value=.65;ambience.gain.value=.15;
   for(const name of Object.keys(recipes)){
     const data=synth(name,ctx.sampleRate), buffer=ctx.createBuffer(1,data.length,ctx.sampleRate);
     buffer.copyToChannel(data,0);bank.set(name,buffer);
   }
   for(const [i,name] of ['grunt-low','grunt-high'].entries()){
     const pcm=exertionPCM(ctx.sampleRate,Boolean(i)),buf=ctx.createBuffer(1,pcm.length,ctx.sampleRate);buf.copyToChannel(pcm,0);bank.set(name,buf);
   }
 }
 function stopScore(){for(const source of score){source.stop();source.disconnect();}score=[];}
 function startScore(){
   if(score.length)return;
   let buffers=scores.get(arena);
   if(!buffers){
     buffers=['drone','pulse'].map(layer=>{const pcm=scorePCM(ctx.sampleRate,arena,layer),buf=ctx.createBuffer(1,pcm.length,ctx.sampleRate);buf.copyToChannel(pcm,0);return buf;});
     scores.set(arena,buffers);
   }
   const when=ctx.currentTime+.02;
   score=buffers.map((buffer,i)=>{const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(i?pulseGain:music);source.start(when);return source;});
 }
 function startWind(){
   if(wind)return;
   let buf=beds.get(arena);
   if(!buf){
   const n=ctx.sampleRate*8;buf=ctx.createBuffer(1,n,ctx.sampleRate);const a=buf.getChannelData(0);
   let seed=21381,lo=0,hi=0;
   for(let i=0;i<n;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     const r=seed/2147483648-1;lo+=.022*(r-lo);hi+=.002*(r-hi);
     const t=i/ctx.sampleRate,env=Math.min(1,t*3,(8-t)*3);
     a[i]=arena==='cistern'?env*(.32*(lo-hi)+.04*Math.sin(2*Math.PI*55*t)+.018*Math.sin(2*Math.PI*110*t))*(.65+.35*Math.cos(2*Math.PI*t/2)):env*(.55*(lo-hi)+.052*Math.sin(2*Math.PI*49*t)+.025*Math.sin(2*Math.PI*73.5*t))*(.8+.2*Math.sin(2*Math.PI*t/8));
   }
   beds.set(arena,buf);
   }
   wind=ctx.createBufferSource();wind.buffer=buf;wind.loop=true;wind.connect(ambience);wind.start();
 }
 return {
   setArena(value){
     if(value===arena)return;
     arena=value;stopScore();if(wind){wind.stop();wind.disconnect();wind=null;}if(enabled){startWind();startScore();}
   },
   async enable(){
     if(!Context)return false;
     try{if(!ctx)build();await ctx.resume();enabled=ctx.state==='running';if(enabled){startWind();startScore();set(master,.7);}return enabled;}
     catch{return false;}
   },
   mute(){enabled=false;if(ctx)set(master,0);},
   mix(sfx,bed,scoreLevel,grunts){if(ctx){set(effects,sfx);set(ambience,bed);set(music,scoreLevel);set(voice,grunts);}},
   tension(n){if(n===intensity)return;intensity=n;if(ctx)pulseGain.gain.setTargetAtTime(n,ctx.currentTime,.35);},
   play(name,x){
     if(!enabled||ctx.state!=='running'||playing.size>=12||!bank.has(name))return;
     if(['shot','hit','interrupt','bell'].includes(name)){
       const now=ctx.currentTime, gain=musicDuck.gain;
       gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);
       gain.setTargetAtTime(.58,now,.012);gain.setTargetAtTime(1,now+.14,.16);
     }
     const source=ctx.createBufferSource(),pan=ctx.createStereoPanner();
     source.buffer=bank.get(name);pan.pan.value=Math.max(-.65,Math.min(.65,(x-480)/480));source.connect(pan);pan.connect(name.startsWith('grunt-')?voice:effects);
     playing.add(source);source.onended=()=>{playing.delete(source);source.disconnect();pan.disconnect();};source.start();
   }
 };
}
