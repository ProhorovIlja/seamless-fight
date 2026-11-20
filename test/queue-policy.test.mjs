import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,queueOptions} from '../public/queue-policy.mjs';
const entry=(x={},rtt=30,sampleAt=10)=>({...queueOptions(x),rtt,sampleAt});
test('both caps and connection preferences apply without silently widening',()=>{
 const a=entry({maxRtt:60,linkFilter:'no-wifi'});
 assert.equal(eligible(a,entry({link:'wifi'}),20),false);
 assert.equal(eligible(a,entry({},61),20),false);
 assert.equal(eligible(a,entry(),20),true);
 assert.equal(eligible(a,entry({linkFilter:'ethernet'}),20),false);
 assert.equal(eligible(a,entry({},30,-10000),20),false);
 assert.deepEqual(queueOptions({maxRtt:1,link:'bogus'}),{maxRtt:0,maxSpread:0,linkFilter:'any',link:'unknown'});
});
test('connection spread caps apply to both players and cannot silently widen',()=>{
 const a=entry({maxSpread:20}),b=entry({maxSpread:0});
 assert.equal(eligible({...a,spread:8},{...b,spread:14},20),true);
 assert.equal(eligible({...a,spread:8},{...b,spread:25},20),false);
 assert.equal(eligible({...a,spread:8},{...b},20),false,'missing telemetry cannot evade a strict spread cap');
 assert.equal(eligible({...a,spread:20},{...b,spread:20,maxSpread:10},20),false);
 assert.equal(queueOptions({maxSpread:11}).maxSpread,0);
});
