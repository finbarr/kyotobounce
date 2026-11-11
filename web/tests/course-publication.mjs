import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {course,header,simulate} from './verification-fixture.mjs';
import {THROW_MODEL} from '../public/throw-power.js';
import {Shot,launchInput,BROWSER_PHYSICS} from '../public/physics/shot.js';
import {Walker} from '../public/physics/walker.js';
import {v,add} from '../public/physics/math.js';
import {STEP} from '../public/physics/ball.js';
import {verificationCourseKey} from '../verification-checkpoint.mjs';

// Runs against the same real HTTP server and isolated Firestore emulator as
// online-service.mjs. No fake storage and no writes to deployed services.
export async function coursePublicationTests({start,stop,service,request,register,submit,finish,world,deferred,advanceClock}){
 let endpoint=await start(service({batchLimit:2}));
 const alice=await register(endpoint,'Course author'),bob=await register(endpoint,'Course player'),baseline=await simulate(world,course,header,[]),hit=baseline.result.waypointHits[0];
 const candidate={id:randomUUID(),revision:1,name:'A verified bank',layout:course.layout,physics:course.physics,scoring:course.scoring,throwModel:THROW_MODEL,start:course.start,goal:null,waypoints:[{id:'bank',center:hit.point,normal:hit.normal,surface:hit.surface,radius:.1}]};
 const proof=c=>({...header,courseId:c.id,revision:c.revision,walkSteps:400,releaseTime:4}),runs=[{steps:400,x:0,z:0,yaw:-180,fast:false}];
 const path=id=>'/v1/attempts/'+id,publish=(e,p,id,c,h=proof(c),base=c.revision-1,status=201)=>request(e,'/v1/publications/'+id,{player:p,method:'POST',body:{course:c,header:h,baseRevision:base},status});
 async function prepare(e,p,c,id=randomUUID(),h=proof(c)){
  await publish(e,p,id,c,h);if(h.walkSteps)await request(e,path(id)+'/inputs/0',{player:p,method:'PUT',body:{runs}});
  await request(e,path(id)+'/seal',{player:p,method:'POST',body:{}});return id;
 }
 async function complete(e,p,id,expected='published'){
  for(let i=0;i<500;i++){
   const response=await fetch(e.url+path(id)+'/advance',{method:'POST',headers:{Authorization:'Bearer '+p.token,'Content-Type':'application/json'},body:'{}'}),body=await response.json();
   assert.ok([200,202].includes(response.status),JSON.stringify(body));
   if(response.status===200){assert.equal(body.state,expected,JSON.stringify(body));return body;}
   assert.equal(body.course,undefined);assert.equal(body.result,undefined);
  }assert.fail('Publication observation limit reached');
 }
 const id=randomUUID();
 for(const extra of ['creator','score','solution','local','hint'])await publish(endpoint,alice,id,{...candidate,[extra]:'forged'},undefined,0,400);
 for(const patch of [{layout:'retired'},{physics:'native'},{revision:9},{name:'\u0000'},{start:{...candidate.start,center:{x:0,y:20,z:0}}},{start:{...candidate.start,normal:{x:0,y:-1,z:0}}},{waypoints:[{...candidate.waypoints[0],center:{x:0,y:1,z:20}}]},{goal:{...candidate.start,radius:100}},{waypoints:Array(33).fill(candidate.waypoints[0])}])await publish(endpoint,alice,id,{...candidate,...patch},undefined,0,400);
 await publish(endpoint,alice,id,candidate,{...proof(candidate),score:1e9},0,400);
 await publish(endpoint,alice,id,candidate);await publish(endpoint,alice,id,candidate);
 await publish(endpoint,alice,id,{...candidate,name:'Changed'},undefined,0,409);
 await publish(endpoint,bob,randomUUID(),candidate,undefined,0,403);
 assert.ok(!(await request(endpoint,'/v1/courses')).courses.some(c=>c.id===candidate.id),'Private draft leaked into public catalog');
 await request(endpoint,'/v1/courses/'+candidate.id+'/leaderboard',{status:404});
 await request(endpoint,'/v1/replays/'+id,{status:404});
 await request(endpoint,path(id)+'/inputs/0',{player:alice,method:'PUT',body:{runs}});await request(endpoint,path(id)+'/seal',{player:alice,method:'POST',body:{}});
 await request(endpoint,path(id)+'/advance',{player:alice,method:'POST',body:{},status:202});
 const saved=(await endpoint.service.attempts.doc(id).get()).data();assert.ok(saved.checkpoint?.length>0);assert.ok(saved.walkingSteps>0);
 await stop(endpoint);endpoint=await start(service({batchLimit:2}));
 const accepted=await complete(endpoint,alice,id);assert.equal(accepted.course.creator,alice.id);assert.equal(accepted.course.revision,1);
 assert.deepEqual(await complete(endpoint,alice,id),accepted);await publish(endpoint,alice,id,candidate);
 assert.ok((await request(endpoint,'/v1/courses')).courses.some(c=>c.id===candidate.id));
 assert.deepEqual((await request(endpoint,'/v1/courses/'+candidate.id+'/leaderboard')).entries,[],'Design proof must not become a ranked score');
 assert.deepEqual((await request(endpoint,'/v1/progress',{player:alice})).entries,[]);
 const seed=await request(endpoint,'/v1/replays/'+id),replayed=await simulate(world,accepted.course,seed.header,runs,{attempt:id,subject:alice.id});
 assert.deepEqual(seed.result,{...JSON.parse(JSON.stringify(replayed.result)),id:alice.id,playerName:alice.name,verified:true,local:false});
 await request(endpoint,path(id)+'/cancel',{player:alice,method:'POST',body:{},status:409});
 const retired=await start(service({catalog:[{...course,layout:'next-station'}]}));
 assert.ok(!(await request(retired,'/v1/courses')).courses.some(c=>c.id===candidate.id));
 await request(retired,'/v1/replays/'+id,{status:409});await request(retired,path(id),{player:alice,status:409});await stop(retired);
 const playId=await submit(endpoint,bob,proof(candidate),runs),played=await finish(endpoint,bob,playId);
 assert.ok(played.result.success);assert.equal((await request(endpoint,'/v1/courses/'+candidate.id+'/leaderboard')).entries[0].attempt,playId);
 assert.equal((await request(endpoint,'/v1/progress',{player:bob})).entries.find(p=>p.challengeId===candidate.id).completed,true);
 console.log('PASS course publication: strict geometry and controls, private drafts, creator ownership, persisted restart, exact solution replay and separately ranked play');

 const miss={...candidate,id:randomUUID(),waypoints:[{...candidate.waypoints[0],center:{x:20,y:1,z:-2.9}}]},missId=await prepare(endpoint,alice,miss);
 await complete(endpoint,alice,missId,'failed');await request(endpoint,'/v1/courses/'+miss.id+'/leaderboard',{status:404});
 const goal={...candidate,id:randomUUID(),goal:{center:{...baseline.result.breakdown.endPosition,y:0},normal:{x:0,y:1,z:0},radius:.5,surface:'floor'}},goalId=await prepare(endpoint,alice,goal);
 await complete(endpoint,alice,goalId);assert.equal((await request(endpoint,'/v1/replays/'+goalId)).result.reason,'Target reached');
 const missedGoal={...goal,id:randomUUID(),goal:{...goal.goal,center:{x:30,y:0,z:0}}};await complete(endpoint,alice,await prepare(endpoint,alice,missedGoal),'failed');
 const recalled={...candidate,id:randomUUID()},recallId=await prepare(endpoint,alice,recalled);
 await request(endpoint,path(recallId)+'/cancel',{player:alice,method:'POST',body:{}});await complete(endpoint,alice,recallId,'cancelled');
 assert.ok(!(await request(endpoint,'/v1/courses')).courses.some(c=>c.id===recalled.id));

 // Keep revision one playable while competing revision-two candidates verify.
 const revision={...candidate,revision:2,name:'Revised bank'};
 await publish(endpoint,bob,randomUUID(),revision,undefined,1,403);
 await publish(endpoint,alice,randomUUID(),revision,undefined,0,400);
 const reached=deferred(),resume=deferred(),slow=await start(service({world:async()=>{reached.resolve();await resume.promise;return world;}}));
 const losing=await prepare(endpoint,alice,revision),winning=await prepare(endpoint,alice,{...revision,name:'Winning revision'});
 const stale=fetch(slow.url+path(losing)+'/advance',{method:'POST',headers:{Authorization:'Bearer '+alice.token,'Content-Type':'application/json'},body:'{}'});
 await reached.promise;assert.equal((await request(endpoint,'/v1/courses/'+candidate.id+'/leaderboard')).challenge.revision,1);
 await complete(endpoint,alice,winning);resume.resolve();assert.equal((await(await stale).json()).state,'failed');await stop(slow);
 assert.equal((await request(endpoint,'/v1/courses/'+candidate.id+'/leaderboard')).challenge.name,'Winning revision');
 assert.deepEqual((await request(endpoint,'/v1/courses/'+candidate.id+'/leaderboard')).entries,[]);
 assert.ok(!(await request(endpoint,'/v1/progress',{player:bob})).entries.some(p=>p.challengeId===candidate.id));
 await request(endpoint,'/v1/replays/'+playId,{status:[404,409]});await request(endpoint,path(playId),{player:bob,status:[404,409]});
 await publish(endpoint,alice,randomUUID(),revision,undefined,1,409);
 // A worker that crashes mid-publication leaves a lease, not a warm server.
 const takeoverCourse={...candidate,id:randomUUID()},takeover=await prepare(endpoint,alice,takeoverCourse);
 await endpoint.service.claim(alice.id,takeover);advanceClock();await stop(endpoint);endpoint=await start();await complete(endpoint,alice,takeover);
 console.log('PASS publication failure/recall exclusion, full-rest finish targets, creator-only revisions, atomic revision races and expired-process recovery');

 // Exercise bounded public pagination independently of expensive simulation.
 const temporary=[];for(let i=0;i<102;i++){const id=randomUUID(),c={...accepted.course,id},key=verificationCourseKey(c);temporary.push(id);await endpoint.service.courses.doc(id).set({owner:alice.id,revision:1,published:true,layout:course.layout,physics:course.physics,current:c});await endpoint.service.progressRef(alice.id,key).set({courseId:id,revision:1,courseKey:key,completed:true,best:null});}
 const first=await request(endpoint,'/v1/courses');assert.equal(first.courses.length,101);assert.ok(first.next);
 const second=await request(endpoint,'/v1/courses?after='+first.next);assert.equal(second.next,null);assert.ok(second.courses.length>0&&second.courses.length<100);
 assert.equal(new Set([...first.courses,...second.courses].map(c=>c.id)).size,first.courses.length+second.courses.length);
 await request(endpoint,'/v1/courses?after=bad',{status:400});
 const progress=await request(endpoint,'/v1/progress',{player:alice});assert.ok(progress.entries.length<=100);assert.ok(progress.next);
 const more=await request(endpoint,'/v1/progress?after='+encodeURIComponent(progress.next),{player:alice});assert.equal(more.next,null);assert.equal(new Set([...progress.entries,...more.entries].map(p=>p.challengeId)).size,102);
 await request(endpoint,'/v1/progress?after=%2F',{player:alice,status:400});
 await Promise.all(temporary.map(id=>endpoint.service.courses.doc(id).delete()));await stop(endpoint);
 console.log('PASS bounded course and personal-progress pagination without duplicates or private drafts');
}

