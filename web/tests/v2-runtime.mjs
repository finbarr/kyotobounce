import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local server');
const {spawn}=JSON.parse(await readFile('web/v2/assets.json','utf8'));
const c=new Client(origin.replace(/^http/,'ws')),magnitude=v=>Math.hypot(v.x,v.y,v.z),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
try{
 await c.join();await delay(1000);
 const player=()=>c.state.players.find(p=>p.id===c.id),feet=()=>player().feet;
 assert.equal(c.state.challenge,null);assert.deepEqual(c.messages.findLast(m=>m.type==='catalog').challenges,[]);
 assert(player().grounded,'Spawn must be on a walkable floor');assert(distance(feet(),spawn)<.1,'Start in the reconstructed courtyard');
 const start={...feet()};
 for(let i=0;i<12;i++){c.input({yaw:0,z:1});await delay(80);}
 c.input({yaw:0});await delay(200);
 const moved=distance(start,feet());assert(moved>1,`Walk at least a metre: ${moved}`);assert(player().grounded);
 c.send('home');await delay(300);assert(distance(feet(),spawn)<.1,'Home returns to the courtyard');
 const shot=await c.throw(150,{powerRange:'precision',yaw:0,pitch:15,top:20},60000);
 assert.equal(shot.result.saved,false,'Exploration never saves an invented score');assert.equal(shot.result.challenge,null);
 assert.equal(c.state.phase,'Result');assert(magnitude(c.state.velocity)<.01,'Translation stops');assert(magnitude(c.state.spin)<.01,'Spin stops');
 assert.equal(c.state.diagnostics?.endReason,'Ball stopped','Finish on full physical rest');
 const elapsed=shot.result.duration;
 await c.request('recall',{},'recalled');await delay(180);assert.equal(c.state.phase,'Aim');
 // Recall a new moving ball and reject all late results from that discarded attempt.
 c.input({yaw:0,pitch:30});await delay(120);
 c.send('charge',{layout:c.state.layout,physics:c.state.physics,challengeId:null,revision:null,powerRange:'precision'});
 await delay(400);const attempt=c.messages.findLast(m=>m.type==='session'&&m.attempt)?.attempt;assert(attempt);
 c.send('release');await c.next(m=>m.type==='state'&&m.phase==='Flight');
 const recalled=await c.request('recall',{},'recalled');await delay(1000);
 assert.equal(c.state.phase,'Aim');assert(!c.messages.some(m=>m.type==='result'&&m.attempt===attempt),'Recall forfeits the pending result');
 assert(player().grounded);console.log(`PASS v2 courtyard spawn, ${moved.toFixed(2)} m walk, full translation/spin rest (${elapsed.toFixed(2)} s), free result, recall and home`);
}finally{c.close();}
