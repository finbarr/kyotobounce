import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Firestore} from '@google-cloud/firestore';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {VerificationService} from '../online/service.mjs';
import {verificationHttp} from '../online/http.mjs';
import {course,header,fixtureWorld,simulate} from './verification-fixture.mjs';
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);assert.equal(process.env.GOOGLE_CLOUD_PROJECT,'demo-kyoto-verification');
const root=resolve('web/public'),site=http.createServer(async(req,res)=>{
 try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Online score synchronization</title>');return;}
 const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/'))throw Error('Outside root');res.setHeader('Content-Type','text/javascript');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${site.address().port}`;
const world=fixtureWorld(),db=new Firestore({projectId:process.env.GOOGLE_CLOUD_PROJECT}),service=new VerificationService({db,namespace:'sync-'+randomUUID(),catalog:[course],world:()=>world,batchLimit:2});
const server=verificationHttp(service,{origins:[origin]});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const endpoint=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext();await backgroundInput(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
const player={id:randomUUID(),name:'Sync test',named:true},attempt=randomUUID(),baseline=await simulate(world,course,header,[],{attempt,subject:player.id});
try{
 await page.goto(origin);
 await page.evaluate(async({player,course,header,replay,endpoint})=>{
  window.store=await(await import('/local-store.js')).localStore();await store.setting('profile',player);
  const route=crypto.randomUUID();await store.startRoute(route,course);await store.append(replay.attempt,0,{poses:[],contacts:[],scoreFrames:[]});
  const saved={...replay,score:replay.score+1000000000,id:player.id,playerName:player.name,recordingChunks:1,accepted:Date.now(),inputs:{route,chunks:0,header}};await store.finish(saved);await store.save(saved,{endpoint});
  window.config={endpoint,store,getProfile:()=>player,getCatalog:()=>[course],getSelected:()=>course,changed:(c,result)=>{window.accepted=result||window.accepted;},status:m=>{window.syncStatus=m;}};
  window.makeSync=(await import('/online-scores.js')).onlineScores;
  window.makeBoard=(await import('/result-board.js')).resultBoard;
 },{player,course,header,replay:baseline.result,endpoint});
 await context.setOffline(true);await page.evaluate(()=>{window.sync=makeSync(config);sync.wake();});
 await page.waitForFunction(()=>syncStatus?.phase==='offline');assert.equal((await service.attempts.get()).size,0);
 await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.waitForFunction(()=>window.accepted?.state==='verified',null,{timeout:30000});
 assert.equal((await service.attempts.get()).size,1);assert.equal((await service.status(player.id,attempt)).result.score,baseline.result.score);
 const firstToken=await page.evaluate(async endpoint=>await store.setting('online:'+endpoint+':credential'),endpoint);
 await page.evaluate(()=>{sync.stop();sync=makeSync(config);sync.wake();});
 await page.waitForFunction(()=>syncStatus.phase==='connected');
 assert.ok(await page.evaluate(async endpoint=>await store.setting('online:'+endpoint+':credential'),endpoint)===firstToken,'Restart must retain the same credential');assert.equal((await service.players.get()).size,1);
 const progress=await page.evaluate(()=>sync.progress());assert.equal(progress[0].rank,1);
 await context.setOffline(true);await page.waitForFunction(()=>syncStatus.phase==='offline');assert.equal((await page.evaluate(()=>sync.board(config.getSelected()))).cached,true);
 assert.ok(await page.evaluate(async()=>{
  const board=makeBoard({host:document.body,watch(){},sound:{cue(){}}});
  board.update(config.getSelected(),[],null,{local:false,cached:true,onlineAvailable:true});board.reset();return document.querySelector('#result-leaderboard .eyebrow').textContent.includes('LAST SYNC');
 }),'Resetting a cached board must not relabel it as freshly synchronized');
 assert.deepEqual(errors,[]);console.log('PASS browser synchronization: offline outbox, tampered local score ignored, stable credential, cached rank, offline status and idempotent restart');
}catch(error){console.error(JSON.stringify({errors,status:await page.evaluate(()=>window.syncStatus),jobs:(await service.attempts.get()).docs.map(d=>({id:d.id,state:d.data().state}))}));throw error;}
finally{await browser.close();server.closeAllConnections();site.closeAllConnections();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>site.close(resolve))]);await db.recursiveDelete(service.root);await db.terminate();world.free();}
