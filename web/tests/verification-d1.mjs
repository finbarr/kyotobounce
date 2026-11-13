import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {d1Harness} from './d1-harness.mjs';
import {course,header,fixtureWorld,simulate} from './verification-fixture.mjs';
import {D1VerificationService} from '../online/d1-service.mjs';
import {credential} from '../online/protocol.mjs';
import {THROW_MODEL} from '../public/throw-power.js';
import {D1Storage} from '../online/d1-storage.mjs';
import {verificationCourseKey} from '../verification-checkpoint.mjs';

const h=await d1Harness(),world=fixtureWorld(),path=id=>'/v1/attempts/'+id;
async function request(url,{player,method='GET',body,status=200,headers={}}={}){
 const r=await h.fetch(url,{method,headers:{...(player?{Authorization:'Bearer '+player.token}:{}),'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 const value=await r.json();assert([status].flat().includes(r.status),`${method} ${url}: ${r.status} ${JSON.stringify(value)}`);return value;
}
async function register(name){const id=randomUUID(),player={id,token:id+'.'+randomBytes(32).toString('base64url'),name};assert.deepEqual(await request('/v1/identity',{player,method:'POST',body:{name}}),{id,name});return player;}
async function submit(player,inputs=header,runs=[],id=randomUUID()){
 await request(path(id),{player,method:'POST',body:{header:inputs},status:201});
 for(let i=0;i<runs.length;i+=128)await request(path(id)+'/inputs/'+i/128,{player,method:'PUT',body:{runs:runs.slice(i,i+128)}});
 await request(path(id)+'/seal',{player,method:'POST',body:{}});return id;
}
async function finish(player,id,state='verified'){
 for(let i=0;i<500;i++){const value=await request(path(id)+'/advance',{player,method:'POST',body:{},status:[200,202]});if(!['pending','verifying'].includes(value.state)){assert.equal(value.state,state,JSON.stringify(value));return value;}assert.equal(value.result,undefined);}
 assert.fail('Observation limit; no fabricated completion');
}
try{
 const alice=await register('Alice'),bob=await register('Bob'),imposter={token:alice.id+'.'+randomBytes(32).toString('base64url')};
 await request('/v1/identity',{player:imposter,method:'POST',body:{name:'Imposter'},status:401});await request('/v1/progress',{status:401});
 await request('/health',{headers:{Origin:'https://foreign.example'},status:403});assert.equal((await request('/v1/courses')).courses.length,1);
 const runs=[{steps:241,x:.2,z:0,yaw:0,fast:false},{steps:519,x:0,z:1,yaw:-180,fast:true}],inputs={...header,walkSteps:760,chargeTime:4.3,releaseTime:5},id=randomUUID();
 for(const key of ['score','checkpoint','launchPosition','poses','contacts'])await request(path(id),{player:alice,method:'POST',body:{header:{...inputs,[key]:1e9}},status:400});
 await request(path(id),{player:alice,method:'POST',body:{header:inputs},status:201});await request(path(id),{player:alice,method:'POST',body:{header:inputs},status:201});
 await request(path(id),{player:bob,status:404});await request(path(id)+'/seal',{player:alice,method:'POST',body:{},status:409});
 await request(path(id)+'/inputs/1',{player:alice,method:'PUT',body:{runs},status:409});
 await Promise.all(Array.from({length:4},()=>request(path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs:[runs[0]]}})));
 await request(path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs:[{...runs[0],x:1}]},status:409});
 await request(path(id)+'/inputs/1',{player:alice,method:'PUT',body:{runs:[runs[1]]}});await request(path(id)+'/seal',{player:alice,method:'POST',body:{}});
 await request(path(id)+'/advance',{player:alice,method:'POST',body:{score:99},status:400});await request(path(id)+'/advance',{player:alice,method:'POST',body:' '.repeat(65537),status:413});
 const pending=await request(path(id)+'/advance',{player:alice,method:'POST',body:{},status:202});assert(pending.walkingSteps<=720);assert(!pending.result);
 const saved=await h.db.prepare('SELECT checkpoint FROM verifier_attempts WHERE id=?').bind(id).first();assert(saved.checkpoint.length||saved.checkpoint.byteLength);
 await h.restart({});const accepted=await finish(alice,id),baseline=await simulate(world,course,inputs,runs,{attempt:id,subject:alice.id});
 assert.deepEqual(accepted.result,{...JSON.parse(JSON.stringify(baseline.result)),id:alice.id,playerName:'Alice',verified:true,local:false});assert.deepEqual(await finish(alice,id),accepted);
 const replay=await request('/v1/replays/'+id);assert.deepEqual(replay.header,inputs);assert.deepEqual((await request('/v1/replays/'+id+'/inputs/0')).runs,[runs[0]]);
 assert.equal((await request('/v1/courses/test/leaderboard',{player:alice})).personal.rank,1);
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM verifier_inputs WHERE attempt=?').bind(id).first()).n,2);
 console.log('PASS real Workers + D1: legal inputs, concurrent immutable uploads, restart checkpoint, exact independent score, public replay and ranks');

 const other=await submit(alice,inputs,runs);await finish(alice,other);
 await request(path(id)+'/cancel',{player:alice,method:'POST',body:{}});assert.equal((await request('/v1/courses/test/leaderboard',{player:alice})).personal.attempt,other);
 await request(path(other)+'/cancel',{player:alice,method:'POST',body:{}});assert.equal((await request('/v1/courses/test/leaderboard',{player:alice})).personal,null);
 assert.equal((await request('/v1/progress',{player:alice})).entries[0].completed,false);await request('/v1/replays/'+id,{status:404});
 const tied=[];for(let i=0;i<12;i++){const attempt=await submit(bob);await finish(bob,attempt);tied.push(attempt);}
 const board=await request('/v1/courses/test/leaderboard',{player:bob});assert.equal(board.entries.length,10);assert.deepEqual(board.entries.map(e=>e.attempt),tied.sort().slice(0,10));
 await request('/v1/identity',{player:bob,method:'POST',body:{name:'Renamed'}});assert.equal((await request('/v1/courses/test/leaderboard',{player:bob})).personal.name,'Renamed');
 console.log('PASS authoritative rankings: tied order, best-attempt replacement, completion independence, renamed players and recall retraction');

 const base=await simulate(world,course,header,[]),hit=base.result.waypointHits[0],candidate={id:randomUUID(),revision:1,name:'A verified bank',layout:course.layout,physics:course.physics,scoring:course.scoring,throwModel:THROW_MODEL,start:course.start,goal:null,waypoints:[{id:'bank',center:hit.point,normal:hit.normal,surface:hit.surface,radius:.1}]};
 const proof=c=>({...header,courseId:c.id,revision:c.revision});
 async function publish(c,player=alice){const id=randomUUID();await request('/v1/publications/'+id,{player,method:'POST',body:{course:c,baseRevision:c.revision-1,header:proof(c)},status:201});await request(path(id)+'/seal',{player,method:'POST',body:{}});return id;}
 const publication=await publish(candidate);assert(!(await request('/v1/courses')).courses.some(c=>c.id===candidate.id));await request('/v1/replays/'+publication,{status:404});
 await h.restart({});const published=await finish(alice,publication,'published');assert.equal(published.course.id,candidate.id);await request(path(publication)+'/cancel',{player:alice,method:'POST',body:{},status:409});
 const play=await submit(bob,proof(candidate));await finish(bob,play);assert.equal((await request('/v1/courses/'+candidate.id+'/leaderboard')).entries[0].attempt,play);
 const revision={...candidate,revision:2,name:'Revised'},winner=await publish(revision),loser=await publish({...revision,name:'Losing revision'});
 await request('/v1/publications/'+randomUUID(),{player:bob,method:'POST',body:{course:revision,baseRevision:1,header:proof(revision)},status:403});
 await finish(alice,winner,'published');await request(path(loser)+'/advance',{player:alice,method:'POST',body:{},status:409});
 assert.equal((await request('/v1/courses/'+candidate.id+'/leaderboard')).challenge.revision,2);await request('/v1/replays/'+play,{status:[404,409]});
 // A losing publication may describe the same geometry as the winning revision.
 // Retiring that job must not erase progress earned on the current course.
 // Exercise it before another publication's admission can clean up the loser.
 assert(await h.db.prepare('SELECT id FROM verifier_attempts WHERE id=?').bind(loser).first());
 await new D1Storage(h.db).transaction(async tx=>tx.write('UPDATE verifier_meta SET cleanup_cursor=? WHERE id=1',loser));
 const ownPlay=await submit(alice,proof(revision));await finish(alice,ownPlay);
 assert(await h.db.prepare('SELECT id FROM verifier_attempts WHERE id=?').bind(loser).first());
 await new D1Storage(h.db).transaction(async tx=>tx.write('UPDATE verifier_meta SET cleanup_cursor=? WHERE id=1',loser.slice(0,-1)));
 await new D1VerificationService({db:h.db,catalog:[course],world:()=>world,now:()=>h.config.now}).cleanup();
 assert.equal(await h.db.prepare('SELECT id FROM verifier_attempts WHERE id=?').bind(loser).first(),null,'The regression must actually retire the losing publication');
 assert((await request('/v1/progress',{player:alice})).entries.some(p=>p.challengeId===candidate.id&&p.completed),'Retiring a losing publication must retain current accepted progress');

 const miss={...candidate,id:randomUUID(),waypoints:[{...candidate.waypoints[0],center:{x:20,y:1,z:-2.9}}]};await finish(alice,await publish(miss),'failed');
 assert(!(await request('/v1/courses')).courses.some(c=>c.id===miss.id));
 console.log('PASS course publication: verified solution, private drafts, ownership, restart, revision promotion, retirement and missed-target rejection');

 // Schema/query pagination only: private test seeds contain no accepted scores.
 // Actual score admission is exercised above through independent simulation.
 const seeded=Array.from({length:101},()=>({...published.course,id:randomUUID()}));
 for(let at=0;at<seeded.length;at+=20)await new D1Storage(h.db).transaction(async tx=>{
  for(const c of seeded.slice(at,at+20)){
   tx.write('INSERT INTO verifier_courses (id,owner,revision,published,layout,physics,data) VALUES (?,?,1,1,?,?,?)',c.id,alice.id,c.layout,c.physics,JSON.stringify({current:c}));
   tx.write('INSERT INTO verifier_progress (owner,courseKey,courseId,revision) VALUES (?,?,?,1)',alice.id,verificationCourseKey(c),c.id);
  }
 });
 const progress=[];let after;
 do{const page=await request('/v1/progress'+(after?'?after='+after:''),{player:alice});assert(page.entries.length<=100);progress.push(...page.entries);after=page.next;}while(after);
 for(const c of seeded)assert.deepEqual(progress.find(p=>p.challengeId===c.id),{challengeId:c.id,revision:1,completed:false,bestScore:0,rank:null});
 assert.equal(new Set(progress.map(p=>p.challengeId)).size,progress.length);assert.equal(progress.find(p=>p.challengeId===candidate.id).rank,(await request('/v1/courses/'+candidate.id+'/leaderboard',{player:alice})).personal.rank);
 console.log('PASS D1 progress: current scores survive losing-publication cleanup, bounded SQL queries and complete pagination');

 // Exercise competing instances against the actual D1 database. Only the
 // world-load boundary is gated; scoring and database operations remain real.
 const service=options=>new D1VerificationService({db:h.db,catalog:[course],world:()=>world,now:()=>h.config.now,...options});
 const fast=service(),player=await fast.authenticate(credential('Bearer '+alice.token));
 for(const cancel of [true,false]){
  const race=randomUUID();await fast.create(player,race,header);await fast.seal(alice.id,race);
  let entered,resume;const ready=new Promise(r=>entered=r),gate=new Promise(r=>resume=r),slow=service({world:async()=>{entered();await gate;return world;}});
  const running=slow.advance(alice.id,race);await ready;
  assert.equal((await fast.advance(alice.id,race)).state,'verifying');
  if(cancel)await fast.cancel(alice.id,race);else{h.config.now+=31000;let reply;do{reply=await fast.advance(alice.id,race);}while(reply.state==='pending');assert.equal(reply.state,'verified');}
  resume();assert.equal((await running).state,cancel?'cancelled':'verified');
 }
 console.log('PASS D1 lease races: duplicate advance, cancellation during compute, expired-lease takeover and fenced stale publication');

 const retry=randomUUID();await fast.create(player,retry,header);await fast.seal(alice.id,retry);
 const flaky=service(),transaction=flaky.storage.transaction.bind(flaky.storage);let calls=0;
 flaky.storage.transaction=fn=>++calls===2?Promise.reject(Error('Injected D1 storage outage')):transaction(fn);
 await assert.rejects(()=>flaky.advance(alice.id,retry),/storage outage/);assert.equal((await fast.status(alice.id,retry)).state,'verifying');
 h.config.now+=31000;let recovered;do{recovered=await fast.advance(alice.id,retry);}while(recovered.state==='pending');assert.equal(recovered.state,'verified');
 const beforeRevision=(await h.db.prepare('SELECT revision FROM verifier_meta WHERE id=1').first()).revision,rollback=randomUUID();
 await assert.rejects(()=>new D1Storage(h.db).transaction(async tx=>{
  tx.write('INSERT INTO verifier_usage (id,data) VALUES (?,?)',rollback,'{}');
  tx.write('INSERT INTO verifier_players (id,credentialHash,name,created) VALUES (?,?,NULL,?)',rollback,'hash',h.config.now);
 }));
 assert.equal(await h.db.prepare('SELECT id FROM verifier_usage WHERE id=?').bind(rollback).first(),null);assert.equal((await h.db.prepare('SELECT revision FROM verifier_meta WHERE id=1').first()).revision,beforeRevision);
 console.log('PASS D1 failure recovery: publication outage retains the lease/checkpoint; failed batches roll back all writes and revision');

 // Competing identities must atomically share the last storage allocation.
 const identities=(await h.db.prepare('SELECT COUNT(*) AS n FROM verifier_players').first()).n;
 await h.restart({limits:{identities:identities+1}});
 const contenders=Array.from({length:4},()=>{const id=randomUUID();return {token:id+'.'+randomBytes(32).toString('base64url')};});
 const registration=await Promise.all(contenders.map(player=>h.fetch('/v1/identity',{method:'POST',headers:{Authorization:'Bearer '+player.token,'Content-Type':'application/json'},body:JSON.stringify({name:'Last slot'})})));
 assert.equal(registration.filter(r=>r.status===200).length,1);assert(registration.filter(r=>r.status!==200).every(r=>r.status===503));for(const r of registration)await r.arrayBuffer();
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM verifier_players').first()).n,identities+1);
 h.config.now+=60000;await h.restart({limits:{computeMinute:1,playerComputeMinute:1}});
 const qa=await submit(alice),qb=await submit(alice),limited=await Promise.all([qa,qb].map(id=>h.fetch(path(id)+'/advance',{method:'POST',headers:{Authorization:'Bearer '+alice.token,'Content-Type':'application/json'},body:'{}'})));
 assert.equal(limited.filter(r=>r.status===429).length,1);assert.equal(limited.filter(r=>r.status===202).length,1);for(const r of limited)await r.arrayBuffer();
 const denied=(await h.db.prepare('SELECT data FROM verifier_attempts WHERE id IN (?,?)').bind(qa,qb).all()).results.map(r=>JSON.parse(r.data));assert(denied.some(j=>j.state==='pending'&&!j.checkpoint&&!j.lease));
 console.log('PASS D1 durable admission: concurrent last identity slot, per-player/global compute limit and pending work retained');

 await h.restart({limits:{cleanupChunks:1}});const cleanupService=service({limits:{cleanupChunks:1}}),expired=await submit(alice,inputs,runs);
 h.config.now+=8*86400000;let sawDeleting=false,removed=false;
 for(let i=0;i<100;i++){
  await cleanupService.cleanup();const row=await cleanupService.get(expired);
  if(row?.state==='deleting'){sawDeleting=true;await assert.rejects(()=>cleanupService.upload(alice.id,expired,2,[{steps:1,x:0,z:0,yaw:0,fast:false}]),e=>e.status===503);}
  if(!row){removed=true;break;}
 }
 assert(sawDeleting&&removed);const usage=JSON.parse((await h.db.prepare("SELECT data FROM verifier_usage WHERE id='global'").first()).data);
 assert.equal(usage.jobs,(await h.db.prepare('SELECT COUNT(*) AS n FROM verifier_attempts').first()).n);
 assert.equal(usage.inputBytes,(await h.db.prepare('SELECT COALESCE(SUM(bytes),0) AS n FROM verifier_inputs').first()).n);
 assert.equal((await cleanupService.status(alice.id,retry)).state,'verified','Accepted current scores never expire');
 console.log('PASS D1 cleanup: bounded chunk deletion, upload fencing, exact quota refunds and retained authoritative scores');
}finally{world.free();await h.close();}
