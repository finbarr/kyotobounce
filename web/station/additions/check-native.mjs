// Route support, head clearance and actual walking through the new entrances.
// Isolated worker, no server/database and no production traffic.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const layoutPath=resolve(process.argv[2]),out=resolve(process.argv[3]);
assert(out.startsWith(resolve('.local')+'/'));
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),hash=createHash('sha256').update(bytes).digest('hex');
await mkdir(out,{recursive:true});process.env.KYOTO_LAYOUT=layoutPath;process.env.KYOTO_WORKER_LOG=out+'/worker.log';
const worker=new PhysicsWorker(),states=new Map(),report={layout:hash,support:[],clearance:[],walks:[],failures:[]};
worker.on('message',m=>{if(m.type==='state')states.set(m.id,m);});
const distance=(a,b)=>Math.hypot(...'xyz'.split('').map(k=>a[k]-b[k]));
const until=async(f,ms=65000)=>{const end=performance.now()+ms;while(!f()){assert(performance.now()<end,'Native observation timed out');await delay(20);}};
try{
 await worker.start();await until(()=>worker.ready);
 // Read the native ray hit even when a designer-sized target disk would span
 // a tread or trim edge. Disk validation and geometric support are different.
 const pending=new Map();let buffer='';
 worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 const ray=async command=>{
  const request=randomUUID();let timer;
  const reply=new Promise((res,rej)=>{timer=setTimeout(()=>rej(Error('Native ray timeout')),10000);pending.set(request,res);});
  worker.send({...command,request});const value=await reply;clearTimeout(timer);
  if(!value.disk?.surface)throw Error(value.message||'No surface');return value.disk;
 };
 const id='station-additions-survey';worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);
 for(const route of layout.stationAdditions.routes){
  const supports=[],blocked=[];
  for(let leg=1;leg<route.points.length;leg++){
   const a=route.points[leg-1],b=route.points[leg],length=distance(a,b),samples=Math.max(1,Math.ceil(length/2));
   for(let i=0;i<=samples;i++){
    const p=Object.fromEntries('xyz'.split('').map(k=>[k,a[k]+(b[k]-a[k])*i/samples]));
    try{
     const hit=await ray({type:'place',id,slot:'waypoint',radius:.2,origin:{...p,y:p.y+.35},direction:{x:0,y:-1,z:0}});
     const error=Math.abs(hit.center.y-p.y);supports.push({point:p,surface:hit.surface,error});
     if(error>.22)report.failures.push({route:route.id,kind:'support',point:p,hit});
    }catch(error){report.failures.push({route:route.id,kind:'support',point:p,error:error.message});}
   }
   const dx=b.x-a.x,dz=b.z-a.z,horizontal=Math.hypot(dx,dz);
   // Horizontal passages only: a sloped flight deliberately intersects treads.
   if(Math.abs(a.y-b.y)<.03&&horizontal>.1)for(const height of [.55,1.45]){
    try{
     const hit=await ray({type:'place',id,slot:'waypoint',radius:.2,origin:{x:a.x,y:a.y+height,z:a.z},direction:{x:dx/horizontal,y:0,z:dz/horizontal}});
     const d=Math.hypot(hit.center.x-a.x,hit.center.z-a.z);
     if(d<horizontal-.12){blocked.push({leg,height,surface:hit.surface,d,horizontal});report.failures.push({route:route.id,kind:'clearance',leg,height,surface:hit.surface,d,horizontal});}
    }catch{/* No face along a clear ray is expected. */}
   }
  }
  report.support.push({route:route.id,samples:supports});report.clearance.push({route:route.id,blocked});
  console.log('SURVEY',route.id,'support',supports.length,'blocked',blocked.length);
 }
 worker.send({type:'leave',id});
 // Actual capsule movement for each short shop entry, both ways. Long public
 // routes are run too, unless the geometry survey already found an obstruction.
 const routes=layout.stationAdditions.routes.filter(r=>!report.failures.some(f=>f.route===r.id));let next=0;
 async function walk(slot){
  const id='station-additions-walk-'+slot;worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);
  while(next<routes.length){const r=routes[next++],points=[...r.points];const receipts=[];
   try{
    const p=points[0],disk=(await worker.request({type:'place',id,slot:'start',radius:.25,origin:{...p,y:p.y+.3},direction:{x:0,y:-1,z:0}})).disk;
    await worker.request({type:'select',id,challenge:{id:'station-route-proof',start:disk,goal:{...disk,radius:.1},layout:hash,physics:states.get(id).physics,throwModel:'robot-v4'}});await delay(120);
    await worker.request({type:'select',id,challenge:null});
    const walkPoints=r.id.endsWith('-entry')?[...points.slice(1),...points.slice(0,-1).reverse()]:points.slice(1);
    for(const target of walkPoints){
     const start=states.get(id).players[0].feet,deadline=performance.now()+distance(start,target)/1.3*1000+12000;
     let previous=Infinity,stalled=0;
     while(true){
      const feet=states.get(id).players[0].feet,dx=target.x-feet.x,dz=target.z-feet.z,dist=Math.hypot(dx,dz);
      if(dist<.22){assert(Math.abs(feet.y-target.y)<.30,'Incorrect floor elevation');break;}
      assert(performance.now()<deadline,'Walking deadline');stalled=Math.abs(previous-dist)<.015?stalled+1:0;assert(stalled<35,'Capsule blocked at '+JSON.stringify(feet));previous=dist;
      worker.send({type:'input',id,yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,x:0,z:Math.min(1,dist/.7),fast:dist>1});await delay(100);
     }
     worker.send({type:'input',id,x:0,z:0,fast:false});receipts.push({target,feet:states.get(id).players[0].feet});
    }
    report.walks.push({route:r.id,pass:true,checkpoints:receipts});console.log('WALK PASS',r.id);
   }catch(error){report.walks.push({route:r.id,pass:false,error:error.message,checkpoints:receipts});report.failures.push({route:r.id,kind:'walk',error:error.message});console.log('WALK FAIL',r.id,error.message);}
  }
  worker.send({type:'leave',id});
 }
 await Promise.all([walk(0),walk(1)]);
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
assert.equal(report.failures.length,0,'See '+out+'/report.json');
console.log('PASS station route support, clearance and native walking');
