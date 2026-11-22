// Cosmetics never enter engine state or modify the telegraph / HUD colors.
export const dyes=Object.freeze({
 ash:['Ash','#312d3a','#635764'],
 oxblood:['Oxblood','#48262f','#98545e'],
 kelp:['Kelp','#223e3b','#537f74'],
 dusk:['Dusk','#39304f','#8270aa'],
 sable:['Sable','#1c2028','#59616b'],
 ivory:['Ivory','#80766a','#d2bf97'],
 garnet:['Garnet','#49212e','#b8757b'],
 frost:['Frost','#2c3944','#87a9b0']
});
export const sigils=Object.freeze({none:'None',thorn:'Thorn',moon:'Crescent',crown:'Crown',lantern:'Lantern',eye:'Hunter Eye'});
const clean=(table,id,fallback)=>typeof id==='string'&&Object.hasOwn(table,id)?id:fallback;
export function outfit(value){
 return {dye:clean(dyes,value?.dye,'ash'),sigil:clean(sigils,value?.sigil,'none')};
}
export const pair=value=>[outfit(value?.[0]),outfit(value?.[1])];
function coatPath(g){g.beginPath();g.moveTo(9,-13);g.lineTo(-7,-18);g.lineTo(-23,-15);g.lineTo(-19,15);g.lineTo(-7,18);g.lineTo(9,12);g.closePath();}
export function paintOutfit(g,value){
 const [,cloth,trim]=dyes[value.dye];
 g.fillStyle=cloth;coatPath(g);g.fill();
 g.save();g.strokeStyle=trim;g.fillStyle=trim;g.lineWidth=1.5;
 // Belt, sleeve, shoulder seam and coat lining are original vector
 // geometry painted in the same fixed local body coordinates for every dye.
 g.beginPath();g.moveTo(-17,-11);g.lineTo(-14,10);
 g.moveTo(-20,-2);g.lineTo(-8,-1);g.moveTo(-8,-17);g.lineTo(7,-11);
 g.moveTo(-18,12);g.lineTo(-9,15);g.stroke();
 g.lineWidth=2.4;g.beginPath();g.moveTo(-20,5);g.lineTo(-3,5);g.stroke();
 g.fillRect(-12,3.9,3,2.7);
 g.lineWidth=1.3;
 if(value.sigil==='thorn'){
   g.beginPath();g.moveTo(-10,-9);g.lineTo(-5,0);g.lineTo(-10,9);g.moveTo(-14,0);g.lineTo(-5,0);g.stroke();
 }
 if(value.sigil==='moon'){
   g.beginPath();g.arc(-9,0,5,0,Math.PI*2);g.arc(-7,-1,4,0,Math.PI*2);g.fill('evenodd');
 }
 if(value.sigil==='crown'){
   g.beginPath();g.moveTo(-15,-2);g.lineTo(-15,-7);g.lineTo(-12,-4);g.lineTo(-9,-8);g.lineTo(-6,-4);g.lineTo(-3,-7);g.lineTo(-3,-2);g.closePath();g.stroke();
 }
 if(value.sigil==='lantern'){
   g.strokeRect(-13,-6,8,11);
   g.beginPath();g.moveTo(-11,-6);g.lineTo(-9,-9);g.lineTo(-7,-6);g.moveTo(-9,5);g.lineTo(-9,8);g.stroke();
 }
 if(value.sigil==='eye'){
   g.beginPath();g.ellipse(-9,-2,6,3,0,0,Math.PI*2);g.stroke();
   g.beginPath();g.arc(-9,-2,1.8,0,Math.PI*2);g.fill();
 }
 g.restore();
 coatPath(g); // Canvas save/restore does not restore the current path.
}
