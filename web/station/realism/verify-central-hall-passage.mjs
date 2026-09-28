// Walk the corrected gate passage in a private component-only native layout.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve}from'node:path';import{createHash,randomUUID}from'node:crypto';import{setTimeout as delay}from'node:timers/promises';import{PhysicsWorker}from'../../worker.ts';
const[basePath,specPath,component,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));assert(process.env.KYOTO_WORKER_EXECUTABLE);await mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),sb=await readFile(specPath),s=JSON.parse(sb),nb=await readFile(component+'/native-panels.json'),n=JSON.parse(nb),build=JSON.parse(await readFile(component+'/report.json')),floorProof=JSON.parse(await readFile(component+'/floor-proof.json'));
assert.equal(build.specSha256,sha(sb));assert.equal(build.outputs.nativePanelsSha256,sha(nb));assert.equal(floorProof.nativeSha256,sha(nb));assert(floorProof.pass);
const layout=JSON.parse(await readFile(basePath));layout.panels=n.panels;for(const k of ['boxes','beams','flights','escalators'])layout[k]=[];layout.status='Private component-only gate passage check; no station installation';const lb=Buffer.from(JSON.stringify(layout)+'\n');await writeFile(out+'/probe-layout.json',lb);
process.env.KYOTO_LAYOUT=resolve(out+'/probe-layout.json');process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');const worker=new PhysicsWorker(),id='central-hall-passage-proof';let state;worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m});
const until=async fn=>{const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(25)}};
const point=(x,d,y=0)=>({x,y,z:-(s.frame.frontZ+s.frame.slope*x+d)});
const report={meaning:'Component-only floor support, head clearance, open cutout and actual capsule walks; not integrated station/campaign acceptance.',specSha256:sha(sb),componentNativeSha256:sha(nb),componentGlbSha256:build.outputs.glbSha256,probeLayoutSha256:sha(lb),supports:[],walks:[],pass:false};
try{await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request)}});
 const ray=async payload=>{const request=randomUUID();let timer;const p=new Promise((res,rej)=>{pending.set(request,res);timer=setTimeout(()=>{pending.delete(request);rej(Error('Ray timed out'))},10000)});worker.send({...payload,id,type:'place',request});try{return await p}finally{clearTimeout(timer)}};
 const cut=point(...floorProof.openCutoutProbeLocal,1.0),absence=await ray({slot:'waypoint',radius:.1,origin:cut,direction:{x:0,y:-1,z:0}});assert.equal(absence.ok,false);assert.equal(absence.message,'Choose a fixed surface; moving targets are not supported.');assert(!absence.disk?.surface,'The basement cutout was filled');report.cutout={origin:cut,result:absence,pass:true};
 for(const x of [s.gate.westX+.75,0,s.gate.eastX-.75]){
  for(const d of [-1.5,.5,2.5,4.5]){const p=point(x,d),floor=await ray({slot:'start',radius:.25,origin:{...p,y:.4},direction:{x:0,y:-1,z:0}});assert(floor.disk?.surface.startsWith('hall-bay-floor-'));assert(Math.abs(floor.disk.center.y)<.003);let head=null;if(d>0){head=await ray({slot:'waypoint',radius:.1,origin:{...p,y:1.8},direction:{x:0,y:1,z:0}});assert(head.disk?.surface);assert(head.disk.center.y>2.1);}report.supports.push({x,d,floor:floor.disk,head:head?.disk||null});}
  const start=point(x,-1.5),placed=await worker.request({type:'place',id,slot:'start',radius:.25,origin:{...start,y:.4},direction:{x:0,y:-1,z:0}});assert(placed.ok);await worker.request({type:'design-start',id,start:placed.disk});await delay(150);
  for(const target of [point(x,4.5),start]){const samples=[],deadline=performance.now()+20000;while(true){const feet=state.players.find(p=>p.id===id).feet,dx=target.x-feet.x,dz=target.z-feet.z,dist=Math.hypot(dx,dz);samples.push(feet);assert(Math.abs(feet.y)<.1,'Capsule left the floor datum');if(dist<.18)break;assert(performance.now()<deadline,'Passage walk blocked');worker.send({type:'input',id,x:0,z:Math.min(1,dist/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:dist>1});await delay(70);}worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push({laneX:x,target,samples,pass:true});}
 }
 if(s.basement){
  report.wellCutouts=[];
  for(const [x,z]of floorProof.openCutoutProbesWorld){
   const result=await ray({slot:'waypoint',radius:.1,origin:{x,y:.6,z:-z},direction:{x:0,y:-1,z:0}});
   assert.equal(result.ok,false);assert.equal(result.message,'Choose a fixed surface; moving targets are not supported.');assert(!result.disk?.surface);report.wellCutouts.push({x,z,result,pass:true});
  }
  const routes=[
   ['north-side',[-14.5,-9.1],[16.5,-9.1]],['south-side',[-14.5,-.2],[16.5,-.2]],
   ['west-side',[-13.3,-9.1],[-13.3,-.2]],['west-center-gap',[-.825,-9.1],[-.825,-.2]],
   ['east-center-gap',[3.33,-9.1],[3.33,-.2]],['east-side',[15.8,-9.1],[15.8,-.2]],
  ];
  for(const [name,A,B]of routes){
   const start={x:A[0],y:0,z:-A[1]},end={x:B[0],y:0,z:-B[1]};
   const placed=await worker.request({type:'place',id,slot:'start',radius:.25,origin:{...start,y:.4},direction:{x:0,y:-1,z:0}});assert(placed.ok,'Invalid route start '+name);assert.equal(placed.disk.surface,'hall-bay-floor-surface');
   await worker.request({type:'design-start',id,start:placed.disk});await delay(150);
   for(const target of [end,start]){
    const samples=[],deadline=performance.now()+20000;
    while(true){
     const feet=state.players.find(p=>p.id===id).feet,dx=target.x-feet.x,dz=target.z-feet.z,dist=Math.hypot(dx,dz);samples.push(feet);assert(Math.abs(feet.y)<.1,'Well route left the floor datum: '+name);if(dist<.18)break;assert(performance.now()<deadline,'Well route blocked: '+name);
     worker.send({type:'input',id,x:0,z:Math.min(1,dist/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:dist>1});await delay(70);
    }
    worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push({route:name,target,samples,pass:true});
   }
  }
 }
 report.pass=true;console.log(JSON.stringify({pass:true,supports:report.supports.length,walks:report.walks.length,cutoutOpen:report.cutout.pass}));
}catch(e){report.error=String(e);throw e}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
