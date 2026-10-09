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
const cancelledDesign=new ShotPlayback();for(const chunk of chunks)cancelledDesign.accept(chunk,0);
assert.equal(cancelledDesign.cancelForNotice({type:'notice',id:'other',message:'Shot recalled'},'designer'),false);
assert.equal(cancelledDesign.active,true,'Another session cannot cancel this buffered shot');
assert.equal(cancelledDesign.cancelForNotice({type:'notice',id:'designer',message:'Ball left the station'},'designer'),true);
assert.equal(cancelledDesign.active,false,'A native cancellation must unfreeze the browser even without a result');
for(const chunk of chunks)cancelledDesign.accept(chunk,100);
assert.equal(cancelledDesign.active,false,'Late chunks cannot bring an abandoned design shot back');
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

const skip=new ShotPlayback(),result={type:'result',attempt:'a',score:300};
assert.equal(skip.skipToEnd(),false);
skip.accept(chunks[0],0);skip.sample(120);assert(skip.skipToEnd());
assert(skip.skipping);frame=skip.sample(121);assert.equal(frame.jumped,false);assert.equal(frame.phase,'Flight','Skip waits for the full native trajectory');
for(const c of chunks.slice(1))skip.accept(c,121);
frame=skip.sample(122);assert.equal(frame.jumped,false);assert.equal(frame.phase,'Flight','Resting frames cannot invent an authoritative score');
skip.result(result);frame=skip.sample(123);
assert.equal(frame.phase,'Result');assert.equal(frame.jumped,true);assert.equal(frame.after.ball.x,10);
assert.deepEqual(frame.messages.map(m=>m.type),['state','result'],'Skipped impact events must not burst at the end');
assert.equal(frame.messages.at(-1),result);assert.equal(skip.skipping,false);assert.equal(skip.rate,1);
assert.equal(skip.skipToEnd(),false,'Repeated skips cannot issue another result');
assert.equal(skip.sample(124).messages.filter(m=>m.type==='result').length,0);
const skipClock=new ShotStream('resume-skip');skipClock.started=performance.now();skipClock.skipToEnd();
assert.equal(skipClock.resume().skipToEnd,true,'A skip intent survives a reconnect while computing');
for(const c of chunks)for(const frame of c.frames)skipClock.frame({...c.base,...frame,attempt:'resume-skip'});
assert(skipClock.resume().time>=19.8,'A completed skip advances the resume clock to rest');
const reconnectSkip=new ShotPlayback();reconnectSkip.resume({...skipClock.resume(),attempt:'a'});
for(const c of chunks)reconnectSkip.accept(c,0);reconnectSkip.result(result);
assert.equal(reconnectSkip.sample(1).jumped,true,'Reconnect goes directly to the finished shot');
const recalledSkip=new ShotPlayback();recalledSkip.expect('a');recalledSkip.accept(chunks[0],0);recalledSkip.skipToEnd();recalledSkip.waitForAttempt();
for(const c of chunks)recalledSkip.accept(c,1);assert.equal(recalledSkip.result(result),false);assert.equal(recalledSkip.active,false);assert.equal(recalledSkip.skipping,false);
console.log('PASS skip waits for authoritative rest/result, emits once, drops skipped effects, restores after reconnect and forfeits on recall');
