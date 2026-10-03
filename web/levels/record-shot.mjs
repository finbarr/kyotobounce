// Record one real design ball through an isolated local service. The output is
// authoring evidence, not a published course or a client-authorized score.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {Client,delay} from '../tests/api-client.mjs';
const [inputPath,outputPath]=process.argv.slice(2);
assert(inputPath&&outputPath,'Usage: node web/levels/record-shot.mjs input.json .local/campaign/capture.json');
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Use an isolated local server');
const out=resolve(outputPath);assert(out.startsWith(resolve('.local')+'/'));
const input=JSON.parse(await readFile(inputPath));
assert(input.hint.holdMs>=0&&input.hint.holdMs<=2800);
const observeSeconds=input.observeSeconds??120;
assert(observeSeconds>=20&&observeSeconds<=120,'Observe for 20–120 seconds; a timeout never counts as rest');
const playbackRate=input.playbackRate??1;
assert(playbackRate===1||playbackRate===2,'Use normal or built-in 2× playback');
const c=new Client(origin.replace(/^http/,'ws'));
let playbackTimer;
try{
 await c.join();
 const rayHeight=input.startRayHeight??3;
 assert(Number.isFinite(rayHeight)&&rayHeight>0&&rayHeight<=3,'Start ray height must be in (0, 3] metres');
 const start=(await c.request('place',{slot:'start',radius:input.startRadius||.4,origin:{...input.start,y:input.start.y+rayHeight},direction:{x:0,y:-1,z:0}},'placement')).disk;
 assert(Math.abs(start.center.y-input.start.y)<.1,'Start ray found another floor; shorten startRayHeight below the ceiling');
 await c.request('design-start',{start},'design-ready');await delay(200);
 if(playbackRate===2)playbackTimer=setInterval(()=>{
  if(c.playback.active&&c.playback.rate!==2){
   c.playback.setRate(2,performance.now());
   c.send('playback-rate',{attempt:c.playback.shot.attempt,rate:2});
  }
 },20);
 const shot=await c.throw(input.hint.holdMs,input.hint,observeSeconds*1000);
 const r=shot.result,thrower=r.thrower;
 assert.equal(r.saved,false);assert.equal(r.reason,'Ball stopped');
 assert.equal(Math.hypot(...Object.values(shot.state.velocity)),0);
 assert.equal(Math.hypot(...Object.values(shot.state.spin)),0);
 const hint=Object.fromEntries(['yaw','pitch','top','kick','powerRange'].map(k=>[k,thrower[k]]));
 hint.holdMs=thrower.power*2800;
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,JSON.stringify({input,hint,...shot},null,2)+'\n');
 assert(r.design&&!r.design.error,r.design?.error||'Native capture missing');
 console.log(JSON.stringify({out,layout:r.layout,hint,duration:r.duration,start:r.design.start,goal:r.design.goal,waypoints:r.design.waypoints}));
}catch(error){
 await mkdir(dirname(out),{recursive:true});
 const s=c.state;
 await writeFile(out.replace(/\.json$/,'')+'.failure.json',JSON.stringify({input,error:error.message,phase:s?.phase,ball:s?.ball,velocity:s?.velocity,spin:s?.spin,flightTime:s?.flightTime,diagnostics:s?.diagnostics,contacts:c.messages.filter(m=>m.type==='impact')},null,2)+'\n');
 throw error;
}finally{clearInterval(playbackTimer);c.close();}
