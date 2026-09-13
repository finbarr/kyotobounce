import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4193',out=process.env.KYOTO_TEST_OUTPUT||'.local/fleet/waypoint-runtime.json';
const client=new Client(origin.replace(/^http/,'ws')),checks=[];
const p=(x,y,z)=>({x,y,z});
async function place(slot,origin,direction,radius){return (await client.request('place',{slot,origin,direction,radius},'placement')).disk;}
async function save(name,start,goal,waypoints){await delay(1050);return (await client.request('save-challenge',{name,start,goal,waypoints,scoring:'waypoint-v3'},'saved-challenge')).challenge;}
async function play(course,settings={}){
 await client.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');client.messages.length=0;
 const shot=await client.throw(settings.holdMs??260,{yaw:90,pitch:15,powerRange:'precision',...settings},60000),r=shot.result;
 assert.ok(shot.state.diagnostics.sleeping);assert.ok(Math.hypot(...Object.values(shot.state.velocity))<1e-5);assert.ok(Math.hypot(...Object.values(shot.state.spin))<1e-5);
 const events=client.messages.filter(m=>m.type==='waypoint-hit');assert.equal(new Set(events.map(h=>h.waypointId)).size,events.length);
 const replay=r.score?(await client.request('replay',{attempt:r.attempt},'replay')).replay:null;
 if(replay){assert.deepEqual(scoreAttempt(replay),r.breakdown);assert.deepEqual(replay.scoreFrames.at(-1).score,r.breakdown);assert.deepEqual(replay.waypointHits,events);}
 checks.push({name:course.name,score:r.score,success:r.success,destinationReached:r.destinationReached,waypoints:r.breakdown.waypointIds,end:shot.state.ball,stopped:true});console.log(JSON.stringify(checks.at(-1)));
 client.send('recall');await delay(120);return {r,replay,events};
}
try{
 await client.join();const start=await place('start',p(0,3,20),p(0,-1,0),.75);
 const early={...await place('waypoint',p(1.4,3,19.78),p(0,-1,0),.45),id:'early'};
 const late={...await place('waypoint',p(8.7,3,19.78),p(0,-1,0),.3),id:'slow'};
 const far=await place('goal',p(-10,3,20),p(0,-1,0),1);
 const near=await place('goal',p(8.88,3,19.78),p(0,-1,0),2);
 const solo=await save('Waypoint-only floor',start,null,[early,late]);const a=await play(solo);
 assert.equal(a.r.success,true);assert.equal(a.r.destinationReached,false);assert.deepEqual(a.r.breakdown.waypointIds,['early','slow']);
 const h=a.events.find(h=>h.waypointId==='slow'),i=a.replay.poses.findIndex(p=>p.t>=h.time),x=a.replay.poses[i-1],y=a.replay.poses[i];
 const speed=Math.hypot(y.p.x-x.p.x,y.p.y-x.p.y,y.p.z-x.p.z)/(y.t-x.t);assert.ok(!a.replay.contacts.some(impact=>Math.abs(impact.time-h.time)<.012),'The slow rolling touch has no >0.28 m/s impact event; full native contact stream must credit it');checks.at(-1).rollingSpeed=speed;checks.at(-1).slowNormalContact=true;
 const mixed=await save('Destination miss keeps chain',start,far,[early,late]),b=await play(mixed);assert.equal(b.r.success,true);assert.equal(b.r.destinationReached,false);assert.equal(b.r.breakdown.destinationBonus,0);assert.equal(b.r.breakdown.waypointCount,2);
 const landed=await save('Destination adds bonus',start,near,[early]),d=await play(landed);assert.equal(d.r.destinationReached,true);assert.equal(d.r.breakdown.destinationBonus,(d.r.score-d.r.breakdown.movementPoints)/2);assert.ok(d.r.records.personalBest&&d.r.records.courseBest,'Authoritative record flags accompany rested result');
 // The native validation must reject a fabricated opposite face and a patch off its plane.
 await assert.rejects(save('Backside',start,null,[{...early,normal:p(0,-1,0)}]),/face|blocked/);
 await assert.rejects(save('Off plane',start,null,[{...early,center:p(early.center.x,.02,early.center.z)}]),/face/);
 await assert.rejects(save('Duplicate IDs',start,null,[early,early]),/unique/);
  await assert.rejects(place('waypoint',p(88,40,1.526107),p(0,-1,0),.15),/moving targets/);
 await client.request('select-challenge',{challengeId:solo.id,revision:solo.revision},'selected');
 client.input({x:1,fast:true});await delay(600);const feet=client.state.players.find(p=>p.id===client.id).feet;
 assert.ok(Math.hypot(feet.x-start.center.x,feet.z-start.center.z)<=start.radius+.001,'Destination-free courses still enforce the native start zone');
 client.send('home');await delay(120);client.input();await delay(120);
 const beforeRecall=(await client.request('leaderboard',{challengeId:solo.id,revision:solo.revision},'leaderboard')).entries;
 client.send('charge',{challengeId:solo.id,revision:solo.revision,layout:solo.layout,physics:solo.physics,powerRange:'precision'});await delay(260);
 const targetEvent=client.next(m=>m.type==='waypoint-hit');client.send('release');await targetEvent;client.send('recall');await delay(200);
 assert.equal(client.state.phase,'Aim');assert.deepEqual((await client.request('leaderboard',{challengeId:solo.id,revision:solo.revision},'leaderboard')).entries,beforeRecall,'Recall forfeits collected waypoint points');
 const full=await save('Maximum target payload',start,near,Array.from({length:32},(_,i)=>({...early,id:`max-${i}`})));assert.equal(full.waypoints.length,32);
 const err=client.next(m=>m.type==='error');client.send('release',{waypointHits:[h],score:999999});assert.match((await err).message,/intent only/);
 await mkdir(out.slice(0,out.lastIndexOf('/')),{recursive:true});await writeFile(out,JSON.stringify({status:'pass',origin,checks},null,2)+'\n');
 console.log('PASS rebuilt native waypoint-only, mixed miss/bonus, slow contacts, once-only, true rest, replay parity and spoof rejection');
}finally{client.close();}
