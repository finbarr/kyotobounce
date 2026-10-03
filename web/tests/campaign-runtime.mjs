import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local server');
const expected=JSON.parse(await readFile('web/starter-challenges.json'));
const ids=process.env.KYOTO_TEST_COURSES?.split(',')||[expected[0].id];
const c=new Client(origin.replace(/^http/,'ws'));
try{
 await c.join();
 const campaign=c.messages.findLast(m=>m.type==='catalog').challenges.filter(c=>c.creator==='station').sort((a,b)=>a.order-b.order);
 assert.deepEqual(campaign,expected,'The served campaign exactly matches the authored catalog');
 assert.equal(c.state.challenge.id,expected[0].id,'New players enter level 1');
 for(const id of ids){
  const course=campaign.find(c=>c.id===id);assert(course,`Unknown stage ${id}`);
  await c.request('select-challenge',{challengeId:id},'selected');await delay(200);
  const {result:r,state}=await c.throw(course.hint.holdMs,course.hint,120000);
  assert(r.success&&r.saved&&Number.isSafeInteger(r.score)&&r.score>0);
  assert.equal(r.reason,'Ball stopped');assert(state.diagnostics.sleeping);
  assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);
  assert.equal(r.waypointHits.length,course.waypoints.length);
  assert.equal(r.breakdown.waypointMultiplier,10*2**(course.waypoints.length-1),'First waypoint is worth ×10; later targets double it');
  assert.equal(r.breakdown.bankBonus,.5*r.breakdown.styleBanks,'Bank rewards stay additive');
  const replay=(await c.request('replay',{attempt:r.attempt},'replay')).replay;
  assert.equal(replay.score,r.score);assert.equal(replay.layout,c.state.layout);
  assert.deepEqual(scoreAttempt(replay),r.breakdown,'Server score is reproducible from native replay evidence');
  assert.deepEqual(replay.scoreFrames.at(-1).score,r.breakdown,'Saved live score ends at the authoritative final score');
  const progress=await c.request('course-progress',{},'course-progress');
  assert(progress.entries.find(p=>p.challengeId===id).completed);
  const board=await c.request('leaderboard',{challengeId:id,revision:course.revision},'leaderboard');
  assert.equal(board.personal.attempt,r.attempt);
  const next=campaign.find(stage=>stage.order===course.order+1);
  if(next)await c.request('select-challenge',{challengeId:next.id},'selected');
  console.log(`PASS ${course.name}: ${r.waypointHits.length} targets, ${r.score} authoritative points, full rest, saved replay and completion`);
 }
 // Recall a moving campaign attempt. It must never save a late result.
 await c.request('recall',{},'recalled');await delay(200);c.input({pitch:30});await delay(120);
 c.send('charge',{layout:c.state.layout,physics:c.state.physics,challengeId:c.state.challenge.id,revision:c.state.challenge.revision,powerRange:'precision'});
 await delay(500);const attempt=c.messages.findLast(m=>m.type==='session'&&m.attempt)?.attempt;assert(attempt);
 c.send('release');await c.next(m=>m.type==='state'&&m.phase==='Flight');
 await c.request('recall',{},'recalled');await delay(1000);
 assert.equal(c.state.phase,'Aim');assert(!c.messages.some(m=>m.type==='result'&&m.attempt===attempt));
 console.log('PASS campaign recall forfeits the unfinished attempt');
}finally{c.close();}
