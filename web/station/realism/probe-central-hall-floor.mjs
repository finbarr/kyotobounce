// Private native placement queries comparing the retained concourse and provisional bay floor.
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{resolve}from'node:path';
import{createHash,randomUUID}from'node:crypto';
import{setTimeout as delay}from'node:timers/promises';
import{PhysicsWorker}from'../../worker.ts';
const[layoutPath,componentPath,catalogPath,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));assert(process.env.KYOTO_WORKER_EXECUTABLE);
await mkdir(out,{recursive:false});const hash=b=>createHash('sha256').update(b).digest('hex');
const[lb,nb,cb]=await Promise.all([readFile(layoutPath),readFile(componentPath+'/native-panels.json'),readFile(catalogPath)]);
const base=JSON.parse(lb),component=JSON.parse(nb),catalog=JSON.parse(cb),c=catalog.find(c=>c.id==='kyoto-balcony');assert(c);
const samples=c.waypoints.map(w=>({id:w.id,surface:w.surface,center:w.center,origin:{...w.center,y:w.center.y+1.5},direction:{x:0,y:-1,z:0}}));
const report={meaning:'Native ray queries only. Diagnostic additive layout is not installed or accepted for gameplay. No throws, service or database writes.',baseLayoutSha256:hash(lb),componentNativeSha256:hash(nb),catalogSha256:hash(cb),workerExecutable:process.env.KYOTO_WORKER_EXECUTABLE,samples,modes:[],toolSha256:hash(await readFile(new URL(import.meta.url)))};
for(const mode of ['base','additive-diagnostic']){
 const layout=JSON.parse(lb);if(mode!=='base'){layout.panels.push(...component.panels);layout.status='Uninstalled diagnostic overlay; known duplicate/unfinished station interfaces';}
 const path=resolve(out,mode+'-layout.json'),bytes=mode==='base'?lb:Buffer.from(JSON.stringify(layout)+'\n');await writeFile(path,bytes);
 process.env.KYOTO_LAYOUT=path;process.env.KYOTO_WORKER_LOG=resolve(out,mode+'-worker.log');const worker=new PhysicsWorker(),id='hall-floor-'+mode,row={mode,layoutSha256:hash(bytes),hits:[]};report.modes.push(row);let joined=false;
 worker.on('message',m=>{if(m.type==='state'&&m.id===id&&m.players?.length)joined=true;});
 const until=async f=>{const end=performance.now()+90000;while(!f()){assert(performance.now()<end,'Native wait timed out');await delay(30);}};
 try{
  await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>joined);
  let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
  for(const s of samples){const request=randomUUID();let timer;const response=new Promise((res,rej)=>{pending.set(request,res);timer=setTimeout(()=>{pending.delete(request);rej(Error('Native ray timed out'));},10000);});worker.send({type:'place',id,slot:'waypoint',radius:.1,request,origin:s.origin,direction:s.direction});let result;try{result=await response;}finally{clearTimeout(timer);}assert(result.disk?.surface);row.hits.push({sample:s.id,disk:result.disk,heightAboveAuthoredWaypointM:result.disk.center.y-s.center.y});}
  row.pass=true;console.log(JSON.stringify(row));
 }finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
}
const [a,b]=report.modes;report.differences=samples.map((s,i)=>({sample:s.id,baseSurface:a.hits[i].disk.surface,addedSurface:b.hits[i].disk.surface,baseY:a.hits[i].disk.center.y,addedY:b.hits[i].disk.center.y,deltaY:b.hits[i].disk.center.y-a.hits[i].disk.center.y}));
assert(report.differences.every(d=>d.baseSurface==='concourse'&&d.addedSurface.startsWith('hall-bay-floor-slab-')&&Math.abs(d.deltaY-.2366)<1e-5));
report.pass=true;await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,differences:report.differences}));
