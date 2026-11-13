import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setImmediate} from 'node:timers/promises';
import {loadVerificationWorld} from '../verification-world.mjs';
import {Shot,launchInput,BROWSER_PHYSICS} from '../public/physics/shot.js';
import {Walker} from '../public/physics/walker.js';
import {STEP} from '../public/physics/ball.js';
import {v,add} from '../public/physics/math.js';

const directory='.local/verification/world',output='.local/verification/world-proof.json';
await writeFile(output,JSON.stringify({passed:false})+'\n');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await readFile(directory+'/manifest.json'));
const catalogBytes=await readFile('web/starter-challenges.json'),catalog=JSON.parse(catalogBytes);
const baseline=JSON.parse(await readFile('.local/browser-physics/campaign-proof.json'));
assert.equal(baseline.physics,BROWSER_PHYSICS);assert.equal(baseline.catalogSha256,hash(catalogBytes));
assert.equal(baseline.inputsSha256,hash(await readFile('web/levels/proof-inputs.json')));
assert(baseline.receipts.every(r=>r.pass&&r.rest));assert.equal(baseline.receipts.length,214);
assert.equal(manifest.sourceSha256,JSON.parse(await readFile('.local/browser-physics/station.collision.bin.json')).sha256);
const memory=[];
async function sample(stage){await setImmediate();global.gc?.();await setImmediate();global.gc?.();const m=process.memoryUsage();memory.push({stage,heapUsed:m.heapUsed,arrayBuffers:m.arrayBuffers,heapAndBuffers:m.heapUsed+m.arrayBuffers,rss:m.rss});}
await sample('before');const began=performance.now(),world=await loadVerificationWorld(manifest,name=>readFile(directory+'/'+name)),loadMs=performance.now()-began;
await sample('loaded');const results=[];
try{
 assert.equal(world.layoutSha256,baseline.layout);
 for(const expected of [...baseline.receipts,...baseline.regressions]){
  const course=catalog.find(c=>c.id===expected.id);let launch=expected.launch;
  if(expected.input){
   const input=expected.input,walker=new Walker(world,add(course.start.center,v(0,.03,0)));
   for(let i=0;i<12;i++)walker.move({x:0,z:0},input.input.yaw,false,STEP);
   const position=walker.release(input.input.yaw,input.input.pitch,expected.releaseTime);assert(position);assert(walker.grounded);
   launch={...launchInput(walker.feet,{...input.input,power:input.holdMs/2800,powerRange:input.range}),position};
   assert.deepEqual(JSON.parse(JSON.stringify(launch)),expected.launch,'Walking/hand-release state must match the JSON receipt (which normalizes signed zero)');
  }
  const shot=new Shot(world,course,launch,{releaseTime:expected.releaseTime}),start=performance.now();
  while(!shot.done&&shot.steps<180*150)shot.step();
  assert(shot.done&&shot.ball.sleeping);assert.deepEqual(shot.ball.velocity,v());assert.deepEqual(shot.ball.spin,v());assert.equal(shot.ball.budgetExhaustions,0);
  const sha256=hash(JSON.stringify(shot.result()));assert.equal(sha256,expected.sha256,`${expected.id} ${expected.label??expected.sample}: exact poses/contacts/score`);
  results.push({id:expected.id,sample:expected.sample,label:expected.label,sha256,computeMs:performance.now()-start});
  if(expected.kind==='hint'||expected.label){await sample(expected.id);console.log('PASS exact compact-world replay: '+expected.id+(expected.label?' '+expected.label:''));}
 }
 await sample('complete');
 const peakRetained=Math.max(...memory.map(m=>m.heapAndBuffers));
 assert(peakRetained<120*1024**2,'Retained verifier memory must leave headroom below a 128 MiB isolate');
 const receipt={passed:true,physics:BROWSER_PHYSICS,layout:world.layoutSha256,sourceSha256:manifest.sourceSha256,catalogSha256:baseline.catalogSha256,loadMs,results,memory,peakRetainedMiB:peakRetained/1024**2,measurement:'Node heap plus ArrayBuffers after GC; actual Worker runtime acceptance is still required'};
 await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:true,cases:results.length,loadMs,peakRetainedMiB:receipt.peakRetainedMiB}));
}finally{world.free();}
