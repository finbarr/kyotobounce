import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const out='artifacts/station-detail/east-square/native.json',c=new Client('ws://127.0.0.1:4283'),checks=[];
const p=(x,y,z)=>({x,y,z});
const layout=createHash('sha256').update(await readFile('.local/station-detail/candidate/station-layout.json')).digest('hex');
async function ray(origin,direction,radius=.1){return (await c.request('place',{slot:'waypoint',origin,direction,radius},'placement')).disk;}
async function course(name,start,goal){await delay(1100);const s=await c.place(start,.5,'start'),g=await c.place(goal,.6,'goal');return (await c.request('save-challenge',{name:`K027 proof ${name}`,start:s,goal:g,waypoints:[],scoring:'waypoint-v1'},'saved-challenge')).challenge;}
async function select(co,explore=false){await c.request('select-challenge',{challengeId:co.id,revision:co.revision},'selected');if(explore)await c.request('select-challenge',{challengeId:null},'selected');await delay(250);}
const feet=()=>c.state.players.find(v=>v.id===c.id).feet;
async function walkTo(x,z){const began=Date.now(),samples=[];while(Date.now()-began<15000){const f=feet(),dx=x-f.x,dz=z-f.z,d=Math.hypot(dx,dz);samples.push({...f});if(d<.09)break;c.input({yaw:Math.atan2(dx,dz)*180/Math.PI,z:1,fast:false});await delay(Math.min(120,Math.max(25,d/2*1000)));}c.input();await delay(150);assert.ok(Math.hypot(feet().x-x,feet().z-z)<.15,`walk to ${x},${z}: ${JSON.stringify(feet())}`);assert.ok(samples.every(s=>Math.abs(s.y-34.62)<.06),'Continuous supported feet');return samples;}
try{
 await c.join();assert.equal(c.state.layout,layout);
 const seatTop=await ray(p(101.25,37,-11.4),p(0,-1,0));assert.match(seatTop.surface,/^k027-seat-south/);checks.push({name:'seat-top-native-placement',ray:seatTop});
 // Curved ribs/trunks cannot hold planar scoring disks; prove them with ball contacts below.
 const route=await course('globe walk',p(101.2,34.62,-6),p(105,34.62,-13));await select(route,true);
 checks.push({name:'walk-through-both-openings',samples:await walkTo(101.2,-.75)});
 checks.push({name:'walk-back-through-globe',samples:await walkTo(101.2,-6)});
 // South approach, tree/seat aisle and restaurant approach remain navigable.
 const aisle=await course('public aisle',p(108,34.62,-14.8),p(105,34.62,-13));await select(aisle,true);
 checks.push({name:'south-door-approach',samples:await walkTo(108,-16.5)});
 checks.push({name:'restaurant-approach',samples:await walkTo(108,-2)});
 checks.push({name:'north-stair-approach-1',samples:await walkTo(108,2.326)});
 checks.push({name:'north-stair-approach-2',samples:await walkTo(105.3,2.326)});
 const mouth=await course('escalator mouth',p(94,34.62,-11.3),p(105,34.62,-13));await select(mouth,true);
 checks.push({name:'escalator-mouth-to-core',samples:await walkTo(98.7,-11.3)});
 // Aim at substantial structure with actual native ball impacts; full rest only.
 const shots=[
  {name:'opening',start:p(101.2,34.62,-6),yaw:0,pitch:0,hold:700,pattern:/^east-court-garden-floor/},
  {name:'trunk',start:p(104.1,34.62,-10),yaw:0,pitch:0,hold:1050,pattern:/^k027-tree-/},
  {name:'seat',start:p(101.6,34.62,-14),yaw:0,pitch:-12,hold:850,pattern:/^k027-seat-south/},
  {name:'globe',start:p(105,34.62,-3.22),yaw:-90,pitch:5,hold:1400,pattern:/^k027-gazebo/}
 ];
 for(const s of shots){const co=await course(s.name,s.start,p(105,34.62,-13));await select(co);c.messages=[];
  const shot=await c.throw(s.hold,{yaw:s.yaw,pitch:s.pitch,powerRange:'precision'},90000);
  assert.ok(shot.contacts.some(i=>s.pattern.test(i.surface)),`${s.name} impact: ${shot.contacts.map(i=>i.surface)}`);
  if(s.name==='opening'){assert.ok(!shot.contacts.some(i=>i.surface.startsWith('k027-gazebo')),'Ball passes real globe openings without hidden fill');assert.ok(c.messages.some(m=>m.type==='state'&&m.phase==='Flight'&&Math.hypot(m.ball.x-101.2,m.ball.z+3)<1.35),'Ball enters globe interior');}
  assert.equal(shot.state.diagnostics.sleeping,true);assert.ok(Math.hypot(...Object.values(shot.state.velocity))<1e-5);assert.ok(Math.hypot(...Object.values(shot.state.spin))<1e-5);
  let replayParity=null;if(shot.result.score>0){const replay=(await c.request('replay',{attempt:shot.result.attempt},'replay')).replay;assert.deepEqual(scoreAttempt(replay),shot.result.breakdown);replayParity=true;}else assert.equal(shot.result.breakdown.total,0); // Zero-score attempts intentionally have no retained replay.
  checks.push({name:`ball-${s.name}`,contacts:shot.contacts,result:shot.result,rest:{velocity:shot.state.velocity,spin:shot.state.spin},replayParity});c.send('recall');await delay(200);
 }
 await writeFile(out,JSON.stringify({status:'pass',layout,workerAssembly:'9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef',checks},null,2));console.log('PASS K027 native seat placement, openings, walking, ball contacts and full rest');
}catch(e){await writeFile(out,JSON.stringify({status:'fail',error:String(e),layout,checks},null,2));throw e;}finally{c.close();}
