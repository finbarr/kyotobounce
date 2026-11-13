import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {d1Harness} from './d1-harness.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {INPUT_FORMAT} from '../verification.mjs';
import {simulate} from './verification-fixture.mjs';

const output='.local/verification/d1-station-proof.json';await writeFile(output,JSON.stringify({passed:false})+'\n');
const h=await d1Harness({station:true,batches:1}),world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),catalog=JSON.parse(await readFile('web/starter-challenges.json')).map(c=>({...c,physics:BROWSER_PHYSICS}));
const player=randomUUID(),token=player+'.'+randomBytes(32).toString('base64url'),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},results=[];
async function request(path,method='GET',body){const r=await h.fetch(path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})}),value=await r.json();assert([200,201,202].includes(r.status),JSON.stringify(value));return value;}
try{
 assert.equal(catalog.length,30);await request('/v1/identity','POST',{name:'Station acceptance'});
 for(const c of catalog){
  const id=randomUUID(),path='/v1/attempts/'+id,a=c.hint,header={format:INPUT_FORMAT,courseId:c.id,revision:c.revision,layout:c.layout,physics:c.physics,scoring:c.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:((a.yaw+180)%360+360)%360-180,pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange}};
  await request(path,'POST',{header});await request(path+'/seal','POST',{});
  const initial=await request(path+'/advance','POST',{});assert.equal(initial.state,'pending');assert(initial.shotSteps>0&&initial.shotSteps<=180);assert(!initial.result);
  const checkpoint=await h.db.prepare('SELECT length(checkpoint) AS bytes FROM verifier_attempts WHERE id=?').bind(id).first();assert(checkpoint.bytes>0);
  // Terminate the entire workerd process and reopen its persistent D1 files.
  await h.restart({now:h.config.now+60000});let accepted,slices=1;
  for(;slices<500;slices++){accepted=await request(path+'/advance','POST',{});if(accepted.state==='verified')break;assert.equal(accepted.state,'pending');assert(!accepted.result);}
  assert.equal(accepted.state,'verified');const baseline=await simulate(world,c,header,[],{attempt:id,subject:player});
  assert.deepEqual(accepted.result,{...JSON.parse(JSON.stringify(baseline.result)),id:player,playerName:'Station acceptance',verified:true,local:false});
  assert(accepted.result.success);assert.equal(accepted.result.waypointHits.length,c.waypoints.length);
  assert.deepEqual((await request('/v1/replays/'+id)).header,header);assert.equal((await request('/v1/courses/'+c.id+'/leaderboard')).personal.rank,1);
  results.push({id:c.id,score:accepted.result.score,duration:accepted.result.duration,checkpointBytes:checkpoint.bytes,slices:slices+1,sha256:createHash('sha256').update(JSON.stringify(baseline)).digest('hex')});
  console.log('PASS D1/workerd restart and independent station score: '+c.id);
 }
 await writeFile(output,JSON.stringify({passed:true,physics:BROWSER_PHYSICS,layout:world.layoutSha256,results},null,2)+'\n');
}finally{world.free();await h.close();}
