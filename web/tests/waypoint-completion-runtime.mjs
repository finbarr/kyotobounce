import assert from 'node:assert/strict';
import {Store} from '../store.ts';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname),'Use an isolated local service');
// Scoring edge cases deliberately use unreachable targets. Seed local fixtures
// directly: public creation now requires a genuine captured solution.
const data=resolve(process.env.KYOTO_TEST_DATA_DIR||`.local/${new URL(origin).port}/data`,'kyoto.sqlite');await stat(data);
const store=new Store(data);
const client=new Client(origin.replace(/^http/,'ws'));
try{
 await client.join();
 const source=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-konbinidirect');
 const extra=await client.place({x:0,y:0,z:20},.5,'waypoint');
 const draft={name:'Full route qualification check',start:source.start,goal:source.goal,scoring:source.scoring,waypoints:[...source.waypoints,{...extra,id:'missing-target'}]};
 const challenge={...source,...draft,id:randomUUID(),creator:client.guestId,revision:1,campaign:undefined,order:undefined};store.saveChallenge(challenge);
 await client.request('select-challenge',{challengeId:challenge.id,revision:challenge.revision},'selected');
 const partial=await client.throw(source.hint.holdMs,source.hint);
 assert.equal(partial.result.breakdown.waypointCount,2);assert.equal(partial.result.destinationReached,true,'The missed waypoint cannot be bypassed by landing in the destination');
 assert.equal(partial.result.success,false);assert.equal(partial.result.saved,true);assert.ok(partial.result.score>0);assert.equal(partial.result.breakdown.outcome,'perfect');
 assert.ok(partial.result.breakdown.potential>0);assert.equal(partial.state.diagnostics.sleeping,true);
 assert.ok(client.messages.some(m=>m.type==='state'&&m.liveScore?.waypointCount===2&&m.liveScore.total>0),'Partial points accumulate during flight');
 assert.equal(partial.result.standings.rank,1);assert.equal(partial.result.standings.after[0].attempt,partial.result.attempt);
 assert.equal((await client.request('replay',{attempt:partial.result.attempt},'replay')).replay.score,partial.result.score);
 const shared=await fetch(`${origin}/api/level/${challenge.id}`);assert.equal(shared.status,200);const publicLevel=await shared.json();assert.equal(publicLevel.challenge.id,challenge.id);assert.equal(publicLevel.entries[0].attempt,partial.result.attempt);
 const page=await fetch(`${origin}/level/${challenge.id}`);assert.equal(page.status,200);assert.match(await page.text(),/Full route qualification check — Kyoto Bounce/);
 await delay(1100);
 const zeroDraft={...draft,editId:challenge.id,waypoints:[{...extra,id:'missing-target'}],goal:null};
 const zeroSaved={challenge:{...challenge,...zeroDraft,revision:2}};store.saveChallenge(zeroSaved.challenge);
 await client.request('select-challenge',{challengeId:challenge.id},'selected');
 const zero=await client.throw(source.hint.holdMs,source.hint);
 assert.equal(zero.result.breakdown.waypointCount,0);assert.equal(zero.result.success,false);assert.equal(zero.result.saved,true);assert.ok(zero.result.score>=10000);assert.equal(zero.result.standings.rank,1);assert.equal(zero.state.diagnostics.sleeping,true);
 const zeroReplay=(await client.request('replay',{attempt:zero.result.attempt},'replay')).replay;assert.deepEqual(zeroReplay.breakdown,zero.result.breakdown);
 const latest=await (await fetch(`${origin}/api/level/${challenge.id}`)).json();assert.equal(latest.challenge.revision,zeroSaved.challenge.revision,'Stable URL resolves the latest saved level');
 const personal=await client.request('leaderboard',{challengeId:challenge.id},'leaderboard');assert.equal(personal.personal.guest,client.messages.find(m=>m.type==='welcome').id);assert.equal(personal.personal.rank,1);
 await delay(1100);
 const completeDraft={...draft,editId:challenge.id,waypoints:source.waypoints,goal:null};
 const updated={challenge:{...challenge,...completeDraft,revision:3}};store.saveChallenge(updated.challenge);
 await client.request('select-challenge',{challengeId:updated.challenge.id,revision:updated.challenge.revision},'selected');
 const complete=await client.throw(source.hint.holdMs,source.hint);
 assert.equal(complete.result.breakdown.waypointCount,2);assert.equal(complete.result.destinationReached,false);
 assert.equal(complete.result.success,true);assert.equal(complete.result.saved,true);assert.ok(complete.result.score>0);assert.equal(complete.result.standings.rank,1);
 const replay=(await client.request('replay',{attempt:complete.result.attempt},'replay')).replay;assert.deepEqual(replay.breakdown,complete.result.breakdown);
 await mkdir('.local',{recursive:true});await writeFile('.local/waypoint-completion-runtime.json',JSON.stringify({partial:partial.result,zero:zero.result,complete:complete.result},null,2));
 console.log('PASS native partial and zero-waypoint shots rank/share at rest; only complete routes pass; stable public level URLs and personal standings');
}finally{client.close();store.close();}
