// Cosmetics never enter engine state or modify the telegraph / HUD colors.
export const dyes=Object.freeze({
 ash:['Ash','#312d3a','#635764'],
 oxblood:['Oxblood','#48262f','#98545e'],
 kelp:['Kelp','#223e3b','#537f74'],
 dusk:['Dusk','#39304f','#8270aa']
});
export const sigils=Object.freeze({none:'None',thorn:'Thorn',moon:'Crescent'});
const clean=(table,id,fallback)=>typeof id==='string'&&Object.hasOwn(table,id)?id:fallback;
export function outfit(value){
 return {dye:clean(dyes,value?.dye,'ash'),sigil:clean(sigils,value?.sigil,'none')};
}
export const pair=value=>[outfit(value?.[0]),outfit(value?.[1])];
export function paintOutfit(g,value){
 const [,cloth,trim]=dyes[value.dye];
 g.fillStyle=cloth;g.beginPath();g.moveTo(9,-13);g.lineTo(-7,-18);g.lineTo(-23,-15);g.lineTo(-19,15);g.lineTo(-7,18);g.lineTo(9,12);g.closePath();g.fill();
 g.save();g.strokeStyle=trim;g.fillStyle=trim;g.lineWidth=1.5;
 g.beginPath();g.moveTo(-17,-11);g.lineTo(-14,10);g.stroke();
 if(value.sigil==='thorn'){
   g.beginPath();g.moveTo(-10,-9);g.lineTo(-5,0);g.lineTo(-10,9);g.moveTo(-14,0);g.lineTo(-5,0);g.stroke();
 }
 if(value.sigil==='moon'){
   g.beginPath();g.arc(-9,0,5,0,Math.PI*2);g.arc(-7,-1,4,0,Math.PI*2);g.fill('evenodd');
 }
 g.restore();
}
