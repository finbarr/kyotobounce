import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {VerificationService} from '../online/service.mjs';
import {verificationHttp} from '../online/http.mjs';
import {requestGate} from '../online/resource-policy.mjs';
import {course,header,simulate} from './verification-fixture.mjs';
import {THROW_MODEL} from '../public/throw-power.js';

export async function resourceTests(db,world){
 async function scenario(limits,run){
  const namespace='limits-'+randomUUID();let clock=Date.UTC(2026,10,11);
  const make=overrides=>new VerificationService({db,namespace,catalog:[course],world:()=>world,now:()=>clock,limits,...overrides}),s=make();
  const player=async()=>{const id=randomUUID();await s.identity({id,hash:'a'.repeat(64)},id);return {id,name:id};};
  try{await run({s,make,player,advance:ms=>{clock+=ms;}});}finally{await db.recursiveDelete(s.root);}
 }
 await scenario({identities:2,jobs:3,playerJobsDay:2},async({s,make,player})=>{
  const a=await player(),b=await player();await s.identity({id:a.id,hash:'a'.repeat(64)},'Renamed');
  await assert.rejects(player(),{status:503});
  const ids=Array.from({length:3},()=>randomUUID()),created=await Promise.allSettled(ids.map(id=>s.create(a,id,header)));
  assert.equal(created.filter(r=>r.status==='fulfilled').length,2);assert.equal(created.filter(r=>r.status==='rejected'&&r.reason.status===429).length,1);
  const existing=created.find(r=>r.status==='fulfilled').value.attempt;
  await make().create(b,randomUUID(),header);await assert.rejects(make().create(b,randomUUID(),header),{status:503});
  assert.equal((await make().create(a,existing,header)).attempt,existing);
  const counters=(await s.policy.usage.doc('global').get()).data();assert.equal(counters.jobs,3);assert.equal(counters.identities,2);
 });
 console.log('PASS durable resource admission: concurrent creation, per-player and global caps, restart and idempotent retries without double charging');

 const run={steps:1,x:0,z:0,yaw:0,fast:false},bytes=Buffer.byteLength(JSON.stringify([run]));
 await scenario({inputBytes:bytes*2,jobInputBytes:bytes*2,jobInputChunks:1,walkSteps:10},async({s,make,player})=>{
  const a=await player(),h={...header,walkSteps:3,releaseTime:1},ids=[randomUUID(),randomUUID()];
  await assert.rejects(s.create(a,randomUUID(),{...h,walkSteps:11}),{status:413});
  for(const id of ids)await s.create(a,id,h);
  await Promise.all(ids.map(id=>s.upload(a.id,id,0,[run])));await make().upload(a.id,ids[0],0,[run]);
  await assert.rejects(s.upload(a.id,ids[0],1,[run]),{status:413});
  const another=randomUUID();await s.create(a,another,h);await assert.rejects(s.upload(a.id,another,0,[run]),{status:503});
  assert.equal((await s.policy.usage.doc('global').get()).data().inputBytes,bytes*2);
  assert.equal((await s.attempts.doc(another).get()).data().inputChunks,0);
 });
 await scenario({playerComputeMinute:1,playerComputeDay:2},async({s,make,player,advance})=>{
  const a=await player(),id=randomUUID();await s.create(a,id,header);await s.seal(a.id,id);
  const first=await make({batchLimit:1}).advance(a.id,id);assert.equal(first.state,'pending');assert.equal(first.result,undefined);
  await assert.rejects(make().advance(a.id,id),{status:429});assert.equal((await s.status(a.id,id)).state,'pending');
  advance(60000);assert.equal((await make({batchLimit:1}).advance(a.id,id)).state,'pending');
  advance(60000);await assert.rejects(make().advance(a.id,id),{status:429});
  advance(86400000);assert.equal((await make({batchLimit:1}).advance(a.id,id)).state,'pending');
  assert.equal((await s.status(a.id,id)).result,undefined,'Exhausting a compute budget never finishes the ball or creates a score');
 });
 console.log('PASS upload and compute budgets: exact byte accounting, bounded chunks/routes, durable rate windows, daily retry and no quota-generated result');
 for(const kind of ['checkpointBytes','resultBytes'])await scenario({[kind]:1},async({s,make,player})=>{
  const a=await player(),id=randomUUID();await s.create(a,id,header);await s.seal(a.id,id);
  const result=await make({batchLimit:kind==='checkpointBytes'?1:10000}).advance(a.id,id);assert.equal(result.state,'failed');assert.equal(result.result,undefined);assert.match(result.message,/storage budget/);assert.deepEqual((await s.board(course.id,a.id)).entries,[]);
 });

 await scenario({idleMs:1000,discardMs:1000,cleanupChunks:2},async({s,make,player,advance})=>{
  const a=await player(),h={...header,walkSteps:5,releaseTime:1},abandoned=randomUUID(),accepted=randomUUID(),active=randomUUID();
  await s.create(a,abandoned,h);for(let i=0;i<5;i++)await s.upload(a.id,abandoned,i,[run]);
  await s.create(a,accepted,h);await s.upload(a.id,accepted,0,[{...run,steps:5}]);await s.seal(a.id,accepted);const result=await s.advance(a.id,accepted);assert.equal(result.state,'verified');
  await s.create(a,active,header);await s.seal(a.id,active);await s.claim(a.id,active);
  advance(2000);await s.cleanup();assert.equal((await s.attempts.doc(abandoned).collection('inputs').get()).size,3);
  await assert.rejects(s.upload(a.id,abandoned,5,[run]),{status:503});assert.equal((await s.status(a.id,active)).state,'verifying');
  await make().cleanup();assert.equal((await s.attempts.doc(abandoned).collection('inputs').get()).size,1);
  await Promise.all([make().cleanup(),make().cleanup()]);assert.equal((await s.attempts.doc(abandoned).collection('inputs').get()).size,0);assert.equal((await s.attempts.doc(abandoned).get()).exists,false);
  assert.deepEqual((await s.replay(accepted)).result,result.result);assert.equal((await s.board(course.id,a.id)).personal.attempt,accepted);
  const usage=(await s.policy.usage.doc('global').get()).data();assert.equal(usage.jobs,2);assert.equal(usage.inputBytes,Buffer.byteLength(JSON.stringify([{...run,steps:5}])));
  // A disconnected browser can retry the same saved controls after expiry.
  await s.create(a,abandoned,h);await s.upload(a.id,abandoned,0,[{...run,steps:5}]);await s.seal(a.id,abandoned);assert.equal((await s.advance(a.id,abandoned)).state,'verified');
  const seed=await simulate(world,course,header,[]),hit=seed.result.waypointHits[0],draft={id:randomUUID(),revision:1,name:'Unpublished',layout:course.layout,physics:course.physics,scoring:course.scoring,throwModel:THROW_MODEL,start:course.start,goal:null,waypoints:[{id:'bank',center:hit.point,normal:hit.normal,surface:hit.surface,radius:.1}]},publication=randomUUID();
  await s.publish(a,publication,draft,0,{...header,courseId:draft.id});advance(2000);
  for(let i=0;i<4;i++)await s.cleanup();assert.equal((await s.courses.doc(draft.id).get()).exists,false,'Orphan private course reservation is reclaimed');
  assert.deepEqual((await s.replay(accepted)).result,result.result);
  // Only an actual course retirement permits reclaiming accepted results.
  const retired=make({catalog:[{...course,revision:2}]});for(let i=0;i<15;i++)await retired.cleanup();
  assert.equal((await s.attempts.doc(accepted).get()).exists,false);assert.equal((await s.players.doc(a.id).collection('progress').get()).size,0);
 });
 console.log('PASS bounded cleanup: interrupted pages, lease protection, byte/count reclamation, resumable local proof, current-score retention and retired-course collection');

 await scenario({},async({s,make,player,advance})=>{
  const a=await player(),hit=(await simulate(world,course,header,[])).result.waypointHits[0],c={id:randomUUID(),revision:1,name:'Retirement',layout:course.layout,physics:course.physics,scoring:course.scoring,throwModel:THROW_MODEL,start:course.start,goal:null,waypoints:[{id:'bank',center:hit.point,normal:hit.normal,surface:hit.surface,radius:.1}]},h={...header,courseId:c.id},publication=randomUUID(),attempt=randomUUID();
  await s.publish(a,publication,c,0,h);await s.seal(a.id,publication);assert.equal((await s.advance(a.id,publication)).state,'published');
  await s.create(a,attempt,h);await s.seal(a.id,attempt);assert.equal((await s.advance(a.id,attempt)).state,'verified');
  advance(30*86400000);for(let i=0;i<5;i++)await s.cleanup();assert.equal((await s.courses.doc(c.id).get()).exists,true);assert.equal((await s.attempts.get()).size,2);
  const retired=make({catalog:[{...course,layout:'next-station'}]});for(let i=0;i<8;i++)await retired.cleanup();
  assert.equal((await s.courses.doc(c.id).get()).exists,false);assert.equal((await s.attempts.get()).size,0);assert.equal((await s.players.doc(a.id).collection('progress').get()).size,0);
  assert.equal((await s.policy.usage.doc('global').get()).data().jobs,0);
 });

 await scenario({idleMs:1000},async({s,make,player,advance})=>{
  const a=await player(),id=randomUUID();await s.create(a,id,header);await s.seal(a.id,id);
  let release,reached;const gate=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{reached=resolve;});
  const slow=make({world:async()=>{reached();await gate;return world;}}),running=slow.advance(a.id,id);await entered;
  try{advance(32000);await s.cleanup();assert.equal((await s.attempts.doc(id).get()).exists,false);await s.create(a,id,header);}finally{release();}
  const late=await running;assert.equal(late.state,'uploading');assert.equal((await s.status(a.id,id)).state,'uploading');assert.deepEqual((await s.board(course.id,a.id)).entries,[]);
 });
 let resume,entered;const held=new Promise(resolve=>{resume=resolve;}),ready=new Promise(resolve=>{entered=resolve;});
 const server=verificationHttp({layout:'fixture',catalog:new Map([['test',course]]),async listCourses(){entered();await held;return {courses:[]};}},{gate:requestGate({concurrency:1})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 try{
  const running=fetch(url+'/v1/courses');await ready;const busy=await fetch(url+'/health');assert.equal(busy.status,429);assert.equal(busy.headers.get('Retry-After'),'1');assert.equal((await busy.json()).retryAfter,1);
  resume();assert.equal((await running).status,200);assert.equal((await fetch(url+'/health')).status,200);
 }finally{resume();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 console.log('PASS published-course retirement, late-worker fencing after cleanup and bounded HTTP concurrency with explicit retry delay');
}
