import assert from 'node:assert/strict';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
const c=new Client(origin.replace(/^http/,'ws'));
try{
 await c.join();const course=c.messages.find(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');
 await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const aim={yaw:90,pitch:15,top:30,kick:-20};c.input(aim);await delay(120);
 c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics});await delay(850);
 const released=c.next(m=>m.type==='state'&&m.phase==='Release');c.send('release');await released;
 const player=c.state.players.find(p=>p.id===c.id),feet={...player.feet};
 const flight=c.next(m=>m.type==='state'&&m.phase==='Flight');
 c.input({yaw:-40,pitch:70,top:200,kick:200,x:1,z:1});await flight;await delay(350);
 const actual=c.state.players.find(p=>p.id===c.id);
 for(const key of ['yaw','pitch','top','kick'])assert.equal(actual[key],aim[key],`${key} must remain frozen during the throw`);
 assert.ok(Math.hypot(...Object.keys(feet).map(k=>feet[k]-actual.feet[k]))<.001,'Flight controls cannot walk the robot');
 const reset=c.next(m=>m.type==='state'&&m.phase==='Aim');c.send('recall');await reset;
 c.input(aim);await delay(120);const retry=c.state.players.find(p=>p.id===c.id);
 assert.equal(retry.yaw,aim.yaw);assert.equal(retry.pitch,aim.pitch);
 c.input({yaw:100,pitch:20});await delay(120);assert.equal(c.state.players.find(p=>p.id===c.id).yaw,100,'Aim input unlocks after recall');
 console.log('PASS native Release/Flight aim and walking lock, recall aim retention, next-shot input');
}finally{c.close();}
