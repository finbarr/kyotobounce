// Run the same passage routes in the complete private station, retaining all obstacles.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import * as T from 'three';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [directory,specPath,out,fullLayoutPath,bankSpecPath,scope]=process.argv.slice(2);assert(resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex'),nb=await readFile(directory+'/native-panels.json'),s=JSON.parse(await readFile(specPath)),r=JSON.parse(await readFile(directory+'/report.json'));
assert.equal(hash(nb),r.outputs.nativePanelsSha256);
assert(fullLayoutPath,'Full station layout is required');
const fb=await readFile(fullLayoutPath),layout=JSON.parse(fb),floorBaseSha256=hash(fb);
assert.equal(layout.architecture[bankSpecPath?'gateBankIntegration':'gateArchitectureIntegration'].componentNativeSha256,hash(nb));
layout.spawn={x:1.4,y:0,z:-7};layout.status='Private full-station gate integration probe';
await writeFile(out+'/layout.json',JSON.stringify(layout)+'\n');process.env.KYOTO_LAYOUT=resolve(out+'/layout.json');process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='gate-passage-walk';let state;worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m});
async function until(fn){const stop=performance.now()+90000;while(!fn()){assert(performance.now()<stop,'Worker timed out');await delay(25)}}
const meshRoot=new T.Group(),region=new T.Box3(new T.Vector3(-15,-1,-31),new T.Vector3(17,200,-4));
for(const p of layout.panels.filter(p=>p.collision!==false)){
 const points=p.vertices.map(v=>new T.Vector3(v.x,v.y,v.z));
 if(!new T.Box3().setFromPoints(points).intersectsBox(region))continue;
 const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points.flatMap(v=>v.toArray()),3));g.setIndex(p.triangles);meshRoot.add(new T.Mesh(g,new T.MeshBasicMaterial({side:T.FrontSide})));
}
for(const p of layout.boxes.filter(p=>p.collision!==false)){
 const o=new T.Mesh(new T.BoxGeometry(p.size.x,p.size.y,p.size.z),new T.MeshBasicMaterial({side:T.FrontSide}));o.position.set(p.center.x,p.center.y,p.center.z);o.rotation.y=(p.yaw||0)*Math.PI/180;o.updateMatrixWorld();
 if(new T.Box3().setFromObject(o).intersectsBox(region))meshRoot.add(o);
}
meshRoot.updateMatrixWorld(true);const browserRay=new T.Raycaster();
const native=(x,y,d)=>({x,y,z:-(s.frame.frontZ+s.frame.slope*x+d)}),L=s.portal.westX,R=s.portal.eastX,b=s.bridge;
const routes=[{id:'ground-center',a:native(1.4,0,.6),z:native(1.4,0,23.2)},{id:'ground-west',a:native(L+.6,0,5),z:native(L+.6,0,23.2)},{id:'ground-east',a:native(R-.6,0,5),z:native(R-.6,0,23.2)},{id:'bridge-west-east',a:native(L-.45,b.floorY+.01,(b.frontGlassDepthM+b.rearDepthM)/2),z:native(R+.45,b.floorY+.01,(b.frontGlassDepthM+b.rearDepthM)/2)}];
if(s.paidConcourse)for(const [id,d] of [['paid-under-bridge',b.frontGlassDepthM+s.paidConcourse.pierDepthM+.5],['paid-rear',15]])routes.push({id,a:native(s.paidConcourse.westX+.5,0,d),z:native(s.paidConcourse.eastX-.5,0,d)});
const bank=bankSpecPath?JSON.parse(await readFile(bankSpecPath)):null;
if(bank){
 assert.equal(bank.stationFrame.frontZ,s.frame.frontZ);assert.equal(bank.stationFrame.slope,s.frame.slope);
 const open=bank.lanes.find(l=>l.open),x=(bank.bodyCentersX[open.leftIndex]+bank.bodyCentersX[open.rightIndex])/2;
 routes.push({id:'gate-wide-lane',a:native(x,0,bank.stationFrame.depthM-2),z:native(x,0,bank.stationFrame.depthM+2)});
}
assert(!scope||scope==='bank-only');if(scope==='bank-only'){assert(bank);routes.splice(0,routes.length-1);}
const report={pass:false,scope:scope||'all-routes',meaning:'Unchanged passage test routes against the complete private station. Bank geometry may obstruct straight diagnostic routes; the open wide lane is separately tested when a bank specification is supplied. Failures remain recorded.',nativeSha256:hash(nb),floorBaseSha256,probeLayoutSha256:hash(await readFile(out+'/layout.json')),glbSha256:r.outputs.glbSha256,checks:[],barrierProbes:[],walks:[],failures:[]};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let k;while((k=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,k));buffer=buffer.slice(k+1);pending.get(m.request)?.(m);pending.delete(m.request)}});
 const rawPlace=async payload=>{const request=randomUUID();let timer;const p=new Promise((res,rej)=>{pending.set(request,res);timer=setTimeout(()=>{pending.delete(request);rej(Error('Ray timed out'))},10000)});worker.send({...payload,id,type:'place',request});try{return await p}finally{clearTimeout(timer)}};
 if(bank)for(const lane of bank.lanes){
  const x=(bank.bodyCentersX[lane.leftIndex]+bank.bodyCentersX[lane.rightIndex])/2+lane.clearM/4,p=native(x,.6,bank.stationFrame.depthM-2);
  const hit=await rawPlace({slot:'waypoint',radius:.05,origin:p,direction:{x:0,y:0,z:-1}});
  browserRay.set(new T.Vector3(p.x,p.y,p.z),new T.Vector3(0,0,-1));const expected=browserRay.intersectObject(meshRoot,true)[0];
  const distance=hit.disk?.center?Math.abs(hit.disk.center.z-p.z):null,blocked=distance!==null&&distance<4;
  const expectedNear=expected&&expected.distance<4;
  const match=expectedNear?hit.disk&&Math.abs(expected.point.z-hit.disk.center.z)<.001:!blocked;
  const pass=Boolean(match)&&blocked===!lane.open;
  report.barrierProbes.push({lane:lane.id,open:lane.open,blocked,distance,expectedDistance:expected?.distance,surface:hit.disk?.surface,pass});
  if(!pass)report.failures.push({lane:lane.id,error:'Barrier state or native/browser collision disagreement'});
 }
 for(const route of routes){
  try{
  for(let i=0;i<=8;i++){
   const p={x:route.a.x+(route.z.x-route.a.x)*i/8,y:route.a.y,z:route.a.z+(route.z.z-route.a.z)*i/8};
   const floor=await worker.request({type:'place',id,slot:'waypoint',radius:.10,origin:{...p,y:p.y+.3},direction:{x:0,y:-1,z:0}});
   browserRay.set(new T.Vector3(p.x,p.y+.3,p.z),new T.Vector3(0,-1,0));const expectedFloor=browserRay.intersectObject(meshRoot,true)[0];assert(expectedFloor&&floor.ok&&Math.abs(floor.disk.center.y-expectedFloor.point.y)<.001,'Floor support '+route.id);assert(Math.abs(expectedFloor.point.y-p.y)<.003,'Unexpected floor level');
   const head=await rawPlace({slot:'waypoint',radius:.10,origin:{...p,y:p.y+1.8},direction:{x:0,y:1,z:0}});
   browserRay.set(new T.Vector3(p.x,p.y+1.8,p.z),new T.Vector3(0,1,0));const expected=browserRay.intersectObject(meshRoot,true)[0];if(expected){assert(head.disk?.surface,'Missing native ceiling');assert(Math.abs(head.disk.center.y-expected.point.y)<.001,'Browser/native ceiling mismatch');assert(head.disk.center.y-p.y>2.1,'Headroom '+route.id);}else{assert(!head.disk?.surface&&head.ok===false,'Unexpected native ceiling');}
   report.checks.push({route:route.id,point:p,floor:floor.disk,expectedFloorY:expectedFloor.point.y,head:head.disk?.surface?head.disk:null,expectedCeilingY:expected?.point.y??null});
  }
  const start=await worker.request({type:'place',id,slot:'start',radius:.25,origin:{...route.a,y:route.a.y+.4},direction:{x:0,y:-1,z:0}});assert(start.ok,'Start '+route.id);
  await worker.request({type:'design-start',id,start:start.disk});await delay(150);
  for(const target of [route.z,route.a]){
   const samples=[],deadline=performance.now()+30000;
   while(true){const feet=state.players.find(p=>p.id===id).feet,dx=target.x-feet.x,dz=target.z-feet.z,distance=Math.hypot(dx,dz);samples.push(feet);assert(Math.abs(feet.y-target.y)<.10,'Wrong walking level');if(distance<.15)break;assert(performance.now()<deadline,'Blocked route '+route.id);worker.send({type:'input',id,x:0,z:Math.min(1,distance/.5),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:false});await delay(70);}
   worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push({route:route.id,target,samples,pass:true});
  }
  }catch(e){worker.send({type:'input',id,x:0,z:0,fast:false});report.failures.push({route:route.id,error:String(e),feet:state?.players?.find(p=>p.id===id)?.feet});}
 }
 report.pass=report.failures.length===0;console.log(JSON.stringify({pass:report.pass,supports:report.checks.length,walks:report.walks.length,failures:report.failures}));
}catch(e){report.error=String(e);throw e}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
