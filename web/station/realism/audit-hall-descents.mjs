// Exercise source-aligned basement descents with the unchanged native worker.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import * as T from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {PhysicsWorker} from '../../worker.ts';
const [basePath,assemblyDir,out]=process.argv.slice(2);
assert(basePath&&assemblyDir&&out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),assemblyBytes=await readFile(assemblyDir+'/native-panels.json'),assembly=JSON.parse(assemblyBytes),build=JSON.parse(await readFile(assemblyDir+'/report.json')),layout=JSON.parse(await readFile(basePath));
assert.equal(sha(assemblyBytes),build.outputs.nativePanelsSha256);assert.equal(assembly.escalators.length,4);
// The old continuous concourse must not cover the new openings.
layout.panels=assembly.panels;layout.boxes=[];layout.beams=[];layout.flights=[];layout.escalators=assembly.escalators;
layout.status='Isolated hall basement construction proof; not the installed station';
const bytes=Buffer.from(JSON.stringify(layout)+'\n');await writeFile(out+'/probe-layout.json',bytes);
process.env.KYOTO_LAYOUT=resolve(out+'/probe-layout.json');process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const root=new T.Group(),ray=new T.Raycaster();
for(const p of assembly.panels.filter(p=>p.collision!==false)){
 const geo=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(p.vertices.flatMap(v=>[v.x,v.y,-v.z]),3)),indices=[];
 for(let i=0;i<p.triangles.length;i+=3)indices.push(...p.triangles.slice(i,i+3).reverse());
 geo.setIndex(indices);geo.boundsTree=new MeshBVH(geo);
 const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.FrontSide}));mesh.raycast=acceleratedRaycast;mesh.name=p.id;root.add(mesh);
}root.updateMatrixWorld(true);
function frame(lane){
 const O=new T.Vector3(lane.lowerCenter.x,lane.lowerCenter.y,lane.lowerCenter.z),U=new T.Vector3(lane.uphill.x,0,lane.uphill.z),R=new T.Vector3(U.z,0,-U.x);
 function profile(z){const p=lane.path,n=lane.publicPointCount;if(z<=p[0].z)return O.y;if(z>=p[n-1].z)return O.y+lane.height;let a=0,b=n-1;while(a+1<b){const m=(a+b)>>1;if(p[m].z<=z)a=m;else b=m;}return O.y+T.MathUtils.lerp(p[a].y,p[b].y,(z-p[a].z)/(p[b].z-p[a].z));}
 const point=(z,w=0)=>{const p=O.clone().addScaledVector(U,z).addScaledVector(R,w);p.y=profile(z);return {x:p.x,y:p.y,z:p.z};};
 const local=p=>{const q=new T.Vector3(p.x,p.y,p.z).sub(O);return {z:q.dot(U),w:q.dot(R),y:p.y};};
 return {point,local,profile,upper:lane.run+lane.flatLength+.66+.5,lower:-lane.flatLength-.66-.45};
}
const report={meaning:'Four isolated hall descent lanes; not full-station or course acceptance',assemblyGlbSha256:build.outputs.glbSha256,nativeSha256:sha(assemblyBytes),probeLayoutSha256:sha(bytes),clearances:[],mismatches:[],obstructions:[],walks:[],rides:[]};
const worker=new PhysicsWorker(),id='hall-descent-audit';let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timeout');await delay(30);}}
let socketBuffer='';const pending=new Map();
function raw(command){const request=randomUUID();return new Promise((res,rej)=>{const timer=setTimeout(()=>{pending.delete(request);rej(Error('Native probe timeout'));},15000);pending.set(request,m=>{clearTimeout(timer);res(m);});worker.send({...command,request});});}
async function place(p,slot='waypoint'){return raw({type:'place',id,slot,radius:slot==='start'?.3:.1,origin:{...p,y:p.y+.55},direction:{x:0,y:-1,z:0}});}
async function walkTo(lane,f,endZ,w,label){
 const target=f.point(endZ,w),walk={lane:lane.id,offset:w,label,target,samples:[],pass:false},deadline=performance.now()+35000;
 try{while(true){const feet=state.players.find(p=>p.id===id).feet,q=f.local(feet),distance=Math.hypot(target.x-feet.x,target.z-feet.z);walk.samples.push(feet);
  assert(Math.abs(feet.y-f.profile(q.z))<.32,'Walking floor-height mismatch');assert(Math.abs(q.w-w)<.22,'Escalator lane drift');
  if(distance<.18)break;assert(performance.now()<deadline,'Hall descent walk deadline');
  worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(target.x-feet.x,target.z-feet.z)*180/Math.PI,pitch:0,fast:distance>1});await delay(70);
 }walk.pass=true;}catch(e){walk.error=String(e);}finally{worker.send({type:'input',id,x:0,z:0,fast:false});await delay(120);report.walks.push(walk);}
 return walk.pass;
}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 worker.socket.on('data',chunk=>{socketBuffer+=chunk;let n;while((n=socketBuffer.indexOf('\n'))>=0){const m=JSON.parse(socketBuffer.slice(0,n));socketBuffer=socketBuffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 for(const lane of assembly.escalators){const f=frame(lane);
  for(const w of [-.1,0,.1])for(let z=f.lower;z<=f.upper;z+=.5){
   const p=f.point(z,w),floor=await place(p),origin={...p,y:p.y+.05};
   ray.set(new T.Vector3(origin.x,origin.y,-origin.z),new T.Vector3(0,1,0));ray.far=250;
   const expected=ray.intersectObject(root,true)[0],head=await raw({type:'place',id,slot:'waypoint',radius:.1,origin,direction:{x:0,y:1,z:0}}),hit=head.disk?.surface?head.disk:null,headroom=hit?hit.center.y-p.y:null,err=expected&&hit?expected.point.distanceTo(new T.Vector3(hit.center.x,hit.center.y,-hit.center.z)):null;
   if(!!expected!==!!hit||expected&&(hit.surface!==expected.object.name||err>.001))report.mismatches.push({lane:lane.id,z,w,expected:expected?.object.name,actual:hit?.surface,errorM:err});
   const floorDifference=floor.disk?.surface?floor.disk.center.y-p.y:null,movingRange=z>=-lane.flatLength&&z<=lane.run+lane.flatLength;
   const movingOverCover=floor.message==='Choose a fixed surface; moving targets are not supported.'&&z>=-lane.flatLength-lane.pitchM/2&&z<=lane.run+lane.flatLength+lane.pitchM/2;
   const pass=(movingRange||movingOverCover||(floorDifference!==null&&floorDifference>=-.026&&floorDifference<.02))&&(headroom===null||headroom>=2.1);
   const row={lane:lane.id,z,w,profileY:p.y,floor:floor.disk||null,floorProbeMessage:floor.message||null,supportProof:movingRange||movingOverCover?'Actual native walking required':'Fixed surface ray',head:hit,headroomM:headroom,floorDifferenceM:floorDifference,pass};report.clearances.push(row);if(!pass)report.obstructions.push(row);
  }
 }
 console.log(JSON.stringify({points:report.clearances.length,mismatches:report.mismatches.length,obstructions:report.obstructions.length}));
 if(!report.mismatches.length&&!report.obstructions.length){
  for(const lane of assembly.escalators){const f=frame(lane);
   for(const w of [-.1,0,.1]){
    const placed=await place(f.point(f.upper,w),'start');assert(placed.ok,JSON.stringify(placed));await worker.request({type:'design-start',id,start:placed.disk});await delay(200);
    if(await walkTo(lane,f,f.lower,w,'upper-to-lower'))await walkTo(lane,f,f.upper,w,'lower-to-upper');
   }
   console.log(JSON.stringify({lane:lane.id,walks:report.walks.length,passing:report.walks.filter(w=>w.pass).length}));
  }
  for(const lane of assembly.escalators){const f=frame(lane),placed=await place(f.point(f.upper),'start');assert(placed.ok,JSON.stringify(placed));await worker.request({type:'design-start',id,start:placed.disk});await delay(200);
   // Position with a separate loop so these setup moves are not counted as through walks.
   const target=f.point(lane.run/2),deadline=performance.now()+25000;
   while(true){const feet=state.players.find(p=>p.id===id).feet,d=Math.hypot(target.x-feet.x,target.z-feet.z);if(d<.75)break;assert(performance.now()<deadline,'Ride positioning failed');worker.send({type:'input',id,x:0,z:Math.min(1,d/.6),yaw:Math.atan2(target.x-feet.x,target.z-feet.z)*180/Math.PI,pitch:0,fast:d>1});await delay(70);}
   worker.send({type:'input',id,x:0,z:0,fast:false});await delay(200);const before=state.players.find(p=>p.id===id).feet,t=performance.now();await delay(2200);const after=state.players.find(p=>p.id===id).feet,seconds=(performance.now()-t)/1000,along=f.local(after).z-f.local(before).z,expected=lane.speed*Math.cos(Math.atan2(lane.height,lane.run))*seconds,pass=Math.sign(along)===Math.sign(expected)&&Math.abs(along-expected)<.15;
   report.rides.push({lane:lane.id,speed:lane.speed,seconds,before,after,alongM:along,expectedAlongM:expected,pass});
  }
 }
 report.summary={points:report.clearances.length,mismatches:report.mismatches.length,obstructions:report.obstructions.length,walks:report.walks.length,passingWalks:report.walks.filter(w=>w.pass).length,rides:report.rides.length,passingRides:report.rides.filter(r=>r.pass).length,pass:report.mismatches.length===0&&report.obstructions.length===0&&report.walks.length===24&&report.walks.every(w=>w.pass)&&report.rides.length===4&&report.rides.every(r=>r.pass)};
 console.log(JSON.stringify(report.summary,null,2));
}catch(e){report.error=String(e);throw e;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
assert(report.summary?.pass,'Hall descent audit failed; see retained report');
