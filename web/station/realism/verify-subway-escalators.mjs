// Walk onto each lane, ride in its declared direction without input, and exit.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),lanes=JSON.parse(await readFile(component+'/motion.json')).escalators;
assert(lanes.length>0,'The component must define escalator lanes');for(const lane of lanes)assert.deepEqual(layout.escalators.find(e=>e.id===lane.id),lane);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='subway-escalators',report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),rides:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
const player=()=>state.players.find(p=>p.id===id),feet=()=>player().feet;
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
function at(e,a){const p=e.path.slice(0,e.publicPointCount);let y=0;if(a>=p.at(-1).z)y=e.height;else if(a>p[0].z){const i=p.findIndex(p=>p.z>=a);y=p[i-1].y+(p[i].y-p[i-1].y)*(a-p[i-1].z)/(p[i].z-p[i-1].z);}return{x:e.lowerCenter.x+e.uphill.x*a,y:e.lowerCenter.y+y,z:e.lowerCenter.z+e.uphill.z*a};}
function along(e,p){return(p.x-e.lowerCenter.x)*e.uphill.x+(p.z-e.lowerCenter.z)*e.uphill.z;}
async function walk(e,target,row){const deadline=performance.now()+35000;while(true){const p=feet(),distance=Math.hypot(p.x-target.x,p.z-target.z);assert(Math.abs(p.y-at(e,along(e,p)).y)<.16,e.id+' walking floor mismatch '+JSON.stringify(p));row.approach.push({...p});if(distance<.14)break;assert(performance.now()<deadline,e.id+' blocked at '+JSON.stringify(p));worker.send({type:'input',id,x:0,z:Math.min(1,Math.max(.6,distance/.6)),yaw:Math.atan2(target.x-p.x,target.z-p.z)*180/Math.PI,pitch:0,fast:false});await delay(60);}worker.send({type:'input',id,x:0,z:0,fast:false});}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 for(const e of lanes){
  const direction=Math.sign(e.speed);assert(direction);
  const bottom=at(e,-e.flatLength-1.15),top=at(e,e.run+e.flatLength+1.15),start=direction>0?bottom:top,end=direction>0?top:bottom,row={lane:e.id,direction,approach:[],samples:[],pass:false};report.rides.push(row);
  const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok,e.id+' approach placement');await worker.request({type:'design-start',id,start:placed.disk});await delay(200);assert(player().grounded);
  await walk(e,at(e,direction>0?0:e.run),row);await walk(e,at(e,direction>0?1:e.run-1),row);await delay(150);
  const from={...feet()},deadline=performance.now()+30000;let last=along(e,from);
  while(direction>0?along(e,feet())<e.run+.4:along(e,feet())>-.4){await delay(80);const p={...feet()},a=along(e,p),expected=at(e,a).y;row.samples.push({...p,expected,grounded:player().grounded});assert(Math.abs(p.y-expected)<.16,e.id+' idle ride floor mismatch');assert(player().grounded,e.id+' idle rider lost ground');assert(direction*(a-last)>=-.01,e.id+' rider moved against the lane');assert(performance.now()<deadline,e.id+' idle ride stalled at '+JSON.stringify(p));last=a;}
  row.travel=direction*(along(e,feet())-along(e,from));assert(row.travel>e.run-1.7,e.id+' idle ride did not cover the slope');
  await walk(e,at(e,direction>0?e.run+e.flatLength:-e.flatLength),row);await walk(e,end,row);await delay(200);assert(player().grounded);assert(Math.abs(feet().y-end.y)<.06);row.endpoint={...feet()};row.pass=true;await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',e.id,'idle ride',row.travel.toFixed(3),'m');
 }
 report.pass=true;
}catch(e){report.error=String(e);throw e;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
