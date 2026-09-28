// Full seven-target native proof for the private relay proposal. Never production.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
import {scoreAttempt,waypointRouteComplete} from '../../scoring.ts';
const [proposalPath,outPath]=process.argv.slice(2);for(const p of [proposalPath,outPath])assert(p&&resolve(p).startsWith(resolve('.local')+'/'));
assert(process.env.KYOTO_WORKER_EXECUTABLE);await mkdir(outPath,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),base='.local/station-realism/';
const cb=await readFile(proposalPath+'/catalog.json'),pb=await readFile(proposalPath+'/report.json'),lb=await readFile(base+'station-hall-basement-05/station-layout.json');
const catalog=JSON.parse(cb),proposal=JSON.parse(pb),previous=JSON.parse(await readFile(base+'pillar-approach-02/catalog.json'));
const original=JSON.parse(await readFile('web/starter-challenges.json')).find(c=>c.id==='kyoto-cascade5'),course=catalog.find(c=>c.id===original.id),layout=sha(lb);
assert(proposal.pass&&proposal.nativeSelectionValid);assert.equal(proposal.layoutSha256,layout);assert.equal(course.layout,layout);
assert.equal(course.revision,original.revision+1);assert.equal(course.waypoints.length,7);assert.deepEqual(course.start,original.start);assert.equal(course.goal,null);
assert.deepEqual(course.waypoints[0],original.waypoints[0]);
for(let i=0;i<7;i++){const a=course.waypoints[i],b=original.waypoints[i];assert.deepEqual({...a,center:b.center,surface:b.surface},b);if(i<6){assert(Math.abs(a.center.y-b.center.y)<.001);assert(Math.abs(a.center.x-b.center.x)<=6);}else{assert.equal(a.surface,'hall-basement-lower-floor');assert(a.center.x>=0);assert(Math.abs(a.center.y+4.9135828)<.001);}}
assert.deepEqual({...course.hint,top:original.hint.top},original.hint);
assert.deepEqual({...course,revision:original.revision,layout:original.layout,waypoints:original.waypoints,hint:original.hint,campaign:original.campaign},original);
assert.deepEqual({...course.campaign,distance:original.campaign.distance,brief:original.campaign.brief},original.campaign);assert(course.campaign.distance>=157);
assert.deepEqual(catalog.filter(c=>c.id!==original.id),previous.filter(c=>c.id!==original.id));
const speed=course.hint.holdMs/2800*11.5+.5,input={yaw:course.hint.yaw,pitch:course.hint.pitch,top:course.hint.top,kick:course.hint.kick};
const jobs=[{kind:'hint',speed,input},{kind:'repeat',speed,input},{kind:'angle-neighbor',speed,input:{...input,yaw:input.yaw+.05}},{kind:'charge-plus',speed:speed+.02,input},{kind:'charge-minus',speed:speed-.02,input}];
process.env.KYOTO_LAYOUT=resolve(base+'station-hall-basement-05/station-layout.json');process.env.KYOTO_WORKER_LOG=resolve(outPath,'worker.log');
const worker=new PhysicsWorker(),states=new Map(),events=new Map(),accelerated=new Set();
worker.on('message',m=>{if(['state','shot-frame'].includes(m.type))states.set(m.id,m);if(m.type==='shot-frame'&&!accelerated.has(m.attempt)){accelerated.add(m.attempt);worker.send({type:'playback-rate',id:m.id,request:m.attempt,rate:2});}if(['result','notice'].includes(m.type))events.set(m.id,m);});
const until=async(fn,ms=90000)=>{const end=performance.now()+ms;while(!fn()){assert(performance.now()<end,'Timed out before full rest');await delay(20);}};
const report={meaning:'Full seven-target native course proof; all target sizes, upper start, public levels and long traversal retained. Only this private relay revision is tested.',layoutSha256:layout,catalogSha256:sha(cb),proposalSha256:sha(pb),toolSha256:sha(await readFile(new URL(import.meta.url))),results:[],pass:false};let next=0;
async function run(slot){const id='relay-proof-'+slot;worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);
while(next<jobs.length){const index=next++,shot=jobs[index],row={index,shot};try{await worker.request({type:'select',id,challenge:course});await delay(150);events.delete(id);worker.send({type:'input',id,x:0,z:0,fast:false,...shot.input});await delay(100);
const hold=(shot.speed-.5)/11.5*2800;worker.send({type:'charge',id,request:randomUUID(),powerRange:'precision'});await delay(hold);worker.send({type:'release',id,power:hold/2800});await until(()=>events.has(id),120000);
const r=events.get(id),bytes=Buffer.from(JSON.stringify(r));await writeFile(resolve(outPath,index+'.json'),bytes);row.traceSha256=sha(bytes);assert.equal(r.type,'result',r.message);assert.equal(r.layout,layout);assert.equal(r.challenge.id,course.id);assert.equal(r.challenge.waypoints.length,7);await until(()=>states.get(id)?.phase==='Result');const s=states.get(id);assert(s.diagnostics.sleeping);assert(Math.hypot(...Object.values(s.velocity))<1e-5);assert(Math.hypot(...Object.values(s.spin))<1e-5);row.rest=true;
row.hits=r.waypointHits.map(h=>h.waypointId);row.fullClear=course.waypoints.every(w=>row.hits.includes(w.id));row.final=r.poses.at(-1).p;row.duration=r.duration;row.pathLengthM=r.poses.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...['x','y','z'].map(k=>p.p[k]-r.poses[i].p[k])),0);assert(row.fullClear,'Must collect all seven targets');assert.equal(r.success,r.destinationReached);row.authoritativeScore=scoreAttempt(r).total;assert(row.authoritativeScore>0);assert(waypointRouteComplete(course,r.waypointHits,!!r.destinationReached));row.pass=true;
}catch(error){row.error=String(error);row.pass=false;row.lastState=states.get(id)?{phase:states.get(id).phase,velocity:states.get(id).velocity,spin:states.get(id).spin,diagnostics:states.get(id).diagnostics}:null;}
report.results.push(row);await writeFile(outPath+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(row));worker.send({type:'recall',id});await delay(150);}worker.send({type:'leave',id});}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{worker.stop();process.exit(130)});
try{await worker.start();await until(()=>worker.ready);await Promise.all(Array.from({length:4},(_,i)=>run(i)));report.pass=report.results.length===jobs.length&&report.results.every(r=>r.pass);}finally{worker.stop();await writeFile(outPath+'/report.json',JSON.stringify(report,null,2)+'\n');}
assert(report.pass,'Relay revision did not pass all native trials');
