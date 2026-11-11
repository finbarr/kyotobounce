import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {InputRecorder,INPUT_CHUNK_RUNS} from '../public/physics/input-recorder.js';
import {GameSession} from '../public/physics/session.js';
import {StaticWorld} from '../public/physics/static-world.js';
import {ShotVerification} from '../verification.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {STEP} from '../public/physics/ball.js';
import {v,identity} from '../public/physics/math.js';
const course={id:'inputs',name:'Inputs',layout:'inputs',physics:BROWSER_PHYSICS,revision:1,scoring:'waypoint-v4',start:{center:v()},waypoints:[],hint:{yaw:180,pitch:5,top:0,kick:0,powerRange:'precision'}};
const messages=[],recorder=new InputRecorder(course,m=>messages.push(structuredClone(m)));
assert.equal(recorder.acknowledge(null),false);recorder.acknowledge(-1);
for(let i=0;i<50000;i++)assert.ok(recorder.record({x:0,z:0},123,false));assert.equal(recorder.runs.length,1,'Standing still is one run, regardless of elapsed time');
assert.equal(recorder.seal(),false);assert.equal(messages.at(-1).runs[0].steps,50000);recorder.acknowledge(0);assert.ok(recorder.seal());
const original=structuredClone(messages),proof=recorder.proof({yaw:0,pitch:5,top:0,kick:0},.3,'precision',300,301);
for(let i=0;i<INPUT_CHUNK_RUNS*2+5;i++){
 const input={x:i%2?1:-1,z:0};if(!recorder.record(input,0,false)){const before=recorder.steps;assert.equal(recorder.record(input,0,false),false);assert.equal(recorder.steps,before);recorder.acknowledge(recorder.waiting);assert.ok(recorder.record(input,0,false));}
 assert.ok(recorder.runs.length<=INPUT_CHUNK_RUNS);
}
assert.deepEqual(messages[1],original[1],'Later walking never changes a persisted prefix');assert.equal(proof.header.walkSteps,50000);assert.equal(proof.chunks,1);
recorder.close();assert.equal(recorder.record({x:1,z:0},0,false),false);assert.equal(recorder.acknowledge(recorder.waiting),false);

const world=new StaticWorld({layoutSha256:'inputs',fallLimitY:-10,shapes:[{kind:'box',id:'floor',position:v(0,-.1,0),half:v(100,.1,100),rotation:identity(),material:'stone',mask:3}],escalators:[]});
let session,packets=[],results=[],auto=false;const routes=new Map();
const receive=m=>{
 if(m.type==='input-start'){routes.set(m.route,[]);packets.push({type:'input-ack',route:m.route,sequence:-1});}
 if(m.type==='input-chunk'){assert.ok(m.runs.length<=INPUT_CHUNK_RUNS);routes.get(m.route).push(structuredClone(m.runs));packets.push({type:'input-ack',route:m.route,sequence:m.sequence});}
 if(m.type==='recording-chunk')queueMicrotask(()=>session.handle({type:'recording-ack',attempt:m.attempt,sequence:m.sequence}));
 if(m.type==='local-result')results.push(m.result);
 if(auto)queueMicrotask(()=>{for(const p of packets.splice(0))session.handle(p);});
};
const tick=()=>{session.lastTick=performance.now()-STEP*1100;session.tick();};
const until=async check=>{const end=performance.now()+10000;while(!check()){assert.ok(performance.now()<end,'Controller recording timed out');await delay(2);}};
try{
 session=new GameSession(world,[course],'player',receive);clearInterval(session.timer);
 for(let i=0;i<INPUT_CHUNK_RUNS+20;i++){session.handle({type:'input',x:i%2?.5:-.5,z:.1,yaw:0,pitch:5,top:0,kick:0,fast:true});tick();}
 const parked={feet:structuredClone(session.walker.feet),steps:session.inputs.steps,time:session.stationTime};
 for(let i=0;i<20;i++){session.handle({type:'input',x:i%2?.2:-.2,z:0,yaw:0,pitch:5,top:0,kick:0,fast:false});tick();}
 assert.deepEqual({feet:session.walker.feet,steps:session.inputs.steps,time:session.stationTime},parked,'Slow storage pauses walking and its clock without losing control steps');
 session.handle({type:'input-ack',route:'stale',sequence:-1});tick();assert.equal(session.inputs.steps,parked.steps);
 session.handle(packets.shift());tick();assert.ok(session.inputs.steps>parked.steps);
 session.handle({type:'charge',powerRange:'precision'});session.power=.3;session.phase='Release';session.launch();
 assert.equal(session.phase,'Release');assert.ok(session.launchWaiting);const releaseTime=session.stationTime;for(let i=0;i<20;i++)tick();assert.equal(session.stationTime,releaseTime,'Release waits for durable controls without extra unrecorded motion');
 auto=true;for(const p of packets.splice(0))session.handle(p);await until(()=>session.runner);session.runner.skip();await until(()=>results.length===1);
 const first=results[0],route=first.inputs.route,commands=routes.get(route).slice(0,first.inputs.chunks).flat();
 const job=new ShotVerification(world,course,first.inputs.header,commands,{attempt:first.attempt,subject:'player'});let reply;do{reply=await job.advance();}while(reply.status!=='verified');
 for(const key of ['launchPosition','velocity','spin','thrower','score','duration','breakdown'])assert.deepEqual(reply.result[key],first[key],key);
 session.handle({type:'bank-result',attempt:first.attempt});session.handle({type:'charge',powerRange:'precision'});session.power=.3;session.launch();session.runner.skip();await until(()=>results.length===2);
 assert.equal(results[1].inputs.route,route);assert.equal(results[1].inputs.chunks,first.inputs.chunks,'Repeated throws share the same saved walking prefix');assert.equal(results[1].inputs.header.walkSteps,first.inputs.header.walkSteps);
 session.handle({type:'recall'});session.handle({type:'home'});assert.notEqual(session.inputs.id,route,'Home begins a fresh canonical route');
 session.handle({type:'input-error',route:session.inputs.id});assert.equal(session.phase,'Aim');assert.ok(session.inputs.closed);assert.equal(session.attempt,null);
}finally{session?.close();world.free();}
console.log('PASS control recording: compressed idle steps, immutable shared prefixes, bounded storage backpressure, stale acknowledgments, release fencing, exact independent controller reconstruction, repeated throws, home and storage failure forfeiture');
