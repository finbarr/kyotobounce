import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {Client} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const client=new Client(origin.replace(/^http/,'ws'));
try{
 const welcome=await client.join();assert.equal(welcome.nameChosen,false);
 await client.request('name',{name:'Runtime Replay Ace'},'named');
 const course=client.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-vending');
 await client.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const {result}=await client.throw((8-.5)/11.5*2800,{yaw:-170.75955,pitch:0,top:0,kick:0,powerRange:'precision',character:'don'},180000);
 assert.ok(result.saved&&result.score>0);assert.equal(result.playerName,'Runtime Replay Ace');assert.equal(result.character,'don');assert.ok(result.standings.rank>0);
 const sessions=async()=> (await(await fetch(origin+'/api/debug/sessions')).json()).sessions.length;
 const before=await sessions(),response=await fetch(`${origin}/api/replay/${result.attempt}`);assert.equal(response.status,200);
 const {replay}=await response.json();assert.equal(replay.score,result.score);assert.equal(replay.character,'don');assert.deepEqual(replay.standings,result.standings);assert.deepEqual(replay.scoreFrames.at(-1).score,result.breakdown);assert.ok(replay.poses.length>1);assert.ok(replay.thrower.feet&&replay.thrower.yaw!==undefined&&replay.thrower.power>0);
 assert.ok(!JSON.stringify(replay).includes(client.token));
 const page=await fetch(`${origin}/replay/${result.attempt}`);assert.equal(page.status,200);assert.match(await page.text(),/src="\/game.js"/);
 assert.equal((await fetch(`${origin}/api/replay/${result.attempt}`,{method:'HEAD'})).status,200);
 assert.equal((await fetch(origin+'/api/replay/not-present')).status,404);assert.equal(await sessions(),before,'Watching via HTTP does not allocate a physics session');
 const fromSocket=await client.request('replay',{attempt:result.attempt},'replay');assert.deepEqual(replay,fromSocket.replay);
 await mkdir('.local',{recursive:true});await writeFile('.local/shared-replay.json',JSON.stringify(replay));
 console.log(`PASS named native shot, saved robot identity, atomic ranks, public HTTP playback without a new session; replay ${result.attempt}`);
}finally{client.close();}
