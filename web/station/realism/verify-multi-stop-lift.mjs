// Full-station native rides, landings and empty-shaft protection for a store core.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const raw=await readFile(layoutPath),layout=JSON.parse(raw),spec=JSON.parse(await readFile(component+'/lift-spec.json')),l=layout.lifts.find(l=>l.id===spec.id);assert(l&&l.stops.length>=2);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='multi-stop-core',report={pass:false,layoutSha256:createHash('sha256').update(raw).digest('hex'),lift:l.id,stops:l.stops,rides:[],checks:[]};let state,failure;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});worker.on('failure',m=>failure=m);
const player=()=>state.players.find(p=>p.id===id),pose=()=>state.lifts.find(p=>p.id===l.id),a=(l.yaw||0)*Math.PI/180;
const point=(z,floor)=>({x:l.origin.x+Math.sin(a)*z,y:l.origin.y+l.stops[floor].height,z:l.origin.z+Math.cos(a)*z});
const localZ=()=>Math.sin(a)*(player().feet.x-l.origin.x)+Math.cos(a)*(player().feet.z-l.origin.z);
async function until(fn,label,timeout=60000){const end=performance.now()+timeout;while(!fn()){assert(!failure,failure);assert(performance.now()<end,label);await delay(40);}}
async function start(floor){const p=point(-2.8,floor),r=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...p,y:p.y+.5},direction:{x:0,y:-1,z:0}});assert(r.ok,JSON.stringify(r));assert((await worker.request({type:'design-start',id,start:r.disk})).ok);await delay(200);assert(player().grounded&&Math.abs(player().feet.y-p.y)<.06);}
async function walk(z,floor){const p=point(z,floor),end=performance.now()+12000;while(Math.abs(localZ()-z)>.1){assert(performance.now()<end,'Lift threshold blocked '+JSON.stringify(player().feet));assert(player().grounded&&Math.abs(player().feet.y-p.y)<.09);worker.send({type:'input',id,x:0,z:Math.min(1,Math.abs(localZ()-z)/.5),yaw:(l.yaw||0)+(z>localZ()?0:180),pitch:0,fast:false});await delay(50);}worker.send({type:'input',id,x:0,z:0,fast:false});await delay(160);assert(player().grounded&&Math.abs(player().feet.y-p.y)<.06);}
async function use(stop){const r=await worker.request({type:'lift',id,lift:l.id,...(stop===undefined?{}:{liftStop:l.stops[stop].id})});assert(r.ok,JSON.stringify(r));}
try{
 await worker.start();await until(()=>worker.ready,'Worker ready',90000);worker.send({type:'join',id});await until(()=>state?.players?.length,'Player ready');
 await start(0);await walk(-.2,0);await assert.rejects(worker.request({type:'lift',id,lift:l.id,liftStop:'missing-floor'}),/Choose a lift floor/);report.checks.push('Native authority rejects unknown destination');
 const top=l.stops.length-1,tour=[...Array.from({length:top},(_,i)=>i+1),0,top,...Array.from({length:top},(_,i)=>top-i-1)];let current=0;
 for(const target of tour){
  const row={from:current,to:target,samples:[],pass:false};report.rides.push(row);await use(target);await until(()=>pose().moving,'Departure');
  await until(()=>{const p=pose(),f=player().feet;assert(player().grounded&&Math.abs(f.y-l.origin.y-p.height)<.09,'Grounded rider follows car');assert(p.landingDoors.length===l.stops.length);for(let i=0;i<l.stops.length;i++)if(p.landingDoors[i]>1e-6)assert(Math.abs(p.height-l.stops[i].height)<.01,'Door opens only beside car');if(p.moving)assert(p.carDoor===0&&p.landingDoors.every(v=>v===0),'Closed doors while moving');row.samples.push({height:p.height,feet:{...f},grounded:player().grounded});return !p.busy&&p.landingDoors[target]>.99;},'Arrival at '+l.stops[target].id);
  await walk(-2.8,target);row.endpoint={...player().feet};row.pass=true;console.log('PASS native lift',l.stops[current].id,'to',l.stops[target].id);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');current=target;await walk(-.2,current);
 }
 // Leave the car at the top, then approach an empty middle landing and call it.
 await use(top);await until(()=>!pose().busy&&pose().landingDoors[top]>.99,'Park at top');const middle=Math.floor(top/2);await start(middle);worker.send({type:'input',id,x:0,z:1,yaw:l.yaw||0,pitch:0,fast:false});await delay(1800);worker.send({type:'input',id,x:0,z:0,fast:false});assert(localZ()<l.doorZ-.15&&player().grounded&&Math.abs(player().feet.y-point(0,middle).y)<.06);report.checks.push('Empty intermediate landing doors block the shaft');await use();await until(()=>!pose().busy&&pose().landingDoors[middle]>.99,'Call to middle');await walk(-.2,middle);report.checks.push('Called car opens at the requested intermediate landing');
 report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
