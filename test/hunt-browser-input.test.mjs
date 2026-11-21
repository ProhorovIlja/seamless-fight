import {test} from 'node:test';
import assert from 'node:assert/strict';
import {huntKeyboardToken,huntMouseToken,huntBrowserGamepadTokens,HUNT_STANDARD_BUTTONS,selectHuntStandardGamepad}
 from '../public/hunt-browser-input.mjs';
import {huntDeviceProfile,createHuntInputAdapter} from '../public/hunt-input-device.mjs';
const pad=()=>({connected:true,mapping:'standard',axes:[0,0,0,0],
 buttons:Array.from({length:16},()=>({pressed:false,value:0}))});
test('input normalization accepts physical English game keys and mouse buttons only',()=>{
 assert.equal(huntKeyboardToken('KeyA'),'key:KeyA');
 assert.equal(huntKeyboardToken('ShiftLeft'),'key:ShiftLeft');
 assert.equal(huntKeyboardToken('Escape'),'key:Escape'); // Reserved later by Hunt profile.
 assert.equal(huntKeyboardToken('<script>'),null);
 assert.equal(huntMouseToken(0),'mouse:0');
 assert.equal(huntMouseToken(2),'mouse:2');
 assert.equal(huntMouseToken(10),null);
});
test('standard gamepads and arcade boards map actual button and analog state',()=>{
 const a=pad();a.buttons[0].pressed=true;a.buttons[5].pressed=true;
 a.buttons[14].pressed=true;a.axes=[-0.8,0.9,0,0];
 const mapped=huntBrowserGamepadTokens(a);
 assert.equal(mapped.connected,true);
 for(const token of ['pad:south','pad:right-shoulder','pad:dpad-left','pad:left-x-','pad:left-y+'])
  assert(mapped.down.includes(token),token);
 assert(!mapped.down.includes('pad:dpad-right'));
 assert.equal(HUNT_STANDARD_BUTTONS.length,16);
 assert(Object.isFrozen(mapped.down));
});
test('Gamepad API rejects disconnected and unrecognized mappings without fabricating inputs',()=>{
 const a=pad();
 assert.deepEqual(huntBrowserGamepadTokens(null),{connected:false,down:[]});
 assert.deepEqual(huntBrowserGamepadTokens({...a,connected:false}),{connected:false,down:[]});
 assert.deepEqual(huntBrowserGamepadTokens({...a,mapping:''}),{connected:false,down:[]});
 assert.deepEqual(huntBrowserGamepadTokens({...a,buttons:[]}),{connected:false,down:[]});
 assert.throws(()=>huntBrowserGamepadTokens(a,0.01),/deadzone/);
});
test('leverless SOCD neutral survives physical opposite directions on real browser sample',()=>{
 const a=pad();a.buttons[14].pressed=true;a.buttons[15].pressed=true;
 a.buttons[12].pressed=true;a.buttons[13].pressed=true;
 const adapter=createHuntInputAdapter(huntDeviceProfile('leverless'));
 const frame=adapter.sample(huntBrowserGamepadTokens(a));
 assert.equal(frame.x,0);assert.equal(frame.y,0);assert.equal(frame.guard,false);
});
test('held gamepad attacks fire only once and are cleared after disconnect',()=>{
 const a=pad();a.buttons[2].pressed=true;
 const adapter=createHuntInputAdapter(huntDeviceProfile('gamepad'));
 assert.equal(adapter.sample(huntBrowserGamepadTokens(a)).act,'light');
 assert.equal(adapter.sample(huntBrowserGamepadTokens(a)).act,'');
 assert.equal(adapter.sample({connected:false,down:[]}).act,'');
 assert.equal(adapter.sample(huntBrowserGamepadTokens(a)).act,'light');
});
test('fightstick and gamepad preserve different one-tick face-button actions',()=>{
 const a=pad();a.buttons[0].pressed=true;
 const ordinary=createHuntInputAdapter(huntDeviceProfile('gamepad'));
 const stick=createHuntInputAdapter(huntDeviceProfile('fightstick'));
 assert.equal(ordinary.sample(huntBrowserGamepadTokens(a)).act,'');
 assert.equal(stick.sample(huntBrowserGamepadTokens(a)).act,'step');
});

test('explicit USB gamepad/fightstick selection is exclusive and disconnect never routes to another pad',()=>{
 const a={...pad(),index:0,id:'Generic first pad'};
 const b={...pad(),index:3,id:'Leverless board'};
 assert.equal(selectHuntStandardGamepad([a,null,b]),a);
 assert.equal(selectHuntStandardGamepad([b,a],null),a,'auto chooses lowest valid stable session index');
 assert.equal(selectHuntStandardGamepad([a,b],3),b);
 assert.equal(selectHuntStandardGamepad([a,{...b,connected:false}],3),null);
 assert.equal(selectHuntStandardGamepad([a,{...b,mapping:''}],3),null);
 assert.equal(selectHuntStandardGamepad([a],3),null,'selected absent pad may not fall back to first');
 assert.equal(selectHuntStandardGamepad([],null),null);
 assert.throws(()=>selectHuntStandardGamepad([a],-1),/Controller selection/);
 assert.throws(()=>selectHuntStandardGamepad([a],'0'),/Controller selection/);
});
