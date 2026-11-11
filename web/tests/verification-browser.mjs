import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {build} from 'esbuild';
import {launchTestBrowser,testBrowserName} from './browser-engine.mjs';
import {backgroundInput} from './background-input.mjs';
import {ShotVerification} from '../verification.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {campaignLaunches} from './browser-launches.mjs';
await build({entryPoints:['web/tests/verification-worker.mjs'],outfile:'.local/browser-physics/verification-worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Input verification acceptance</title>');return;}const file=req.url==='/worker.js'?'.local/browser-physics/verification-worker.js':req.url==='/collision.bin'?'.local/browser-physics/station.collision.bin':null;if(!file){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'application/octet-stream');createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,world;const results=[];
try{
 const courses=JSON.parse(await readFile('web/starter-challenges.json')).map(c=>({...c,physics:BROWSER_PHYSICS}));
 browser=await launchTestBrowser();const context=await browser.newContext();await backgroundInput(context);const page=await context.newPage();page.setDefaultTimeout(60000);
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(catalog=>{
  window.worker=new Worker('/worker.js',{type:'module'});window.messages=[];window.poses=[];window.contacts=[];window.result=null;
  worker.onmessage=({data:m})=>{
   if(m.type==='recording-chunk'){poses.push(...m.recording.poses);contacts.push(...m.recording.contacts);worker.postMessage({type:'recording-ack',attempt:m.attempt,sequence:m.sequence});return;}
   if(m.type==='local-result'){result=m;worker.postMessage({type:'bank-result',attempt:m.result.attempt});return;}
   messages.push(m);
  };worker.onerror=e=>messages.push({type:'error',message:e.message});worker.postMessage({type:'init',catalog});
 },courses);await page.waitForFunction(()=>messages.some(m=>m.type==='test-ready'||m.type==='error'));assert.equal(await page.evaluate(()=>messages.some(m=>m.type==='error')),false);await context.setOffline(true);
 world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 const launches=await page.evaluate(()=>messages.find(m=>m.type==='test-ready').launches);
 assert.equal(launches.length,30);assert.ok(launches.every(r=>r.grounded&&r.launch.position));
 assert.deepEqual(launches,campaignLaunches(world,courses),`${testBrowserName} release placement and launch arithmetic must match Node on all 30 courses`);
 console.log(`PASS all 30 ${testBrowserName} release positions, velocities and spins match Node exactly`);
 for(const id of ['atrium-welcome','basement-upward-bound']){
  const course=courses.find(c=>c.id===id),a=course.hint;
  await page.evaluate(id=>{messages=[];poses=[];contacts=[];result=null;worker.postMessage({type:'select-challenge',challengeId:id});},id);
  await page.waitForFunction(id=>messages.some(m=>m.type==='selected'&&m.challenge.id===id),id);
  // Exercise live controller walking, a direction change, sprint and charge
  // timing. Keep input refreshed just as the actual renderer does.
  await page.evaluate(aim=>{
   window.control={type:'input',x:.5,z:.5,fast:true,yaw:aim.yaw,pitch:aim.pitch,top:aim.top,kick:aim.kick};worker.postMessage(control);window.refresh=setInterval(()=>worker.postMessage(control),30);
  },a);await page.waitForTimeout(240);await page.evaluate(()=>{control={...control,x:-.5,z:-.5,fast:false};});await page.waitForTimeout(180);
  await page.evaluate(()=>{control={...control,x:0,z:0,fast:false};});await page.waitForTimeout(100);
  await page.evaluate(()=>worker.postMessage({type:'charge',powerRange:control.powerRange||'precision'}));await page.waitForTimeout(a.holdMs);
  await page.evaluate(()=>{clearInterval(refresh);worker.postMessage({type:'release'});});await page.waitForFunction(()=>messages.some(m=>m.type==='state'&&m.phase==='Release'));
  const attempt=await page.evaluate(()=>messages.findLast(m=>m.type==='session'&&m.attempt).attempt);await page.waitForFunction(()=>poses.length>1||messages.some(m=>m.type==='error'));await page.evaluate(attempt=>worker.postMessage({type:'skip-shot',attempt}),attempt);
  await page.waitForFunction(()=>result||messages.some(m=>m.type==='error'));const actual=await page.evaluate(()=>({result:result?.result,proof:result?.proof,poses,contacts,errors:messages.filter(m=>m.type==='error')}));assert.deepEqual(actual.errors,[]);assert.ok(actual.proof.commands.some(c=>c.x!==0&&c.fast));assert.ok(actual.proof.commands.some(c=>c.x<0));
  const job=new ShotVerification(world,course,actual.proof.header,actual.proof.commands,{attempt:actual.result.attempt,subject:'proof-player'}),poses=[],contacts=[];let verified;
  do{verified=await job.advance();if(verified.recording){poses.push(...verified.recording.poses);contacts.push(...verified.recording.contacts);}}while(verified.status!=='verified');
  const {id:ignoredId,recordingChunks,inputs,...expected}=actual.result;assert.deepEqual(inputs.header,actual.proof.header,'Production input header matches the independent controller observer');assert.deepEqual({...verified.result,poses,contacts},{...expected,poses:actual.poses,contacts:actual.contacts},`Node independently reconstructs the real ${testBrowserName} controller and entire shot exactly`);
  results.push({id,walkingSteps:actual.proof.header.walkSteps,inputRuns:actual.proof.commands.length,score:verified.result.score,duration:verified.result.duration,poses:poses.length});console.log(`PASS real ${testBrowserName} controls -> independently verified exact Node replay: ${id}`);
 }
 await writeFile(`.local/browser-physics/verification-browser-${testBrowserName}-proof.json`,JSON.stringify({engine:testBrowserName,browser:await browser.version(),physics:BROWSER_PHYSICS,launches:launches.length,results},null,2)+'\n');
}finally{world?.free();await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
