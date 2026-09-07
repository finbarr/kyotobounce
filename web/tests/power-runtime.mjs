import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
import {throwSpeed} from '../public/throw-power.js';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4187';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Use an isolated local server');
const c=new Client(origin.replace(/^http/,'ws')),rows=[];
try{
 await c.join();await c.request('select-challenge',{challengeId:null},'selected');
 for(const [range,values]of [['full',[.1,.25,.49,.5,.51,.75,1]],['precision',[.09,.5,1]]])for(const power of values){
  c.input({yaw:90,pitch:15});await delay(100);
  c.send('charge',{challengeId:null,revision:null,layout:c.state.layout,physics:c.state.physics,powerRange:range});await delay(power*2800);
  const flying=c.next(s=>s.type==='state'&&s.phase==='Flight');c.send('release');const first=await flying;
  const player=first.players.find(p=>p.id===c.id),expected=throwSpeed(player.power,range),measured=Math.hypot(...Object.values(first.velocity));
  assert.equal(player.powerRange,range);assert.ok(Math.abs(player.power-power)<.025,'Server windup follows elapsed hold time');
  assert.ok(first.flightTime<=.06,'Sample the actual initial flight');
  assert.ok(Math.abs(measured-expected)<Math.max(1,expected*.08),'Native motion agrees with the meter, allowing initial gravity and air drag');
  const early=await c.next(s=>s.type==='state'&&s.phase==='Flight'&&s.flightTime>=.25);
  const travel=Math.hypot(early.ball.x-first.launchPosition.x,early.ball.z-first.launchPosition.z);
  if(range==='full'&&power===.25)assert.ok(travel>5,'Quarter power must already produce a substantial throw');
  if(range==='full'&&power===.5)assert.ok(travel>10,'Half power is around 50 m/s, not a gentle toss');
  rows.push({range,power,actualPower:player.power,expected,measured,travel,time:early.flightTime});
  const reset=c.next(s=>s.type==='state'&&s.phase==='Aim');c.send('recall');await reset;
 }
 const middle=rows.filter(r=>r.range==='full'&&r.power>=.49&&r.power<=.51);
 assert.ok(Math.max(...middle.map(r=>r.measured))-Math.min(...middle.map(r=>r.measured))<4,'No launch-speed cliff around the midpoint');
 await mkdir('artifacts/power-control',{recursive:true});await writeFile('artifacts/power-control/runtime.json',JSON.stringify({origin,rows},null,2)+'\n');
 console.log(JSON.stringify(rows,null,2));console.log('PASS native gentle, midpoint and full-power throws, linear speed, range locking and substantial quarter-power travel');
}finally{c.close();}
