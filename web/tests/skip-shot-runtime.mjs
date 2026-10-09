import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local server');
const clients=[];
async function connect(token,sessionId){
 const c=new Client(origin.replace(/^http/,'ws'));clients.push(c);
 await c.join(token,sessionId);return c;
}
function rest(c,r){
 assert.equal(c.state.phase,'Result');assert(c.state.diagnostics.sleeping);
 assert.equal(Math.hypot(...Object.values(c.state.velocity)),0);
 assert.equal(Math.hypot(...Object.values(c.state.spin)),0);
 assert(r.success&&r.saved&&r.score>0);assert.equal(r.waypointHits.length,2);
}
async function release(c,course){
 await c.request('select-challenge',{challengeId:course.id},'selected');await delay(150);
 c.input(course.hint);await delay(120);
 c.send('charge',{layout:c.state.layout,physics:c.state.physics,challengeId:course.id,revision:course.revision,powerRange:course.hint.powerRange});
 await delay(course.hint.holdMs+50);
 const flight=c.next(m=>m.type==='state'&&m.phase==='Flight');c.send('release');
 await flight;return c.playback.shot.attempt;
}
async function replay(c,r){
 const recorded=(await c.request('replay',{attempt:r.attempt},'replay')).replay;
 assert.deepEqual(scoreAttempt(recorded),r.breakdown,'Native evidence reproduces the authoritative score');
 assert.deepEqual(recorded.scoreFrames.at(-1).score,r.breakdown);
 assert.equal(recorded.duration,r.duration);assert(recorded.poses.length>100);
 return recorded;
}
try{
 const c=await connect();
 assert(c.messages.findLast(m=>m.type==='worker-status')?.capabilities.includes('shot-skip-v1'),'Rebuild the native worker before testing skip');
 const course=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-clock-in');assert(course);
 await c.request('select-challenge',{challengeId:course.id},'selected');await delay(150);
 const baseline=(await c.throw(course.hint.holdMs+50,course.hint,90000)).result;rest(c,baseline);
 const baselineReplay=await replay(c,baseline);
 const attempt=await release(c,course),started=performance.now();
 const result=c.next(m=>m.type==='result'&&m.attempt===attempt,30000);
 c.send('skip-shot',{attempt});const skipped=await result;rest(c,skipped);
 const waitMs=performance.now()-started;
 assert(waitMs<skipped.duration*500,`Skip should finish in less than half the remaining playback (${waitMs} ms)`);
 const skippedReplay=await replay(c,skipped);
 assert.equal(skipped.duration,baseline.duration,'Skipping preserves the full physical duration');
 assert.equal(skipped.score,baseline.score,'The same throw earns the same score');
 assert.deepEqual(skippedReplay.poses,baselineReplay.poses,'Skipping preserves the complete native trajectory');
 assert.equal(c.messages.filter(m=>m.type==='result'&&m.attempt===attempt).length,1);
 console.log(`PASS ${skipped.duration.toFixed(2)} s shot skipped in ${(waitMs/1000).toFixed(2)} s; identical score and replay, full translation/spin rest`);

 // Disconnect immediately after the request; resume must retain intent even
 // when the original connection never receives the acknowledgement.
 const resumedAttempt=await release(c,course);
 c.send('skip-shot',{attempt:resumedAttempt});await delay(30);c.socket.terminate();
 const resumed=await connect(c.token,c.id);
 const resumedResult=resumed.messages.find(m=>m.type==='result'&&m.attempt===resumedAttempt)||await resumed.next(m=>m.type==='result'&&m.attempt===resumedAttempt,30000);
 rest(resumed,resumedResult);assert(resumed.playback.shot.resultSent);
 assert.equal(resumed.messages.filter(m=>m.type==='result'&&m.attempt===resumedAttempt).length,1);
 console.log('PASS skip survives reconnection without replaying the flight');

 const recalledAttempt=await release(resumed,course);
 resumed.send('skip-shot',{attempt:recalledAttempt});await resumed.request('recall',{},'recalled');await delay(500);
 assert.equal(resumed.state.phase,'Aim');assert(!resumed.messages.some(m=>m.type==='result'&&m.attempt===recalledAttempt));
 assert.equal(resumed.playback.skipping,false);
 const nextAttempt=await release(resumed,course);await delay(500);
 assert.equal(resumed.state.phase,'Flight');assert(!resumed.playback.skipping,'Skip must not leak into the next shot');
 assert(!resumed.messages.some(m=>m.type==='result'&&m.attempt===nextAttempt));
 await resumed.request('recall',{},'recalled');
 console.log('PASS recall forfeits a pending skip; the next shot plays normally');
}finally{for(const c of clients)c.close();}
