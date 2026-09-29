// Check the changed northern escalator transfers and southern stair approach
// against the complete station collision geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,out,scope='all']=process.argv.slice(2);assert(['all','north','south'].includes(scope));assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='west-side-connections',report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),walks:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
const feet=()=>state.players.find(p=>p.id===id).feet;
async function start(p){const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...p,y:p.y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok,'Unsupported route entry '+JSON.stringify(placed));await worker.request({type:'design-start',id,start:placed.disk});await delay(200);}
async function walk(points,label){const row={label,points,samples:[],pass:false};report.walks.push(row);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],deadline=performance.now()+35000,dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  while(true){const p=feet(),distance=Math.hypot(p.x-b.x,p.z-b.z),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(length2||1))),expected=a.y+(b.y-a.y)*t;row.samples.push({...p,expected});assert(Math.abs(p.y-expected)<.36,`${label} floor height ${JSON.stringify({p,expected,target:b})}`);if(distance<.16)break;assert(performance.now()<deadline,`${label} blocked at ${JSON.stringify(p)}`);
   worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(b.x-p.x,b.z-p.z)*180/Math.PI,pitch:0,fast:true});await delay(60);
  }
 }
 worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);row.pass=true;console.log('PASS',label,row.samples.length,'samples');
}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 for(const lane of scope==='south'?[]:[1,2]){
  const route=layout.routes.find(r=>r.id===`north-escalator-complete-${lane}-up`);assert(route);
  const points=[{x:-60,y:15.6146583557,z:14},{x:-70,y:15.6146583557,z:17},...route.points];
  await start(points[0]);await walk(points,'north escalators lane '+lane+' up');await walk(points.toReversed(),'north escalators lane '+lane+' down');
 }
 if(scope!=='north'){
 const flights=['south-approach-lower','south-approach-midlanding','south-approach-upper'].map(id=>layout.flights.find(f=>f.id===id));assert(flights.every(Boolean));
 // Walk within one stair aisle; the center contour follows its dividing rail.
 const route=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[Math.floor(row.points.length/3)];return{x:p.x,y:f.baseElevation+i*f.rise,z:p.y};}));
 const a=route[0],b=route[1],c=route.at(-1),d=route.at(-2),firstLength=Math.hypot(b.x-a.x,b.z-a.z),lastLength=Math.hypot(c.x-d.x,c.z-d.z);
 route.unshift({x:a.x-(b.x-a.x)/firstLength*.8,y:a.y,z:a.z-(b.z-a.z)/firstLength*.8});route.push({x:c.x+(c.x-d.x)/lastLength*.8,y:c.y,z:c.z+(c.z-d.z)/lastLength*.8},{x:-65,y:c.y,z:8});
 await start(route[0]);await walk(route,'southern approach up to plaza');await walk(route.toReversed(),'southern approach return');
 }
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
