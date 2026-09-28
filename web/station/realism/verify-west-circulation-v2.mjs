// Exercise the connected western route in the complete collision candidate.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),native=JSON.parse(await readFile(component+'/native-panels.json'));
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='west-v2-route',report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),walks:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
const feet=()=>state.players.find(p=>p.id===id).feet;
function point(e,z){const p=e.path.slice(0,e.publicPointCount);let h=0;if(z>=p.at(-1).z)h=e.height;else if(z>p[0].z){let i=p.findIndex(p=>p.z>=z);h=p[i-1].y+(p[i].y-p[i-1].y)*(z-p[i-1].z)/(p[i].z-p[i-1].z);}return{x:e.lowerCenter.x+e.uphill.x*z,y:e.lowerCenter.y+h,z:e.lowerCenter.z+e.uphill.z*z};}
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
 for(const lane of [1,2]){
  const lower=native.escalators.find(e=>e.id===`west-v2-lower-escalator-${lane}`),upper=native.escalators.find(e=>e.id===`west-v2-upper-escalator-${lane}`);assert(lower&&upper);
  const route=[];for(const e of [lower,upper]){route.push(point(e,-e.flatLength-1.11),point(e,0),point(e,e.run),point(e,e.run+e.flatLength+1.16));}
  await start(route[0]);await walk(route,'connected lane '+lane+' up');await walk(route.toReversed(),'connected lane '+lane+' down');
 }
 const stairs=native.panels.filter(p=>p.id.startsWith('west-v2-stair-')).map(p=>({x:(Math.min(...p.vertices.map(v=>v.x))+Math.max(...p.vertices.map(v=>v.x)))/2,y:Math.max(...p.vertices.map(v=>v.y)),z:(Math.min(...p.vertices.map(v=>v.z))+Math.max(...p.vertices.map(v=>v.z)))/2})).sort((a,b)=>a.y-b.y);
 assert.equal(stairs.length,31);const first=stairs[0],last=stairs.at(-1),length=Math.hypot(last.x-first.x,last.z-first.z),dx=(last.x-first.x)/length,dz=(last.z-first.z)/length;
 const route=[{x:first.x-dx*.8,y:.0365782864,z:first.z-dz*.8},...stairs,{x:last.x+dx*.6,y:5.6520280838,z:last.z+dz*.6}];
 await start(route[0]);await walk(route,'lower staircase up');await walk(route.toReversed(),'lower staircase down');
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
