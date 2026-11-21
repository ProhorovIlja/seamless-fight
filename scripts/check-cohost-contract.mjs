// Staged /fight co-host contract. Pure, read-only. No service mutation or Caddy install.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const COHOST_PATH='/fight';
export const COHOST_PORT=18080;
export const COHOST_DOMAIN='seamlesshunt.com';

function section(text,heading){
 const marker='['+heading+']';
 const start=text.indexOf(marker);
 if(start<0)return '';
 const next=text.indexOf('\n[',start+marker.length);
 return text.slice(start,next<0?undefined:next);
}
function values(text,key){return [...text.matchAll(new RegExp('^'+key+'=(.*)$','gm'))].map(m=>m[1].trim());}
export function inspectCohostContract({caddy,unit}){
 const errors=[];
 if(typeof caddy!=='string'||typeof unit!=='string')return ['Caddy and systemd text required'];
 const route=caddy.split('\n').filter(line=>!line.trim().startsWith('#')).join('\n');
 const u=section(unit,'Service'),head=section(unit,'Unit');
 if(!/^@seamless_fight\s*\{[\s\S]*?path \/fight \/fight\/\*/m.test(route))
  errors.push('Proxy must select /fight and /fight/* only');
 if(/\bhandle_path\b/.test(route))errors.push('Cannot strip /fight prefix');
 if(!/\bhandle\s+@seamless_fight\s*\{/.test(route))
  errors.push('Must use a scoped handle matcher');
 if(!/\breverse_proxy 127\.0\.0\.1:18080\b/.test(route))
  errors.push('Backend must use 127.0.0.1:18080');
 if(/\b(?:respond|redir|rewrite|file_server)\b/.test(route))
  errors.push('Proxy fragment cannot overwrite the live website routes');
 if(!/\btransport http\s*\{/.test(route))
  errors.push('Explicit bounded HTTP transport required');
 if(!/HOST=127\.0\.0\.1 PORT=18080\b/.test(u))
  errors.push('Backend must bind only to loopback port 18080');
 if(!/EnvironmentFile=\/etc\/seamless-fight\.env\b/.test(u))
  errors.push('Dedicated external environment required');
 if(!/DynamicUser=yes/.test(u)||!/ProtectSystem=strict/.test(u)||!/NoNewPrivileges=yes/.test(u))
  errors.push('Dedicated sandbox is required');
 for(const key of ['CPUWeight','IOWeight','MemoryHigh','MemoryMax','TasksMax']){
  if(values(u,key).length!==1)errors.push('Explicit resource-control key required: '+key);
 }
 const max=values(u,'MemoryMax')[0]||'0';
 if(!/^\d+M$/.test(max)||Number.parseInt(max)>1024||Number.parseInt(max)<128)
  errors.push('MemoryMax must fit documented shared-VPS budget');
 const high=values(u,'MemoryHigh')[0]||'0';
 if(!/^\d+M$/.test(high)||Number.parseInt(high)>=Number.parseInt(max))
  errors.push('MemoryHigh must be below MemoryMax');
 if(!/StartLimitBurst=5/.test(head)||!/StartLimitIntervalSec=60/.test(head))
  errors.push('Restart throttling must be inside Unit section');
 if(/\b(?:bbsc-|shadnet|gameserver|caddy\.service|registration)\b/i.test(u+'\n'+head))
  errors.push('Game must not mutate or depend on existing BBSC units');
 return errors;
}
export function inspectCohostSizing({cpus,memTotalBytes,memAvailableBytes}){
 const warnings=[];
 if(!Number.isFinite(cpus)||cpus<2)warnings.push('Need at least two vCPUs for initial shared-host load testing');
 if(!Number.isFinite(memTotalBytes)||memTotalBytes<3.5*1024**3)
  warnings.push('Target 4 GiB RAM for shared-host pilot; lower capacity requires proof');
 if(!Number.isFinite(memAvailableBytes)||memAvailableBytes<900*1024**2)
  warnings.push('Insufficient observed available RAM headroom for a new game process');
 return {eligibleForLoadTest:warnings.length===0,warnings};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const caddy=readFileSync(new URL('../deploy/seamlesshunt-fight.caddy',import.meta.url),'utf8');
 const unit=readFileSync(new URL('../deploy/seamless-fight.service',import.meta.url),'utf8');
 const errors=inspectCohostContract({caddy,unit});
 if(errors.length){for(const error of errors)process.stderr.write(error+'\n');process.exitCode=1;}
 else process.stdout.write('PASS: Isolated /fight deployment files meet additive co-host contract. Not deployed.\n');
}
