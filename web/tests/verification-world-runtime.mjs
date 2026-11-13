import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import WebSocket from 'ws';
import {createHash} from 'node:crypto';

const directory='.local/verification/world',output='.local/verification/world-runtime-proof.json';
await writeFile(output,JSON.stringify({passed:false})+'\n');
const manifest=JSON.parse(await readFile(directory+'/manifest.json'));
const baseline=JSON.parse(await readFile('.local/browser-physics/verification-proof.json'));
assert.equal(baseline.physics,manifest.physics);assert.equal(baseline.layout,manifest.layoutSha256);assert.equal(baseline.receipts.length,30);
const allowed=new Set(['manifest.json',...Object.values(manifest.arrays).flatMap(a=>a.parts.map(p=>p.name)),...manifest.metadata.parts.map(p=>p.name)]);
const source=await build({entryPoints:['web/tests/verification-world-worker.mjs'],bundle:true,write:false,platform:'browser',format:'esm',target:'es2022'});
const assetHandler=async request=>{
 const name=new URL(request.url).pathname.slice(1);if(!allowed.has(name))return new Response('Not found',{status:404});
 return new Response(await readFile(directory+'/'+name));
};
const mf=new Miniflare({inspectorPort:0,telemetry:{enabled:false},workers:[{config:{
 name:'kyoto-verification-memory',compatibilityDate:'2026-11-12',
 manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:source.outputFiles[0].text}}},
 env:{ASSETS:{type:'fetcher',handler:assetHandler}}
}}]});
let socket;const results=[],memory=[];
async function deadline(promise,label,ms=30000){
 let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out: '+label)),ms);})]);}finally{clearTimeout(timer);}
}
try{
 console.log('Starting local workerd and inspector');
 const inspector=await deadline(mf.getInspectorURL(),'inspector startup'),listing=new URL('/json/list',inspector);listing.protocol=inspector.protocol==='wss:'?'https:':'http:';
 const targets=await(await fetch(listing,{signal:AbortSignal.timeout(30000)})).json();
 const target=targets.find(t=>t.webSocketDebuggerUrl&&(t.title?.includes('kyoto-verification-memory')||t.id?.includes('kyoto-verification-memory')));assert(target,'Expected Worker inspector target: '+JSON.stringify(targets.map(t=>({id:t.id,title:t.title}))));
 socket=new WebSocket(target.webSocketDebuggerUrl);await deadline(new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);}), 'inspector connection');
 let sequence=0;const pending=new Map();
 socket.on('message',bytes=>{const m=JSON.parse(String(bytes)),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
 const command=(method,params={})=>deadline(new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));}),method);
 async function measure(stage){
  // workerd can leave collectGarbage's response pending indefinitely. Taking
  // a snapshot also collects first; discard its streamed chunks on the host.
  const before=await command('Runtime.getHeapUsage');await command('HeapProfiler.takeHeapSnapshot',{reportProgress:false});const after=await command('Runtime.getHeapUsage');
  assert(Number.isFinite(after.usedSize)&&Number.isFinite(after.backingStorageSize),'Inspector must report heap and backing-store memory');
  if(stage!=='before')assert(after.backingStorageSize>=Object.values(manifest.arrays).reduce((n,a)=>n+a.bytes,0),'Measure the isolate that owns the loaded geometry');
  memory.push({stage,before,after,retainedBytes:after.usedSize+after.backingStorageSize+(after.embedderHeapUsedSize||0)});
 }
 console.log('Measuring unloaded Worker');await command('Runtime.enable');await measure('before');
 async function verify(expected){
  const began=performance.now(),response=await deadline(mf.dispatchFetch('https://verifier.invalid/verify',{method:'POST',body:JSON.stringify({id:expected.id})}),'verify '+expected.id,120000);
  assert.equal(response.status,200,await response.clone().text());const actual=await response.json();
  assert.equal(actual.sha256,expected.sha256,'workerd independently reconstructs complete poses/contacts/score: '+expected.id);
  assert.equal(actual.score,expected.score);assert(actual.success);assert.equal(actual.waypoints,expected.waypoints);
  assert.deepEqual(actual.velocity,{x:0,y:0,z:0});assert.deepEqual(actual.spin,{x:0,y:0,z:0});assert.equal(actual.budgetExhaustions,0);
  results.push({...actual,elapsedMs:performance.now()-began});
 }
 for(const expected of baseline.receipts){await verify(expected);await measure(expected.id);console.log('PASS real workerd verification: '+expected.id);}
 await Promise.all(baseline.receipts.slice(0,4).map(verify));await measure('four concurrent requests');
 const peakRetainedMiB=Math.max(...memory.map(m=>m.retainedBytes))/1024**2;
 const peakObservedBeforeSnapshotMiB=Math.max(...memory.map(m=>m.before.usedSize+m.before.backingStorageSize+(m.before.embedderHeapUsedSize||0)))/1024**2;
 assert(peakRetainedMiB<120,'Worker retained data must leave headroom below 128 MiB');
 const report={passed:true,physics:manifest.physics,layout:manifest.layoutSha256,sourceSha256:manifest.sourceSha256,workerSha256:createHash('sha256').update(source.outputFiles[0].contents).digest('hex'),results,memory,peakRetainedMiB,peakObservedBeforeSnapshotMiB,scope:'Local workerd runtime: heap, backing stores and reported embedder heap sampled at request boundaries, with snapshots for retained memory. This does not measure allocation peaks inside a request or enforce managed Sites limits.'};
 await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,cases:results.length,peakRetainedMiB}));
}finally{socket?.close();await mf.dispose();}
