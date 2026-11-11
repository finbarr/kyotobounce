import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setImmediate} from 'node:timers/promises';
import {ShotVerification,INPUT_FORMAT} from '../verification.mjs';
import {saveVerification,restoreVerification} from '../verification-checkpoint.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
const began=performance.now(),world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),buildMs=performance.now()-began;
const catalog=JSON.parse(await readFile('web/starter-challenges.json')).map(c=>({...c,physics:BROWSER_PHYSICS})),receipts=[];
const yaw=value=>((value+180)%360+360)%360-180;
try{
 assert.equal(catalog.length,30);
 for(const course of catalog){
  const a=course.hint,header={format:INPUT_FORMAT,courseId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,scoring:course.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:yaw(a.yaw),pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange}};let previous;
  for(let repeat=0;repeat<2;repeat++){
   let job=new ShotVerification(world,course,header,[]);const poses=[],contacts=[];let response,batches=0,computeMs=0,maxBatchMs=0;
   do{
    const start=performance.now();response=await job.advance();const elapsed=performance.now()-start;computeMs+=elapsed;maxBatchMs=Math.max(maxBatchMs,elapsed);
    if(response.recording){assert.ok(response.recording.poses.length<=181);poses.push(...response.recording.poses);contacts.push(...response.recording.contacts);}
    if(repeat&&response.status!=='verified')job=restoreVerification(world,course,saveVerification(job),[],{attempt:'verified',subject:'verified'});
    // An 8 ms work slice can end before 180 steps under load. Count actual
    // simulation steps, rather than treating every yielded slice as one second.
    assert.ok((job.shot?.steps||0)<180*180&&++batches<10000,'Observation limit, never a fabricated finish');await setImmediate();
   }while(response.status!=='verified');
   const result={...response.result,poses,contacts};assert.ok(result.success,course.id);assert.equal(result.waypointHits.length,course.waypoints.length);if(course.goal)assert.ok(result.destinationReached);
   assert.equal(Math.hypot(...Object.values(job.shot.ball.velocity)),0);assert.equal(Math.hypot(...Object.values(job.shot.ball.spin)),0);assert.equal(job.shot.ball.budgetExhaustions,0);
   const sha256=createHash('sha256').update(JSON.stringify(result)).digest('hex');if(previous)assert.equal(sha256,previous);previous=sha256;
   if(!repeat)receipts.push({id:course.id,score:result.score,waypoints:result.waypointHits.length,duration:result.duration,sha256,computeMs,maxBatchMs});
  }
  console.log('PASS verified controls, full clear and exact replay across checkpoint restarts: '+course.name);
 }
 await writeFile('.local/browser-physics/verification-proof.json',JSON.stringify({physics:BROWSER_PHYSICS,layout:world.layoutSha256,format:INPUT_FORMAT,buildMs,memory:process.memoryUsage(),receipts},null,2)+'\n');
}finally{world.free();}
