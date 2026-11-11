import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {Firestore} from '@google-cloud/firestore';
import {VerificationService} from '../online/service.mjs';
import {verificationHttp} from '../online/http.mjs';
import {verificationCourseKey} from '../verification-checkpoint.mjs';
import {ShotVerification,INPUT_FORMAT} from '../verification.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {course,header,fixtureWorld,shape,simulate} from './verification-fixture.mjs';
import {v} from '../public/physics/math.js';
import {coursePublicationTests,stationPublicationTests} from './course-publication.mjs';
import {resourceTests} from './verifier-resources.mjs';

assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/,'These record-creating checks must use the isolated emulator');
assert.equal(process.env.GOOGLE_CLOUD_PROJECT,'demo-kyoto-verification');
const db=new Firestore({projectId:process.env.GOOGLE_CLOUD_PROJECT}),namespace='test-'+randomUUID(),world=fixtureWorld(),servers=new Set(),gates=new Set();
let clock=1700000000000,stationWorld;
const service=overrides=>new VerificationService({db,namespace,catalog:[course],world:()=>world,now:()=>clock,sliceMs:10000,...overrides});
async function start(s=service()){
 const server=verificationHttp(s,{origins:['https://game.example']}),endpoint={server,service:s};servers.add(endpoint);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));endpoint.url=`http://127.0.0.1:${server.address().port}`;return endpoint;
}
async function stop(endpoint){await new Promise(resolve=>endpoint.server.close(resolve));endpoint.server.closeAllConnections();servers.delete(endpoint);}
async function request(endpoint,path,{player,method='GET',body,status=200,headers={}}={}){
 const response=await fetch(endpoint.url+path,{method,headers:{...(player?{Authorization:'Bearer '+player.token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 const result=await response.json().catch(()=>null);assert.ok((Array.isArray(status)?status:[status]).includes(response.status),`${method} ${path}: expected ${status}, received ${response.status}: ${JSON.stringify(result)}`);return result;
}
async function register(endpoint,name){
 const id=randomUUID(),player={id,token:id+'.'+randomBytes(32).toString('base64url'),name};
 assert.deepEqual(await request(endpoint,'/v1/identity',{player,method:'POST',body:{name}}),{id,name});return player;
}
const path=id=>'/v1/attempts/'+id;
async function submit(endpoint,player,h=header,runs=[],id=randomUUID()){
 await request(endpoint,path(id),{player,method:'POST',body:{header:h},status:201});
 for(let i=0;i<runs.length;i+=128)await request(endpoint,path(id)+'/inputs/'+i/128,{player,method:'PUT',body:{runs:runs.slice(i,i+128)}});
 await request(endpoint,path(id)+'/seal',{player,method:'POST',body:{}});return id;
}
async function finish(endpoint,player,id){
 for(let i=0;i<400;i++){
  const r=await fetch(endpoint.url+path(id)+'/advance',{method:'POST',headers:{Authorization:'Bearer '+player.token,'Content-Type':'application/json'},body:'{}'}),value=await r.json();
  assert.ok([200,202].includes(r.status),JSON.stringify(value));
  if(r.status===200){assert.equal(value.state,'verified',JSON.stringify(value));return value;}
  assert.ok(!value.result,'Pending work must never return a score');
 }
 assert.fail('Observation limit: job did not finish');
}
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=()=>{gates.delete(resolve);done();};gates.add(resolve);});return {promise,resolve};};
try{
 let endpoint=await start(service({batchLimit:2}));const alice=await register(endpoint,'Alice'),bob=await register(endpoint,'Bob');
 await request(endpoint,'/v1/identity',{player:alice,method:'POST',body:{name:'Alice'}});
 const imposter={token:alice.id+'.'+randomBytes(32).toString('base64url')};
 await request(endpoint,'/v1/identity',{player:imposter,method:'POST',body:{name:'Imposter'},status:401});
 await request(endpoint,'/v1/progress',{status:401});await request(endpoint,'/v1/progress',{player:imposter,status:401});
 await request(endpoint,'/v1/identity',{player:alice,method:'POST',body:{name:'A'.repeat(33)},status:400});
 await request(endpoint,'/health',{headers:{Origin:'https://foreign.example'},status:403});
 const cors=await fetch(endpoint.url+'/health',{headers:{Origin:'https://game.example'}});assert.equal(cors.headers.get('access-control-allow-origin'),'https://game.example');
 await request(endpoint,'/v1/courses?owner=other',{status:400});
 assert.equal((await request(endpoint,'/v1/courses')).courses.length,1);
 const runs=[{steps:241,x:.2,z:0,yaw:0,fast:false},{steps:519,x:0,z:1,yaw:-180,fast:true}],h={...header,walkSteps:760,chargeTime:4.3,releaseTime:5},id=randomUUID();
 for(const forbidden of ['score','success','launchPosition','checkpoint','continuation','poses','contacts'])await request(endpoint,path(id),{player:alice,method:'POST',body:{header:{...h,[forbidden]:1000000}},status:400});
 await request(endpoint,path(id),{player:alice,method:'POST',body:{header:{...h,revision:2}},status:400});
 await request(endpoint,path(id),{player:alice,method:'POST',body:{header:h},status:201});
 await request(endpoint,path(id),{player:alice,method:'POST',body:{header:h},status:201});
 await request(endpoint,path(id),{player:alice,method:'POST',body:{header:{...h,releaseTime:6}},status:409});
 await request(endpoint,path(id),{player:bob,status:404});
 await request(endpoint,path(id)+'/cancel',{player:bob,method:'POST',body:{},status:404});
 await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:{},status:409});
 await request(endpoint,path(id)+'/seal',{player:alice,method:'POST',body:{},status:409});
 await request(endpoint,path(id)+'/inputs/1',{player:alice,method:'PUT',body:{runs:[runs[0]]},status:409});
 await request(endpoint,path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs:[{...runs[0],position:{x:100,y:100,z:100}}]},status:400});
 await request(endpoint,path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs:[runs[0]]}});
  await request(endpoint,path(id)+'/inputs/1',{player:alice,method:'PUT',body:{runs:Array.from({length:129},()=>({...runs[0],steps:1}))},status:400});
  await request(endpoint,path(id)+'/inputs/1',{player:alice,method:'PUT',body:{runs:[{...runs[1],steps:600}]},status:400});
 await request(endpoint,path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs:[runs[0]]}});
 await request(endpoint,path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs:[{...runs[0],x:1}]},status:409});
 await request(endpoint,path(id)+'/inputs/1',{player:alice,method:'PUT',body:{runs:[runs[1]]}});
 await request(endpoint,path(id)+'/seal',{player:alice,method:'POST',body:{}});
 await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:{score:1},status:400});
 await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:'{',status:400});
 await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:' '.repeat(65537),status:413});
 await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:{},headers:{'Content-Type':'text/plain'},status:415});
 await request(endpoint,'/v1/replays/'+id,{status:404});
 const pending=await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:{},status:202});assert.equal(pending.state,'pending');assert.ok(!pending.result);
 const stored=(await endpoint.service.attempts.doc(id).get()).data();assert.ok(Buffer.isBuffer(stored.checkpoint));assert.ok(stored.walkingSteps>0&&stored.walkingSteps<760);
 await stop(endpoint);endpoint=await start(service({batchLimit:2}));
 const accepted=await finish(endpoint,alice,id),baseline=await simulate(world,course,h,runs,{attempt:id,subject:alice.id});
 assert.deepEqual(accepted.result,{...JSON.parse(JSON.stringify(baseline.result)),id:alice.id,playerName:'Alice',verified:true,local:false});
 assert.deepEqual(await finish(endpoint,alice,id),accepted,'Submission retry cannot accept a second score');
 const replay=await request(endpoint,'/v1/replays/'+id),replayRuns=[];
 for(let i=0;i<replay.inputChunks;i++)replayRuns.push(...(await request(endpoint,`/v1/replays/${id}/inputs/${i}`)).runs);
 assert.deepEqual(await simulate(world,course,replay.header,replayRuns,{attempt:id,subject:alice.id}),baseline);
 const rawPlayer=(await endpoint.service.players.doc(alice.id).get()).data();assert.equal(rawPlayer.credentialHash.length,64);assert.ok(!JSON.stringify(rawPlayer).includes(alice.token));
 console.log('PASS real HTTP + Firestore: authentication, strict controls, ordered immutable uploads, process restart, independent score and replay, idempotent retries, CORS and body limits');

 // A request owns a lease only. A cancellation or replacement owner fences it.
 for(const cancel of [true,false]){
  const reached=deferred(),resume=deferred(),slow=await start(service({world:async()=>{reached.resolve();await resume.promise;return world;}})),fast=await start();
  const raceId=await submit(fast,alice),running=fetch(slow.url+path(raceId)+'/advance',{method:'POST',headers:{Authorization:'Bearer '+alice.token,'Content-Type':'application/json'},body:'{}'});
  await reached.promise;
  assert.equal((await request(fast,path(raceId)+'/advance',{player:alice,method:'POST',body:{},status:202})).state,'verifying');
  if(cancel)await request(fast,path(raceId)+'/cancel',{player:alice,method:'POST',body:{}});
  else{clock+=31000;await finish(fast,alice,raceId);}
  resume.resolve();const response=await running;assert.equal(response.status,200);assert.equal((await response.json()).state,cancel?'cancelled':'verified');
  assert.equal((await request(fast,path(raceId),{player:alice})).state,cancel?'cancelled':'verified');
  if(cancel){await request(fast,'/v1/replays/'+raceId,{status:404});assert.equal((await request(fast,path(raceId)+'/advance',{player:alice,method:'POST',body:{}})).state,'cancelled');}
  await stop(slow);await stop(fast);
 }
 // Fail the publication transaction after actual computation; retry from the
 // last persisted checkpoint after lease expiry, never from client state.
 let transactions=0;const flakyDb={collection:(...args)=>db.collection(...args),runTransaction:async fn=>{if(++transactions===2)throw Object.assign(Error('injected storage outage'),{code:'TEST_UNAVAILABLE'});return db.runTransaction(fn);}};
 const flaky=await start(service({db:flakyDb})),retry=await submit(endpoint,alice);
 await request(flaky,path(retry)+'/advance',{player:alice,method:'POST',body:{},status:503});
 assert.equal((await request(endpoint,path(retry),{player:alice})).state,'verifying');clock+=31000;await finish(endpoint,alice,retry);await stop(flaky);
 console.log('PASS lease races: duplicate requests, recall during computation, expired process replacement, fenced late publication and retriable storage outage');

 const entered=deferred(),continueLoad=deferred(),disconnected=await start(service({world:async()=>{entered.resolve();await continueLoad.promise;return world;}})),disconnectId=await submit(endpoint,alice),abort=new AbortController();
 const lost=fetch(disconnected.url+path(disconnectId)+'/advance',{method:'POST',headers:{Authorization:'Bearer '+alice.token,'Content-Type':'application/json'},body:'{}',signal:abort.signal});
 await entered.promise;abort.abort();await assert.rejects(lost,{name:'AbortError'});continueLoad.resolve();
 for(let i=0;i<100;i++){
  const status=await request(endpoint,path(disconnectId),{player:alice});if(status.state==='pending')break;
  assert.equal(status.state,'verifying');assert.ok(i<99,'Disconnected request must save a pending checkpoint');await new Promise(resolve=>setTimeout(resolve,10));
 }
 await finish(endpoint,alice,disconnectId);await stop(disconnected);
 console.log('PASS disconnected HTTP verification resumes from its persisted checkpoint');

 const missing=await submit(endpoint,alice,h,runs);await endpoint.service.inputRef(missing,0).delete();
 assert.equal((await request(endpoint,path(missing)+'/advance',{player:alice,method:'POST',body:{}})).state,'failed');
 await request(endpoint,'/v1/replays/'+missing,{status:404});
 const fallWorld=new StaticWorld({layoutSha256:'fall',shapes:[shape('floor',v(0,-.1,0),v(1,.1,1))],escalators:[],fallLimitY:-10});
 try{
  const c={...course,id:'fall',layout:'fall'},fall=await start(service({catalog:[c],world:()=>fallWorld}));
  const id=await submit(fall,alice,{...header,courseId:'fall',layout:'fall',aim:{...header.aim,power:1,powerRange:'full'}});
  assert.equal((await request(fall,path(id)+'/advance',{player:alice,method:'POST',body:{}})).state,'forfeited');
  assert.deepEqual((await request(fall,'/v1/courses/fall/leaderboard')).entries,[]);await request(fall,'/v1/replays/'+id,{status:404});await stop(fall);
 }finally{fallWorld.free();}
 console.log('PASS incomplete evidence and real out-of-station forfeits never publish scores or replays');

 // Actual independently verified entries, including more than a page of tied
 // scores. Rank counts attempts ahead of the authenticated player's best.
 await stop(endpoint);endpoint=await start();
 const ties=[];for(let i=0;i<12;i++){
  const player=await register(endpoint,'Tie '+i),attempt=await submit(endpoint,player);await finish(endpoint,player,attempt);ties.push({player,attempt});
 }
 const finalPlayer=ties.at(-1).player;
 const all=(await endpoint.service.rankedQuery(verificationCourseKey(course)).get()).docs.map(d=>d.data());
 const board=await request(endpoint,'/v1/courses/test/leaderboard',{player:finalPlayer});assert.equal(board.entries.length,10);
 assert.deepEqual(board.entries.map(e=>e.attempt),all.slice(0,10).map(j=>j.id));assert.equal(board.personal.rank,all.findIndex(j=>j.owner===finalPlayer.id)+1);
 await request(endpoint,'/v1/identity',{player:finalPlayer,method:'POST',body:{name:'Renamed'}});
 assert.equal((await request(endpoint,'/v1/courses/test/leaderboard',{player:finalPlayer})).personal.name,'Renamed');
 const first=await submit(endpoint,bob),second=await submit(endpoint,bob);await finish(endpoint,bob,first);await finish(endpoint,bob,second);
 assert.equal((await request(endpoint,'/v1/progress',{player:bob})).entries[0].completed,true);
  assert.equal((await request(endpoint,'/v1/progress',{player:bob})).entries[0].rank,(await request(endpoint,'/v1/courses/test/leaderboard',{player:bob})).personal.rank);
 await request(endpoint,path(first)+'/cancel',{player:bob,method:'POST',body:{}});await request(endpoint,'/v1/replays/'+first,{status:404});
 assert.equal((await request(endpoint,'/v1/courses/test/leaderboard',{player:bob})).personal.attempt,second);
 await request(endpoint,path(second)+'/cancel',{player:bob,method:'POST',body:{}});await request(endpoint,path(second)+'/cancel',{player:bob,method:'POST',body:{}});
 assert.equal((await request(endpoint,'/v1/courses/test/leaderboard',{player:bob})).personal,null);
 assert.equal((await request(endpoint,'/v1/progress',{player:bob})).entries[0].completed,false);
 const revised=await start(service({catalog:[{...course,revision:2}]}));
 assert.deepEqual((await request(revised,'/v1/courses/test/leaderboard')).entries,[]);assert.deepEqual((await request(revised,'/v1/progress',{player:alice})).entries,[]);
 await request(revised,path(id),{player:alice,status:[404,409]});await request(revised,'/v1/replays/'+id,{status:[404,409]});await stop(revised);
 console.log('PASS durable authoritative standings: tied ordering, top ten, personal rank, names, completion, late recall retraction and current-course isolation');

 await coursePublicationTests({start,stop,service,request,register,submit,finish,world,deferred,advanceClock:()=>{clock+=31000;}});
 await resourceTests(db,world);

 // A terminating instance stops at a simulation boundary and stores a private
 // continuation before closing the HTTP connection. The next process resumes.
 const drainGate=deferred(),drainEntered=deferred(),draining=await start(service({world:async()=>{drainEntered.resolve();await drainGate.promise;return world;}}));
 const drainId=await submit(draining,alice,h,runs),drainReply=request(draining,path(drainId)+'/advance',{player:alice,method:'POST',body:{},status:202});
 await drainEntered.promise;const drained=draining.server.drain();drainGate.resolve();
 const drainState=await drainReply;await drained;servers.delete(draining);
 assert.equal(drainState.state,'pending');assert.ok(!drainState.result);assert.ok((await draining.service.attempts.doc(drainId).get()).data().checkpoint.length>0);
 const successor=await start();await finish(successor,alice,drainId);await stop(successor);
 console.log('PASS graceful HTTP drain checkpoints in-flight controls and a replacement verifier resumes to a real result');

 if(process.argv.includes('--station')){
  const began=performance.now();stationWorld=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
  const catalog=JSON.parse(await readFile('web/starter-challenges.json')).map(c=>({...c,physics:BROWSER_PHYSICS}));assert.equal(catalog.length,30);
  let station=await start(service({catalog,world:()=>stationWorld,batchLimit:3}));const receipts=[];
  for(const c of catalog){
   // Tiny batches deliberately amplify restart requests. Advance the admission
   // clock between courses; simulation/replay time remains the recorded input.
   clock+=60000;
   const a=c.hint,h={format:INPUT_FORMAT,courseId:c.id,revision:c.revision,layout:c.layout,physics:c.physics,scoring:c.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:((a.yaw+180)%360+360)%360-180,pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange}};
   const id=await submit(station,alice,h),initial=await request(station,path(id)+'/advance',{player:alice,method:'POST',body:{},status:202});assert.ok(initial.shotSteps>0);
   const checkpoint=(await station.service.attempts.doc(id).get()).data().checkpoint;assert.ok(checkpoint?.length>0);
   await stop(station);station=await start(service({catalog,world:()=>stationWorld,batchLimit:3}));
   const accepted=await finish(station,alice,id),result=accepted.result;assert.ok(result.success,c.name);assert.equal(result.waypointHits.length,c.waypoints.length);
   const seed=await request(station,'/v1/replays/'+id),baseline=await simulate(stationWorld,c,seed.header,[],{attempt:id,subject:alice.id});
   assert.deepEqual(result,{...JSON.parse(JSON.stringify(baseline.result)),id:alice.id,playerName:'Alice',verified:true,local:false});
   const sha256=createHash('sha256').update(JSON.stringify(baseline)).digest('hex');receipts.push({id:c.id,score:result.score,duration:result.duration,checkpointBytes:checkpoint.length,sha256});
   console.log('PASS HTTP/Firestore restart, complete independent score and public replay: '+c.name);
  }
  await stationPublicationTests({endpoint:station,request,player:alice,world:stationWorld,catalog});
  await writeFile('.local/verification/service-proof.json',JSON.stringify({physics:BROWSER_PHYSICS,layout:stationWorld.layoutSha256,elapsedMs:performance.now()-began,receipts},null,2)+'\n');await stop(station);
 }
}finally{
 for(const release of gates)release();
 for(const endpoint of servers)await stop(endpoint);
 await db.recursiveDelete(db.collection('games').doc(namespace));await db.terminate();world.free();stationWorld?.free();
}
