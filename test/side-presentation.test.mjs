import test from 'node:test';
import assert from 'node:assert/strict';
import {sideMatch,sideInput,sideStep,SIDE_FLOOR} from '../public/side-engine.mjs';
import {createSideBot,SIDE_AI_LEVELS} from '../public/side-ai.mjs';
import {SIDE_STAGES,paintSideStage,paintSideFighter,paintSideWeather,drawSideTraining,drawSideHUD,drawSideImpact} from '../public/side-art.mjs';

function fakeCanvas(){
 const actions=[];
 const g=new Proxy({}, {
  get(_,name){return (...args)=>{
   actions.push([name,...args]);
   if(name==='createLinearGradient'||name==='createRadialGradient')return {addColorStop(...a){actions.push(['addColorStop',...a]);}};
  };},set(){return true;}
 });
 return {g,actions};
}
test('all stages draw seeded original side-view scenery with platform geometry',()=>{
 assert.deepEqual(Object.keys(SIDE_STAGES).sort(),['cistern','lantern','reliquary']);
 const lengths=[];
 for(const arena of Object.keys(SIDE_STAGES)){
  const first=fakeCanvas(),second=fakeCanvas();
  paintSideStage(first.g,arena);paintSideStage(second.g,arena);
  assert.deepEqual(first.actions,second.actions,'stage is deterministic: '+arena);
  lengths.push(first.actions.length);
  assert(first.actions.some(a=>a[0]==='bezierCurveTo'),'Gothic background arches');
  assert(first.actions.filter(a=>a[0]==='fillRect').length>130);
  assert(first.actions.length<40000,'draw stage once, not every animation frame');
 }
 assert.notEqual(lengths[0],0);
});
test('side hunter features articulate by phase, palette and equipment without changing state',()=>{
 const s=sideMatch(),p=s.p[0],before=structuredClone(s);
 const appearances=[{dye:'ash',sigil:'lantern'},{dye:'ivory',sigil:'eye'},{dye:'garnet',sigil:'crown'}];
 const phases=['','cut','hew','shot','step','stun'];
 let draws=0;
 for(const look of appearances)for(const act of phases){
  p.act=act;p.age=act==='cut'?10:act==='hew'?22:act==='shot'?10:3;
  const {g,actions}=fakeCanvas();
  paintSideFighter(g,p,look,3000,false,true);draws+=actions.length;
  assert(actions.some(a=>a[0]==='ellipse'),'sprite has rendered profile and shadow');
  assert(actions.some(a=>a[0]==='lineTo'),'sprite contains real outlined parts');
  assert(actions.length<2000,'draw cost remains bounded');
 }
 assert(draws>1000);
 assert.equal(s.tick,before.tick);
 assert.equal(s.p[0].hp,before.p[0].hp);
 assert.equal(s.p[0].x,before.p[0].x);
});
test('training boxes, hit FX and HUD use side-view state without mutation',()=>{
 const s=sideMatch();s.p[0].act='cut';
 const before=structuredClone(s),{g,actions}=fakeCanvas();
 drawSideTraining(g,s);drawSideHUD(g,s,0);
 drawSideImpact(g,{x:400,y:350,kind:'hit',tick:5},.75);
 paintSideWeather(g,2000,'cistern',false);
 assert(actions.some(a=>a[0]==='strokeRect'));
 assert(actions.some(a=>a[0]==='fillText'));
 assert.deepEqual(s,before);
 const still=fakeCanvas();paintSideWeather(still.g,2000,'cistern',true);
 assert.equal(still.actions.length,0,'reduced effects disables decorative motion');
});
test('bots use a fixed observation delay and three explicit difficulty profiles',()=>{
 assert.deepEqual(SIDE_AI_LEVELS,['easy','normal','hard']);
 const s=sideMatch();s.ready=0;
 const easy=createSideBot('easy'),normal=createSideBot('normal'),hard=createSideBot('hard');
 for(let t=0;t<8;t++){
  s.tick=t;
  for(const bot of [easy,normal,hard])assert.deepEqual(bot(s),sideInput());
 }
 let sawHard=false,sawNormal=false;
 for(let t=8;t<31;t++){
  s.tick=t;
  const a=easy(s),b=normal(s),c=hard(s);
  if(t<22)assert.deepEqual(a,sideInput(),'easy does not see future inputs');
  if(b.x||b.act)sawNormal=true;
  if(c.x||c.act)sawHard=true;
 }
 assert(sawHard);assert(sawNormal);
 assert.throws(()=>createSideBot('hard',2),RangeError);
});
test('bot mirror runs are deterministic with no changes to world physics',()=>{
 const once=()=>{
  const s=sideMatch();s.ready=0;
  const bot=createSideBot('hard'),actions=[];
  for(let t=0;t<540;t++){
   const ai=bot(s);actions.push(ai);sideStep(s,[{...sideInput(),x:t%60<40?1:-1,act:t%61===0?'cut':''},ai]);
  }
  return {s,actions};
 };
 assert.deepEqual(once(),once());
 assert.equal(SIDE_FLOOR,436);
});
