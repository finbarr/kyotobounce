// Native support, headroom and actual capsule movement through all six B1 portals.
import assert from 'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve}from'node:path';import{createHash,randomUUID}from'node:crypto';import{setTimeout as delay}from'node:timers/promises';import{PhysicsWorker}from'../../worker.ts';import*as T from'three';
const[basePath,specPath,assembly,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),sb=await readFile(specPath),s=JSON.parse(sb),nb=await readFile(assembly+'/native-panels.json'),n=JSON.parse(nb),build=JSON.parse(await readFile(assembly+'/report.json'));assert.equal(build.outputs.nativePanelsSha256,sha(nb));
const layout=JSON.parse(await readFile(basePath));layout.panels=n.panels;for(const k of ['boxes','beams','flights'])layout[k]=[];layout.escalators=n.escalators;layout.status='Private B1 portal walking check';const lb=Buffer.from(JSON.stringify(layout)+'\n');await writeFile(out+'/probe-layout.json',lb);
process.env.KYOTO_LAYOUT=resolve(out+'/probe-layout.json');process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');const worker=new PhysicsWorker(),id='b1-portal-proof';let state;worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m});
const until=async fn=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(25)}};
const root=new T.Group();for(const p of n.panels.filter(p=>p.collision!==false)){const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(p.vertices.flatMap(v=>[v.x,v.y,-v.z]),3));const ids=[];for(let i=0;i<p.triangles.length;i+=3)ids.push(...p.triangles.slice(i,i+3).reverse());g.setIndex(ids);root.add(new T.Mesh(g,new T.MeshBasicMaterial({side:T.FrontSide})));}root.updateMatrixWorld(true);const browserRay=new T.Raycaster();
const report={meaning:'Six B1 portals and both continuous outer aisles; native walking and headroom, not photographic or full-station acceptance.',specSha256:sha(sb),nativeSha256:sha(nb),glbSha256:build.outputs.glbSha256,supports:[],walks:[],pass:false};
try{await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let k;while((k=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,k));buffer=buffer.slice(k+1);pending.get(m.request)?.(m);pending.delete(m.request)}});
const ray=async payload=>{const request=randomUUID();let timer;const p=new Promise((res,rej)=>{pending.set(request,res);timer=setTimeout(()=>{pending.delete(request);rej(Error('Ray timed out'))},10000)});worker.send({...payload,id,type:'place',request});try{return await p}finally{clearTimeout(timer)}};

const routes=[];
for(const side of ['north','south']){
 const sign=side==='north'?-1:1,[[ax,az],[bx,bz]]=s.frontEdges[side],slope=(bz-az)/(bx-ax),point=(x,d)=>({x,y:s.floorY,z:-(az+(x-ax)*slope+sign*d)});
 for(const [bay,[L,R]]of s.openings.entries()){
  const x=(L+R)/2;
  routes.push({id:side+'-portal-'+bay,start:point(x,s.corridorWidthM+1.6),end:point(x,-.5),checks:[-.5,.2,1.5,2.9,3.2,4.6].map(d=>point(x,d))});
 }
 const left=Math.min(ax,bx)+1,right=Math.max(ax,bx)-1;
 routes.push({id:side+'-long-aisle',start:point(left,s.corridorWidthM/2),end:point(right,s.corridorWidthM/2),checks:Array.from({length:7},(_,i)=>point(left+(right-left)*i/6,s.corridorWidthM/2))});
}
for(const route of routes){
 for(const p of route.checks){
  const floor=await ray({slot:'waypoint',radius:.1,origin:{...p,y:p.y+.35},direction:{x:0,y:-1,z:0}});assert(floor.disk?.surface,'Missing floor');assert(Math.abs(floor.disk.center.y-s.floorY)<.001);
  const head=await ray({slot:'waypoint',radius:.1,origin:{...p,y:p.y+1.8},direction:{x:0,y:1,z:0}});browserRay.set(new T.Vector3(p.x,p.y+1.8,-p.z),new T.Vector3(0,1,0));const expected=browserRay.intersectObject(root,true)[0];if(expected){assert(head.disk?.surface,'Missing expected ceiling');assert(Math.abs(head.disk.center.y-expected.point.y)<.001,'Ceiling height mismatch');assert(head.disk.center.y-s.floorY>2.1,'Insufficient head clearance');}else{assert(!head.disk?.surface,'Native overhead obstruction in browser opening');assert.equal(head.ok,false);}report.supports.push({route:route.id,point:p,floor:floor.disk,head:head.disk,expectedCeilingY:expected?.point.y??null});
 }
 const {start,end}=route,placed=await worker.request({type:'place',id,slot:'start',radius:.25,origin:{...start,y:start.y+.4},direction:{x:0,y:-1,z:0}});assert(placed.ok,'Invalid start');await worker.request({type:'design-start',id,start:placed.disk});await delay(150);
 for(const target of [end,start]){
  const samples=[],deadline=performance.now()+30000;
  while(true){const feet=state.players.find(p=>p.id===id).feet,dx=target.x-feet.x,dz=target.z-feet.z,distance=Math.hypot(dx,dz);samples.push(feet);assert(Math.abs(feet.y-s.floorY)<.1,'Capsule left B1 floor');if(distance<.15)break;assert(performance.now()<deadline,'Corridor walk blocked: '+route.id);worker.send({type:'input',id,x:0,z:Math.min(1,distance/.5),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:false});await delay(70);}
  worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push({route:route.id,target,samples,pass:true});
 }
}
report.pass=true;console.log(JSON.stringify({pass:true,supports:report.supports.length,walks:report.walks.length}));
}catch(e){report.error=String(e);throw e}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
