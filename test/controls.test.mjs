import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_KEYS,DEFAULT_MOVE,DEFAULT_PAD,settings,samplePad,swapBinding,mouseAction} from '../public/controls.mjs';
const pad=(bs=[],axes=[0,0],extra={})=>({mapping:'standard',connected:true,index:0,axes,buttons:Array.from({length:16},(_,i)=>({pressed:bs.includes(i)})),...extra});
test('persisted preferences validate key conflicts, reserved keys and ranges',()=>{
 const a=settings({keys:{...DEFAULT_KEYS,cut:'KeyK'},sfx:200,ambience:-3,deadzone:NaN});
 assert.deepEqual(a.keys,DEFAULT_KEYS);assert.deepEqual([a.sfx,a.ambience,a.deadzone],[100,0,30]);
 assert.deepEqual(settings({keys:{...DEFAULT_KEYS,cut:'KeyR'}}).keys,DEFAULT_KEYS);
 assert.equal(settings({keys:{...DEFAULT_KEYS,cut:'KeyU'}}).keys.cut,'KeyU');
});
test('gamepad filters drift, prioritizes the D-pad and suppresses repeated actions',()=>{
 const a=samplePad(pad([],[.2,-.22]),null,.3);
 assert.deepEqual([a.x,a.y,a.act],[0,0,'']);
 const b=samplePad(pad([2,14],[.95,.95]),a.next,.3);
 assert.deepEqual([b.x,b.y,b.act],[-1,0,'cut']);
 const c=samplePad(pad([2],[.8,-.8]),b.next,.3);
 assert.deepEqual([c.x,c.y,c.act],[1,-1,'']);
 assert.equal(samplePad(null,c.next,.3).next,null);
 assert.equal(samplePad(pad([2],[0,0],{index:1}),c.next,.3).act,'');
});

test('analog movement deadzone uses stable press and release thresholds',()=>{
 const initial=samplePad(pad([],[0,0]),null,.3);
 const pressed=samplePad(pad([],[.31,0]),initial.next,.3);
 assert.equal(pressed.x,1);
 const wobble=samplePad(pad([],[.25,0]),pressed.next,.3);
 assert.equal(wobble.x,1,'maintains held direction at the release threshold');
 const released=samplePad(pad([],[.20,0]),wobble.next,.3);
 assert.equal(released.x,0);
 assert.equal(samplePad(pad([],[.26,0]),released.next,.3).x,0,'below engagement threshold stays neutral');
 assert.equal(samplePad(pad([],[.31,0]),released.next,.3).x,1);
 const reversed=samplePad(pad([],[ -.26,0]),pressed.next,.3);
 assert.equal(reversed.x,0,'direction reversal cannot inherit the previous sign');
 const dpad=samplePad(pad([14],[.25,0]),pressed.next,.3);
 assert.equal(dpad.x,-1,'D-pad always overrides stick state');
 assert.equal(samplePad(pad([],[.25,0]),dpad.next,.3).x,1,'raw analog hysteresis is independent of D-pad');
 assert.equal(samplePad(pad([],[.25,0],{index:1}),pressed.next,.3).x,0,'a new controller starts neutral');
});
test('queue format remains opt-in for unrated competitive sets',()=>{
 assert.equal(settings().setFormat,'casual');
 assert.equal(settings({setFormat:'set-preview'}).setFormat,'set-preview');
 assert.equal(settings({setFormat:'ranked'}).setFormat,'casual');
});
test('ghost auto-learning is disabled by default and only restored from explicit opt-in',()=>{
 assert.equal(settings().ghostAuto,false);
 assert.equal(settings({ghostAuto:true}).ghostAuto,true);
 assert.equal(settings({ghostAuto:'yes'}).ghostAuto,false);
});
test('remaps swap existing controls and reject invalid or conflicting persisted layouts',()=>{
 const bindings={...DEFAULT_PAD};swapBinding(bindings,'shot',2);
 assert.equal(bindings.cut,5);
 assert.deepEqual(settings({pad:bindings,stick:'right'}).pad,bindings);
 assert.deepEqual(settings({pad:{...bindings,shot:15}}).pad,DEFAULT_PAD);
 assert.deepEqual(settings({move:{...DEFAULT_MOVE,up:'KeyJ'}}).move,DEFAULT_MOVE);
 assert.equal(settings({move:{...DEFAULT_MOVE,up:'KeyU'}}).move.up,'KeyU');
 const base=samplePad(pad([],[0,0,0,-1]),null,.3,bindings,'right');
 assert.equal(base.y,-1);
 assert.equal(samplePad(pad([2]),base.next,.3,bindings).act,'shot');
});

test('mouse is opt-in and rejects invalid actions and duplicates',()=>{
 assert.equal(mouseAction(settings().mouse,0),'');
 const {mouse}=settings({mouse:{0:'shot',1:'shot',2:'hew',3:'constructor',5:'cut'}});
 assert.deepEqual(mouse,{0:'shot',2:'hew'});
 swapBinding(mouse,2,'shot');assert.deepEqual(mouse,{0:'hew',2:'shot'});
});

test('precise training geometry is opt-in, local and type checked',()=>{
 assert.equal(settings().trainingGeometry,false);
 assert.equal(settings({trainingGeometry:true}).trainingGeometry,true);
 for(const value of ['true',1,null,{}])assert.equal(settings({trainingGeometry:value}).trainingGeometry,false);
});
test('UI scale validates saved values without changing controls or combat',()=>{
 assert.equal(settings().uiScale,100);
 for(const scale of [100,115,130,150])assert.equal(settings({uiScale:scale}).uiScale,scale);
 for(const invalid of [-5,0,200,125,'130',null,{},NaN])assert.equal(settings({uiScale:invalid}).uiScale,100);
});
test('recorded foley setting is enabled by default and explicitly reversible',()=>{
 assert.equal(settings().foley,true);
 assert.equal(settings({foley:false}).foley,false);
 assert.equal(settings({foley:true}).foley,true);
});
