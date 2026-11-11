import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
const root=resolve('web/public');
const server=http.createServer(async(req,res)=>{
 try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Control storage acceptance</title>');return;}
  const path=resolve(root,'.'+req.url);if(!path.startsWith(root+'/'))throw Error('Outside root');res.setHeader('Content-Type','text/javascript');res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();await backgroundInput(context);const page=await context.newPage(),origin=`http://127.0.0.1:${server.address().port}`,errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);
 await page.evaluate(async()=>{
  const opening=indexedDB.open('kyoto-browser',3);opening.onupgradeneeded=()=>{
   const db=opening.result;db.createObjectStore('settings');const replays=db.createObjectStore('replays',{keyPath:'attempt'});replays.createIndex('draft','draft');replays.createIndex('route','inputs.route');
   db.createObjectStore('records',{keyPath:'attempt'}).createIndex('course','course');db.createObjectStore('routes',{keyPath:'id'});
   db.createObjectStore('inputs',{keyPath:['route','sequence']}).createIndex('route','route');db.createObjectStore('chunks',{keyPath:['attempt','sequence']}).createIndex('attempt','attempt');
  };
  const db=await new Promise(resolve=>{opening.onsuccess=()=>resolve(opening.result);});const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put('retained','upgrade-proof');await new Promise(resolve=>{tx.oncomplete=resolve;});db.close();
 });
 await page.evaluate(async()=>{
  window.localStore=(await import('/local-store.js')).localStore;window.one=await localStore();
  if(await one.setting('upgrade-proof')!=='retained')throw Error('The current database did not survive the outbox upgrade');
  window.course={id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'};
  window.run=n=>({steps:n,x:0,z:0,yaw:0,fast:false});
  window.counts=async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('kyoto-browser');r.onsuccess=()=>resolve(r.result);});try{return await Promise.all(['records','replays','chunks','routes','inputs'].map(name=>new Promise(resolve=>{const r=db.transaction(name).objectStore(name).count();r.onsuccess=()=>resolve(r.result);})));}finally{db.close();}};
  window.save=async(attempt,chunks,walkSteps)=>{
   const replay={attempt,id:'guest',challenge:course,score:42,success:true,breakdown:{outcome:'complete'},duration:1,surfaces:1,accepted:1,recordingChunks:1,inputs:{route:'shared',chunks,header:{walkSteps}}};
   await one.append(attempt,0,{poses:[],contacts:[],scoreFrames:[]});await one.finish(replay);await one.save(replay);
  };
  window.controls=async(store,id)=>{const runs=[];for await(const c of store.inputChunks(id))runs.push(...c.runs);return runs;};
  await one.startRoute('shared',course);await one.appendInputs('shared',0,[run(50000)]);await save('first',1,50000);
  await one.appendInputs('shared',1,[{...run(180),x:1,fast:true}]);await save('second',2,50180);
 });
 assert.deepEqual(await page.evaluate(()=>counts()),[2,2,2,1,2],'Two complete replays share their common walking prefix');
 assert.equal((await page.evaluate(()=>controls(one,'first'))).length,1);assert.equal((await page.evaluate(()=>controls(one,'second'))).length,2);
 assert.equal(await page.evaluate(async()=>{try{await one.appendInputs('shared',1,[run(1)]);return false;}catch{return true;}}),true,'Repeated input sequence is rejected');
 assert.equal(await page.evaluate(async()=>{try{await save('broken',3,50181);return false;}catch{await one.discard('broken');return true;}}),true,'A replay cannot finish ahead of its persisted inputs');
 assert.equal(await page.evaluate(async()=>{try{await save('changed',2,50179);return false;}catch{await one.discard('changed');return true;}}),true,'Walking count must match the exact saved prefix');
 // The final chunk belongs to no completed shot. A crash must remove that tail
 // but retain both saved attempts, even when they share earlier chunks.
 await page.evaluate(async()=>{await one.appendInputs('shared',2,[run(20)]);await one.startRoute('abandoned',course);await one.appendInputs('abandoned',0,[run(12)]);});
 const second=await context.newPage();second.on('pageerror',e=>errors.push(String(e)));await second.goto(origin);
 await second.evaluate(async()=>{window.two=await(await import('/local-store.js')).localStore();await two.cleanInterrupted();});
 assert.deepEqual(await page.evaluate(()=>counts()),[2,2,2,2,4],'Another live tab cannot prune active routes');
 await page.evaluate(()=>one.close());await second.evaluate(()=>two.cleanInterrupted());assert.deepEqual(await page.evaluate(()=>counts()),[2,2,2,1,2],'Crash cleanup keeps only the longest referenced prefix');
 await page.reload();await page.evaluate(async()=>{window.one=await(await import('/local-store.js')).localStore();window.saved=await one.inputProof('first');window.runs=[];for await(const c of one.inputChunks('first'))runs.push(...c.runs);});
 assert.deepEqual(await page.evaluate(()=>({proof:saved,runs})),{proof:{route:'shared',chunks:1,header:{walkSteps:50000}},runs:[{steps:50000,x:0,z:0,yaw:0,fast:false}]},'Saved controls survive reload unchanged');
 await page.evaluate(async()=>{
  const db=await new Promise(resolve=>{const r=indexedDB.open('kyoto-browser');r.onsuccess=()=>resolve(r.result);});
  await new Promise(resolve=>{const tx=db.transaction('inputs','readwrite');tx.objectStore('inputs').delete(['shared',1]);tx.oncomplete=resolve;});db.close();
 });
 assert.equal(await second.evaluate(async()=>{try{for await(const c of two.inputChunks('second')){}return false;}catch{return true;}}),true,'Missing control chunks are explicit errors');
 await second.evaluate(()=>two.retainCurrent([]));
 const count=()=>second.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('kyoto-browser');r.onsuccess=()=>resolve(r.result);});try{return await Promise.all(['records','replays','chunks','routes','inputs'].map(name=>new Promise(resolve=>{const r=db.transaction(name).objectStore(name).count();r.onsuccess=()=>resolve(r.result);})));}finally{db.close();}});
 assert.deepEqual(await count(),[0,0,0,0,0],'Retiring a course releases its last control references');
 await page.evaluate(async()=>{await one.startRoute('crashed',{id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'});await one.appendInputs('crashed',0,[{steps:100,x:0,z:0,yaw:0,fast:false}]);});await page.close();await second.evaluate(()=>two.cleanInterrupted());assert.deepEqual(await count(),[0,0,0,0,0]);
 for(const length of [3,7,2]){
  const result=await second.evaluate(async length=>{
   const id=crypto.randomUUID();for(let sequence=0;sequence<length;sequence++){const chunk={poses:[{t:sequence}],contacts:[],scoreFrames:[]};await two.append(id,sequence,chunk,{cacheBytes:new TextEncoder().encode(JSON.stringify(chunk)).byteLength});}
   await two.imported({attempt:'public',remote:true,recordingChunks:length,challenge:{id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'}},id);
   return (await two.replay('public')).poses;
  },length);assert.deepEqual(result,Array.from({length},(_,t)=>({t})));assert.deepEqual(await count(),[0,1,length,0,0]);
 }
 await second.evaluate(()=>two.retainCurrent([]));assert.deepEqual(await count(),[0,0,0,0,0],'Retired public replay cache is deleted');
 await second.evaluate(async()=>{
  window.limits=(await import('/local-store.js')).PUBLIC_REPLAY_CACHE;
  window.cacheCourse={id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'};
  window.cache=async(id,bytes=0)=>{
   const temporary=crypto.randomUUID(),chunk={poses:[{t:1,payload:'x'.repeat(bytes)}],contacts:[{surface:id}],scoreFrames:[]};
   await two.append(temporary,0,chunk,{cacheBytes:new TextEncoder().encode(JSON.stringify(chunk)).byteLength});
   const replay=await two.imported({attempt:id,remote:true,recordingChunks:1,challenge:cacheCourse},temporary);
   return {id:replay.attempt,length:replay.poses[0].payload.length,contacts:replay.contacts};
  };
  window.cacheState=async()=>{
   const db=await new Promise(resolve=>{const r=indexedDB.open('kyoto-browser');r.onsuccess=()=>resolve(r.result);});
   try{return await new Promise(resolve=>{const r=db.transaction('replays').objectStore('replays').getAll();r.onsuccess=()=>resolve(r.result.map(r=>({id:r.attempt,bytes:r.cacheBytes,inputs:!!r.inputs,draft:!!r.draft})));});}finally{db.close();}
  };
  // A verified replacement of the player's own shot must retain its legal
  // controls and score even when downloaded public replays are evicted.
  await two.startRoute('proof',cacheCourse);await two.appendInputs('proof',0,[{steps:3,x:0,z:0,yaw:0,fast:false}]);
  const own={attempt:'own',id:'guest',challenge:cacheCourse,score:42,success:true,breakdown:{outcome:'complete'},duration:1,surfaces:1,accepted:1,recordingChunks:1,inputs:{route:'proof',chunks:1,header:{walkSteps:3}}};
  await two.append('own',0,{poses:[],contacts:[],scoreFrames:[]});await two.finish(own);await two.save(own,{endpoint:'https://scores.example'});await two.closeRoute('proof');await cache('own');
  for(let i=0;i<limits.maxEntries;i++)await cache('public-'+i);
 });
 await second.waitForTimeout(5);await second.evaluate(()=>two.replay('public-0'));await second.waitForTimeout(5);await second.evaluate(()=>cache('new'));
 let cached=await second.evaluate(()=>cacheState());assert.equal(cached.length,9);assert.ok(cached.some(r=>r.id==='public-0'));assert.ok(!cached.some(r=>r.id==='public-1'),'Reading a replay updates recency before eviction');
 assert.deepEqual(await count(),[1,9,9,1,1],'Eviction deletes replay chunks as well as headers');
 assert.equal((await second.evaluate(()=>two.inputProof('own'))).header.walkSteps,3);assert.equal((await second.evaluate(()=>two.pendingSync('https://scores.example'))).length,1);
 // Use real large payloads, not invented byte counters. The byte ceiling
 // applies even below the entry limit; an oversized replay is returned whole.
 const half=await second.evaluate(()=>Math.floor(limits.maxBytes/2));
 await second.evaluate(bytes=>cache('large-1',bytes),half);await second.waitForTimeout(5);await second.evaluate(bytes=>cache('large-2',bytes),half);
 cached=await second.evaluate(()=>cacheState());assert.ok(!cached.some(r=>r.id==='large-1'));assert.ok(cached.some(r=>r.id==='large-2'));assert.ok(cached.filter(r=>!r.inputs).reduce((sum,r)=>sum+r.bytes,0)<=half*2);
 const oversized=await second.evaluate(bytes=>cache('oversized',bytes),half*2+1);assert.equal(oversized.length,half*2+1);assert.deepEqual(oversized.contacts,[{surface:'oversized'}]);
 assert.ok(!(await second.evaluate(()=>cacheState())).some(r=>r.id==='oversized'),'An oversized replay is playable but not retained');
 const third=await context.newPage();third.on('pageerror',e=>errors.push(String(e)));await third.goto(origin);
 await third.evaluate(async()=>{window.three=await(await import('/local-store.js')).localStore();});
 await Promise.all([second.evaluate(async()=>{for(let i=0;i<10;i++)await cache('concurrent-'+i);}),third.evaluate(async()=>{
  for(let i=0;i<10;i++){
   const id='other-'+i,temp=crypto.randomUUID(),chunk={poses:[{t:i}],contacts:[],scoreFrames:[]};
   await three.append(temp,0,chunk,{cacheBytes:new TextEncoder().encode(JSON.stringify(chunk)).byteLength});
   const result=await three.imported({attempt:id,remote:true,recordingChunks:1,challenge:{id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'}},temp);
   if(result.poses.length!==1||result.poses[0].t!==i)throw Error('Concurrent import lost its replay');
  }
 })]);
 assert.equal((await second.evaluate(()=>cacheState())).filter(r=>!r.inputs).length,8);
 await second.evaluate(()=>two.append('interrupted-download',0,{poses:[{t:0}],contacts:[],scoreFrames:[]},{cacheBytes:100}));await third.evaluate(()=>three.cleanInterrupted());
 assert.ok((await second.evaluate(()=>cacheState())).some(r=>r.id==='interrupted-download'),'Another tab keeps an active download');
 await second.evaluate(()=>two.close());await third.evaluate(()=>three.cleanInterrupted());
 assert.ok(!(await second.evaluate(()=>cacheState())).some(r=>r.id==='interrupted-download'),'Abandoned downloads are cleaned after their tab closes');
 assert.equal((await third.evaluate(()=>three.inputProof('own'))).header.walkSteps,3);assert.equal((await third.evaluate(()=>three.records({id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'}))).length,1);
 assert.deepEqual(await count(),[1,9,9,1,1]);
 assert.deepEqual(errors,[]);console.log('PASS durable controls: shared immutable prefixes, exact step counts, duplicate/incomplete rejection, reload, live-tab locks, abandoned-tail cleanup, missing chunks and retired-course collection');
 console.log('PASS public replay cache: entry/byte bounds, recent reads, complete oversized playback, concurrent tabs, abandoned downloads and preservation of saved scores, queued verification and legal controls');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
