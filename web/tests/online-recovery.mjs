import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN;if(!origin?.startsWith('https://'))throw new Error('Set KYOTO_TEST_ORIGIN');
const saved=JSON.parse(await readFile('artifacts/online/verification/reconnect-private.json','utf8'));
const start=Date.now();let health;
while(Date.now()-start<60000){
 try{const response=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(2000)});if(response.ok){health=await response.json();break;}}catch{}
 await delay(1000);
}
assert.equal(health?.worker,true,'Physics came back after reboot');
const c=new Client(origin.replace(/^https/,'wss'));
try{
 await c.join(saved.token);assert.equal(c.guestId,saved.guest);
 assert.equal(c.state.challenge.id,saved.challenge.id);
 const board=(await c.request('leaderboard',{challengeId:saved.challenge.id,revision:saved.challenge.revision},'leaderboard')).entries;
 assert.ok(board.some(e=>e.attempt===saved.attempt));
 const replay=(await c.request('replay',{attempt:saved.attempt},'replay')).replay;
 assert.equal(replay.score,10800);assert.ok(replay.poses.length>1000);
 assert.ok(c.messages.find(m=>m.type==='catalog').challenges.some(ch=>ch.id===saved.createdChallenge.id));
 await writeFile('artifacts/online/verification/recovery.json',JSON.stringify({status:'pass',origin,health,guestRestored:true,selectionRestored:true,scoreRestored:true,replayRestored:true,createdChallengeRestored:true,secondsUntilReady:(Date.now()-start)/1000},null,2));
 console.log('PASS full reboot: HTTPS, physics, identity, selected level, high score, replay and created challenge restored');
}finally{c.close();}
