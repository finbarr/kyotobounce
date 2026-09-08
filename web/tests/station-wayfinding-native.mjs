// Seeds only the assigned isolated service for reproducible normal-game approaches.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
import {wayfindingLayout} from '../public/station-details.js';
const c=new Client('ws://127.0.0.1:4286'),checks=[];
try{
 await c.join();assert.equal(c.state.layout,wayfindingLayout);
 for(const s of [{id:'hall',x:8,y:0,z:-18},{id:'west',x:-42,y:7.35,z:-8},{id:'east',x:37,y:0,z:5}]){
  const start=await c.place(s,.35,'start'),goal=await c.place({...s,x:s.x+1},.3,'goal');
  const saved=(await c.request('save-challenge',{name:`K030 ${s.id} sign approach`,start,goal},'saved-challenge')).challenge;
  await c.request('select-challenge',{challengeId:saved.id,revision:saved.revision},'selected');await delay(250);
  await c.request('select-challenge',{challengeId:null},'selected');await delay(250);
  const before=c.state.players.find(p=>p.id===c.id).feet;
  for(let i=0;i<10;i++){c.input({yaw:90,z:1});await delay(80);}c.input();await delay(250);
  const after=c.state.players.find(p=>p.id===c.id).feet;
  assert.ok(after.x-before.x>.5,`${s.id}: actual native lateral walk`);assert.ok(Math.abs(after.y-before.y)<.08,`${s.id}: continuous floor support`);
  checks.push({id:s.id,challenge:saved.id,start:start.center,before,after});
 }
 await writeFile('.local/station-detail/native.json',JSON.stringify({status:'pass',checks},null,2));console.log('PASS supported native hall/west/east approaches',JSON.stringify(checks));
}catch(e){await writeFile('.local/station-detail/native.json',JSON.stringify({status:'fail',error:String(e),checks},null,2));throw e;}finally{c.close();}
