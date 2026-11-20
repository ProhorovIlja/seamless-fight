export const CAPS=Object.freeze([0,60,90,120,180]);
export const LINKS=Object.freeze(['any','no-wifi','ethernet']);
export const queueOptions=raw=>({
 maxRtt:CAPS.includes(raw?.maxRtt)?raw.maxRtt:0,
 linkFilter:LINKS.includes(raw?.linkFilter)?raw.linkFilter:'any',
 link:['wifi','ethernet','cellular'].includes(raw?.link)?raw.link:'unknown'
});
const accepts=(filter,link)=>filter==='ethernet'?link==='ethernet':filter!=='no-wifi'||link!=='wifi';
export function eligible(a,b,now){
 if(!Number.isFinite(a.rtt)||!Number.isFinite(b.rtt)||now-a.sampleAt>10000||now-b.sampleAt>10000)return false;
 const worst=Math.max(a.rtt,b.rtt);
 return (!a.maxRtt||worst<=a.maxRtt)&&(!b.maxRtt||worst<=b.maxRtt)&&accepts(a.linkFilter,b.link)&&accepts(b.linkFilter,a.link);
}
