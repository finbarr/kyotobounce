// Walk both subway gate halls, stairs, platform paths and retained public passage; test both platform barriers.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='subway-platforms',report={boundaries:[],layoutSha256:createHash('sha256').update(bytes).digest('hex'),walks:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
const player=()=>state.players.find(p=>p.id===id),feet=()=>player().feet;
async function start(p){const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...p,y:p.y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok,'Unsupported route entry '+JSON.stringify(placed));await worker.request({type:'design-start',id,start:placed.disk});await delay(200);assert(player().grounded,'Route entry must remain grounded: '+JSON.stringify(p));}
async function walk(points,label){const row={label,points,samples:[],pass:false};report.walks.push(row);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],deadline=performance.now()+35000,dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  while(true){const p=feet(),distance=Math.hypot(p.x-b.x,p.z-b.z),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length2)),expected=a.y+(b.y-a.y)*t;row.samples.push({...p,expected});assert(Math.abs(p.y-expected)<.36,`${label} floor height ${JSON.stringify({p,expected,target:b})}`);if(distance<.16)break;assert(performance.now()<deadline,`${label} blocked at ${JSON.stringify(p)}`);
   worker.send({type:'input',id,x:0,z:Math.min(1,distance/.6),yaw:Math.atan2(b.x-p.x,b.z-p.z)*180/Math.PI,pitch:0,fast:false});await delay(60);
  }
 }
 worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);assert(Math.abs(feet().y-points.at(-1).y)<.06,`${label} endpoint floor mismatch`);assert(player().grounded,label+' endpoint must remain grounded');row.endpoint={...feet(),grounded:player().grounded};row.pass=true;console.log('PASS',label,row.samples.length,'samples');
}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 const construction=JSON.parse(await readFile(component+'/report.json'));
 for(const row of construction.geometry.routes){await start(row.points[0]);await walk(row.points,row.label);}
 for(const row of construction.geometry.blocked){await start(row.start);const samples=[];for(let i=0;i<60;i++){worker.send({type:'input',id,x:0,z:1,yaw:row.yaw,pitch:0,fast:false});await delay(60);const p=feet();samples.push({...p});assert((p[row.axis]-row.limit)*row.sign>=0,row.label+' crossed');assert(Math.abs(p.y-row.start.y)<.06,row.label+' lost floor');}worker.send({type:'input',id,x:0,z:0,fast:false});const end=feet();assert(player().grounded,row.label+' must remain grounded');assert(Math.abs(end[row.axis]-row.start[row.axis])>.2,row.label+' never approached barrier');report.boundaries.push({label:row.label,samples,pass:true});console.log('PASS',row.label);}
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
