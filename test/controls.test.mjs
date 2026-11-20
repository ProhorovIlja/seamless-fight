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
