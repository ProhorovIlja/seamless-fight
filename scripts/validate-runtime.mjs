import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function validateRuntime(env,nodeVersion,osRelease){
 const errors=[];
 const fields=Object.fromEntries(String(osRelease).split(/\r?\n/).map(line=>/^([A-Z_]+)=(.*)$/.exec(line)).filter(Boolean).map(([,key,value])=>[key,value.replace(/^["']|["']$/g,'')]));
 if(fields.ID!=='debian'||fields.VERSION_ID?.split('.')[0]!=='13')errors.push('Debian 13 required.');
 const major=Number(String(nodeVersion).split('.')[0]);
 if(!Number.isInteger(major)||major<22)errors.push('Node 22 or newer required.');
 if(env.NODE_ENV!=='production')errors.push('NODE_ENV must be production.');
 if(env.HOST!=='127.0.0.1')errors.push('HOST must be loopback only.');
 const port=Number(env.PORT);
 if(!Number.isInteger(port)||port<1024||port>65535)errors.push('Use an unprivileged TCP port.');
 try{
   const url=new URL(env.PUBLIC_ORIGIN);
   if(url.protocol!=='https:'||url.origin!==env.PUBLIC_ORIGIN||url.username||url.password||url.pathname!=='/'||url.search||url.hash)errors.push('PUBLIC_ORIGIN must be an exact HTTPS origin.');
 }catch{errors.push('PUBLIC_ORIGIN must be an exact HTTPS origin.');}
 if(env.SITE_ART!==undefined&&!['0','1'].includes(env.SITE_ART))errors.push('SITE_ART must be 0 or 1.');
 return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const issues=validateRuntime(process.env,process.versions.node,readFileSync('/etc/os-release','utf8'));
 if(issues.length){for(const issue of issues)process.stderr.write(issue+'\n');process.exitCode=1;}
 else process.stdout.write('Debian 13 runtime preflight passed.\n');
}
