import {scorePCM,exertionPCM,windPCM} from './score.mjs';
import {moves} from './engine.mjs';

// Original synthesized sound bank. No sample downloads or per-frame synthesis.
const sampleFiles=Object.freeze({
 hit:'./audio/impactMetal_light_000.ogg',
 interrupt:'./audio/impactMetal_heavy_000.ogg',
 step:'./audio/footstep_concrete_000.ogg'
});
const recipes={
 rangeCut:[.14,565,770,.04,1800],rangeShot:[.13,272,348,.035,1500],rangeExit:[.12,385,244,.03,1400],
 cut:[.16,490,110,.52,1800],hew:[.29,390,54,.62,1100],
 cock:[.085,930,385,.58,2200],shot:[.24,160,43,.9,2400],step:[.14,200,72,.68,520],
 feint:[.13,620,250,.42,1900],hit:[.24,145,39,.61,760],
 interrupt:[.35,330,82,.67,2100],bell:[1.2,196,192,.025,1700],
};
export function synth(name,rate,variant=0){
 const [duration,start,end,noise,cutoff]=recipes[name];
 const data=new Float32Array(Math.ceil(duration*rate));
 let seed=843721+variant*15791,lp=0,phase=0;
 const detune=1+variant*.035;
 const alpha=1-Math.exp(-2*Math.PI*cutoff/rate);
 for(let i=0;i<data.length;i++){
   const u=i/data.length;
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   lp+=alpha*(seed/2147483648-1-lp);
   phase+=2*Math.PI*detune*start*(end/start)**u/rate;
   const tone=name==='bell'?.66*Math.sin(phase)+.22*Math.sin(phase*2.41)+.12*Math.sin(phase*4.08):.81*Math.sin(phase)+.19*Math.sin(phase*2.15);
   const env=Math.min(1,i/(rate*.006))*Math.exp(-5*u)*Math.min(1,(1-u)*12);
   if(i===0)continue;
   const t=i/rate;
   const metal=name==='interrupt'?.17*Math.exp(-21*t)*(Math.sin(2*Math.PI*1088*detune*t)+.46*Math.sin(2*Math.PI*1727*detune*t)):
     name==='hit'?.09*Math.exp(-43*t)*Math.sin(2*Math.PI*640*detune*t):0;
   const crack=name==='shot'?.31*Math.exp(-100*t)*lp:0;
   data[i]=Math.max(-1,Math.min(1,env*(noise*lp+(1-noise)*tone+metal+crack)));
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
   if(p.hp<q.hp)out.push({name:p.act==='stun'?'interrupt':'hit',x:p.x,index:i,...(withActor?{actor:1-i}:{})});
 }
 return out;
}
export function rangeBand(distance,previous){
 // Hysteresis prevents chatter as snapshots straddle a boundary.
 const margin=previous==='cut'?8:0;
 if(distance<=moves.cut[4]+margin)return 'cut';
 if(distance<=moves.shot[4]+(previous==='shot'?8:0))return 'shot';
 return 'far';
}
export function createAudio(Context=globalThis.AudioContext){
 let ctx,master,effects,ambience,assist,music,musicDuck,voice,pulseGain,wind,enabled=false,arena='lantern',score=[],intensity=0;
 let center=false;
 const scores=new Map();
 const beds=new Map();
 const bank=new Map(),playing=new Set(), takes=new Map(),recorded=new Map();
 let sampleRequested=false;
 function prepareSamples(){
   if(sampleRequested||!ctx||typeof fetch!=='function')return;
   sampleRequested=true;
   // A missing or undecodable optional sample leaves the original synthesized
   // sound fully functional. Fetch only after explicit user audio activation.
   for(const [name,path] of Object.entries(sampleFiles)){
     fetch(new URL(path,import.meta.url)).then(async response=>{
       if(!response.ok)throw Error('Sound sample unavailable');
       if(Number(response.headers.get('content-length'))>128000)throw Error('Sound sample too large');
       const bytes=await response.arrayBuffer();
       if(bytes.byteLength>128000||bytes.byteLength<128)throw Error('Invalid sample size');
       return ctx.decodeAudioData(bytes);
     }).then(clip=>{if(clip.duration<=3)recorded.set(name,clip);}).catch(()=>{});
   }
 }

 const set=(node,value)=>node.gain.setTargetAtTime(value,ctx.currentTime,.025);
 function build(){
   ctx=new Context({latencyHint:'interactive'});
   master=ctx.createGain();effects=ctx.createGain();ambience=ctx.createGain();
   music=ctx.createGain();voice=ctx.createGain();assist=ctx.createGain();assist.gain.value=.26;pulseGain=ctx.createGain();
   musicDuck=ctx.createGain();pulseGain.connect(music);music.connect(musicDuck);musicDuck.connect(master);
   music.gain.value=.22;voice.gain.value=.35;pulseGain.gain.value=intensity;
   const compressor=ctx.createDynamicsCompressor();
   compressor.threshold.value=-16;compressor.ratio.value=5;
   effects.connect(compressor);voice.connect(compressor);assist.connect(compressor);ambience.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
   master.gain.value=0;effects.gain.value=.65;ambience.gain.value=.15;
   for(const name of Object.keys(recipes)){
     const data=synth(name,ctx.sampleRate), buffer=ctx.createBuffer(1,data.length,ctx.sampleRate);
     buffer.copyToChannel(data,0);
     const variants=[buffer];
     if(['cut','hew','step','hit','interrupt','shot'].includes(name))for(let j=1;j<=2;j++){
       const pcm=synth(name,ctx.sampleRate,j), take=ctx.createBuffer(1,pcm.length,ctx.sampleRate);
       take.copyToChannel(pcm,0);variants.push(take);
     }
     bank.set(name,variants);
   }
   for(const [i,name] of ['grunt-low','grunt-high'].entries()){
     const variants=[];
     for(let take=0;take<3;take++){
       const pcm=exertionPCM(ctx.sampleRate,Boolean(i),take),buf=ctx.createBuffer(1,pcm.length,ctx.sampleRate);
       buf.copyToChannel(pcm,0);variants.push(buf);
     }
     bank.set(name,variants);
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
 function stopBeds(){
   stopScore();if(wind){wind.stop();wind.disconnect();wind=null;}
 }
 function startWind(){
   if(wind)return;
   let buf=beds.get(arena);
   if(!buf){
   const pcm=windPCM(ctx.sampleRate,arena);
   buf=ctx.createBuffer(1,pcm.length,ctx.sampleRate);buf.copyToChannel(pcm,0);
   beds.set(arena,buf);
   }
   wind=ctx.createBufferSource();wind.buffer=buf;wind.loop=true;wind.connect(ambience);wind.start();
 }
 return {
   setArena(value){
     if(value===arena)return;
     arena=value;stopBeds();if(enabled){startWind();startScore();}
   },
   async enable(){
     if(!Context)return false;
     try{if(!ctx)build();await ctx.resume();enabled=ctx.state==='running';if(enabled){startWind();startScore();set(master,.7);prepareSamples();}return enabled;}
     catch{return false;}
   },
   mute(){
     enabled=false;
     if(ctx){
       set(master,0);stopBeds();
       for(const source of playing)source.stop();playing.clear();
     }
   },
   mix(sfx,bed,scoreLevel,grunts){if(ctx){set(effects,sfx);set(ambience,bed);set(music,scoreLevel);set(voice,grunts);}},
   tension(n){if(n===intensity)return;intensity=n;if(ctx)pulseGain.gain.setTargetAtTime(n,ctx.currentTime,.35);},
   assist(level,mono){if(ctx)set(assist,level);center=mono;},
   play(name,x){
     if(!enabled||ctx.state!=='running'||playing.size>=12||!bank.has(name))return;
     if(['shot','hit','interrupt','bell'].includes(name)){
       const now=ctx.currentTime, gain=musicDuck.gain;
       gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);
       gain.setTargetAtTime(.58,now,.012);gain.setTargetAtTime(1,now+.14,.16);
     }
     const source=ctx.createBufferSource(),pan=ctx.createStereoPanner();
     const clips=bank.get(name), take=takes.get(name)||0;
     source.buffer=clips[take];takes.set(name,(take+1)%clips.length);pan.pan.value=center||name.startsWith('range')?0:Math.max(-.65,Math.min(.65,(x-480)/480));source.connect(pan);pan.connect(name.startsWith('range')?assist:name.startsWith('grunt-')?voice:effects);
     playing.add(source);source.onended=()=>{playing.delete(source);source.disconnect();pan.disconnect();};source.start();
     const sample=recorded.get(name);
     if(sample&&playing.size<12){
       const layer=ctx.createBufferSource(),gain=ctx.createGain(),position=ctx.createStereoPanner();
       layer.buffer=sample;
       gain.gain.value=name==='step'?.13:name==='hit'?.22:.25;
       position.pan.value=pan.pan.value;
       layer.connect(gain);gain.connect(position);position.connect(effects);
       playing.add(layer);
       layer.onended=()=>{playing.delete(layer);layer.disconnect();gain.disconnect();position.disconnect();};
       layer.start();
     }
   }
 };
}
