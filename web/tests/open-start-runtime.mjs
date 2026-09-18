import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const client=new Client(origin.replace(/^http/,'ws'));
try{
 await client.join();
 const course=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.order===0);
 await client.request('select-challenge',{challengeId:course.id},'selected');
 await delay(180);
 const feet=()=>client.state.players.find(p=>p.id===client.id).feet;
 for(let i=0;i<22;i++){client.input({yaw:90,z:-1,fast:true});await delay(80);}
 client.input({yaw:90});await delay(180);
 const launchFeet={...feet()},distance=Math.hypot(launchFeet.x-course.start.center.x,launchFeet.z-course.start.center.z);
 assert.ok(distance>course.start.radius+4,`Walk freely outside the pad: ${distance} m`);
 assert.equal(client.messages.findLast(m=>m.type==='session').challenge.id,course.id);
 const {result}=await client.throw(course.hint.holdMs,course.hint,60000);
 assert.ok(result.saved&&result.score>0,'A throw outside the start pad remains ranked');
 assert.equal(result.challenge.id,course.id);
 const replay=(await client.request('replay',{attempt:result.attempt},'replay')).replay;
 assert.ok(Math.hypot(replay.thrower.feet.x-launchFeet.x,replay.thrower.feet.z-launchFeet.z)<.08,'Replay uses the actual remote launch spot');
 assert.deepEqual(scoreAttempt(replay),result.breakdown,'Scoring stays authoritative from an off-pad launch');
 const board=await client.request('leaderboard',{challengeId:course.id,revision:course.revision},'leaderboard');
 assert.ok(board.entries.some(entry=>entry.attempt===result.attempt),'The selected level receives the score');
 await client.request('recall',{},'recalled');await delay(180);
 assert.ok(Math.hypot(feet().x-launchFeet.x,feet().z-launchFeet.z)<.08,'Retry stays at the chosen launch spot');
 client.send('home');await delay(250);
 assert.ok(Math.hypot(feet().x-course.start.center.x,feet().z-course.start.center.z)<.08,'Start returns to the checkered pad');
 console.log(`PASS walked ${distance.toFixed(2)} m outside start, ranked authoritative throw/replay, retry position and return to pad`);
}finally{client.close();}
