import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {buildBrowserPhysics} from '../build-physics.mjs';
import {encodeCollisionPack} from '../public/physics/collision-pack.js';
import {v,identity} from '../public/physics/math.js';
await buildBrowserPhysics();
const course={id:'recording-test',name:'Recording test',layout:'recording-test',physics:'kyoto-browser-1',scoring:'waypoint-v4',revision:1,start:{center:v(0,10000,0),radius:.25,normal:v(0,1,0),surface:'platform'},waypoints:[],hint:{yaw:0,pitch:0,top:0,kick:0,powerRange:'full'}};
const collision=encodeCollisionPack({layoutSha256:course.layout,fallLimitY:-1e9,shapes:[{kind:'box',id:'platform',material:'granite',position:v(0,9999.5,0),half:v(2,.5,2),rotation:identity(),mask:3}],escalators:[]},[]);
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Browser recording acceptance</title>');return;}
  if(req.url==='/campaign.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify([course]));return;}
  if(req.url==='/station.collision.bin'){res.end(collision);return;}
  const file=req.url==='/physics-worker.js'?resolve('.local/browser-physics/worker.js'):resolve('web/public','.'+req.url);
  if(req.url!=='/physics-worker.js'&&!file.startsWith(resolve('web/public')+'/'))throw Error('Outside root');
  res.setHeader('Content-Type','text/javascript');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();await backgroundInput(context);
 const page=await context.newPage(),origin=`http://127.0.0.1:${server.address().port}`,errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);
 await page.evaluate(async()=>{
  // The two-course preview already saved current progress in schema 1. Adding
  // chunk storage must preserve those records and their complete inline replay.
  await new Promise((resolve,reject)=>{
   const open=indexedDB.open('kyoto-browser',1);open.onupgradeneeded=()=>{const db=open.result;db.createObjectStore('settings');db.createObjectStore('replays',{keyPath:'attempt'});db.createObjectStore('records',{keyPath:'attempt'}).createIndex('course','course');};
   open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(['records','replays'],'readwrite');tx.objectStore('records').put({attempt:'existing',course:'retired-test',score:123});tx.objectStore('replays').put({attempt:'existing',score:123,poses:[{t:0,p:{x:1,y:2,z:3}}],contacts:[],scoreFrames:[]});tx.oncomplete=()=>{db.close();resolve();};};
  });
  const {localStore}=await import('/local-store.js');window.localStore=localStore;
  window.counts=async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('kyoto-browser');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await Promise.all(['records','replays','chunks'].map(name=>new Promise(resolve=>{const r=db.transaction(name).objectStore(name).count();r.onsuccess=()=>resolve(r.result);})));}finally{db.close();}};
  window.one=await localStore();window.existing=await one.replay('existing');await one.retainCurrent([]);await one.append('live-tab',0,{poses:[],contacts:[],scoreFrames:[]});
 });
 assert.deepEqual(await page.evaluate(()=>({score:existing.score,poses:existing.poses})),{score:123,poses:[{t:0,p:{x:1,y:2,z:3}}]});
 const second=await context.newPage();await second.goto(origin);await second.evaluate(async()=>{window.store=await(await import('/local-store.js')).localStore();await store.cleanInterrupted();});
 assert.deepEqual(await page.evaluate(()=>counts()),[0,1,1],'Another tab must not remove a live recording');
 await page.evaluate(()=>one.close());await second.evaluate(()=>store.cleanInterrupted());assert.deepEqual(await page.evaluate(()=>counts()),[0,0,0],'Interrupted recordings are removed after their owner releases its lock');
 await page.evaluate(async()=>{
  window.messages=[];window.attempt=null;window.holdAck=true;window.held=[];window.chunks=0;window.lastTime=0;window.maxPoses=0;window.maxFrames=0;window.stopAt=Infinity;
  const NativeWorker=Worker;
  class ObservedWorker extends NativeWorker{
   constructor(...args){super(...args);window.worker=this;this.addEventListener('message',event=>{const m=event.data;if(m.type==='recording-chunk'){chunks++;lastTime=m.recording.poses.at(-1)?.t||lastTime;maxPoses=Math.max(maxPoses,m.recording.poses.length);maxFrames=Math.max(maxFrames,m.playback.frames.length);if(lastTime>=stopAt)holdAck=true;}});}
   postMessage(m){if(m.type==='recording-ack'&&holdAck)held.push(m);else super.postMessage(m);}
   flush(){holdAck=false;for(const m of held.splice(0))super.postMessage(m);}
  }
  window.connection=(await import('/local-connection.js')).browserConnection({WorkerImpl:ObservedWorker,onStatus:()=>{},onMessage:m=>{messages.push(m);if(m.type==='session')attempt=m.attempt;if(m.type==='state')window.state=m;}});
 });
 await page.waitForFunction(()=>messages.some(m=>m.type==='ready'));await context.setOffline(true);
 async function launch(){await page.evaluate(()=>connection.send('charge',{powerRange:'full'}));await page.waitForFunction(()=>state?.phase==='Charging');await page.waitForTimeout(300);await page.evaluate(()=>connection.send('release'));await page.waitForFunction(()=>held.length>0);}
 await launch();const first=await page.evaluate(()=>({chunks,lastTime}));await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>({chunks,lastTime})),first,'Slow storage stops the real worker');
 await page.evaluate(()=>worker.flush());await page.waitForFunction(()=>lastTime>=30);await page.waitForTimeout(150);const parked=await page.evaluate(()=>chunks);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>chunks),parked,'No playback leaves simulation parked 30 seconds ahead');
 assert.equal(await page.evaluate(()=>messages.some(m=>m.type==='result')),false);
 // Release animation advertises an estimated time; playback acknowledges the
 // actual launch timestamp carried by the recorded frames.
 await page.evaluate(()=>connection.playback(attempt,messages.find(m=>m.type==='shot-chunk').base.releaseTime+lastTime));await page.waitForFunction(()=>lastTime>=60);await page.waitForTimeout(100);
 const preSkip=await page.evaluate(()=>messages.filter(m=>m.type==='shot-chunk').length);
 await page.evaluate(()=>{stopAt=240;connection.send('skip-shot',{attempt});});await page.waitForFunction(()=>lastTime>=240&&held.length>0);
 const skipped=await page.evaluate(()=>({chunks,lastTime,maxPoses,maxFrames,playback:messages.filter(m=>m.type==='shot-chunk').length,results:messages.filter(m=>m.type==='result').length}));
 assert.ok(skipped.maxPoses<=181);assert.ok(skipped.maxFrames<=30);assert.equal(skipped.results,0);assert.equal(skipped.playback,preSkip,'Skip does not flood the renderer with discarded future frames');
 await page.evaluate(()=>connection.send('recall'));await page.waitForFunction(()=>state.phase==='Aim'&&!attempt);await page.waitForFunction(async()=>JSON.stringify(await counts())==='[0,0,0]');
 await page.evaluate(()=>worker.flush());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>messages.some(m=>m.type==='result')),false,'Late recording acknowledgments cannot revive a recalled shot');
 // Losing an in-progress recording is an explicit forfeiture, never a partial
 // replay paired with a banked score. Exercise an actual aborted IDB transaction.
 await page.evaluate(()=>{holdAck=true;stopAt=Infinity;});await launch();const damaged=await page.evaluate(()=>attempt);
 await second.evaluate(id=>store.discard(id),damaged);await page.evaluate(()=>worker.flush());await page.waitForFunction(()=>state.phase==='Aim'&&messages.some(m=>m.type==='error'&&m.message.includes('Could not record')));
 assert.deepEqual(await page.evaluate(()=>counts()),[0,0,0]);
 await page.evaluate(()=>{holdAck=true;});await launch();assert.ok((await page.evaluate(()=>counts()))[2]>0);await page.close();
 await second.evaluate(()=>store.cleanInterrupted());const remaining=await second.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('kyoto-browser');r.onsuccess=()=>resolve(r.result);});try{return await Promise.all(['records','replays','chunks'].map(name=>new Promise(resolve=>{const r=db.transaction(name).objectStore(name).count();r.onsuccess=()=>resolve(r.result);})));}finally{db.close();}});assert.deepEqual(remaining,[0,0,0],'Closing a tab leaves no permanent orphan replay');
 assert.deepEqual(errors,[]);console.log('PASS offline browser recording: bounded worker messages/lookahead, >240 s moving Skip without early result, recall, stale acknowledgments, storage failure forfeiture, active-tab protection and interrupted-recording cleanup');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
