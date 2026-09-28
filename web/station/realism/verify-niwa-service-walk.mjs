import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [component,out]=process.argv.slice(2);assert(component&&out?.startsWith('.local/'));
const assets=JSON.parse(await readFile('web/v2/assets.json')),source=await readFile(assets.layout),layout=JSON.parse(source),report=JSON.parse(await readFile(component+'/report.json'));
assert.equal(createHash('sha256').update(source).digest('hex'),assets.layoutSha256);
const {origin:O,forward:D,south:A}=report.registration;
const point=(u,v)=>({x:O[0]+u*D[0]+v*A[0],y:31.6,z:-(O[2]+u*D[2]+v*A[2])});
const start=point(48.2,16.3),end=point(48.2,19.0),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
layout.spawn=start;await mkdir(out,{recursive:true});await writeFile(out+'/layout.json',JSON.stringify(layout)+'\n');
process.env.KYOTO_LAYOUT=out+'/layout.json';process.env.KYOTO_WORKER_LOG=out+'/worker.log';
const worker=new PhysicsWorker(),id='niwa-service-walk';let state;const samples=[];
worker.on('message',m=>{if(m.type==='state'&&m.id===id){state=m;samples.push(m.players?.find(p=>p.id===id));}});
async function until(condition,timeout=60000){const end=performance.now()+timeout;while(!condition()){assert(performance.now()<end,'Native walk timed out');await delay(30);}}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);await delay(500);
 const player=()=>state.players.find(p=>p.id===id);assert(player().grounded,'Counter frontage spawn grounded');assert(Math.abs(player().feet.y-start.y)<.1);
 const deadline=performance.now()+10000;
 while(distance(player().feet,end)>.15){assert(performance.now()<deadline,'Counter frontage path obstructed');const feet=player().feet;
  worker.send({type:'input',id,x:0,z:1,yaw:Math.atan2(end.x-feet.x,end.z-feet.z)*180/Math.PI,pitch:0,top:0,kick:0,fast:false});await delay(60);
 }
 worker.send({type:'input',id,x:0,z:0,yaw:0,pitch:0,top:0,kick:0});await delay(200);
 assert(samples.every(p=>!p||Math.abs(p.feet.y-start.y)<.1),'The route stays on the existing counter-front floor');assert(player().grounded);
 const result={layoutSha256:assets.layoutSha256,start,end,final:player().feet,distanceM:distance(start,player().feet),samples:samples.length,pass:true};await writeFile(out+'/report.json',JSON.stringify(result,null,2)+'\n');console.log('PASS unobstructed counter frontage walk',result);
}finally{worker.stop();}
