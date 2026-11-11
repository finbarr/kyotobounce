import assert from 'node:assert/strict';
import {ShotVerification} from '../verification.mjs';
import {saveVerification,restoreVerification} from '../verification-checkpoint.mjs';
import {course,header,fixtureWorld,shape,simulate} from './verification-fixture.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {v} from '../public/physics/math.js';

const options={attempt:'checkpoint',subject:'walker'},world=fixtureWorld();
try{
 const runs=[{steps:241,x:.2,z:0,yaw:-0,fast:false},{steps:519,x:0,z:1,yaw:-180,fast:true}],h={...header,walkSteps:760,chargeTime:4.3,releaseTime:5};
 const baseline=await simulate(world,course,h,runs,options),poses=[],contacts=[];
 let cursor=0,job=new ShotVerification(world,course,h,{[Symbol.iterator](){return this;},next(){return cursor<runs.length?{value:runs[cursor++],done:false}:{done:true};}},options),reply,restores=0,walkRestores=0,flightRestores=0,maxBytes=0;
 do{
  reply=await job.advance(47);if(reply.recording){poses.push(...reply.recording.poses);contacts.push(...reply.recording.contacts);}
  if(reply.status!=='verified'){
   const saved=saveVerification(job);maxBytes=Math.max(maxBytes,saved.length);
   const copy=restoreVerification(world,course,saved,{[Symbol.iterator](){return this;},next(){return cursor<runs.length?{value:runs[cursor++],done:false}:{done:true};}},options);
   assert.deepEqual(copy.walker,job.walker);assert.equal(copy.remaining,job.remaining);assert.deepEqual(copy.run,job.run);
   if(job.shot){assert.deepEqual(copy.shot,job.shot);assert.ok(copy.shot.impactTimes instanceof Map);assert.ok(copy.shot.collected instanceof Set);flightRestores++;}else walkRestores++;
   job=copy;restores++;
  }
 }while(reply.status!=='verified');
 assert.deepEqual({result:reply.result,poses,contacts},baseline);assert.ok(walkRestores>2&&flightRestores>2);
 assert.throws(()=>saveVerification(job),/cannot be checkpointed/);
 const walking=new ShotVerification(world,course,h,runs,options);await walking.advance(1);const bytes=saveVerification(walking);
 for(const patch of [{attempt:'foreign'},{subject:'foreign'}])assert.throws(()=>restoreVerification(world,course,bytes,[],{...options,...patch}),/does not match/);
 assert.throws(()=>restoreVerification(world,{...course,revision:2},bytes,[],options),/does not match/);
 assert.throws(()=>restoreVerification(world,course,bytes.subarray(0,4),[],options));
 console.log(`PASS checkpoint restart: ${restores} independent reconstructions during walking and flight, exact poses/contacts/score, maximum ${maxBytes} bytes, wrong job/course and corruption rejected`);
}finally{world.free();}
const high={...course,start:{...course.start,center:v(0,10000,0)}},endless=new StaticWorld({layoutSha256:'test',shapes:[shape('platform',v(0,9999.5,0),v(2,.5,2))],escalators:[],fallLimitY:-1e9});
try{
 let job=new ShotVerification(endless,high,{...header,aim:{...header.aim,power:1,powerRange:'full'}},[],options),restores=0;
 while(!job.shot||job.shot.ball.clock<240){
  const reply=await job.advance();assert.notEqual(reply.status,'verified');assert.equal(reply.result,undefined);
  if(++restores%20===0)job=restoreVerification(endless,high,saveVerification(job),[],options);
 }
 assert.ok(Object.values(job.shot.ball.velocity).some(x=>x!==0));
 console.log('PASS checkpointed moving shot remains pending beyond 240 simulated seconds; no timer-generated score');
}finally{endless.free();}
