import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const script=new URL('../deploy/shared-vps-preflight.sh',import.meta.url);
const source=readFileSync(script,'utf8');
test('read-only host preflight has valid bash syntax and no mutation paths',()=>{
 const child=spawnSync('bash',['-n',script.pathname],{encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);
 assert.match(source,/--read-only/);
 assert.match(source,/COHOST_MEM_AVAILABLE_MIB/);
 assert.match(source,/18080/);
 assert.match(source,/COHOST_CPU_THREADS/);
 assert.doesNotMatch(source,/\b(?:apt\s+install|systemctl\s+(?:restart|start|enable)|ufw\s+allow|iptables\s+-|rm\s+-rf|caddy\s+reload)\b/);
});
test('cannot accidentally execute read-only preflight without explicit opt-in',()=>{
 const child=spawnSync('bash',[script.pathname],{encoding:'utf8'});
 assert.equal(child.status,2,'Must refuse invocation without required read-only flag');
 assert.match(child.stderr,/Usage/);
});
