import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4306';
assert.equal(new URL(origin).hostname,'127.0.0.1','Use an isolated service');
const c=new Client(origin.replace(/^http/,'ws'));
const wait=async(predicate,timeout=15000)=>{const until=performance.now()+timeout;while(!predicate()){assert.ok(performance.now()<until,'Timed out waiting for trajectory');await delay(20);}};
try{
 await c.join();const course=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-crossstation');
 await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const {holdMs,...aim}=course.hint;
 c.input(aim);await delay(120);
 c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,powerRange:aim.powerRange});await delay(holdMs);
 const wireStart=c.socket._socket.bytesRead;const released=performance.now();c.send('release');
 await wait(()=>c.chunks.some(chunk=>chunk.complete),20000);
 const end=c.chunks.at(-1),duration=end.frames.at(-1).flightTime,computedMs=end.received-released;
 assert.ok(computedMs<duration*500,'The whole shot must arrive at least twice as fast as playback');
 assert.equal(c.state.phase,'Flight','Receiving the complete trajectory does not end playback');
 const wireBytes=c.socket._socket.bytesRead-wireStart;
 assert.ok(c.socket.extensions.includes('permessage-deflate'));
 assert.ok(wireBytes<c.chunks.reduce((n,chunk)=>n+JSON.stringify(chunk).length,0)*.6,'Trajectory compression reduces transfer size');
 const attempt=end.attempt;
 const board=await c.request('leaderboard',{challengeId:course.id,revision:course.revision},'leaderboard');
 assert.equal(board.entries.some(e=>e.attempt===attempt),false,'A future result must not be posted while the visible shot is still playing');
 const recalled=c.next(m=>m.type==='notice');c.send('recall');assert.match((await recalled).message,/No score/);
 await wait(()=>c.state.phase==='Aim');
 const after=await c.request('leaderboard',{challengeId:course.id,revision:course.revision},'leaderboard');
 assert.equal(after.entries.some(e=>e.attempt===attempt),false,'Recall forfeits even when the server already computed a successful landing');
 console.log(JSON.stringify({event:'PASS shot computed ahead and recall forfeits',duration,computedMs:Math.round(computedMs),speedup:Number((duration*1000/computedMs).toFixed(1)),wireBytes,chunks:c.chunks.length,bytes:c.chunks.reduce((n,chunk)=>n+JSON.stringify(chunk).length,0)}));
}finally{c.close();}
