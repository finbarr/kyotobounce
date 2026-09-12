import assert from 'node:assert/strict';
import {Client} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname),'Record-creating campaign checks require an isolated local service');
await Promise.all(['kyoto-konbinidirect','kyoto-garden','kyoto-skyway','kyoto-crossstation'].map(async id=>{
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
