import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
import {PhysicsWorker} from '../worker.ts';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname),'Record-creating campaign checks require an isolated local service');
await Promise.all(['kyoto-konbinidirect','kyoto-garden','kyoto-skyway'].map(async id=>{
 const client=new Client(origin.replace(/^http/,'ws'));
 try{
  await client.join();const catalog=client.messages.findLast(m=>m.type==='catalog').challenges;
  const campaign=catalog.filter(c=>c.creator==='station').sort((a,b)=>a.order-b.order);
  assert.equal(campaign.length,30);assert.equal(campaign.at(-1).order,29);
  const c=campaign.find(c=>c.id===id);assert.ok(c);
  await client.request('select-challenge',{challengeId:c.id,revision:c.revision},'selected');
  const {holdMs,powerRange,yaw,pitch,top,kick}=c.hint;
  const shot=await client.throw(holdMs,{powerRange,yaw,pitch,top,kick},100000),r=shot.result;
  assert.ok(r.success&&r.saved&&Number.isSafeInteger(r.score)&&r.score>0,'The route banks an authoritative score');
  assert.ok(r.waypointHits.length>0);assert.equal(shot.state.diagnostics.sleeping,true);
  const replay=(await client.request('replay',{attempt:r.attempt},'replay')).replay;
  assert.equal(replay.score,r.score);assert.deepEqual(replay.challenge.campaign,c.campaign);
  assert.deepEqual(scoreAttempt(replay),r.breakdown);
  const next=campaign.find(stage=>stage.order===c.order+1);
  if(next){const selected=await client.request('select-challenge',{challengeId:next.id,revision:next.revision},'selected');assert.equal(selected.challenge.order,c.order+1);}
  console.log(`PASS ${c.name}: ${r.waypointHits.length}/${c.waypoints.length} waypoints, ${r.score.toLocaleString()} points, saved replay and progression`);
 }finally{client.close();}
}));

// The 270 m finale needs its authored 38 m/s launch exactly. Wall-clock WebSocket
// charge timing can miss that route by milliseconds under concurrent test load.
// Prove that fixed input through the trusted worker protocol; the shorter courses
// above cover the real client charge/release, scoring, persistence and replay path.
const finale=JSON.parse(await readFile('web/starter-challenges.json','utf8')).find(c=>c.id==='kyoto-crossstation');
process.env.KYOTO_WORKER_LOG=resolve(`.local/campaign-runtime-${process.pid}.log`);
const worker=new PhysicsWorker();let state,result;
worker.on('message',m=>{if(m.type==='state')state=m;if(m.type==='result'||m.type==='notice')result=m;});
const until=async(test,ms=65000)=>{const end=performance.now()+ms;while(!test()){if(performance.now()>end)throw Error('Native finale proof timed out');await delay(10);}};
try{
 await worker.start();await until(()=>worker.ready);
 const id='campaign-finale';worker.send({type:'join',id});await until(()=>state?.players?.length);
 await worker.request({type:'select',id,challenge:finale});await delay(150);
 worker.send({type:'input',id,x:0,z:0,fast:false,...finale.hint});await delay(100);
 worker.send({type:'charge',id,request:'finale-proof',powerRange:finale.hint.powerRange});await delay(100);
 worker.send({type:'release',id,power:finale.hint.holdMs/2800});await until(()=>result,100000);await until(()=>state.phase==='Result');
 assert.equal(result.type,'result',result.message);assert.equal(state.diagnostics.sleeping,true);
 assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);
 assert.equal(result.waypointHits.length,finale.waypoints.length);assert.equal(result.destinationReached,true);
 const score=scoreAttempt(result);
 assert.equal(score.comboMultiplier,2**score.waypointCount+.5*score.styleBanks);
 assert.equal(score.total,2*10000*score.comboMultiplier+score.movementPoints);
 assert.ok(Number.isSafeInteger(score.total));
 console.log(`PASS ${finale.name}: exact 38 m/s native launch, ${score.waypointCount} waypoints, destination, ${score.comboMultiplier}x combo, ${score.total.toLocaleString()} points at full rest`);
}finally{worker.stop();}
