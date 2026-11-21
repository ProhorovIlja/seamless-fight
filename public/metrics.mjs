// Browser-only diagnostics. No uploads and no changes to the simulation.
export function percentile(values,p){
 if(!values.length)return null;
 const sorted=values.slice().sort((a,b)=>a-b);
 return sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
}
export function createMetrics(){
 const sent=new Map(), frame=[], rtt=[], ackAge=[], gaps=[], corrections=[];
 let last=null, highest=0;
 function add(a,n){if(!Number.isFinite(n)||n<0)return;if(a.length===120)a.shift();a.push(n);}
 return {
  sent(seq,at){if(sent.size===240)sent.delete(sent.keys().next().value);sent.set(seq,at);},
  snapshot(tick,ack,at){
   // Finished matches repeat the same tick; do not mistake that for jitter.
   if(last&&tick>last.tick)add(gaps,at-last.at);
   if(!last||tick>last.tick)last={tick,at};
   if(Number.isSafeInteger(ack)&&ack>highest){
    if(sent.has(ack))add(ackAge,at-sent.get(ack));
    highest=ack;
    for(const seq of sent.keys()){if(seq>ack)break;sent.delete(seq);}
   }
  },
  frame(n){add(frame,n);}, ping(n){add(rtt,n);}, correction(n){add(corrections,n);},
  summary(){return {
   rtt:percentile(rtt,.5),rttSpread:rtt.length>1?percentile(rtt,.95)-percentile(rtt,.5):null,
   ack:percentile(ackAge,.95),gap:percentile(gaps,.95),frame:percentile(frame,.95),correction:percentile(corrections,.95)
  };},
  clearFrame(){frame.length=0;last=null;}
 };
}
