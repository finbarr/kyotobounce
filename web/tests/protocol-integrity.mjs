import { Client,delay } from './api-client.mjs';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/phase3/protocol-integrity';await mkdir(out,{recursive:true});const clients=[],checks=[];
async function join(){const c=new Client();clients.push(c);await c.join();return c;}
async function reject(c,type,extra,pattern){const result=await c.request(type,extra,'unexpected-success').then(()=>{throw new Error('Unexpected acceptance: '+type)},error=>error.message);assert.match(result,pattern);checks.push({type,result});}
try{
 const a=await join(),c=JSON.parse(await readFile('web/starter-challenges.json','utf8'))[0];await a.request('select-challenge',{challengeId:c.id,revision:c.revision},'selected');
 const b=await join(),d=await join(),e=await join();const fifth=new Client();clients.push(fifth);await assert.rejects(fifth.join(),/four players/);checks.push({capacity:4,fifth:'rejected'});fifth.close();
 const intent={challengeId:c.id,revision:c.revision,layout:c.layout,physics:c.physics};
 await reject(b,'charge',intent,/turn/);await reject(a,'charge',{...intent,revision:999},/version/);await reject(a,'charge',{...intent,layout:'wrong'},/version/);
 await reject(a,'charge',{...intent,origin:{x:200,y:30,z:0}},/authoritative/);await reject(a,'release',{power:999,velocity:{x:999,y:0,z:0}},/authoritative/);
 await delay(25);await reject(a,'input',{x:0,z:0,yaw:90,pitch:15,top:201,kick:0},/range/);
 await reject(a,'result',{attempt:'forged',score:999999,success:true,surfaces:999},/Unsupported/);
 const before=await a.request('leaderboard',{challengeId:c.id,revision:c.revision},'leaderboard');const attempt=before.entries[0]?.attempt;
 if(attempt)await reject(a,'result',{attempt,score:999999,success:true},/Unsupported/);
 await reject(a,'save-challenge',{name:'Invalid upper floor',start:{...c.start,center:{...c.start.center,y:c.start.center.y+2}},goal:c.goal},/floor/);
 const moveStates=[];for(let i=0;i<25;i++){a.input({x:0,z:1,fast:true});await delay(40);const feet=a.state.players.find(p=>p.id===a.id).feet;moveStates.push(feet);assert.ok(Math.hypot(feet.x-c.start.center.x,feet.z-c.start.center.z)<=c.start.radius+.001);}
 a.input();checks.push({startRadius:c.start.radius,maxDistance:Math.max(...moveStates.map(p=>Math.hypot(p.x-c.start.center.x,p.z-c.start.center.z))),outsideMovement:'constrained'});
 const after=await a.request('leaderboard',{challengeId:c.id,revision:c.revision},'leaderboard');assert.deepEqual(after.entries,before.entries);
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Real local protocol rejection, four-player capacity, start-radius constraint and unchanged board; not browser input evidence',checks},null,2));console.log('PASS protocol integrity, capacity, radius boundary and unchanged leaderboard');
}catch(error){await writeFile(`${out}/result.json`,JSON.stringify({status:'fail',error:String(error),checks},null,2));throw error;}finally{for(const c of clients)c.close();}
