// Validate retained course surfaces against candidate native geometry. Local only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
import {Store} from '../../store.ts';
const [layoutArg,outArg,dbArg]=process.argv.slice(2),layoutPath=resolve(layoutArg),out=resolve(outArg),db=dbArg&&resolve(dbArg);
for(const p of [layoutPath,out,db].filter(Boolean))assert(p.startsWith(resolve('.local')+'/'),'Use isolated candidate paths');
await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),bytes=await readFile(layoutPath),layout=sha(bytes);
const catalogBytes=await readFile('web/starter-challenges.json'),courses=JSON.parse(catalogBytes).map(c=>({...c,layout}));
process.env.KYOTO_LAYOUT=layoutPath;process.env.KYOTO_WORKER_LOG=out+'/worker.log';
const worker=new PhysicsWorker(),states=new Map();let ready;
worker.on('message',m=>{if(m.type==='ready')ready=m;if(m.type==='state')states.set(m.id,m);});
const until=async(fn,ms=65000)=>{const end=performance.now()+ms;while(!fn()){assert(performance.now()<end,'Observation timed out');await delay(25);}};
const report={layoutSha256:layout,originalCatalogSha256:sha(catalogBytes),scope:'Native surface/placement validation only. Authored shot completion and scoring proof remain required before publication.',courses:[],walks:[]};
try{
 await worker.start();await until(()=>worker.ready);assert.equal(ready.layout,layout);
 const id='city-course-placement-proof';worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);
 for(const course of courses){await worker.request({type:'select',id,challenge:course});report.courses.push({id:course.id,revision:course.revision,placementValid:true});}
 // Use native-validated starts on the retained concourse and real input movement.
 await worker.request({type:'select',id,challenge:null});
 for(const x of [-40,0,30,60,100]){
  const {disk}=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{x,y:1,z:27},direction:{x:0,y:-1,z:0}});
  await worker.request({type:'design-start',id,start:disk});await delay(120);
  const samples=[];
  const walk=async(direction,target)=>{const deadline=performance.now()+8000;while(true){const p=states.get(id).players.find(p=>p.id===id);samples.push({feet:p.feet,grounded:p.grounded});if(direction>0?p.feet.z>=target:p.feet.z<=target)break;assert(performance.now()<deadline,`Entrance ${x} blocked before ${target}, reached ${p.feet.z}`);assert(p.feet.y>-.3&&p.feet.y<.5,`Entrance ${x} height jump`);worker.send({type:'input',id,x:0,z:direction,yaw:0,pitch:0,fast:true});await delay(70);}worker.send({type:'input',id,x:0,z:0,yaw:0,pitch:0,fast:false});await delay(100);};
  await walk(1,34);await walk(-1,27.2);const maxDrift=Math.max(...samples.map(s=>Math.abs(s.feet.x-x)));assert(maxDrift<.25,'Walk deflected sideways');
  report.walks.push({x,startZ:27,outwardZ:34,returnedZ:27.2,samples,maxDrift});console.log('PASS entrance out-and-back',x);
 }
 await writeFile(out+'/catalog.json',JSON.stringify(courses,null,2)+'\n');
 if(db){const store=new Store(db);try{store.syncCampaign(courses);}finally{store.db.close();}report.testDatabase=db;}
 report.pass=true;
} catch(e){report.pass=false;report.error=String(e);throw e;}
finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({courses:report.courses.length,walks:report.walks.length,pass:report.pass}));
