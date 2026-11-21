import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 HUNT_INPUT_SCHEMA,HUNT_DEVICE_LAYOUTS,HUNT_BINDABLE,HUNT_ACTION_PRIORITY,
 huntDeviceProfile,validateHuntDeviceProfile,rebindHuntDeviceProfile,
 createHuntInputAdapter
} from '../public/hunt-input-device.mjs';
import {canonicalHuntInput} from '../public/side-hunt-lab.mjs';

const frame=(...down)=>({down});
test('all six input layouts cover every Hunt action without unsupported automation',()=>{
 assert.deepEqual(HUNT_DEVICE_LAYOUTS,
  ['keyboard-mouse','gamepad','fightstick','leverless','fightpad','accessibility']);
 assert.equal(HUNT_BINDABLE.length,15);
 for(const layout of HUNT_DEVICE_LAYOUTS){
  const profile=huntDeviceProfile(layout);
  assert.equal(profile.schema,HUNT_INPUT_SCHEMA);
  assert.equal(validateHuntDeviceProfile(profile),true);
  assert.deepEqual(Object.keys(profile.binds).sort(),[...HUNT_BINDABLE].sort());
  for(const value of Object.values(profile.binds))assert(value.length>=1);
  assert.equal(profile.socd,'neutral');
 }
 assert(HUNT_ACTION_PRIORITY.includes('visceral')&&HUNT_ACTION_PRIORITY.includes('shot'));
 assert(!HUNT_BINDABLE.includes('grab'));
 assert(!HUNT_BINDABLE.includes('block'));
 assert(!HUNT_BINDABLE.includes('airStep'));
});
test('keyboard/mouse default uses valid independent native actions with no macro',()=>{
 const adapter=createHuntInputAdapter();
 assert.deepEqual(adapter.sample(frame('key:KeyA','mouse:0')),
  {x:-1,y:0,act:'light',guard:false});
 assert.deepEqual(adapter.sample(frame('key:KeyA','mouse:0')),
  {x:-1,y:0,act:'',guard:false},'held light must not trigger turbo');
 assert.deepEqual(adapter.sample(frame('key:KeyA','mouse:2')),
  {x:-1,y:0,act:'heavy',guard:false});
 assert.deepEqual(adapter.sample(frame()),canonicalHuntInput({}));
 assert.deepEqual(adapter.sample(frame('key:ShiftLeft')),
  {x:0,y:0,act:'step',guard:false});
 assert.equal(adapter.stats().tick,5);
});
test('leverless and keyboard SOCD neutralize left/right and jump/crouch',()=>{
 for(const layout of ['keyboard-mouse','leverless','fightstick']){
  const profile=huntDeviceProfile(layout),a=createHuntInputAdapter(profile);
  const l=profile.binds.left[0],r=profile.binds.right[0],
   u=profile.binds.jump[0],d=profile.binds.crouch[0];
  assert.equal(a.sample(frame(l,r)).x,0,layout+' horizontal SOCD');
  assert.equal(a.sample(frame(u,d)).y,0,layout+' vertical SOCD');
  assert.equal(a.sample(frame(l,u)).x,-1);
  assert.equal(a.sample(frame(l,u)).y,0,'same held inputs do not create extra jump');
  a.reset();
  const diagonal=a.sample(frame(l,u));
  assert.equal(diagonal.x,-1);
  assert.equal(diagonal.y,-1);
 }
});
test('fightpad, fightstick, gamepad and accessibility switch all normalize to same 60Hz input',()=>{
 for(const layout of ['gamepad','fightstick','fightpad','accessibility']){
  const p=huntDeviceProfile(layout),a=createHuntInputAdapter(p);
  const result=a.sample(frame(p.binds.left[0],p.binds.shot[0]));
  assert.deepEqual(result,{x:-1,y:0,act:'shot',guard:false});
  assert.equal(a.sample(frame(p.binds.left[0],p.binds.shot[0])).act,'');
  assert.deepEqual(a.sample({...frame(p.binds.left[0]),connected:false}),
   {x:0,y:0,act:'',guard:false},'device disconnect must neutralize gameplay');
  assert.equal(a.sample(frame(p.binds.left[0],p.binds.shot[0])).act,'shot',
   'reconnecting does not inherit stale held state');
 }
});
test('simultaneous attacks follow explicit priority, not hidden macros or double inputs',()=>{
 const p=huntDeviceProfile(),a=createHuntInputAdapter(p);
 const sample=a.sample(frame(p.binds.heavy[0],p.binds.shot[0],p.binds.visceral[0]));
 assert.equal(sample.act,'visceral');
 assert.equal(a.sample(frame(p.binds.heavy[0],p.binds.shot[0])).act,'',
  'falling-edge high-priority key does not create a delayed secondary attack');
 a.sample(frame());
 assert.equal(a.sample(frame(p.binds.heavy[0],p.binds.shot[0])).act,'shot');
});
test('rebinding one family never mutates source and rejects duplicates',()=>{
 const old=huntDeviceProfile('keyboard-mouse');
 const p=rebindHuntDeviceProfile(old,'light',['key:KeyZ']);
 assert.deepEqual(old.binds.light,['mouse:0']);
 assert.deepEqual(p.binds.light,['key:KeyZ']);
 assert.equal(createHuntInputAdapter(p).sample(frame('key:KeyZ')).act,'light');
 assert.throws(()=>rebindHuntDeviceProfile(p,'heavy',['key:KeyZ']),/duplicate/i);
 assert.throws(()=>rebindHuntDeviceProfile(p,'light',['key:Escape']),/Unsupported/i);
 assert.throws(()=>rebindHuntDeviceProfile(p,'grab',['key:KeyM']),/Unknown/i);
 assert.throws(()=>rebindHuntDeviceProfile(p,'step',['pad:south']),/Unsupported/i);
});
test('profile version, SOCD, and binding shape fail closed',()=>{
 const p=huntDeviceProfile('leverless');
 assert.throws(()=>validateHuntDeviceProfile({...p,socd:'last-wins'}),/Invalid/);
 assert.throws(()=>validateHuntDeviceProfile({...p,schema:'sf-hunt-input-profile/0'}),/Invalid/);
 assert.throws(()=>validateHuntDeviceProfile({...p,macro:true}),/Invalid/);
 assert.throws(()=>validateHuntDeviceProfile({...p,binds:{...p.binds,airStep:['pad:back']}}),/Unknown/);
 assert.throws(()=>huntDeviceProfile('trackball-unknown'),/Unknown/);
 assert.throws(()=>createHuntInputAdapter({...p,binds:{...p.binds,shot:[]}}),/1–4/);
});
test('malformed controller samples never contaminate normalized gameplay state',()=>{
 const a=createHuntInputAdapter();
 assert.throws(()=>a.sample({down:'KeyA'}),/Invalid/);
 assert.throws(()=>a.sample({down:['key:Escape']}),/Invalid/);
 assert.throws(()=>a.sample({down:['key:KeyA'],connected:42}),/Invalid/);
 assert.throws(()=>a.sample({down:Array.from({length:129},()=>'key:KeyA')}),/Invalid/);
 assert.equal(a.stats().tick,0);
 assert.equal(a.sample(frame('key:KeyD')).x,1);
});
test('sample stream is deterministic across 600 gameplay ticks and a fresh adapter reproduces it',()=>{
 const p=huntDeviceProfile('leverless');
 const actions=HUNT_BINDABLE;
 const tape=Array.from({length:600},(_,t)=>{
  const down=[];
  if(t%17<4)down.push(p.binds.left[0]);
  if(t%19<5)down.push(p.binds.right[0]);
  if(t%53===7)down.push(p.binds.shot[0]);
  if(t%43===3)down.push(p.binds.light[0]);
  if(t%37===2)down.push(p.binds.step[0]);
  if(t%23===1)down.push(p.binds.jump[0]);
  return {down};
 });
 const first=createHuntInputAdapter(p),second=createHuntInputAdapter(p);
 const r=tape.map(x=>first.sample(x)),q=tape.map(x=>second.sample(x));
 assert.deepEqual(r,q);
 assert.equal(r.length,600);
 for(const input of r)assert.deepEqual(canonicalHuntInput(input),input);
 first.reset();
 assert.equal(first.sample(tape[0]).act,second.sample(tape[0]).act);
 assert.equal(first.stats().tick,1);
});
