import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
const out=process.env.KYOTO_TEST_OUTPUT||'artifacts/phase3/combo-arcade/runtime.json';
const c=new Client(origin.replace(/^http/,'ws')),checks=[];
try{
 await c.join();c.send('name',{name:'Arcade QA'});const course=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');
 assert.equal(course.scoring,'combo-v4');assert.equal(course.allowedInputs.chargeSeconds,2.8);
 await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 for(const [name,holdMs,yaw]of [['perfect',260,90],['near',260,104],['tagged',373,90]]){
  c.messages.length=0;const shot=await c.throw(holdMs,{yaw,pitch:15,powerRange:'precision'},45000),r=shot.result;
  const live=c.messages.filter(m=>m.type==='state'&&m.liveScore).map(m=>m.liveScore);
  assert.ok(live.length>10);assert.ok(live.some(m=>m.potential>10000));assert.ok(live.some(m=>m.styleBanks>0));
  if(r.breakdown.outcome!==name)console.error(JSON.stringify({expected:name,actual:r.breakdown.outcome,holdMs,power:r.thrower.power,range:r.thrower.powerRange,velocity:r.velocity,final:shot.state.ball,breakdown:r.breakdown}));
  assert.equal(r.breakdown.outcome,name);assert.equal(shot.state.diagnostics.sleeping,true);assert.ok(Math.hypot(...Object.values(shot.state.velocity))<1e-5);assert.ok(Math.hypot(...Object.values(shot.state.spin))<1e-5);
  assert.equal(c.messages.some(m=>'scorePoses' in m),false,'Private positions must not be broadcast');
  const rotationFrames=c.messages.filter(m=>m.type==='state'&&m.rotationSamples?.length);
  assert.ok(rotationFrames.some(m=>m.rotationSamples.length>=5),'Render orientations must retain native subframes');
  assert.ok(rotationFrames.every(m=>m.rotationSamples.length<=90&&m.rotationSamples.every(s=>Object.keys(s).sort().join(',')==='q,t')),'Only bounded orientation samples are public');
  const replay=(await c.request('replay',{attempt:r.attempt},'replay')).replay;
  assert.ok(replay.scoreFrames.length>20);assert.deepEqual(replay.scoreFrames.at(-1).score,r.breakdown);assert.deepEqual(scoreAttempt(replay),r.breakdown);assert.equal(replay.score,r.score);
  assert.equal(replay.thrower.powerRange,'precision');assert.ok(Math.abs(Math.hypot(...Object.values(replay.velocity))-(.5+11.5*replay.thrower.power))<.00001,'The displayed linear speed is the actual native launch speed');
  assert.ok(Math.abs(live.at(-1).potential-r.breakdown.potential)<=1,'Live multiplier exactly agrees with final replay');
  if(name==='perfect'){assert.equal(r.breakdown.landingMultiplier,1);assert.ok(live.some(m=>m.goalVisited),'The goal must light before the result');assert.ok(r.score>17500);}
  if(name==='tagged'){assert.equal(r.breakdown.goalVisited,true);assert.ok(r.breakdown.landingMultiplier>=.25);}
  checks.push({name,score:r.score,breakdown:r.breakdown,liveFrames:live.length,poses:replay.poses.length,stopped:true});console.log(JSON.stringify({name,score:r.score,banks:r.breakdown.styleBanks,time:r.breakdown.timeMultiplier,landing:r.breakdown.landingMultiplier}));
  c.send('recall');await delay(150);
 }
 const bad=c.next(m=>m.type==='error');c.send('release',{score:999999999,power:1});assert.match((await bad).message,/intent only/);
 // Charging now takes 2.8 seconds, including authoritative remote avatar power.
 c.input();await delay(100);c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics});await delay(700);
 assert.ok(c.state.power>.18&&c.state.power<.31,'700 ms is about 25% power, not near full');c.send('cancel');await delay(120);
 await mkdir(out.slice(0,out.lastIndexOf('/')),{recursive:true});await writeFile(out,JSON.stringify({status:'pass',origin,checks,chargeSeconds:2.8},null,2)+'\n');
 console.log('PASS native live/final parity, goal tags before rest, partial scores, immutable replay, forged score rejection, slower charge');
}finally{c.close();}
