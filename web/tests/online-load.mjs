import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN;if(!origin?.startsWith('https://'))throw new Error('Set KYOTO_TEST_ORIGIN');
const clients=Array.from({length:12},()=>new Client(origin.replace(/^https/,'wss')));
let inputTimer;
try{
 await Promise.all(clients.map(c=>c.join()));
 assert.equal(new Set(clients.map(c=>c.id)).size,12);
 await Promise.all(clients.map(c=>c.request('select-challenge',{challengeId:null},'selected')));
 // Four live balls and eight independent observers. Exploration writes no ranked attempts.
 clients.slice(0,4).forEach(c=>c.input({yaw:90,pitch:35,top:30,kick:15}));await delay(200);
 clients.slice(0,4).forEach(c=>c.send('charge',{challengeId:null,revision:null,layout:c.state.layout,physics:c.state.physics}));
 await delay(850);clients.slice(0,4).forEach(c=>c.send('release'));
 inputTimer=setInterval(()=>clients.forEach(c=>c.input({yaw:90,pitch:35,top:30,kick:15})),33);
 await delay(1000);const start=performance.now(),clock=clients.map(c=>c.state.stationTime),counts=clients.map(c=>c.messages.filter(m=>m.type==='state').length);
 await delay(8000);const wall=(performance.now()-start)/1000;
 const sessions=clients.map((c,i)=>({id:c.id,phase:c.state.phase,clockRate:(c.state.stationTime-clock[i])/wall,updatesPerSecond:(c.messages.filter(m=>m.type==='state').length-counts[i])/wall,players:c.state.players.length}));
 for(const s of sessions){assert.ok(s.clockRate>.85,`Clock kept pace: ${s.clockRate}`);assert.ok(s.updatesPerSecond>15,`State delivery: ${s.updatesPerSecond}`);assert.equal(s.players,1);}
 assert.ok(sessions.slice(0,4).every(s=>s.phase==='Flight'));assert.ok(sessions.slice(4).every(s=>s.phase==='Aim'));
 await mkdir('artifacts/online/verification',{recursive:true});await writeFile('artifacts/online/verification/load.json',JSON.stringify({status:'pass',concurrentSessions:12,activeThrows:4,wall,sessions},null,2));
 console.log('PASS 12 simultaneous players, four live throws, independent state, simulation pace and update delivery');
}finally{clearInterval(inputTimer);clients.forEach(c=>c.close());}
