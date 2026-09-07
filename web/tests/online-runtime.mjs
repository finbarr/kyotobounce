import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import WebSocket from 'ws';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN;
if(!origin?.startsWith('https://'))throw new Error('Set KYOTO_TEST_ORIGIN to the deployed HTTPS origin');
const out='artifacts/online/verification';await mkdir(out,{recursive:true});
const endpoint=origin.replace(/^https/,'wss'),a=new Client(endpoint),b=new Client(endpoint),checks=[];
try{
 const health=await fetch(origin+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).scope,'online');
 assert.equal((await fetch(origin+'/api/debug/sessions')).status,404);
 assert.equal((await fetch(origin+'/server.ts')).status,404);
 const rejected=await new Promise(resolve=>{const s=new WebSocket(endpoint,{origin:'https://example.com'});s.on('unexpected-response',(_,r)=>{resolve(r.statusCode);s.terminate();});s.on('error',()=>{});s.on('open',()=>{resolve(101);s.close();});});
 assert.equal(rejected,401);checks.push('HTTPS health, private diagnostics and origin rejection');
 await Promise.all([a.join(),b.join()]);a.send('name',{name:'Kyoto Launch Check'});
 const course=a.messages.find(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');
 assert.equal(course.scoring,'accuracy-v3');
 await a.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 await b.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const bInitial=structuredClone(b.state.ball);
 const shot=await a.throw(365,{yaw:90,pitch:15},60000);
 assert.ok(shot.result.score>0&&shot.result.saved);
 assert.equal(shot.state.diagnostics.sleeping,true);
 assert.deepEqual(shot.state.velocity,{x:0,y:0,z:0});assert.deepEqual(shot.state.spin,{x:0,y:0,z:0});
 assert.equal(b.state.phase,'Aim');assert.deepEqual(b.state.ball,bInitial);
 const board=(await b.request('leaderboard',{challengeId:course.id,revision:course.revision},'leaderboard')).entries;
 assert.ok(board.some(e=>e.attempt===shot.result.attempt));
 const replay=(await b.request('replay',{attempt:shot.result.attempt},'replay')).replay;
 assert.equal(replay.score,shot.result.score);assert.ok(replay.poses.length>1000);
 checks.push('Native Linux throw finishes at rest, isolated players, shared leaderboard and full replay');
 const start=await a.place(course.start.center,course.start.radius,'start');
 const goal=await a.place(course.goal.center,course.goal.radius,'goal');
 const saved=await a.request('save-challenge',{name:'Opening Night',start,goal},'saved-challenge');
 await delay(150);assert.ok(b.messages.filter(m=>m.type==='catalog').at(-1).challenges.some(c=>c.id===saved.challenge.id));
 await b.request('select-challenge',{challengeId:saved.challenge.id,revision:saved.challenge.revision},'selected');
 checks.push('Creator places both circles, names a level, and another player can select it');
 const spoof=a.next(m=>m.type==='error');a.send('release',{score:999999});assert.match((await spoof).message,/intent only/);
 const record={status:'pass',origin,checks,attempt:shot.result.attempt,score:shot.result.score,duration:shot.result.duration,rest:shot.state.diagnostics.sleeping,replayPoses:replay.poses.length,challenge:course,createdChallenge:saved.challenge};
 await writeFile(`${out}/runtime.json`,JSON.stringify(record,null,2));
 // Credentials are local-only and excluded by the release allowlist.
 await writeFile(`${out}/reconnect-private.json`,JSON.stringify({token:a.token,guest:a.guestId,attempt:shot.result.attempt,challenge:course,createdChallenge:saved.challenge}),{mode:0o600});
 console.log(JSON.stringify(record,null,2));
}catch(error){await writeFile(`${out}/runtime-failure.json`,JSON.stringify({error:String(error),checks,state:a.state},null,2));throw error;}
finally{a.close();b.close();}
