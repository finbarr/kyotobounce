import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
import {PhysicsWorker} from '../worker.ts';
import {resolve} from 'node:path';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const client=new Client(origin.replace(/^http/,'ws'));
try{
 await client.join();
 const course=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-locker');
 await client.request('select-challenge',{challengeId:course.id},'selected');
 await client.request('design-start',{start:course.start},'design-ready');await delay(120);
 const {result}=await client.throw(course.hint.holdMs+5,course.hint);
 assert.equal(result.saved,false,'Design balls cannot post to a leaderboard');
 const d=result.design;assert.ok(d&&!d.error,d?.error);assert.ok(d.proof);assert.ok(d.goal);assert.ok(d.path.length>20&&d.path.length<=2001);
 assert.ok(d.waypoints.length>=2&&d.waypoints.some(w=>w.normal.y<.5),'Auto targets include real wall banks');
 assert.ok(d.waypoints.length<=8,'Dense contacts are reduced to a readable route');
 for(let i=0;i<d.waypoints.length;i++)for(let j=0;j<i;j++){
  const a=d.waypoints[i].center,b=d.waypoints[j].center;
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>=3-1e-5,'Targets stay spatially separated');
  assert.ok(d.waypointTimes[i]-d.waypointTimes[j]>=.45-1e-5,'Rapid bounces do not each create targets');
 }
 const draft={name:'Recorded wall-bank test',start:d.start,goal:d.goal,waypoints:d.waypoints,scoring:'waypoint-v3',designProof:d.proof};
 await assert.rejects(client.request('save-challenge',{...draft,designProof:'forged'},'saved-challenge'),/recorded route changed/);await delay(1100);
 await assert.rejects(client.request('save-challenge',{...draft,waypoints:d.waypoints.map((w,i)=>i? w:{...w,id:'edited-target'})},'saved-challenge'),/recorded route changed/);await delay(1100);
 const {challenge}=await client.request('save-challenge',draft,'saved-challenge');assert.ok(challenge.hint);assert.equal(challenge.hint.powerRange,'precision');
 await client.request('select-challenge',{challengeId:challenge.id},'selected');
 const played=await client.throw(challenge.hint.holdMs,challenge.hint);assert.ok(played.result.saved);assert.ok(played.result.breakdown.waypointCount>0);
 // WebSocket release timing varies under load. Re-run the captured authoritative
 // power directly through a separate worker to prove this exact route is possible.
 process.env.KYOTO_WORKER_LOG=resolve(`.local/designer-proof-${process.pid}.log`);
 const worker=new PhysicsWorker();let nativeState,nativeResult;
 worker.on('message',m=>{if(m.type==='state')nativeState=m;if(m.type==='result'||m.type==='notice')nativeResult=m;});
 const until=async(predicate,ms=45000)=>{const end=performance.now()+ms;while(!predicate()){if(performance.now()>end)throw Error('Native design proof timed out');await delay(10);}};
 try{
  await worker.start();await until(()=>worker.ready,65000);const id='designer-proof';worker.send({type:'join',id});await until(()=>nativeState?.players?.length);
  await worker.request({type:'select',id,challenge});await delay(150);worker.send({type:'input',id,x:0,z:0,fast:false,...challenge.hint});await delay(100);
  worker.send({type:'charge',id,request:'design-proof-shot',powerRange:challenge.hint.powerRange});await delay(100);worker.send({type:'release',id,power:challenge.hint.holdMs/2800});await until(()=>nativeResult);
  assert.equal(nativeResult.type,'result',nativeResult.message);assert.equal(nativeResult.waypointHits.length,challenge.waypoints.length);assert.equal(nativeResult.destinationReached,true);
 }finally{worker.stop();}
 // A fresh design route can be abandoned without producing a course or score.
 await client.request('design-start',{},'design-ready');client.send('charge',{challengeId:null,revision:null,layout:course.layout,physics:course.physics,powerRange:'precision'});await delay(150);client.send('cancel');await delay(150);
 await client.request('select-challenge',{challengeId:course.id},'selected');
 const cramped=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-corner-store');
 assert.ok(cramped,'Corner Store fixture exists');
 await client.request('design-start',{start:cramped.start},'design-ready');await delay(120);
 const {result:corner}=await client.throw(cramped.hint.holdMs+5,cramped.hint);
 assert.ok(corner.design&&!corner.design.error,corner.design?.error);assert.equal(corner.design.goal,null,'Cramped landing becomes a waypoint-only course');assert.ok(corner.design.waypoints.length>0);assert.match(corner.design.note,/cramped or uneven/);
 console.log(`PASS unranked native design ball, ${d.waypoints.length} validated targets including walls, saved solution, identical-shot all-target clear + destination, tampered proof rejection and cancellation`);
}finally{client.close();}
