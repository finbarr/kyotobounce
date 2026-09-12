// Runs the authored campaign in isolated native sessions, never on production.
// A shot must finish at full physical rest. Timeouts and recalls do not pass.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../worker.ts';
const out=resolve(process.argv[2]||`.local/campaign-proof-${Date.now()}`);
if(!out.startsWith(resolve('.local')+'/'))throw Error('Proof output must be under this worktree .local/');
if(!process.env.KYOTO_WORKER_EXECUTABLE)throw Error('Select a compatible KYOTO_WORKER_EXECUTABLE explicitly');
await mkdir(out,{recursive:false});process.env.KYOTO_WORKER_LOG=resolve(out,'worker.log');
const bytes=await readFile('runtime/station-layout.json'),layout=createHash('sha256').update(bytes).digest('hex');
const campaignBytes=await readFile('web/starter-challenges.json'),courses=JSON.parse(campaignBytes);
const selectedIds=process.argv[3]?.split(',');
if(selectedIds)for(const id of selectedIds)assert.ok(courses.some(c=>c.id===id),`Unknown stage ${id}`);
await writeFile(resolve(out,'catalog.json'),campaignBytes);
const fixture=JSON.parse(await readFile('web/levels/proof-inputs.json'));
assert.equal(fixture.layout,layout);
const worker=new PhysicsWorker(),states=new Map(),events=new Map();let ready;
worker.on('message',m=>{if(m.type==='ready')ready=m;if(m.type==='state')states.set(m.id,m);if(['result','notice'].includes(m.type))events.set(m.id,m);});
const until=async(f,ms=15000)=>{const end=performance.now()+ms;while(!f()){if(performance.now()>end)throw Error('Observation timed out before rest');await delay(10);}};
const jobs=fixture.courses.filter(p=>!selectedIds||selectedIds.includes(p.id)).flatMap(proof=>{
 const challenge=courses.find(c=>c.id===proof.id&&c.revision===proof.revision);assert.ok(challenge,`Current course ${proof.id}`);
 return [...Array.from({length:proof.repeat},()=>({kind:'hint',shot:proof.shot})),...proof.neighbors.map(shot=>({kind:'neighbor',shot}))].map(job=>({...job,challenge}));
});
let next=0;const receipts=[];
async function run(slot){
 const id=`campaign-proof-${slot}`;worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length,30000);
 while(next<jobs.length){const index=next++,{challenge,shot,kind}=jobs[index];const receipt={index,id:challenge.id,kind,shot};
  try{
   assert.equal(challenge.layout,layout);assert.equal(challenge.physics,ready.physics);
   await worker.request({type:'select',id,challenge});await delay(150);events.delete(id);
   worker.send({type:'input',id,x:0,z:0,fast:false,...shot.input});await delay(100);
   const holdMs=shot.holdMs??(shot.speed-.5)/(shot.range==='precision'?11.5:99.5)*2800;
   assert.ok(holdMs>=0&&holdMs<=2800);
   if(shot.period){const t=states.get(id).stationTime,target=shot.phase+Math.ceil((t+holdMs/1000+.3-shot.phase)/shot.period)*shot.period;await delay(Math.max(0,(target-t-holdMs/1000-.12)*1000));}
   worker.send({type:'charge',id,request:randomUUID(),powerRange:shot.range});await delay(holdMs);
   // Trusted service-to-worker field, derived from the real authored charge.
   worker.send({type:'release',id,power:holdMs/2800});
   await until(()=>events.has(id),Math.min(120,shot.observeSeconds||80)*1000);
   const result=events.get(id);assert.equal(result.type,'result',result.message);
   await until(()=>states.get(id)?.phase==='Result');
   const state=states.get(id);assert.equal(state.diagnostics.sleeping,true);assert.ok(Math.hypot(...Object.values(state.velocity))<1e-5);assert.ok(Math.hypot(...Object.values(state.spin))<1e-5);
   const hitIds=new Set(result.waypointHits.map(h=>h.waypointId));
   receipt.duration=result.duration;receipt.hits=[...hitIds];receipt.destinationReached=result.destinationReached;receipt.final=result.poses.at(-1).p;
   if(challenge.scoring==='waypoint-v1'){
    assert.ok(hitIds.size>0||result.destinationReached,'A completed shot must earn points');
    if(kind==='hint')for(const target of challenge.waypoints)assert.ok(hitIds.has(target.id),`Suggested shot misses ${target.id}`);
   }else assert.ok(result.success,'Suggested classic shot must reach its destination');
   receipt.pass=true;
  }catch(error){receipt.pass=false;receipt.error=error.message;}
  receipts.push(receipt);console.log(JSON.stringify(receipt));worker.send({type:'recall',id});await delay(150);
 }
 worker.send({type:'leave',id});
}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{worker.stop();process.exit(130);});
try{await worker.start();await until(()=>worker.ready,65000);assert.ok(worker.capabilities.includes('waypoint-v1'));await Promise.all(Array.from({length:4},(_,i)=>run(i)));}
finally{worker.stop();await writeFile(resolve(out,'summary.json'),JSON.stringify({layout,physics:ready?.physics,executable:process.env.KYOTO_WORKER_EXECUTABLE,campaignHash:createHash('sha256').update(campaignBytes).digest('hex'),receipts:receipts.sort((a,b)=>a.index-b.index)},null,2));}
assert.equal(receipts.length,jobs.length);assert.ok(receipts.every(r=>r.pass),'Campaign proof failed; inspect summary.json');
console.log(`PASS ${new Set(jobs.map(j=>j.challenge.id)).size} stages, ${receipts.length} shots at full native rest`);
