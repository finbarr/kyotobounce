import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4193',out=process.env.KYOTO_TEST_OUTPUT||'.local/fleet/waypoint-oriented-runtime.json';
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
 await client.join();
 const wallStart=await place('start',p(1,3,12.648),p(0,-1,0),.5);
 const wall={...await place('waypoint',p(2,1.15,12.428),p(1,0,0),.25),id:'wall-front'};
 const back={...await place('waypoint',p(6,1.15,12.428),p(-1,0,0),.25),id:'wall-back'};
 const above={...await place('waypoint',p(2,3,12.428),p(1,0,0),.25),id:'wall-near-miss'};
 const wallCourse=await save('Oriented wall, opposite face and near miss',wallStart,null,[wall,back,above]);
 const w=await play(wallCourse,{yaw:90,pitch:0,powerRange:'precision',holdMs:2000});assert.deepEqual(w.r.breakdown.waypointIds,['wall-front']);
 const ceilingStart=await place('start',p(-2.5,3,-24.78),p(0,-1,0),.5);
 const ceiling={...await place('waypoint',p(.5,2,-25),p(0,1,0),.2),id:'ceiling'};
 const ceilingCourse=await save('Oriented ceiling',ceilingStart,null,[ceiling]);
 const roof=await play(ceilingCourse,{yaw:90,pitch:80,powerRange:'full',holdMs:550});assert.deepEqual(roof.r.breakdown.waypointIds,['ceiling']);
 await mkdir(out.slice(0,out.lastIndexOf('/')),{recursive:true});await writeFile(out,JSON.stringify({status:'pass',origin,checks},null,2)+'\n');
 console.log('PASS native oriented wall/ceiling contact, opposite-face and near-miss rejection, optional targets, full rest and replay parity');
}finally{client.close();}
