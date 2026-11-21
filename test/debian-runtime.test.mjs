import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRuntime} from '../scripts/validate-runtime.mjs';
const good={NODE_ENV:'production',HOST:'127.0.0.1',PORT:'18080',PUBLIC_ORIGIN:'https://seamlesshunt.com',SITE_ART:'1'};
const trixie='ID=debian\nVERSION_ID="13"\n';
test('accepts Debian 13 with isolated Node 22/24 and a secure public origin',()=>{
 assert.deepEqual(validateRuntime(good,'22.23.5',trixie),[]);
 assert.deepEqual(validateRuntime({...good,PORT:'19000',SITE_ART:'0'},'24.10.0',trixie),[]);
 assert.deepEqual(validateRuntime({...good,SF_MAX_MAIN_ROOMS:'8',SF_MAX_SIDE_ROOMS:'8'},'22.23.5',trixie),[]);
});
test('rejects distro Node 20, wrong OS, exposed binding, insecure origin and privileged port',()=>{
 for(const [env,version,release] of [
  [good,'20.19.2',trixie],
  [good,'22.23.5','ID=ubuntu\nVERSION_ID=26.04\n'],
  [{...good,HOST:'0.0.0.0'},'22.23.5',trixie],
  [{...good,PORT:'80'},'22.23.5',trixie],
  [{...good,PUBLIC_ORIGIN:'http://seamlesshunt.com'},'22.23.5',trixie],
  [{...good,PUBLIC_ORIGIN:'https://seamlesshunt.com/fight'},'22.23.5',trixie],
  [{...good,PUBLIC_ORIGIN:'https://user:pw@seamlesshunt.com'},'22.23.5',trixie],
  [{...good,SITE_ART:'maybe'},'22.23.5',trixie],
  [{...good,SF_MAX_MAIN_ROOMS:'0'},'22.23.5',trixie],
  [{...good,SF_MAX_MAIN_ROOMS:'100000'},'22.23.5',trixie],
  [{...good,SF_MAX_SIDE_ROOMS:'-1'},'22.23.5',trixie],
  [{...good,SF_MAX_SIDE_ROOMS:'65'},'22.23.5',trixie]
 ])assert(validateRuntime(env,version,release).length>0);
});
test('production unit points to an isolated runtime and remains sandboxed',()=>{
 const unit=readFileSync(new URL('../deploy/seamless-fight.service',import.meta.url),'utf8');
 assert.match(unit,/ExecStartPre=\/opt\/seamless-fight\/runtime\/bin\/node .*validate-runtime\.mjs/);
 assert.match(unit,/ExecStart=\/opt\/seamless-fight\/runtime\/bin\/node .*server\.mjs/);
 assert.match(unit,/DynamicUser=yes/);
 assert.match(unit,/ProtectSystem=strict/);
 assert.match(unit,/HOST=127\.0\.0\.1 PORT=18080/);
 assert.match(unit,/EnvironmentFile=\/etc\/seamless-fight\.env/);
});
