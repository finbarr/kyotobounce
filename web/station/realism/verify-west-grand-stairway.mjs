// Exercise the source upper landing through all fourteen Grand Stairway flights.
// Full-station collision check; Skyway and south-approach interfaces require separate checks.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='west-v2-route',report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),walks:[],pass:false};let state;
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
 const flights=layout.flights.filter(f=>/^daikaidan-flight-\d+$/.test(f.id)).sort((a,b)=>a.id.localeCompare(b.id));
 assert.equal(flights.length,14);
 const route=[{x:-50,y:15.6146583557,z:18},{x:-60,y:15.6146583557,z:14}];
 for(const f of flights)for(const [i,c]of f.contours.entries()){
  const p=c.points[Math.min(22,Math.floor(c.points.length/3))];route.push({x:p.x,y:f.baseElevation+i*f.rise,z:p.y});
 }
 await start(route[0]);await walk(route,'upper approach through all Grand Stairway flights');await walk(route.toReversed(),'Grand Stairway return to upper approach');
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
