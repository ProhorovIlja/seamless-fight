import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('production game process rejects exposed host before listening', {timeout:6000},async()=>{
 const child=spawn(process.execPath,['server.mjs'],{
   env:{...process.env,DEBIAN_13_REQUIRED:'1',NODE_ENV:'production',HOST:'0.0.0.0',PORT:'18080',PUBLIC_ORIGIN:'https://seamlesshunt.com'},
   stdio:'ignore'
 });
 const [exitCode]=await once(child,'exit');
 assert.notEqual(exitCode,0);
});
