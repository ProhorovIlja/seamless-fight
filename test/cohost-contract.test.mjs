import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COHOST_PATH,COHOST_PORT,COHOST_DOMAIN,inspectCohostContract,inspectCohostSizing}
 from '../scripts/check-cohost-contract.mjs';

const caddy=readFileSync(new URL('../deploy/seamlesshunt-fight.caddy',import.meta.url),'utf8');
const unit=readFileSync(new URL('../deploy/seamless-fight.service',import.meta.url),'utf8');
test('isolated /fight handler is strictly namespaced; no Bloodborne Caddy or backend mutation',()=>{
 assert.equal(COHOST_PATH,'/fight');
 assert.equal(COHOST_DOMAIN,'seamlesshunt.com');
 assert.equal(COHOST_PORT,18080);
 assert.deepEqual(inspectCohostContract({caddy,unit}),[]);
 assert.match(caddy,/handle @seamless_fight/);
 assert.doesNotMatch(caddy.split('\n').filter(line=>!line.trim().startsWith('#')).join('\n'),/handle_path/);
});
test('cohost validator rejects prefix stripping and over-broad routing',()=>{
 for(const broken of [
  caddy.replace('path /fight /fight/*','path /*'),
  caddy.replace('handle @seamless_fight','handle_path @seamless_fight'),
  caddy.replace('127.0.0.1:18080','0.0.0.0:18080'),
  caddy.replace('handle @seamless_fight','handle'),
  caddy+'\nfile_server\n'
 ])assert(inspectCohostContract({caddy:broken,unit}).length>0);
});
test('cohost validator enforces low-priority resource sandbox and no dependency on production BBSC',()=>{
 for(const broken of [
  unit.replace('HOST=127.0.0.1','HOST=0.0.0.0'),
  unit.replace('DynamicUser=yes','DynamicUser=no'),
  unit.replace('ProtectSystem=strict','ProtectSystem=no'),
  unit.replace('MemoryMax=768M','MemoryMax=4096M'),
  unit.replace('MemoryHigh=384M','MemoryHigh=900M'),
  unit.replace('IOWeight=50',''),
  unit.replace('After=network.target','After=network.target bbsc-shadnet.service')
 ])assert(inspectCohostContract({caddy,unit:broken}).length>0);
});
test('shared game server sizing is an admission gate, not guaranteed 4GB sufficiency',()=>{
 const GB=1024**3;
 assert.deepEqual(inspectCohostSizing({cpus:2,memTotalBytes:4*GB,memAvailableBytes:2*GB}),
  {eligibleForLoadTest:true,warnings:[]});
 for(const x of [
  {cpus:1,memTotalBytes:4*GB,memAvailableBytes:2*GB},
  {cpus:2,memTotalBytes:2*GB,memAvailableBytes:1*GB},
  {cpus:2,memTotalBytes:4*GB,memAvailableBytes:.5*GB}
 ])assert.equal(inspectCohostSizing(x).eligibleForLoadTest,false);
});
