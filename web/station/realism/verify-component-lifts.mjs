// Native acceptance of both thresholds, doorway sensing and empty-shaft doors.
// Adjoining station routes are checked separately after composition.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);
assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const raw=await readFile(layoutPath),layout=JSON.parse(raw),motion=JSON.parse(await readFile(component+'/motion.json'));
assert(motion.lifts.length>0);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='component-lifts';let state,failure;
const report={layoutSha256:createHash('sha256').update(raw).digest('hex'),scope:'Lift hardware and immediate thresholds; adjoining routes checked separately',lifts:[],pass:false};
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
worker.on('failure',message=>{failure=message;});
const player=()=>state.players.find(p=>p.id===id),feet=()=>player().feet;
async function until(fn,label,timeout=30000){const end=performance.now()+timeout;while(!fn()){assert(!failure,failure);assert(performance.now()<end,label);await delay(40);}}
function point(l,z,y=l.origin.y){const a=(l.yaw||0)*Math.PI/180;return{x:l.origin.x+Math.sin(a)*z,y,z:l.origin.z+Math.cos(a)*z};}
function localZ(l,p){const a=(l.yaw||0)*Math.PI/180;return(p.x-l.origin.x)*Math.sin(a)+(p.z-l.origin.z)*Math.cos(a);}
async function start(p){const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...p,y:p.y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok,'Fixed threshold must support placement');const result=await worker.request({type:'design-start',id,start:placed.disk});assert(result.ok);await delay(180);assert(player().grounded);assert(Math.abs(feet().y-p.y)<.06);}
async function walk(target,label){const end=performance.now()+12000;while(true){assert(!failure,failure);const p=feet(),d=Math.hypot(p.x-target.x,p.z-target.z);assert(Math.abs(p.y-target.y)<.09,label+' lost threshold '+JSON.stringify(p));if(d<.1)break;assert(performance.now()<end,label+' blocked '+JSON.stringify(p));worker.send({type:'input',id,x:0,z:Math.min(1,d/.5),yaw:Math.atan2(target.x-p.x,target.z-p.z)*180/Math.PI,pitch:0,fast:false});await delay(50);}worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);assert(player().grounded);}
async function use(l){const r=await worker.request({type:'lift',id,lift:l.id});assert(r.ok,JSON.stringify(r));}
try{
 await worker.start();await until(()=>worker.ready,'Worker startup',90000);worker.send({type:'join',id});await until(()=>state?.players?.length,'Player startup');
 for(const source of motion.lifts){
  const l=layout.lifts.find(l=>l.id===source.id);assert(l);const pose=()=>state.lifts.find(p=>p.id===l.id),L=l.origin.y,H=L+l.height,row={id:l.id,checks:[],samples:[],pass:false};report.lifts.push(row);
  await start(point(l,-1.95));await walk(point(l,-.2),'Lower entry');row.checks.push('Walk from lower threshold into car');
  await use(l);await walk(point(l,l.doorZ),'Door sensor');await delay(2200);assert(pose().blocked&&pose().height===0&&pose().carDoor>.95,'Doorway must hold departure');row.checks.push('Doorway sensor holds doors open');
  await walk(point(l,-.2),'Clear doorway');await until(()=>pose().moving,'Lift departure');
  await until(()=>{const p=pose(),f={...feet()};row.samples.push({height:p.height,feet:f,grounded:player().grounded});assert(player().grounded&&Math.abs(f.y-L-p.height)<.09,'Idle rider must follow car');return p.upperDoor>.99&&!p.busy;},'Upper arrival');
  await walk(point(l,-1.95,H),'Upper exit');row.checks.push('Idle ride and exit onto upper threshold');
  await start(point(l,-1.95));assert(pose().height>l.height-.01,'Placement must retain car upstairs');
  worker.send({type:'input',id,x:0,z:1,yaw:l.yaw||0,pitch:0,fast:false});await delay(1600);worker.send({type:'input',id,x:0,z:0,fast:false});
  assert(localZ(l,feet())<l.doorZ-.15&&player().grounded&&Math.abs(feet().y-L)<.06,'Empty lower shaft must remain closed');row.checks.push('Closed landing doors block empty lower shaft');
  await use(l);await until(()=>pose().lowerDoor>.99&&!pose().busy,'Lower recall');await walk(point(l,-.2),'Reenter lower car');
  await use(l);await until(()=>pose().upperDoor>.99&&!pose().busy,'Second upper arrival');await use(l);await until(()=>pose().lowerDoor>.99&&!pose().busy,'Return arrival');
  await walk(point(l,-1.95),'Return exit');row.checks.push('Call car, ride up and down, exit lower threshold');row.pass=true;
  await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',l.id,row.checks.length,'checks');
 }
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
