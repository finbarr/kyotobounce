import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backgroundInput} from './background-input.mjs';
import {assertBackgroundWorker} from '../macos-worker.ts';

// Even repeated capture requests must never reach the native browser method.
let nativeRequests=0;
class Element {requestPointerLock(){nativeRequests++;throw new Error('Desktop pointer touched');}}
await backgroundInput({addInitScript:async callback=>runInNewContext(`(${callback})();`,{Element})});
const canvas=new Element();
await canvas.requestPointerLock();await canvas.requestPointerLock();
assert.equal(nativeRequests,0);
assert.throws(()=>{Element.prototype.requestPointerLock=()=>nativeRequests++;},TypeError);

if(process.platform==='darwin'){
  const temp=await mkdtemp(join(tmpdir(),'kyoto-background-'));
  try{
    const contents=join(temp,'Worker.app/Contents'),executable=join(contents,'MacOS/worker');
    await mkdir(contents,{recursive:true});
    const plist=value=>`<?xml version="1.0"?><plist version="1.0"><dict>${value}</dict></plist>`;
    for(const value of ['', '<key>LSBackgroundOnly</key><false/>','<key>LSBackgroundOnly</key><string>true</string>']){
      await writeFile(join(contents,'Info.plist'),plist(value));
      // plutil raw strings and booleans can look identical: enforce the type.
      await assert.rejects(assertBackgroundWorker(executable),/not background-only/);
    }
    await writeFile(join(contents,'Info.plist'),plist('<key>LSBackgroundOnly</key><true/>'));
    await assertBackgroundWorker(executable);
  }finally{await rm(temp,{recursive:true,force:true});}
}
console.log('PASS background checks cannot capture the pointer and macOS workers require a background-only bundle');
