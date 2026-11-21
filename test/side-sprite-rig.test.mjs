import test from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_FLOOR,sideMatch,sideInput,sideStep} from '../public/side-engine.mjs';
import {SIDE_SPRITE_CLIPS,SIDE_SPRITE_MAX_TEXELS,validateSideSpriteManifest,sideSpriteClip,sideSpriteFrame,paintSideSprite,decodeSideSpriteRig} from '../public/side-sprite-rig.mjs';

const manifest=()=>{
 const clips=Object.fromEntries(SIDE_SPRITE_CLIPS.map(key=>[key,{
  loop:['idle','run','guard','crouch','jump'].includes(key),
  frames:[{x:0,y:0,w:160,h:256,px:80,py:237,ticks:4},{x:160,y:0,w:160,h:256,px:80,py:237,ticks:5}]
 }]));
 return {version:1,character:'original-hunter-a',texture:'/fight/art/hunters/original-hunter-a.webp',
  width:512,height:512,scale:.68,creator:'Seamless Fight test',license:'Original authored asset',clips};
};
const fake=()=>{
 const actions=[];const g={save:()=>actions.push(['save']),restore:()=>actions.push(['restore']),
  translate:(...a)=>actions.push(['translate',...a]),scale:(...a)=>actions.push(['scale',...a]),
  drawImage:(...a)=>actions.push(['drawImage',...a])};
 return {g,actions};
};
test('strict atlas manifest requires an entire deterministic fighter animation roster',()=>{
 const m=manifest();assert.deepEqual(validateSideSpriteManifest(m),[]);
 assert.equal(SIDE_SPRITE_CLIPS.length,11);
 assert(SIDE_SPRITE_MAX_TEXELS<=4096*2048);
 const broken=manifest();delete broken.clips.hew;
 assert(validateSideSpriteManifest(broken).some(s=>s.includes('hew')));
 const url=manifest();url.texture='https://elsewhere.example/sprite.webp';
 assert(validateSideSpriteManifest(url).some(s=>s.includes('same-origin')));
 const massive=manifest();massive.width=8192;
 assert(validateSideSpriteManifest(massive).some(s=>s.includes('budget')));
 const bounds=manifest();bounds.clips.run.frames[0].x=505;
 assert(validateSideSpriteManifest(bounds).some(s=>s.includes('run')));
 const pivot=manifest();pivot.clips.idle.frames[0].py=1000;
 assert(validateSideSpriteManifest(pivot).some(s=>s.includes('idle')));
 const missing=manifest();delete missing.creator;
 assert(validateSideSpriteManifest(missing).some(s=>s.includes('artist')));
 const unknown=manifest();unknown.clips.attack={loop:true,frames:[]};
 assert(validateSideSpriteManifest(unknown).some(s=>s.includes('Unexpected')));
});
test('server-authoritative action age drives authored attack frames while neutral cycles are render-only',()=>{
 const rig=manifest(),p=sideMatch().p[0];
 assert.equal(sideSpriteClip(p,rig),'idle');
 p.vx=2;assert.equal(sideSpriteClip(p,rig),'run');
 p.act='cut';p.age=0;assert.equal(sideSpriteClip(p,rig),'cut');
 assert.equal(sideSpriteFrame(p,rig,999).frame.x,0);
 p.age=7;assert.equal(sideSpriteFrame(p,rig,0).frame.x,160);
 assert.equal(sideSpriteFrame(p,rig,100000).frame.x,160);
 p.act='guardBreak';assert.equal(sideSpriteClip(p,rig),'stun');
 p.act='';p.guardAge=2;assert.equal(sideSpriteClip(p,rig),'guard');
 p.guardAge=0;p.crouch=true;assert.equal(sideSpriteClip(p,rig),'crouch');
 p.crouch=false;p.y=SIDE_FLOOR-50;assert.equal(sideSpriteClip(p,rig),'jump');
});
test('atlas is drawn with exact pixel pivots and facing transform with no hitbox mutation',()=>{
 const rig=manifest(),image={naturalWidth:512,naturalHeight:512},s=sideMatch(),p=s.p[0],before=structuredClone(s);
 const {g,actions}=fake();
 assert.equal(paintSideSprite(g,p,image,rig,500),true);
 assert.deepEqual(actions[0],['save']);
 assert.deepEqual(actions[1],['translate',p.x,p.y]);
 assert.deepEqual(actions[2],['scale',.68,.68]);
 assert(actions.some(a=>a[0]==='drawImage'&&a[6]===-80&&a[7]===-237));
 assert.deepEqual(actions.at(-1),['restore']);
 p.dir=-1;
 const neg=fake();paintSideSprite(neg.g,p,image,rig,500);
 assert.deepEqual(neg.actions[2],['scale',-.68,.68]);
 const bad=fake();assert.equal(paintSideSprite(bad.g,p,{naturalWidth:5,naturalHeight:5},rig,0),false);
 assert.deepEqual(bad.actions,[]);
 assert.equal(before.p[0].hp,s.p[0].hp);assert.equal(before.tick,s.tick);
});
test('local authored rig decode is explicit, rejects mismatches, and never requires uploads',async()=>{
 const rig=manifest();
 class Valid{naturalWidth=512;naturalHeight=512;async decode(){}}
 const a=await decodeSideSpriteRig(rig,Valid,'blob:local-preview');
 assert.equal(a.img.src,'blob:local-preview');assert.equal(a.manifest.character,rig.character);
 class Broken{async decode(){throw Error('missing');}}
 assert.equal(await decodeSideSpriteRig(rig,Broken,'blob:error'),null);
 class Different{naturalWidth=128;naturalHeight=512;async decode(){}}
 assert.equal(await decodeSideSpriteRig(rig,Different),null);
 assert.equal(await decodeSideSpriteRig(rig,null),null);
 const bad=manifest();bad.scale=Infinity;
 await assert.rejects(()=>decodeSideSpriteRig(bad,Valid),TypeError);
});
test('sample sprite poses do not influence authoritative game ticks over replayable inputs',()=>{
 const rig=manifest(),img={naturalWidth:512,naturalHeight:512};
 const a=sideMatch(),b=structuredClone(a);
 for(let t=0;t<200;t++){
  const frame=fake();
  paintSideSprite(frame.g,a.p[0],img,rig,t*1000/60);
  paintSideSprite(frame.g,a.p[1],img,rig,t*1000/60);
  const cmd=[{...sideInput(),x:t%30<20?1:-1,act:t%53===0?'cut':''},sideInput()];
  sideStep(a,cmd);sideStep(b,cmd);
 }
 assert.deepEqual(a,b);
});