export async function stationPublicationTests({endpoint,request,player,world,catalog}){
 for(const sourceId of ['atrium-welcome','atrium-clock-in','basement-upward-bound']){
  const source=catalog.find(c=>c.id===sourceId),walker=new Walker(world,add(source.start.center,v(0,.03,0)));
  const a=source.hint,aim={yaw:((a.yaw+180)%360+360)%360-180,pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange};
  for(let i=0;i<12;i++)walker.move({x:0,z:0},aim.yaw,false,STEP);
  const launch={...launchInput(walker.feet,aim),position:walker.release(aim.yaw,aim.pitch,0)};
  const shot=new Shot(world,{...source,goal:null,waypoints:[]},launch,{design:true,thrower:{feet:walker.feet,...aim}});
  while(!shot.done&&shot.steps<180*120){shot.step();if(shot.steps%180===0)shot.drain();}
  assert.ok(shot.done&&shot.ball.sleeping);const capture=shot.designer.finish(shot);assert.equal(capture.error,'');
  const course={id:randomUUID(),revision:1,name:'Published '+source.name,layout:world.layoutSha256,physics:BROWSER_PHYSICS,scoring:'waypoint-v4',throwModel:THROW_MODEL,start:capture.start,goal:capture.goal,waypoints:capture.waypoints};
  const id=randomUUID(),h={...header,courseId:course.id,layout:course.layout,aim};
  await request(endpoint,'/v1/publications/'+id,{player,method:'POST',body:{course,header:h,baseRevision:0},status:201});
  await request(endpoint,'/v1/attempts/'+id+'/seal',{player,method:'POST',body:{}});
  let complete=false;
  for(let i=0;i<400;i++){
   const response=await fetch(endpoint.url+'/v1/attempts/'+id+'/advance',{method:'POST',headers:{Authorization:'Bearer '+player.token,'Content-Type':'application/json'},body:'{}'}),reply=await response.json();
   assert.ok([200,202].includes(response.status),JSON.stringify(reply));if(response.status===200){assert.equal(reply.state,'published',JSON.stringify(reply));complete=true;break;}
  }
  assert.ok(complete,'Publication observation limit reached');const seed=await request(endpoint,'/v1/replays/'+id),replay=await simulate(world,seed.result.challenge,seed.header,[],{attempt:id,subject:player.id});
  assert.deepEqual(seed.result,{...JSON.parse(JSON.stringify(replay.result)),id:player.id,playerName:player.name,verified:true,local:false});
  assert.equal(seed.result.waypointHits.length,capture.waypoints.length);assert.equal(seed.result.destinationReached,!!capture.goal);
  console.log(`PASS real-station publication: ${source.name}, ${capture.waypoints.length} waypoints, full-rest goal ${!!capture.goal}, exact independent replay`);
 }
}
