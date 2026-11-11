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
   const id=crypto.randomUUID();for(let sequence=0;sequence<length;sequence++)await two.append(id,sequence,{poses:[{t:sequence}],contacts:[],scoreFrames:[]});
   await two.imported({attempt:'public',remote:true,recordingChunks:length,challenge:{id:'course',revision:1,layout:'layout',physics:'physics',scoring:'waypoint-v4'}},id);
   return (await two.replay('public')).poses;
  },length);assert.deepEqual(result,Array.from({length},(_,t)=>({t})));assert.deepEqual(await count(),[0,1,length,0,0]);
 }
 await second.evaluate(()=>two.retainCurrent([]));assert.deepEqual(await count(),[0,0,0,0,0],'Retired public replay cache is deleted');
 assert.deepEqual(errors,[]);console.log('PASS durable controls: shared immutable prefixes, exact step counts, duplicate/incomplete rejection, reload, live-tab locks, abandoned-tail cleanup, missing chunks and retired-course collection');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
