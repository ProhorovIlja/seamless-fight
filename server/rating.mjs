// Pure Glicko-2 rating-period arithmetic from Mark E. Glickman's worked example.
// This module is deliberately NOT connected to the live casual server. Ranked
// requires authenticated identities, durable verified results and fraud controls.
export const DEFAULT_RATING=Object.freeze({rating:1500,rd:350,volatility:.06});
export const RATING_SCALE=173.7178;
const validate=(player,name='player')=>{
 if(!player||!Number.isFinite(player.rating)||player.rating<-10000||player.rating>10000
   ||!Number.isFinite(player.rd)||player.rd<=0||player.rd>350
   ||!Number.isFinite(player.volatility)||player.volatility<=0||player.volatility>1)
   throw new RangeError('Invalid '+name+' rating profile.');
};
const g=phi=>1/Math.sqrt(1+3*phi*phi/(Math.PI*Math.PI));
const expectation=(mu,oppMu,oppPhi)=>1/(1+Math.exp(-g(oppPhi)*(mu-oppMu)));
export function winProbability(player,opponent){
 validate(player);validate(opponent,'opponent');
 return expectation((player.rating-1500)/RATING_SCALE,
   (opponent.rating-1500)/RATING_SCALE,opponent.rd/RATING_SCALE);
}
export function ratePeriod(player,results,tau=.5){
 validate(player);
 if(!Array.isArray(results)||results.length>250||!Number.isFinite(tau)||tau<.2||tau>1.2)
   throw new RangeError('Invalid rating period.');
 const mu=(player.rating-1500)/RATING_SCALE,phi=player.rd/RATING_SCALE,sigma=player.volatility;
 if(!results.length)return {...player,rd:Math.min(350,RATING_SCALE*Math.hypot(phi,sigma))};
 let varianceInverse=0,scoreSum=0;
 for(const item of results){
   validate(item?.opponent,'opponent');
   if(![0,.5,1].includes(item.score))throw new RangeError('Match score must be 0, 0.5 or 1.');
   const oppMu=(item.opponent.rating-1500)/RATING_SCALE,oppPhi=item.opponent.rd/RATING_SCALE;
   const weight=g(oppPhi),expected=expectation(mu,oppMu,oppPhi);
   varianceInverse+=weight*weight*expected*(1-expected);
   scoreSum+=weight*(item.score-expected);
 }
 const variance=1/varianceInverse,delta=variance*scoreSum,a=Math.log(sigma*sigma);
 const f=x=>{
   const ex=Math.exp(x),denom=phi*phi+variance+ex;
   return ex*(delta*delta-phi*phi-variance-ex)/(2*denom*denom)-(x-a)/(tau*tau);
 };
 let A=a,B;
 if(delta*delta>phi*phi+variance)B=Math.log(delta*delta-phi*phi-variance);
 else {
   let k=1;
   while(f(a-k*tau)<0){
     if(k++>1000)throw Error('Could not bracket rating volatility.');
   }
   B=a-k*tau;
 }
 let fA=f(A),fB=f(B),iterations=0;
 while(Math.abs(B-A)>1e-7){
   if(++iterations>200)throw Error('Glicko-2 volatility solver did not converge.');
   const C=A+(A-B)*fA/(fB-fA),fC=f(C);
   if(fC*fB<=0){A=B;fA=fB;}
   else fA/=2;
   B=C;fB=fC;
 }
 const newVolatility=Math.exp(A/2),phiStar=Math.hypot(phi,newVolatility);
 const newPhi=1/Math.sqrt(1/(phiStar*phiStar)+1/variance);
 const newMu=mu+newPhi*newPhi*scoreSum;
 return {rating:RATING_SCALE*newMu+1500,rd:Math.min(350,RATING_SCALE*newPhi),volatility:newVolatility};
}
