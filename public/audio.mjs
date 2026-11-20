// Original synthesized sound bank. No sample downloads or per-frame synthesis.
const recipes={
 cut:[.16,490,110,.52,1800],hew:[.29,390,54,.62,1100],
 shot:[.24,160,43,.9,2400],step:[.14,200,72,.68,520],
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
   data[i]=env*(noise*lp+(1-noise)*tone);
 }
 return data;
}
export function soundChanges(before,after){
 if(!before||before.round!==after.round||after.tick<=before.tick)return [];
 const out=[];
 if(before.ready&&!after.ready&&!after.end)out.push({name:'bell',x:480});
 for(let i=0;i<2;i++){
   const p=after.p[i],q=before.p[i];
   if(p.hp<q.hp)out.push({name:p.act==='stun'?'interrupt':'hit',x:p.x,index:i});
   else if(Object.hasOwn(recipes,p.act)&&(p.act!==q.act||p.age<q.age))out.push({name:p.act,x:p.x});
 }
 return out;
}
export function createAudio(Context=globalThis.AudioContext){
 let ctx,master,effects,ambience,wind,enabled=false;
 const bank=new Map(),playing=new Set();
 const set=(node,value)=>node.gain.setTargetAtTime(value,ctx.currentTime,.025);
 function build(){
   ctx=new Context({latencyHint:'interactive'});
   master=ctx.createGain();effects=ctx.createGain();ambience=ctx.createGain();
   const compressor=ctx.createDynamicsCompressor();
   compressor.threshold.value=-16;compressor.ratio.value=5;
   effects.connect(compressor);ambience.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
   master.gain.value=0;effects.gain.value=.65;ambience.gain.value=.15;
   for(const name of Object.keys(recipes)){
     const data=synth(name,ctx.sampleRate), buffer=ctx.createBuffer(1,data.length,ctx.sampleRate);
     buffer.copyToChannel(data,0);bank.set(name,buffer);
   }
 }
 function startWind(){
   if(wind)return;
   const n=ctx.sampleRate*8,buf=ctx.createBuffer(1,n,ctx.sampleRate),a=buf.getChannelData(0);
   let seed=21381,lo=0,hi=0;
   for(let i=0;i<n;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     const r=seed/2147483648-1;lo+=.022*(r-lo);hi+=.002*(r-hi);
     const t=i/ctx.sampleRate,env=Math.min(1,t*3,(8-t)*3);
     a[i]=env*(.55*(lo-hi)+.052*Math.sin(2*Math.PI*49*t)+.025*Math.sin(2*Math.PI*73.5*t))*(.8+.2*Math.sin(2*Math.PI*t/8));
   }
   wind=ctx.createBufferSource();wind.buffer=buf;wind.loop=true;wind.connect(ambience);wind.start();
 }
 return {
   async enable(){
     if(!Context)return false;
     try{if(!ctx)build();await ctx.resume();enabled=ctx.state==='running';if(enabled){startWind();set(master,.7);}return enabled;}
     catch{return false;}
   },
   mute(){enabled=false;if(ctx)set(master,0);},
   mix(sfx,bed){if(ctx){set(effects,sfx);set(ambience,bed);}},
   play(name,x){
     if(!enabled||ctx.state!=='running'||playing.size>=12||!bank.has(name))return;
     const source=ctx.createBufferSource(),pan=ctx.createStereoPanner();
     source.buffer=bank.get(name);pan.pan.value=Math.max(-.65,Math.min(.65,(x-480)/480));source.connect(pan);pan.connect(effects);
     playing.add(source);source.onended=()=>{playing.delete(source);source.disconnect();pan.disconnect();};source.start();
   }
 };
}
