import assert from 'node:assert/strict';
import {ShotStream,RequestBudget} from '../shot-stream.ts';
import {ShotPlayback} from '../public/shot-playback.js';

const budget=new RequestBudget();
for(let i=0;i<900;i++)assert.ok(budget.accept(true,120,budget.updated),'30 seconds of normal queued movement survives reconnect');
for(let i=0;i<180;i++)assert.ok(budget.accept(false,20,budget.updated),'Inputs do not exhaust the command budget');
assert.equal(budget.accept(false,20,budget.updated),false,'Discrete command floods are still rejected');
const bytes=new RequestBudget();assert.equal(bytes.accept(true,300000,bytes.updated),false,'Large input abuse is byte bounded');

const stream=new ShotStream('a');const chunks=[];
for(let i=1;i<=300;i++){
 const t=i/30;
 if(i===60)stream.events.push({type:'impact',time:2,stationTime:12});
 const c=stream.frame({type:'state',attempt:'a',id:'private',releaseTime:10,stationTime:10+t,flightTime:t,phase:i===300?'Result':'Flight',ball:{x:t,y:1,z:0},launchPosition:{x:0,y:1,z:0},rotation:{x:0,y:0,z:0,w:1},players:[],liveScore:{total:i},challenge:{id:'course'}});
 if(c)chunks.push(c);
}
assert.ok(chunks.length<60);assert.ok(chunks.at(-1).complete);
assert.equal(chunks[1].frames[0].challenge,undefined,'Repeated course metadata is shared by the chunk');
const playback=new ShotPlayback();for(const c of chunks)playback.accept(c,0);
playback.result({type:'result',attempt:'a',score:300});
let frame=playback.sample(120);assert.equal(frame.time,10);assert.equal(frame.phase,'Flight');
assert.ok(!frame.messages.some(m=>m.type==='impact'||m.type==='result'));
frame=playback.sample(2120);assert.equal(frame.time,12);assert.equal(frame.messages.filter(m=>m.type==='impact').length,1);
const buffered=playback.stats().shotBufferedSeconds;assert.ok(buffered>7.9);
// No further packets: the same playback module used by the browser must finish.
frame=playback.sample(10120);assert.equal(frame.phase,'Result');assert.equal(frame.after.ball.x,10);assert.equal(frame.messages.filter(m=>m.type==='result').length,1);
frame=playback.sample(15120);assert.equal(frame.time,25,'Escalators keep moving after the ball rests');assert.equal(frame.messages.some(m=>m.type==='result'),false);
playback.accept(chunks.at(-1),15120);assert.equal(playback.shot.frames.length,2,'Reconnect duplicates do not rewind or duplicate samples');
playback.clear(true);for(const c of chunks)playback.accept(c,16000);assert.equal(playback.active,false,'Recalled shots cannot return from delayed packets');
const resumed=new ShotPlayback();resumed.resume({attempt:'a',time:15});for(const c of chunks)resumed.accept(c,20000);assert.equal(resumed.sample(20000).time,15,'Fresh reconnect starts at server presentation time');
const delayed=new ShotPlayback();delayed.resume({attempt:'a',time:21});delayed.accept(chunks[0],30000);assert.equal(delayed.sample(30010),null,'Resume waits for the requested part of the trajectory');
for(const c of chunks.slice(1))delayed.accept(c,30020);delayed.result({type:'result',attempt:'a'});const restored=delayed.sample(30020);assert.ok(restored.time>=21);assert.equal(restored.phase,'Result');assert.ok(restored.messages.some(m=>m.type==='result'),'A completed shot is not replayed from the beginning after reconnect');
console.log('PASS autonomous shot playback, timed effects/results, resume, recall, chunk metadata and input/control flood separation');

const fast=new ShotPlayback();for(const c of chunks)fast.accept(c,0);
fast.result({type:'result',attempt:'a',score:300});fast.sample(120);
fast.setRate(2,1120);assert.equal(fast.sample(2120).time,13,'One second at 1x plus one at 2x');
fast.setRate(1,2620);assert.equal(fast.sample(3120).time,14.5,'Rate changes preserve elapsed time');
fast.setRate(2,3120);frame=fast.sample(5920);assert.equal(frame.phase,'Result');assert.equal(frame.messages.filter(m=>m.type==='result').length,1);
assert.ok(Math.abs(frame.time-20.05)<.00001,'Any time after rest advances the station at 1x');
assert.equal(fast.sample(6920).time,21.05);fast.clear();assert.equal(fast.rate,1);
assert.throws(()=>fast.setRate(0,7000),/Invalid/);
const sparse=new ShotPlayback();sparse.accept(chunks[0],0);sparse.setRate(2,0);frame=sparse.sample(1000);assert.equal(frame.time,chunks[0].frames.at(-1).stationTime,'Fast-forward never invents unavailable physics');
const clock=new ShotStream('clock');clock.started=0;clock.releaseTime=10;clock.setRate(2,1000);assert.equal(clock.elapsed(2000),3);clock.setRate(1,2500);assert.equal(clock.elapsed(3000),4.5,'Resume and native presentation keep the same piecewise clock');
console.log('PASS 2x clocks, rate switching, full-rest completion, bounded buffers and unchanged result payload');
