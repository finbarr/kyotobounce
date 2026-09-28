// Native hits on sampled outer-wing faces, separate from retained-course proofs.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [candidateArg,outArg]=process.argv.slice(2),candidate=resolve(candidateArg),out=resolve(outArg);assert(candidate.startsWith(resolve('.local')+'/'));assert(out.startsWith(resolve('.local')+'/'));
const bytes=await readFile(candidate),layout=JSON.parse(bytes),baseline=JSON.parse(await readFile('.local/station-realism/city-candidate-03/station-layout.json'));
for(const k of ['boxes','beams','flights','escalators','stationAdditions','routes'])assert.deepEqual(layout[k],baseline[k]);assert.deepEqual(layout.panels.slice(0,baseline.panels.length),baseline.panels);
const panels=layout.panels.slice(baseline.panels.length);assert.equal(panels.length,307);assert(panels.every(p=>p.id.startsWith('municipal-station-wing-')));
const buckets=new Map(),xyz=['x','y','z'];
for(const p of panels){const side=p.id.startsWith('municipal-station-wing-west-')?'west':'east';for(let i=0;i<p.triangles.length;i+=3){const [a,b,c]=p.triangles.slice(i,i+3).map(j=>p.vertices[j]),u=xyz.map(k=>b[k]-a[k]),v=xyz.map(k=>c[k]-a[k]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);if(length<2)continue;const normal=n.map(x=>x/length),axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),key=side+'-'+xyz[axis]+(normal[axis]>0?'+':'-');const row={side,panel:p.id,area:length/2,point:Object.fromEntries(xyz.map(k=>[k,(a[k]+b[k]+c[k])/3])),normal:Object.fromEntries(xyz.map((k,j)=>[k,normal[j]]))};if(!buckets.has(key)||buckets.get(key).area<row.area)buckets.set(key,row);}}
await mkdir(out,{recursive:true});process.env.KYOTO_LAYOUT=candidate;process.env.KYOTO_WORKER_LOG=out+'/worker.log';const worker=new PhysicsWorker(),report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),retainedGeometryUnchanged:true,panels:panels.length,probes:[],failures:[]};
let joined=false;worker.on('message',m=>{if(m.type==='state'&&m.id==='wing-surface-proof'&&m.players?.length)joined=true;});
const until=async(fn)=>{const end=performance.now()+65000;while(!fn()){assert(performance.now()<end);await delay(30);}};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id:'wing-surface-proof'});await until(()=>joined);const pending=new Map();let buffer='';worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 for(const [key,row]of buckets){const request=randomUUID();let timer;const response=new Promise((res,rej)=>{timer=setTimeout(()=>{pending.delete(request);rej(Error('Ray timeout'));},10000);pending.set(request,res);});worker.send({type:'place',id:'wing-surface-proof',slot:'waypoint',radius:.1,request,origin:Object.fromEntries(xyz.map(k=>[k,row.point[k]+row.normal[k]*.02])),direction:Object.fromEntries(xyz.map(k=>[k,-row.normal[k]]))});let result;try{result=await response;}finally{clearTimeout(timer);}const hit=result.disk,error=hit?.surface?Math.hypot(...xyz.map(k=>hit.center[k]-row.point[k])):null;report.probes.push({key,...row,result,error});if(error===null||error>.02||!hit.surface.startsWith('municipal-station-wing-'))report.failures.push({key,error,surface:hit?.surface});}
 assert(report.probes.length>=10,'Insufficient directional wing coverage');assert.equal(report.failures.length,0,'Wing source/native parity failed');console.log('PASS wing source/native probes',report.probes.length);
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
