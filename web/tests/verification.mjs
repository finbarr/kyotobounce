import assert from 'node:assert/strict';
import {ShotVerification,INPUT_FORMAT} from '../verification.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {VerifiedReplay} from '../public/physics/verified-replay.js';
import {v,identity} from '../public/physics/math.js';
const shape=(id,position,half)=>({kind:'box',id,position,half,rotation:identity(),material:'stone',mask:3});
const make=(shapes,fallLimitY=-10)=>new StaticWorld({layoutSha256:'test',shapes,escalators:[],fallLimitY});
const world=make([shape('floor',v(0,-.1,0),v(100,.1,100)),shape('wall',v(0,2,-3),v(100,2,.1))]);
const course={id:'test',revision:1,layout:'test',physics:BROWSER_PHYSICS,scoring:'waypoint-v4',start:{center:v(),normal:v(0,1,0),radius:.5,surface:'floor'},goal:null,waypoints:[{id:'bank',center:v(-.22,1,-2.9),normal:v(0,0,1),radius:1,surface:'wall'}]};
const header={format:INPUT_FORMAT,courseId:course.id,revision:1,layout:course.layout,physics:course.physics,scoring:course.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:-180,pitch:5,top:0,kick:0,power:.3,powerRange:'precision'}};
async function complete(job,max=30000){
 const poses=[],contacts=[];let reply,batches=0;
 do{reply=await job.advance();batches++;if(reply.recording){assert.ok(reply.recording.poses.length<=181);poses.push(...reply.recording.poses);contacts.push(...reply.recording.contacts);}assert.ok(batches<max,'Verification must remain resumable');}while(reply.status!=='verified'&&reply.status!=='cancelled');
 return {reply,poses,contacts,batches};
}
try{
 for(const key of ['score','success','waypointHits','poses','contacts','launchPosition','velocity','spin','start','challenge'])assert.throws(()=>new ShotVerification(world,course,{...header,[key]:123},[]),/unsupported fields/);
 for(const patch of [{format:'old'},{courseId:'other'},{revision:2},{layout:'other'},{physics:'native'},{scoring:'other'},{walkSteps:1.5},{walkSteps:-1},{releaseTime:Infinity},{releaseTime:NaN},{chargeTime:1}])assert.throws(()=>new ShotVerification(world,course,{...header,...patch},[]));
 for(const patch of [{yaw:180},{yaw:-181},{pitch:81},{top:201},{kick:-201},{power:1.01},{power:NaN},{powerRange:'boost'},{speed:1000}])assert.throws(()=>new ShotVerification(world,course,{...header,aim:{...header.aim,...patch}},[]));
 const result=await complete(new ShotVerification(world,course,header,[]));assert.ok(result.reply.result.score>0);assert.ok(Number.isSafeInteger(result.reply.result.score));assert.ok(result.batches>1);assert.ok(result.poses.length>1000);
 const again=await complete(new ShotVerification(world,course,header,[]));for(const key of ['poses','contacts'])assert.deepEqual(again[key],result[key]);assert.deepEqual(again.reply.result,result.reply.result,'Batching reproduces complete replay evidence exactly');
 const movingHeader={...header,walkSteps:1800,chargeTime:10,releaseTime:11};
 const run={steps:1800,x:0,z:1,yaw:-180,fast:true};
 const walking=new ShotVerification(world,course,movingHeader,[run]);await complete(walking);assert.ok(walking.walker.feet.z>-2.64&&walking.walker.feet.z<-2.62,'Walking stops at the real wall; no client launch position is accepted');
 for(const bad of [{...run,steps:1801},{...run,steps:0},{...run,x:2},{...run,z:Infinity},{...run,fast:1},{...run,yaw:180},{...run,position:v(0,0,-10)}]){
  const job=new ShotVerification(world,course,movingHeader,[bad]);await assert.rejects(job.advance());await assert.rejects(job.advance(),/already failed/);
 }
 await assert.rejects(complete(new ShotVerification(world,course,movingHeader,[])),/ended early/);
 await assert.rejects(complete(new ShotVerification(world,course,header,[{...run,steps:1}])),/run length/);
 const original=structuredClone(header),isolated=new ShotVerification(world,course,original,[]);original.aim.power=999;assert.deepEqual((await complete(isolated)).reply.result,result.reply.result,'Mutating submitted objects cannot change an active verification');
 let resolve;const delayed={async *[Symbol.asyncIterator](){yield await new Promise(done=>{resolve=done;});}};
 const cancelled=new ShotVerification(world,course,movingHeader,delayed),pending=cancelled.advance();await assert.rejects(cancelled.advance(),/already advancing/);cancelled.cancel();resolve(run);assert.deepEqual(await pending,{status:'cancelled'});
 const completed=new ShotVerification(world,course,header,[]);await complete(completed);completed.cancel();assert.deepEqual(await completed.advance(),{status:'cancelled'},'Cancelled work cannot publish a previously computed score');
}finally{world.free();}
const endless=make([shape('platform',v(0,9999.5,0),v(2,.5,2))],-1e9),high={...course,start:{...course.start,center:v(0,10000,0)}};
try{
 const job=new ShotVerification(endless,high,{...header,aim:{...header.aim,power:1,powerRange:'full'}},[]);let last;
 while(!job.shot||job.shot.ball.clock<240){last=await job.advance();assert.notEqual(last.status,'verified');assert.equal(last.result,undefined);assert.ok((last.recording?.poses.length||0)<=181);}
 assert.ok(Object.values(job.shot.ball.velocity).some(x=>x!==0));job.cancel();assert.deepEqual(await job.advance(),{status:'cancelled'});
}finally{endless.free();}
console.log('PASS independent verification: strict control-only schema, canonical course/version binding, legal walking blocked by geometry, exact bounded replay batches, forged-result rejection, cancellation and >240 s moving shot without a false result');
const originalFetch=globalThis.fetch;let timeout;
try{
 const calls=[];globalThis.fetch=async url=>{calls.push(url);return new Response(JSON.stringify(calls.length===1?{retryAfter:.01}:{sequence:0,runs:[]}),{status:calls.length===1?429:200});};
 const replay=new VerifiedReplay(null,{result:{attempt:'fixture'}},'https://scores.example','request',()=>{});
 assert.deepEqual(await replay.chunk(0),{sequence:0,runs:[]});assert.equal(calls.length,2);assert.equal(calls[0],calls[1]);
 globalThis.fetch=async()=>new Response(JSON.stringify({retryAfter:3600}),{status:503});
 const cancelled=new VerifiedReplay(null,{result:{attempt:'fixture'}},'https://scores.example','request',()=>{}),waiting=cancelled.chunk(0);
 await new Promise(resolve=>setImmediate(resolve));cancelled.cancel();
 await assert.rejects(Promise.race([waiting,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Replay cancellation timed out')),500);})]),/cancelled/);
}finally{clearTimeout(timeout);globalThis.fetch=originalFetch;}
console.log('PASS replay input retry: resumes the same chunk and cancellation interrupts a long server retry delay');
