import assert from 'node:assert/strict';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {buildBrowserPhysics} from '../build-physics.mjs';
import {launchInput,BROWSER_PHYSICS} from '../public/physics/shot.js';
import {v,add,spinRotation} from '../public/physics/math.js';
await buildBrowserPhysics();
const files={'/worker.js':'.local/browser-physics/worker.js','/math.js':'web/public/physics/math.js','/collision.bin':'.local/browser-physics/station.collision.bin'};
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Physics worker acceptance</title>');return;}
 const file=files[req.url];if(!file){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'application/octet-stream');createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const results=[],campaign=process.argv.includes('--campaign');
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext();await backgroundInput(context);const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}/`);
 // Real manually timed First Bounce input exposed a one-bit quaternion
 // difference in native Math.sin/cos. Keep that exact cancellation case and
 // varied spins as a cross-engine regression, independent of course hints.
 const rotations=[{q:{x:.40015149116516113,y:-2.823299416539258e-23,z:-4.9004432727629954e-17,w:.9164488315582275},w:v(-269.03173828125,-1.2788808281127017e-29,3.294691180034254e-14),dt:Math.fround(1/180)}];
 let seed=12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 for(let i=0;i<1024;i++){const q={x:random()-.5,y:random()-.5,z:random()-.5,w:random()-.5},norm=Math.sqrt(Object.values(q).reduce((n,x)=>n+x*x,0));for(const key in q)q[key]/=norm;rotations.push({q,w:v((random()-.5)*10000,(random()-.5)*10000,(random()-.5)*10000),dt:Math.fround(random()/180)});}
 const browserRotations=await page.evaluate(async inputs=>{const {spinRotation}=await import('/math.js');return inputs.map(({q,w,dt})=>spinRotation(q,w,dt));},rotations);
 assert.deepEqual(browserRotations,rotations.map(({q,w,dt})=>spinRotation(q,w,dt)),'Rotation arithmetic must match Chrome and Node exactly');
 await page.evaluate(()=>{
  window.worker=new Worker('/worker.js',{type:'module'});window.messages=[];window.result=null;window.gaps=[];window.tick=performance.now();
  window.worker.onmessage=e=>{const m=e.data;window.messages.push(m);if(m.type==='result')window.result=m;if(m.type==='frames'&&window.recallNext){window.recallNext=false;window.worker.postMessage({type:'recall'});}};
  window.worker.onerror=e=>{window.messages.push({type:'error',message:e.message});};
  setInterval(()=>{const now=performance.now();window.gaps.push(now-window.tick);window.tick=now;},16);
  window.worker.postMessage({type:'init',collisionURL:'/collision.bin'});
 });
 await page.waitForFunction(()=>messages.some(m=>m.type==='ready'||m.type==='error'),null,{timeout:60000});
 const ready=await page.evaluate(()=>messages.find(m=>m.type==='ready'||m.type==='error'));assert.equal(ready.type,'ready',ready.message);
 // Both repeat runs execute after network access is disabled. Neither collision
 // queries nor scoring may fall back to the Unity service or an HTTP endpoint.
 await context.setOffline(true);
 const courses=JSON.parse(await readFile('web/starter-challenges.json','utf8')),nodeProof=JSON.parse(await readFile(`.local/browser-physics/${campaign?'campaign':'station'}-proof.json`,'utf8'));
 if(campaign){assert.equal(nodeProof.physics,BROWSER_PHYSICS);assert.equal(nodeProof.receipts.filter(r=>r.kind==='hint'&&r.pass).length,30);assert.equal(nodeProof.catalogSha256,createHash('sha256').update(await readFile('web/starter-challenges.json')).digest('hex'),'Node proof must describe the current catalog');}
 const cases=(campaign?courses.map(c=>c.id):['atrium-welcome','atrium-clock-in','basement-upward-bound']).map(id=>campaign?nodeProof.receipts.find(r=>r.id===id&&r.kind==='hint'):nodeProof.results.find(r=>r.id===id));
 if(campaign){assert.ok(nodeProof.regressions.some(r=>r.label==='moving-contact-timestamp'));cases.push(...nodeProof.regressions);}
 for(const expected of cases){
  const id=expected.id,label=expected.label||id,challenge=courses.find(c=>c.id===id),hint=challenge.hint,launch=campaign?expected.launch:launchInput(add(challenge.start.center,v(0,.025,0)),{...hint,power:hint.holdMs/2800}),releaseTime=expected.releaseTime||0;
  let hash;
  for(let run=0;run<2;run++){
   await page.evaluate(({challenge,launch,releaseTime})=>{window.result=null;window.messages=[];window.worker.postMessage({type:'throw',challenge,launch,options:{releaseTime}});},{challenge,launch,releaseTime});
   await page.waitForFunction(()=>result||messages.some(m=>m.type==='error'),null,{timeout:60000});
   const response=await page.evaluate(()=>result||messages.find(m=>m.type==='error'));assert.equal(response.type,'result',response.message);
   const {result,computeMs,maxBatchMs}=response;assert.ok(result.success);assert.equal(result.waypointHits.length,challenge.waypoints.length);
   const digest=createHash('sha256').update(JSON.stringify(result)).digest('hex');
   assert.equal(digest,expected.sha256,`${label}: Chrome must reproduce the Node verifier byte for byte`);
   if(hash)assert.equal(digest,hash);hash=digest;
   if(!run)results.push({id,label,computeMs,maxBatchMs,duration:result.duration,score:result.score,sha256:digest});
  }
  console.log(`PASS offline Chrome: ${label}, two identical full replays`);
 }
 // A buffered shot is still recallable after computation has finished, before
 // the user reaches the end of playback. It must not become a banked score.
 await page.evaluate(()=>{window.result=null;window.worker.postMessage({type:'recall'});});
 await page.waitForFunction(()=>result,null,{timeout:10000});
 const lateRecall=await page.evaluate(()=>result.result);assert.equal(lateRecall.reason,'Recalled');assert.equal(lateRecall.score,0);assert.equal(lateRecall.success,false);
 const challenge=courses.find(c=>c.id==='atrium-welcome'),hint=challenge.hint,launch=launchInput(add(challenge.start.center,v(0,.025,0)),{...hint,power:hint.holdMs/2800});
 await page.evaluate(({challenge,launch})=>{window.result=null;window.recallNext=true;window.worker.postMessage({type:'throw',challenge,launch});},{challenge,launch});
 await page.waitForFunction(()=>result,null,{timeout:10000});const recalled=await page.evaluate(()=>result.result);
 assert.equal(recalled.reason,'Recalled');assert.equal(recalled.score,0);assert.equal(recalled.success,false);assert.ok(recalled.duration<results[0].duration);
 const gaps=await page.evaluate(()=>gaps);gaps.sort((a,b)=>a-b);const heartbeat={count:gaps.length,p95Ms:gaps[Math.floor(gaps.length*.95)],maxMs:Math.max(...gaps)};
 assert.ok(gaps.length>10,'Main thread kept receiving events while physics ran');assert.ok(heartbeat.p95Ms<50,'Worker should not stall the main thread');assert.deepEqual(errors,[]);
 const receipt={browser:await browser.version(),ready,results,recall:{duration:recalled.duration,score:recalled.score},heartbeat};
 await writeFile(`.local/browser-physics/${campaign?'campaign-worker':'worker'}-proof.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
