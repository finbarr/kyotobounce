// Unranked route study; no catalog edits and no course-clear claims.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,configPath,outPath,mode="design"]=process.argv.slice(2);
assert(["design","prefix"].includes(mode));
for(const p of [layoutPath,configPath,outPath]) assert(p&&resolve(p).startsWith(resolve('.local')+'/'));
assert(process.env.KYOTO_WORKER_EXECUTABLE);
await mkdir(outPath,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const lb=await readFile(layoutPath),cb=await readFile('web/starter-challenges.json'),jb=await readFile(configPath);
const c=JSON.parse(cb).find(c=>c.id==='kyoto-cascade5'),jobs=JSON.parse(jb);
assert(jobs.length>0&&jobs.length<=40);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(outPath,'worker.log');
const worker=new PhysicsWorker(),states=new Map(),events=new Map(),accelerated=new Set();
worker.on('message',m=>{if(['state','shot-frame'].includes(m.type))states.set(m.id,m);if(m.type==='shot-frame'&&!accelerated.has(m.attempt)){accelerated.add(m.attempt);worker.send({type:'playback-rate',id:m.id,request:m.attempt,rate:2});}if(['result','notice'].includes(m.type))events.set(m.id,m);});
const until=async(fn,ms=90000)=>{const end=performance.now()+ms;while(!fn()){assert(performance.now()<end,'Timed out before full rest');await delay(20);}};
const report={meaning:'Isolated route diagnostics. Design mode is unranked. Prefix mode checks only the first six original targets with the replacement floor ID, omitting the invalid seventh target for diagnosis. Neither mode proves the seven-target course. Contact distances are only sparse impact samples, not authoritative waypoint hits. No catalog or scoring change.',layoutSha256:sha(lb),catalogSha256:sha(cb),configSha256:sha(jb),toolSha256:sha(await readFile(new URL(import.meta.url))),mode,results:[]};let next=0;
async function run(slot){const id='relay-route-'+slot;worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);
while(next<jobs.length){const index=next++,shot=jobs[index],row={index,shot};try{
assert(shot.speed>=4.5&&shot.speed<=12);assert(shot.yaw>=75&&shot.yaw<=78);assert((shot.pitch??0)>=-45&&(shot.pitch??0)<=0);assert((shot.top??-100)>=-110&&(shot.top??-100)<=200);
const start=(await worker.request({type:'place',id,slot:'start',radius:c.start.radius,origin:{...c.start.center,y:c.start.center.y+.4},direction:{x:0,y:-1,z:0}})).disk;
assert(Math.hypot(...['x','y','z'].map(k=>start.center[k]-c.start.center[k]))<.001);assert.equal(start.radius,c.start.radius);
if(mode==='design')await worker.request({type:'design-start',id,start});
else {const prefix=structuredClone(c);prefix.layout=report.layoutSha256;prefix.waypoints=prefix.waypoints.slice(0,6);prefix.waypoints[5].surface='hall-bay-floor-surface';await worker.request({type:'select',id,challenge:prefix});}
await delay(150);events.delete(id);
worker.send({type:'input',id,x:0,z:0,fast:false,yaw:shot.yaw,pitch:shot.pitch??0,top:shot.top??-100,kick:0});await delay(100);
const hold=(shot.speed-.5)/11.5*2800;worker.send({type:'charge',id,request:randomUUID(),powerRange:'precision'});await delay(hold);worker.send({type:'release',id,power:hold/2800});await until(()=>events.has(id),120000);
const r=events.get(id),bytes=Buffer.from(JSON.stringify(r));await writeFile(resolve(outPath,index+'.json'),bytes);row.traceSha256=sha(bytes);
assert.equal(r.type,'result',r.message);assert.equal(r.layout,report.layoutSha256);if(mode==='design'){assert(!r.challenge?.id);assert(r.design);}else{assert.equal(r.challenge.id,c.id);assert.equal(r.challenge.waypoints.length,6);row.prefixHits=r.waypointHits.map(h=>h.waypointId);row.prefixComplete=c.waypoints.slice(0,6).every(w=>row.prefixHits.includes(w.id));}await until(()=>states.get(id)?.phase==='Result');const s=states.get(id);assert(s.diagnostics.sleeping);assert(Math.hypot(...Object.values(s.velocity))<1e-5);assert(Math.hypot(...Object.values(s.spin))<1e-5);
row.rest=true;row.duration=r.duration;row.final=r.poses.at(-1).p;row.pathLengthM=r.poses.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...['x','y','z'].map(k=>p.p[k]-r.poses[i].p[k])),0);
row.contactDistances=c.waypoints.map(w=>{const contacts=r.contacts.filter(b=>(b.surface===w.surface||(w.surface==='concourse'&&b.surface==='hall-bay-floor-surface'))&&Math.abs(b.point.y-w.center.y)<.01);return{id:w.id,radius:w.radius,distance:contacts.length?Math.min(...contacts.map(b=>Math.hypot(b.point.x-w.center.x,b.point.z-w.center.z))):null};});
row.newHallContacts=r.contacts.filter(b=>/^(hall-bay-well|hall-basement|hall-b1)/.test(b.surface)).map(({surface,time,point,speed})=>({surface,time,point,speed}));
}catch(e){row.error=String(e);const s=states.get(id);if(s)row.lastState={phase:s.phase,position:s.position,velocity:s.velocity,spin:s.spin,diagnostics:s.diagnostics};}report.results.push(row);await writeFile(resolve(outPath,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({index,...shot,rest:row.rest,prefixHits:row.prefixHits,final:row.final,pathLengthM:row.pathLengthM,distances:row.contactDistances?.map(x=>x.distance===null?null:Number(x.distance.toFixed(3))),error:row.error}));worker.send({type:'recall',id});await delay(150);}worker.send({type:'leave',id});}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{worker.stop();process.exit(130)});
try{await worker.start();await until(()=>worker.ready);await Promise.all(Array.from({length:Math.min(4,jobs.length)},(_,i)=>run(i)));}finally{worker.stop();await writeFile(resolve(outPath,'report.json'),JSON.stringify(report,null,2)+'\n');}
assert.equal(report.results.length,jobs.length);
