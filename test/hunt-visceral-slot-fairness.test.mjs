import test from 'node:test';
import assert from 'node:assert/strict';
import {huntMatch,huntInput,huntStep} from '../public/side-hunt-lab.mjs';

const visceral=()=>({...huntInput(),act:'visceral'});
function simultaneous(actor,distance,targetVelocity,opening){
 const s=huntMatch();s.ready=0;
 const opponent=1-actor;
 s.p[actor].x=500;
 s.p[opponent].x=500-distance;
 s.p[actor].vx=0;
 s.p[opponent].vx=targetVelocity;
 s.p[actor].act='';
 s.p[opponent].act='stagger';
 s.p[opponent].age=1;
 s.p[opponent].exposed=opening;
 const commands=[huntInput(),huntInput()];
 commands[actor]=visceral();
 const events=[];
 huntStep(s,commands,events);
 return {s,events,actor: s.p[actor],victim:s.p[opponent]};
}

test('visceral range uses PRE-frame positions for both player slots',()=>{
 for(const actor of [0,1]){
  const out=simultaneous(actor,77,6,15);
  assert.equal(out.actor.act,'',
   'target walking INTO range during the tick cannot retroactively permit visceral');
  assert.equal(out.victim.act,'stagger',
   'failed range test cannot consume the victim opening');
  assert.equal(out.actor.queue,'visceral',
   'rejected follow-up remains a normal, finite input buffer');
  const within=simultaneous(actor,74,-6,15);
  assert.equal(within.actor.act,'visceral',
   'target walking AWAY during the tick cannot invalidate initially legal visceral');
  assert.equal(within.victim.act,'visceralVictim');
  assert.equal(within.victim.exposed,0);
 }
});

test('the FINAL parry opening frame is usable for either slot with identical rules',()=>{
 for(const actor of [0,1]){
  const out=simultaneous(actor,74,0,1);
  assert.equal(out.actor.act,'visceral',
   'opening present at tick start must not expire earlier for player slot 1');
  assert.equal(out.victim.act,'visceralVictim');
  const expired=simultaneous(actor,74,0,0);
  assert.equal(expired.actor.act,'','expired opening cannot start visceral');
  assert.equal(expired.victim.act,'stagger');
 }
});

test('visceral requires a true grounded, forward-facing exposed opponent',()=>{
 for(const actor of [0,1]){
  const out=simultaneous(actor,74,0,15);
  assert.equal(out.actor.dir,-1,'authoritative facing points to the left-side target');
  assert.equal(out.actor.act,'visceral');
  const s=huntMatch();s.ready=0;
  const opponent=1-actor;
  s.p[actor].x=500;s.p[opponent].x=426;
  s.p[actor].y=350;
  s.p[opponent].act='stagger';s.p[opponent].age=1;s.p[opponent].exposed=15;
  const input=[huntInput(),huntInput()];input[actor]=visceral();
  huntStep(s,input);
  assert.notEqual(s.p[actor].act,'visceral','no airborne grab-like visceral');
 }
});
