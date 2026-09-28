// Propose seven same-sized targets on the same succession of levels, ending on B1.
// Native placement is not course acceptance; full shots and keyboard checks follow.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [tracePath,configPath,indexArg,outPath]=process.argv.slice(2),index=Number(indexArg);
for(const p of [tracePath,configPath,outPath])assert(p&&resolve(p).startsWith(resolve('.local')+'/'));
assert(Number.isInteger(index));assert(process.env.KYOTO_WORKER_EXECUTABLE);await mkdir(outPath,{recursive:false});
const base='.local/station-realism/',sha=b=>createHash('sha256').update(b).digest('hex');
const lb=await readFile(base+'station-hall-basement-05/station-layout.json'),tb=await readFile(tracePath),cb=await readFile('web/starter-challenges.json'),jb=await readFile(configPath);
const layout=sha(lb),trace=JSON.parse(tb),shot=JSON.parse(jb)[index],old=JSON.parse(cb).find(c=>c.id==='kyoto-cascade5');
assert.equal(trace.layout,layout);assert(!trace.challenge?.id);assert(trace.design);assert.equal(shot.speed,5);assert.equal(shot.yaw,old.hint.yaw);assert.equal(shot.pitch??0,0);
const pathLength=trace.poses.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...['x','y','z'].map(k=>p.p[k]-trace.poses[i].p[k])),0);assert(pathLength>=157);
const catalog=JSON.parse(await readFile(base+'pillar-approach-02/catalog.json')),course=catalog.find(c=>c.id===old.id);assert.deepEqual({...course,layout:old.layout},old);
course.revision++;course.hint={...old.hint,top:shot.top};course.campaign={...old.campaign,distance:Number(pathLength.toFixed(1)),brief:'Tag the upper landing, then relay the ball down the stairs and escalators through the concourse to B1. The distant patches turn a small opening into a huge chain.'};
process.env.KYOTO_LAYOUT=resolve(base+'station-hall-basement-05/station-layout.json');process.env.KYOTO_WORKER_LOG=resolve(outPath,'worker.log');
const worker=new PhysicsWorker(),id='relay-placement';let state;worker.on('message',m=>{if(m.id===id&&m.type==='state')state=m});
const until=async fn=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end);await delay(20);}};
const report={status:'Unaccepted seven-target proposal. No course-clear claim.',layoutSha256:layout,sourceCatalogSha256:sha(cb),sourceTrace:{path:resolve(tracePath),sha256:sha(tb)},config:{path:resolve(configPath),sha256:sha(jb)},index,shot,pathLengthM:pathLength,placements:[],pass:false};
try{await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
let previousTime=0;
for(let i=0;i<7;i++){
 const w=old.waypoints[i],y=i===6?-4.913582801818848:w.center.y;
 const surfaces=i===6?['hall-basement-lower-floor']:i===5?['concourse','hall-bay-floor-surface']:[w.surface];
 let candidates=[];
 if(i===0)candidates=[{point:w.center,time:.866}];
 else {
  candidates=trace.contacts.filter(c=>surfaces.includes(c.surface)&&Math.abs(c.point.y-y)<.001&&c.time>previousTime+.1).map(c=>({point:c.point,time:c.time}));
  if(i<6)for(const p of trace.poses){if(p.t<=previousTime+.1||Math.abs(p.p.y-y-.0232)>.002)continue;candidates.push({point:{x:p.p.x,y,z:p.p.z},time:p.t});}
  candidates=candidates.filter(c=>i===6?c.point.x>=0:Math.abs(c.point.x-w.center.x)<=6);
  candidates.sort((a,b)=>i===6?a.time-b.time:Math.abs(a.point.x-w.center.x)-Math.abs(b.point.x-w.center.x));
 }
 let selected;
 for(const c of candidates){try{const reply=await worker.request({type:'place',id,slot:'waypoint',radius:w.radius,origin:{...c.point,y:y+.15},direction:{x:0,y:-1,z:0}});assert(surfaces.includes(reply.disk.surface));assert(Math.abs(reply.disk.center.y-y)<.001);selected={...w,center:reply.disk.center,surface:reply.disk.surface};report.placements.push({id:w.id,before:w,after:selected,time:c.time,shiftM:Math.hypot(...['x','y','z'].map(k=>selected.center[k]-w.center[k]))});previousTime=c.time;break;}catch(error){report.rejected=(report.rejected||0)+1;}}
 assert(selected,'No supported same-radius target '+w.id);if(i===0){assert(Math.hypot(...['x','y','z'].map(k=>selected.center[k]-w.center[k]))<.001);selected=structuredClone(w);}
 course.waypoints[i]=selected;
}
assert.deepEqual(course.start,old.start);assert.deepEqual(course.waypoints.map(w=>w.radius),old.waypoints.map(w=>w.radius));assert.equal(course.waypoints.length,7);
for(let i=2;i<=4;i++)assert(course.waypoints[i].center.x-course.waypoints[i-1].center.x>6,'Keep the west-platform targets well separated');
await worker.request({type:'select',id,challenge:course});report.nativeSelectionValid=true;report.pass=true;
await writeFile(outPath+'/catalog.json',JSON.stringify(catalog,null,2)+'\n');console.log(JSON.stringify({pass:true,targets:course.waypoints,hint:course.hint}));
}finally{worker.stop();await writeFile(outPath+'/report.json',JSON.stringify(report,null,2)+'\n');}
