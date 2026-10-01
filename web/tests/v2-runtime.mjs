import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local server');
const {spawn}=JSON.parse(await readFile(process.env.KYOTO_V2_ASSETS||'web/v2/assets.json','utf8'));
const shotStart=process.env.KYOTO_TEST_SHOT_START?JSON.parse(process.env.KYOTO_TEST_SHOT_START):null;
if(shotStart)assert(['x','y','z'].every(k=>Number.isFinite(shotStart[k])),'Shot start must be a finite position');
const c=new Client(origin.replace(/^http/,'ws')),magnitude=v=>Math.hypot(v.x,v.y,v.z),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
try{
 await c.join();await delay(1000);
 const player=()=>c.state.players.find(p=>p.id===c.id),feet=()=>player().feet;
 assert.equal(c.state.challenge,null);assert.deepEqual(c.messages.findLast(m=>m.type==='catalog').challenges,[]);
 assert(player().grounded,'Spawn must be on a walkable floor');assert(distance(feet(),spawn)<.1,'Start at the configured exploration spawn');
 const start={...feet()};
 for(let i=0;i<12;i++){c.input({yaw:0,z:1});await delay(80);}
 c.input({yaw:0});await delay(200);
 const moved=distance(start,feet());assert(moved>1,`Walk at least a metre: ${moved}`);assert(player().grounded);
 c.send('home');await delay(300);assert(distance(feet(),spawn)<.1,'Home returns to the configured spawn');
 // Let component checks exercise their new floor while retaining the ordinary
 // exploration spawn, movement and home assertions above.
 if(shotStart){
  const placed=await c.request('place',{slot:'start',radius:.3,origin:{...shotStart,y:shotStart.y+.5},direction:{x:0,y:-1,z:0}},'placement');
  assert(placed.disk,'Shot start needs a supported floor');
  await c.request('design-start',{start:placed.disk},'design-ready');await delay(200);
  assert(player().grounded&&distance(feet(),shotStart)<.1,'Stand on the requested shot floor');
 }
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
 assert(player().grounded);console.log(`PASS v2 exploration spawn, ${moved.toFixed(2)} m walk, full translation/spin rest (${elapsed.toFixed(2)} s), free result, recall and home`);
}finally{c.close();}
