// Rebase the one destination affected by removing the superseded draft pier.
// All six targets, scoring and displayed throw settings remain unchanged.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutArg,outArg,traceArg]=process.argv.slice(2),layoutPath=resolve(layoutArg),out=resolve(outArg),tracePath=resolve(traceArg);
for(const p of [layoutPath,out,tracePath])assert(p.startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:false});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),hash=createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(layout.architecture.municipalStationFrontage.removedSupersededBoxes.map(b=>b.id),['west-north-terminal-pier']);
const original=JSON.parse(await readFile('web/starter-challenges.json')),courses=original.map(c=>({...c,layout:hash})),course=courses.find(c=>c.id==='kyoto-terracedrop');
const proof=JSON.parse(await readFile('web/levels/proof-inputs.json'));assert.equal(course.revision,2);
const traceBytes=await readFile(tracePath),trace=JSON.parse(traceBytes);assert.equal(trace.layout,hash);assert.equal(trace.challenge.id,course.id);
const routeLength=trace.poses.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...['x','y','z'].map(k=>p.p[k]-trace.poses[i].p[k])),0);
const fromDistance=course.campaign.distance,toDistance=Number(routeLength.toFixed(1));course.campaign={...course.campaign,distance:toDistance};
const fromGoal=course.goal,target={x:-68.55,y:0,z:23.55};
process.env.KYOTO_LAYOUT=layoutPath;process.env.KYOTO_WORKER_LOG=out+'/worker.log';
const worker=new PhysicsWorker(),id='frontage-destination-walk';let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
const until=async(fn,ms=65000)=>{const end=performance.now()+ms;while(!fn()){assert(performance.now()<end,'Native observation timed out');await delay(25);}};
const report={layout:hash,course:course.id,fromRevision:course.revision,fromGoal,proposedTarget:target,walks:[]};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 const {disk}=await worker.request({type:'place',id,slot:'goal',radius:fromGoal.radius,origin:{...target,y:.4},direction:{x:0,y:-1,z:0}});
 assert.equal(disk.surface,'concourse');assert(Math.abs(disk.center.y)<.001);assert(Math.abs(disk.normal.y-1)<1e-6);
 course.goal=disk;course.revision++;await worker.request({type:'select',id,challenge:course});report.goal=disk;report.nativeCourseValid=true;
 await worker.request({type:'select',id,challenge:null});
 const start=course.waypoints.at(-1).center,placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...start,y:.4},direction:{x:0,y:-1,z:0}});
 await worker.request({type:'design-start',id,start:placed.disk});await delay(150);
 for(const target of [disk.center,start]){
  const samples=[],deadline=performance.now()+16000;
  while(true){const feet=state.players.find(p=>p.id===id).feet,dx=target.x-feet.x,dz=target.z-feet.z,dist=Math.hypot(dx,dz);samples.push(feet);assert(Math.abs(feet.y)<.3,'Unexpected floor elevation');if(dist<.18)break;assert(performance.now()<deadline,'Public passage walk blocked');worker.send({type:'input',id,x:0,z:Math.min(1,dist/.6),yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:0,fast:dist>1});await delay(70);}
  worker.send({type:'input',id,x:0,z:0,fast:false});await delay(100);report.walks.push({target,samples,pass:true});
 }
 const adjustment={id:course.id,fromRevision:2,toRevision:3,fromGoal,toGoal:disk,fromDistance,toDistance,nativeTrace:{path:tracePath,sha256:createHash('sha256').update(traceBytes).digest('hex')},reason:'Removed the draft west terminal pier. Municipal source has an open passage at the former bank; the unchanged six-waypoint shot now settles farther west in the concourse.',evidence:'Native source rays and candidate shot receipts in .local/station-realism/frontage-seams and frontage-campaign-02; support and out-and-back capsule walk in this report.'};
 proof.sourceLayout=proof.layout;proof.layout=hash;proof.courseAdjustments=[adjustment];proof.courses.find(p=>p.id===course.id).revision=3;
 await writeFile(out+'/catalog.json',JSON.stringify(courses,null,2)+'\n');await writeFile(out+'/proof-inputs.json',JSON.stringify(proof,null,2)+'\n');report.pass=true;
 console.log('PASS unchanged course targets and throw, revised destination, native placement and two passage walks');
}catch(e){report.pass=false;report.error=String(e);throw e;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
