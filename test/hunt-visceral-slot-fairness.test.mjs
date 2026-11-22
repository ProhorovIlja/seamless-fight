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


test('locked visceral victim cannot buffer phantom shots, steps or resources in either slot',()=>{
 for(const attacker of [0,1])for(const command of ['shot','step']){
  const victimSlot=1-attacker;
  const state=huntMatch();state.ready=0;
  const hunter=state.p[attacker],victim=state.p[victimSlot];
  hunter.x=500;hunter.vx=0;hunter.act='';
  victim.x=426;victim.vx=6;victim.act='stagger';
  victim.age=20;victim.exposed=20;
  victim.queue='';victim.queueLife=0;
  const ammo=victim.ammo,stamina=victim.st;
  const inputs=[huntInput(),huntInput()];
  inputs[attacker]=visceral();
  inputs[victimSlot]={...huntInput(),act:command,x:command==='step'?1:0};
  const events=[];
  huntStep(state,inputs,events);
  assert.equal(hunter.act,'visceral','confirmed parry follow-up starts');
  assert.equal(victim.act,'visceralVictim','victim is genuinely locked');
  assert.equal(victim.age,1,'visceral starts on the same simulation tick');
  assert.equal(victim.exposed,0,'opening is consumed exactly once');
  assert.equal(victim.queue,'','locked victim cannot buffer another action');
  assert.equal(victim.queueLife,0,'no latent queued input for rollback');
  assert.equal(victim.ammo,ammo,'no ammunition spent after capture');
  assert.equal(victim.st,stamina,'no stamina spent after capture');
  assert.equal(events.some(e=>e.kind==='action'&&e.actor===victimSlot),false,
   'captured opponent cannot start a free gun or dodge action');
  const afterFirst={x:victim.x,vx:victim.vx,queue:victim.queue,
   age:victim.age,act:victim.act,ammo:victim.ammo,st:victim.st};
  // Even if the victim keeps pressing shot during the lock, the buffer
  // remains empty and the same simulation state replays deterministically.
  for(let frame=0;frame<5;frame++){
   const held=[huntInput(),huntInput()];
   held[victimSlot]={...huntInput(),act:command};
   huntStep(state,held);
   assert.equal(victim.queue,'');
   assert.equal(victim.queueLife,0);
   assert.equal(victim.ammo,ammo);
   assert.equal(victim.st,stamina);
  }
  assert(Number.isFinite(afterFirst.x)&&Number.isFinite(afterFirst.vx));
 }
});
