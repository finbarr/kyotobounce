// Native rays at the restored entrance and municipal surfaces; isolated worker.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const candidate=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert(output.startsWith(resolve('.local')+'/'));
const bytes=await readFile(candidate),layout=JSON.parse(bytes),baseline=JSON.parse(await readFile('runtime/station-layout.json'));
for(const key of ['boxes','beams','flights','escalators','stationAdditions','routes'])assert.deepEqual(layout[key],baseline[key],`Retained ${key} changed`);
assert.deepEqual(layout.panels.slice(0,baseline.panels.length),baseline.panels,'Retained station panels changed');
const added=layout.panels.slice(baseline.panels.length);assert(added.length>3000&&added.every(p=>p.id.startsWith('municipal-')));
await mkdir(output,{recursive:true});process.env.KYOTO_LAYOUT=candidate;process.env.KYOTO_WORKER_LOG=output+'/worker.log';
const worker=new PhysicsWorker(),states=new Map(),report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),retainedStationUnchanged:true,addedPanels:added.length,rays:[],failures:[]};
worker.on('message',m=>{if(m.type==='state')states.set(m.id,m);});
const until=async(fn,ms=90000)=>{const end=performance.now()+ms;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(30);}};
const normalize=v=>{const n=Math.hypot(v.x,v.y,v.z);return {x:v.x/n,y:v.y/n,z:v.z/n};};
const diff=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
try{
 await worker.start();await until(()=>worker.ready);
 const pending=new Map();let buffer='';worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 const id='city-restoration-proof';worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);
 async function ray(name,origin,direction,expected=null){
  const request=randomUUID();let timer;const response=new Promise((res,rej)=>{timer=setTimeout(()=>{pending.delete(request);rej(Error('Ray timed out'));},10000);pending.set(request,res);});
  worker.send({type:'place',id,slot:'waypoint',radius:.1,origin,direction,request});
  let result;try{result=await response;}finally{clearTimeout(timer);}
  const hit=result.disk;const row={name,origin,direction,expected,result};report.rays.push(row);
  if(!hit?.surface){report.failures.push({name,reason:'No native surface',result});return;}
  if(expected){row.distanceError=Math.hypot(...'xyz'.split('').map(k=>hit.center[k]-expected[k]));if(row.distanceError>.02)report.failures.push({name,reason:'Native surface differs from source triangle',distanceError:row.distanceError});}
 }
 // Across the exact retained entrance footprint and its 1.5 m transition.
 for(const x of [-70,-40,0,30,60,100])for(const z of [28.8,29.1,29.8,30.6])await ray(`entrance-${x}-${z}`,{x,y:1,z},{x:0,y:-1,z:0});
 // Large upward or vertical faces, approached only 2 cm from their source face
 // to avoid accidentally testing another object in front of the chosen mesh.
 for(const physical of ['stone','asphalt','grass','facade','steel']){
  let chosen=null;
  for(const p of added.filter(p=>p.material===physical)){
   for(let i=0;i<p.triangles.length;i+=3){const [a,b,c]=p.triangles.slice(i,i+3).map(n=>p.vertices[n]);const n=cross(diff(b,a),diff(c,a)),area=Math.hypot(n.x,n.y,n.z)/2;
    if(area<1)continue;const normal=normalize(n);if(normal.y<-.1)continue;
    if(!chosen||area>chosen.area)chosen={panel:p.id,area,normal,point:{x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3,z:(a.z+b.z+c.z)/3}};
   }
  }
  if(!chosen)continue;const {point,normal}=chosen;
  await ray(`surface-${physical}`,Object.fromEntries('xyz'.split('').map(k=>[k,point[k]+normal[k]*.02])),Object.fromEntries('xyz'.split('').map(k=>[k,-normal[k]])),point);
 }
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({addedPanels:report.addedPanels,rays:report.rays.length,failures:report.failures}));
 assert.equal(report.failures.length,0,'Restored municipal native rays failed');
}finally{worker.stop();}
