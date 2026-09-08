// Isolated direct-native authoring probe. Never connects to a running service.
// Real charge/release and full native stepping; a timeout is inconclusive, not a result.
// The trusted service supplies release.power to native. This harness explicitly
// derives that field from its authored hold duration; it is not a browser protocol field.
import { PhysicsWorker } from '../worker.ts';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const [file,outArg]=process.argv.slice(2);
if(!file||!outArg||!process.env.KYOTO_WORKER_EXECUTABLE)throw Error('Usage: KYOTO_WORKER_EXECUTABLE=... node web/levels/native-proof.mjs fixture.json .local/proofs/fresh');
const out=resolve(outArg);if(!out.startsWith(resolve('.local')+'/'))throw Error('Receipts must be under this checkout .local/');
await mkdir(out,{recursive:false});
process.env.KYOTO_WORKER_LOG=resolve(out,'worker.log');
const fixture=JSON.parse(await readFile(file,'utf8'));
if(!fixture.shots?.length||fixture.shots.length>48)throw Error('Choose 1–48 bounded shots');
const bytes=await readFile(process.env.KYOTO_LAYOUT||'runtime/station-layout.json');
const layout=createHash('sha256').update(bytes).digest('hex');
const workerHash=createHash('sha256').update(await readFile(process.env.KYOTO_WORKER_EXECUTABLE)).digest('hex');
const assemblyPath=resolve(dirname(process.env.KYOTO_WORKER_EXECUTABLE),'KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll');
const assemblyHash=createHash('sha256').update(await readFile(assemblyPath)).digest('hex');
const worker=new PhysicsWorker();let state;let events=[];
worker.on('message',m=>{events.push({...m,received:performance.now()});if(m.type==='state')state=m;});
const until=async(predicate,timeout=15000)=>{const end=performance.now()+timeout;while(!predicate()){if(performance.now()>end)throw Error('Observation timeout');await delay(5);}};
const results=[];const id='k019-proof';
const harnessHash=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{worker.stop();process.exit(130);});
try{
 await worker.start();await until(()=>worker.ready,65000);
 if(!fixture.preliminary&&!worker.capabilities.includes('waypoint-v1'))throw Error('Final acceptance requires advertised waypoint-v1 capability');
 worker.send({type:'join',id});await until(()=>state?.players?.length);
 for(const [index,shot] of fixture.shots.entries()){
  events=[];const challenge=structuredClone(shot.challenge||fixture.challenge);
  challenge.layout=layout;challenge.physics=state.physics;
  if(fixture.preliminary){challenge.scoring='combo-v5';challenge.waypoints=[];}
  try{
   await worker.request({type:'select',id,challenge});await delay(100);
   const settings={x:0,z:0,fast:false,yaw:90,pitch:15,top:0,kick:0,...shot.input};
   worker.send({type:'input',id,...settings});await delay(100);
   const holdMs=shot.holdMs??(shot.speed-.5)/(shot.range==='precision'?11.5:99.5)*2800;
   if(!Number.isFinite(holdMs)||holdMs<0||holdMs>2800)throw Error('Invalid charge duration');
   if(shot.period){const target=shot.phase+Math.ceil((state.stationTime+holdMs/1000+.3-shot.phase)/shot.period)*shot.period;await delay(Math.max(0,(target-state.stationTime-holdMs/1000-.12)*1000));}
   const before=performance.now();worker.send({type:'charge',id,request:randomUUID(),powerRange:shot.range||'precision'});await delay(holdMs);worker.send({type:'release',id,power:holdMs/2800});
   const limit=Math.min(120,shot.observeSeconds||60)*1000;
   let outcome='inconclusive';
   try{await until(()=>events.some(m=>m.type==='result'||m.type==='notice'),limit);outcome=events.some(m=>m.type==='result')?'rest-result':'cancelled';}catch{}
   await delay(50);
   const result=events.find(m=>m.type==='result'),states=events.filter(m=>m.type==='state');
   const row={index,shot,challenge,outcome,wallSeconds:(performance.now()-before)/1000,result,final:state,events};
   await writeFile(resolve(out,`shot-${index}.json`),JSON.stringify(row));
   results.push({index,outcome,success:result?.success,reason:result?.reason,final:state.ball,spin:state.spin,velocity:state.velocity,duration:result?.duration,surfaces:[...new Set(events.filter(m=>m.type==='impact').map(m=>m.surface))],thrower:result?.thrower,releaseTime:result?.releaseTime,states:states.length});
  }catch(error){results.push({index,outcome:'validation-error',message:error.message});}
  console.log(JSON.stringify(results.at(-1)));worker.send({type:'recall',id});await delay(60);
 }
}finally{
 worker.send({type:'leave',id});await worker.stop();
 await writeFile(resolve(out,'summary.json'),JSON.stringify({scope:fixture.preliminary?'PRELIMINARY classic native trajectory only; no waypoint or browser acceptance':'Native proof; browser acceptance separately required',layout,workerHash,assemblyHash,harnessHash,capabilities:worker.capabilities,fixture,results},null,2));
}
