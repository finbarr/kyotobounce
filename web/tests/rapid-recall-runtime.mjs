import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4386';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const c=new Client(origin.replace(/^http/,'ws'));let count=0;
try{
 await c.join();if(!c.messages.some(m=>m.type==='session'&&!m.restoring))await c.next(m=>m.type==='session'&&!m.restoring);
 const catalog=c.messages.findLast(m=>m.type==='catalog').challenges;
 for(const level of catalog.slice(0,8)){
  await c.request('select-challenge',{challengeId:level.id},'selected');
  if(c.state.challenge?.id!==level.id)await c.next(m=>m.type==='state'&&m.challenge?.id===level.id);
  const pose=c.state.players.find(p=>p.id===c.id);
  for(const key of ['yaw','pitch','top','kick'])assert.ok(Math.abs(pose[key]-level.hint[key])<.001,`${level.name} starts at suggested ${key}`);
  for(const recallAfter of [0,80,200,450]){
   c.input(level.hint);const charge={challengeId:level.id,revision:level.revision,layout:c.state.layout,physics:c.state.physics,powerRange:level.hint.powerRange};
   const active=c.next(m=>m.type==='session'&&m.busy);c.send('charge',charge);const old=(await active).attempt;await delay(50);c.send('release');await delay(recallAfter);
   const ack=c.next(m=>m.type==='recalled');c.send('recall');c.send('recall');c.send('recall');await ack;
   const newCharge=c.next(m=>m.type==='session'&&m.busy&&m.attempt!==old);c.send('charge',charge);const next=(await newCharge).attempt;
   await c.next(m=>m.type==='state'&&m.phase==='Charging'&&m.attempt===next);
   const since=c.messages.length;await delay(120);
   assert.ok(!c.messages.slice(since).some(m=>m.type==='result'||m.type==='notice'),'Discarded shot cannot end the new charge');
   const idle=c.next(m=>m.type==='state'&&m.phase==='Aim');await c.request('recall',{},'recalled');await idle;count+=2;
  }
 }
 console.log(`PASS ${count} native throws: repeated recalls at release/early flight, immediate new charge, no stale result/notice, and entry aim on eight courses`);
}finally{c.close();}
