import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../public/audio.mjs';
const param=()=>({value:1,setTargetAtTime(v){this.value=v;},setValueAtTime(){},cancelScheduledValues(){}});
class Context{
 static current;
 constructor(){Context.current=this;this.currentTime=0;this.sampleRate=2000;this.destination={};this.sources=[];this.gains=[];}
 async resume(){this.state='running';}
 createGain(){const n={gain:param(),connect(target){this.target=target;}};this.gains.push(n);return n;}
 createDynamicsCompressor(){return this.compressor={threshold:param(),ratio:param(),connect(){}};}
 createBuffer(_,n){const data=new Float32Array(n);return {copyToChannel(values){data.set(values);},getChannelData(){return data;}};}
 createStereoPanner(){return {pan:param(),connect(){},disconnect(){}};}
 createBufferSource(){const n={connect(){},disconnect(){},start(){},stop(){this.stopped=true;this.onended?.();}};this.sources.push(n);return n;}
}
test('audio stays opt-in, mute releases all sources, and unmute restores only the current arena loops',async()=>{
 const audio=createAudio(Context);
 audio.play('hit',400);assert.equal(Context.current,undefined);
 assert.equal(await audio.enable(),true);
 const ctx=Context.current;
 assert.equal(ctx.sources.length,3);
 audio.mix(0,.2,.3,.4);assert.equal(ctx.gains[1].gain.value,0);
 assert.equal(ctx.gains[4].gain.value,.4);
 assert.equal(ctx.gains[4].target,ctx.compressor);
 audio.play('grunt-low',400);assert.equal(ctx.sources.length,4);
 audio.mute();assert(ctx.sources.every(s=>s.stopped));
 audio.setArena('cistern');audio.play('shot',400);assert.equal(ctx.sources.length,4);
 assert.equal(await audio.enable(),true);assert.equal(ctx.sources.filter(s=>!s.stopped).length,3);
 audio.setArena('lantern');assert.equal(ctx.sources.filter(s=>!s.stopped).length,3);
});