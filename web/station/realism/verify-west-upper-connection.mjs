// Exercise the full-station route through the registered 10F doorway, restaurant,
// western bridge and central Skyway in both directions.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='west-upper-corridor',report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),walks:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
const feet=()=>state.players.find(p=>p.id===id).feet;
async function start(p){const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...p,y:p.y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok,'Unsupported route entry '+JSON.stringify(placed));await worker.request({type:'design-start',id,start:placed.disk});await delay(200);}
async function walk(points,label){const row={label,points,samples:[],pass:false};report.walks.push(row);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],deadline=performance.now()+35000,dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  while(true){const p=feet(),distance=Math.hypot(p.x-b.x,p.z-b.z),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length2)),expected=a.y+(b.y-a.y)*t;row.samples.push({...p,expected});assert(Math.abs(p.y-expected)<.36,`${label} floor height ${JSON.stringify({p,expected,target:b})}`);if(distance<.16)break;assert(performance.now()<deadline,`${label} blocked at ${JSON.stringify(p)}`);
   worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(b.x-p.x,b.z-p.z)*180/Math.PI,pitch:0,fast:true});await delay(60);
  }
 }
 worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);row.pass=true;console.log('PASS',label,row.samples.length,'samples');
}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 const registered=layout.routes.find(r=>r.id==='west-source-restaurant-skyway-out');assert(registered);
 const entry=registered.points[0],lower=layout.flights.find(f=>f.id==='daikaidan-flight-12').contours.at(-1).points,upper=layout.flights.find(f=>f.id==='daikaidan-flight-13').contours[0].points;
 const across=[22,32,40,48,56].map(i=>({x:(lower[i].x+upper[i].x)/2,y:entry.y,z:(lower[i].y+upper[i].y)/2}));
 const route=[...across,...registered.points];
 // Split long corridor legs so each segment keeps the usual bounded timeout.
 const sampled=[route[0]];for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/8);for(let j=1;j<=n;j++)sampled.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n,z:a.z+(b.z-a.z)*j/n});}
 await start(sampled[0]);await walk(sampled,'10F landing through restaurant and central Skyway');await walk(sampled.toReversed(),'Skyway return through restaurant to Grand Stairway');
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
