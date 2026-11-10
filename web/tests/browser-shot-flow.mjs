import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {StaticWorld} from '../public/physics/static-world.js';
import {Shot} from '../public/physics/shot.js';
import {ShotRunner,SHOT_LOOKAHEAD,SHOT_BATCH_STEPS} from '../public/physics/shot-runner.js';
import {ComboTracker} from '../scoring.ts';
import {v,identity} from '../public/physics/math.js';
const until=async check=>{const end=performance.now()+10000;while(!check()){if(performance.now()>end)throw Error('Shot flow timed out');await delay(5);}};
const course={id:'flow',layout:'flow',physics:'kyoto-browser-1',scoring:'waypoint-v4',revision:1,start:{center:v()},waypoints:[]};
const world=new StaticWorld({layoutSha256:'flow',fallLimitY:-1e9,shapes:[],escalators:[]});
const endless=new Shot(world,course,{position:v(0,1e6,0),velocity:v(1,0,0),spin:v(0,5,0)});
let chunks=0,result=null,last,hold=true,maxPoses=0;
const runner=new ShotRunner(endless,{id:'test'},m=>{
 if(m.type==='recording-chunk'){chunks++;last=m;maxPoses=Math.max(maxPoses,m.recording.poses.length);if(!hold)queueMicrotask(()=>runner.acknowledge(m.sequence));}
 else if(m.type==='local-result')result=m;
});
await until(()=>chunks===1);const paused=endless.steps;await delay(30);assert.equal(endless.steps,paused,'No second chunk before storage acknowledges');
runner.acknowledge(last.sequence+1);await delay(20);assert.equal(endless.steps,paused,'Wrong acknowledgment cannot resume computation');
hold=false;runner.acknowledge(last.sequence);await until(()=>endless.ball.clock>=SHOT_LOOKAHEAD);
await delay(30);const parked=endless.steps;await delay(30);assert.equal(endless.steps,parked,'Unplayed flight parks at the lookahead bound');assert.equal(result,null);assert.equal(endless.done,false);assert.equal(endless.poses.length,0);assert.equal(endless.contacts.length,0);
runner.progress(Infinity);await delay(20);assert.equal(endless.steps,parked);
runner.progress(10);await until(()=>endless.ball.clock>=SHOT_LOOKAHEAD+10);assert.ok(endless.ball.clock<SHOT_LOOKAHEAD+10.01);
runner.skip();await until(()=>endless.ball.clock>240);hold=true;await delay(30);
assert.equal(result,null,'Skip must not invent rest for an indefinitely moving shot');assert.equal(endless.done,false);
assert.ok(maxPoses<=SHOT_BATCH_STEPS+1);assert.ok(endless.poses.length<=SHOT_BATCH_STEPS+1);
runner.close();endless.cancel();assert.equal(endless.result().score,0);assert.equal(endless.result().reason,'Recalled');const stopped=endless.steps;await delay(30);assert.equal(endless.steps,stopped);

// Chunking and compacting live score state must reproduce the exact raw solver
// trajectory, impacts, spin, waypoint events, final score and settled endpoint.
const floor={kind:'box',id:'floor',material:'granite',position:v(0,-.5,0),half:v(1000,.5,1000),rotation:identity(),mask:3};
const flat=new StaticWorld({layoutSha256:'flow',fallLimitY:-10,shapes:[floor],escalators:[]}),launch={position:v(0,1.5,0),velocity:v(0,2,12),spin:v(25,10,0)};
const baseline=new Shot(flat,course,launch);while(!baseline.done&&baseline.steps<180*120)baseline.step();assert.ok(baseline.done);
const streamed=new Shot(flat,course,launch),recorded={poses:[],contacts:[],scoreFrames:[]};let final,recordings=0;
const replayRunner=new ShotRunner(streamed,{id:'test'},m=>{
 if(m.type==='recording-chunk'){
  recordings++;for(const key of Object.keys(recorded))recorded[key].push(...m.recording[key]);
  assert.ok(streamed.tracker.contacts.length<=1,'Repeated banks do not accumulate in live score state');
  queueMicrotask(()=>replayRunner.acknowledge(m.sequence));
 }else if(m.type==='local-result')final=m.result;
});replayRunner.skip();await until(()=>final);
assert.ok(recordings>1);assert.equal(final.recordingChunks,recordings);
const {id,recordingChunks,...summary}=final;
assert.deepEqual({...summary,poses:recorded.poses,contacts:recorded.contacts},baseline.result());
assert.deepEqual(streamed.ball.velocity,v());assert.deepEqual(streamed.ball.spin,v());

const original=new ComboTracker(course,-10),compact=new ComboTracker(course,-10);
for(let i=0;i<2000;i++){
 const hit={qualifying:i%3!==0,speed:i%5?2:.5,time:i*.1,surface:'surface-'+i%37,label:'surface '+i%37,point:v(i%23,0,i%11)};
 for(const t of [original,compact]){t.contact(hit);t.poses([{t:hit.time,p:hit.point,q:identity()}]);}
 compact.compactContacts();assert.deepEqual(compact.value(),original.value());assert.ok(compact.contacts.length<=37);
}
world.free();flat.free();
console.log('PASS shot flow: bounded lookahead/recording, storage backpressure, no timeout finish, responsive recall, lossless streamed replay and bounded live bank history');
