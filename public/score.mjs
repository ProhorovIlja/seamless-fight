// Original eight-bar score. Loop boundaries are silent; both layers share phase.
export const NOTES=[55,55,49,49,58.27,58.27,41.2,49];
export function scorePCM(rate,arena,layer){
 const length=16,n=length*rate,out=new Float32Array(n), cistern=arena==='cistern';
 const tau=2*Math.PI;
 for(let i=1;i<n;i++){
   const t=i/rate, bar=Math.floor(t/2), phase=t%2, base=NOTES[bar]*(cistern?.75:1);
   const env=Math.min(1,phase*3,(2-phase)*4);
   const pulse=t%.5, decay=Math.min(1,pulse*60)*Math.exp(-11*pulse);
   const f=base*(bar%2?1.5:2);
   out[i]=layer==='pulse'?decay*(.25*Math.sin(tau*base*pulse)+.07*Math.sin(tau*f*3*pulse)):
     env*(.15*Math.sin(tau*base*phase)+.078*Math.sin(tau*f*phase)+.045*Math.sin(tau*(f+.55)*phase));
 }
 return out;
}
export function exertionPCM(rate,high=false,take=0){
 const out=new Float32Array(Math.ceil(rate*.29));let phase=0,seed=643+take*913,low=0,prev=0;
 for(let i=1;i<out.length;i++){
   const u=i/out.length, fundamental=(high?177:122)*(1+(take-1)*.045)*(1+.16*Math.sin(Math.PI*u)-.28*u);
   phase=(phase+fundamental/rate)%1;
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const breath=seed/2147483648-1;
   const burst=(take===1?.14:take===2?.09:.12)*Math.exp(-30*u)*breath;
   const glottal=(Math.sin(phase*2*Math.PI)+.42*Math.sin(phase*4*Math.PI)+.18*Math.sin(phase*8*Math.PI));
   low+=.23*(glottal+.2*breath+burst-low);prev+=.05*(low-prev);
   out[i]=(low-.6*prev)*.62*Math.min(1,u*14)*Math.pow(1-u,1.65);
 }
 return out;
}

export function windPCM(rate,arena){
 // Generate each periodic 8-second sound twice from the same noise seed.
 // First pass warms up the low-pass filters; the second yields a smoothly
 // wrapping loop, without the audible once-per-loop silence of fade ramps.
 const n=Math.floor(rate*8),out=new Float32Array(n),cistern=arena==='cistern';
 let lo=0,hi=0;
 for(let pass=0;pass<2;pass++){
   let seed=21381;
   for(let i=0;i<n;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     const r=seed/2147483648-1;
     lo+=.022*(r-lo);hi+=.002*(r-hi);
     if(pass===0)continue;
     const t=i/rate;
     out[i]=cistern?(.32*(lo-hi)+.04*Math.sin(2*Math.PI*55*t)+.018*Math.sin(2*Math.PI*110*t))*(.65+.35*Math.cos(2*Math.PI*t/2))
       :(.55*(lo-hi)+.052*Math.sin(2*Math.PI*49*t)+.025*Math.sin(2*Math.PI*73.5*t))*(.8+.2*Math.sin(2*Math.PI*t/8));
   }
 }
 return out;
}
