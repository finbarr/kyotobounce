import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const client=new Client(origin.replace(/^http/,'ws'));
try{
 await client.join();
 const course=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-corner-store');
 await assert.rejects(client.request('playback-rate',{attempt:'invalid',rate:3},'playback-rate'),/normal or 2x/);
 async function shot(fast=false,releaseEarly=false){
  await client.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
  client.input(course.hint);await delay(120);
  client.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,powerRange:'precision'});await delay(2900);
  const resultPromise=client.next(m=>m.type==='result'||m.type==='error'||m.type==='notice',20000);
  const flight=client.next(m=>m.type==='state'&&m.phase==='Flight');const began=performance.now();client.send('release');await flight;
  const setRate=async rate=>{const attempt=client.playback.shot.attempt;client.playback.setRate(rate,performance.now());await client.request('playback-rate',{attempt,rate},'playback-rate');};
  if(fast){await setRate(2);if(releaseEarly){await delay(800);await setRate(1);}}
  const result=await resultPromise,elapsed=(performance.now()-began)/1000;assert.equal(result.type,'result',result.message);
  assert.ok(result.saved&&result.score>0);assert.equal(client.state.diagnostics.sleeping,true);
  assert.equal(Math.hypot(...Object.values(client.state.velocity)),0);assert.equal(Math.hypot(...Object.values(client.state.spin)),0);
  const {replay}=await(await fetch(`${origin}/api/replay/${result.attempt}`)).json();assert.deepEqual(replay.scoreFrames.at(-1).score,result.breakdown);
  await delay(100);return {result,elapsed,replay};
 }
 const normal=await shot(),fast=await shot(true),released=await shot(true,true),again=await shot();
 for(const value of [fast,released,again]){
  assert.equal(value.result.score,normal.result.score);assert.equal(value.result.duration,normal.result.duration);
  assert.equal(value.result.breakdown.movementPoints,normal.result.breakdown.movementPoints);
  assert.deepEqual(value.replay.poses,normal.replay.poses,'Presentation rate does not alter native physics');
 }
 assert.ok(fast.elapsed<normal.elapsed*.65,`${fast.elapsed}s fast vs ${normal.elapsed}s normal`);
 assert.ok(fast.elapsed>normal.result.duration*.45,'Cannot fast-forward past uncomputed physical rest');
 assert.ok(released.elapsed>fast.elapsed+.5&&released.elapsed<normal.elapsed-.3,'Releasing restores normal pace');
 assert.ok(Math.abs(again.elapsed-normal.elapsed)<.6,'The next shot starts at normal speed');
 console.log(`PASS identical native trajectory, score, movement bonus and saved replay at both speeds; normal ${normal.elapsed.toFixed(2)}s, 2x ${fast.elapsed.toFixed(2)}s, released ${released.elapsed.toFixed(2)}s, next ${again.elapsed.toFixed(2)}s`);
}finally{client.close();}
