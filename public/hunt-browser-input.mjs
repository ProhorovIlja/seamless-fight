// Thin platform-only adapter. The deterministic Hunt combat and input normalization
// accept logical actions, not browser-specific Gamepad IDs or nonstandard button
// assignments. Physical USB/Windows hardware acceptance is separate.
export const HUNT_PAD_DEADZONE=0.5;
export const HUNT_STANDARD_BUTTONS=Object.freeze([
 'south','east','west','north','left-shoulder','right-shoulder',
 'left-trigger','right-trigger','select','start','left-stick','right-stick',
 'dpad-up','dpad-down','dpad-left','dpad-right'
]);
const legalKey=/^[A-Za-z][A-Za-z0-9]{0,30}$/;
export function huntKeyboardToken(code){
 return typeof code==='string'&&legalKey.test(code)?'key:'+code:null;
}
export function huntMouseToken(button){
 return Number.isInteger(button)&&button>=0&&button<=4?'mouse:'+button:null;
}
export function huntBrowserGamepadTokens(gamepad,deadzone=HUNT_PAD_DEADZONE){
 if(!Number.isFinite(deadzone)||deadzone<0.2||deadzone>0.9)
  throw RangeError('Controller deadzone must be between 0.2 and 0.9');
 if(!gamepad||gamepad.connected!==true||gamepad.mapping!=='standard'||
  !Array.isArray(gamepad.axes)&&!ArrayBuffer.isView(gamepad.axes))
  return Object.freeze({connected:false,down:Object.freeze([])});
 if(!gamepad.buttons||gamepad.buttons.length<16||gamepad.axes.length<2)
  return Object.freeze({connected:false,down:Object.freeze([])});
 const down=[];
 for(let i=0;i<HUNT_STANDARD_BUTTONS.length;i++){
  const button=gamepad.buttons[i];
  if(button?.pressed===true||Number.isFinite(button?.value)&&button.value>=0.5)
   down.push('pad:'+HUNT_STANDARD_BUTTONS[i]);
 }
 const x=Number(gamepad.axes[0]),y=Number(gamepad.axes[1]);
 if(Number.isFinite(x)){
  if(x<=-deadzone)down.push('pad:left-x-');
  if(x>=deadzone)down.push('pad:left-x+');
 }
 if(Number.isFinite(y)){
  if(y<=-deadzone)down.push('pad:left-y-');
  if(y>=deadzone)down.push('pad:left-y+');
 }
 if(gamepad.axes.length>=4){
  const rx=Number(gamepad.axes[2]),ry=Number(gamepad.axes[3]);
  if(Number.isFinite(rx)){
   if(rx<=-deadzone)down.push('pad:right-x-');
   if(rx>=deadzone)down.push('pad:right-x+');
  }
  if(Number.isFinite(ry)){
   if(ry<=-deadzone)down.push('pad:right-y-');
   if(ry>=deadzone)down.push('pad:right-y+');
  }
 }
 return Object.freeze({connected:true,down:Object.freeze(down)});
}

/**
 * A manually selected pad is an exclusive session-local input source.
 * A detached/mis-mapped pad MUST NOT silently hand a fighter to a different
 * USB arcade controller. null means automatic first detected standard pad.
 * The browser Gamepad.index is not a stable persistent hardware identifier.
 */
export function selectHuntStandardGamepad(pads,requestedIndex=null){
 if(requestedIndex!==null&&(!Number.isSafeInteger(requestedIndex)||requestedIndex<0))
  throw RangeError('Controller selection must be an index or automatic');
 const available=Array.from(pads||[]).filter(p=>p?.connected===true&&
  p.mapping==='standard'&&Number.isSafeInteger(p.index)&&p.index>=0);
 if(requestedIndex!==null)return available.find(p=>p.index===requestedIndex)||null;
 available.sort((a,b)=>a.index-b.index);
 return available[0]||null;
}
