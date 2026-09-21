import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Use an isolated local service');
const client=new Client(origin.replace(/^http/,'ws'));
try{
 await client.join();const c=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-tutorial');
 assert.equal(client.messages.findLast(m=>m.type==='session').challenge.id,c.id,'New players enter Level 0 automatically');
 await client.request('name',{name:'Tutorial test'},'named');
 const {result,state}=await client.throw(c.hint.holdMs,c.hint,90000);
 assert.equal(result.success,true);assert.equal(result.saved,true);assert.ok(result.score>0);assert.equal(result.waypointHits.length,1);
 assert.equal(state.diagnostics.sleeping,true,'The tutorial still waits for full physical rest');
 const replay=(await client.request('replay',{attempt:result.attempt},'replay')).replay;
 assert.deepEqual(scoreAttempt(replay),result.breakdown);assert.equal(replay.challenge.id,c.id);
 const board=await client.request('leaderboard',{challengeId:c.id,revision:c.revision},'leaderboard');
 assert.equal(board.personal.attempt,result.attempt);assert.equal(board.personal.name,'Tutorial test');assert.ok(board.personal.rank>=1);
 const progress=await client.request('course-progress',{},'course-progress');assert.equal(progress.entries.find(p=>p.challengeId===c.id).completed,true);
 const first=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.order===0);
 await client.request('select-challenge',{challengeId:first.id,revision:first.revision},'selected');await delay(100);
 assert.equal(client.state.challenge.id,first.id);
 console.log(`PASS Level 0 entry, waypoint clear, ${result.score} authoritative points, saved replay/rank, completion and Level 1`);
}finally{client.close();}
