// Sample the live native floor geometry on both sides of the western upper join.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';

const [layoutPath,out]=process.argv.slice(2);
assert(layoutPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes);
const upper=layout.panels.find(p=>p.id==='west-v2-upper-0');
const plaza=layout.panels.find(p=>p.id==='muromachi-square');
assert(upper&&plaza,'Expected the current western upper landing and plaza');
const top=p=>Math.max(...p.vertices.map(v=>v.y));
await mkdir(out,{recursive:true});
process.env.KYOTO_LAYOUT=resolve(layoutPath);
process.env.KYOTO_WORKER_LOG=resolve(out,'worker.log');
const worker=new PhysicsWorker(),id='west-upper-audit',pending=new Map();
let joined=false,buffer='';
worker.on('message',m=>{if(m.type==='state'&&m.id===id)joined=true;});
async function until(predicate){const deadline=performance.now()+90000;while(!predicate()){assert(performance.now()<deadline,'Native startup timed out');await delay(40);}}
async function probe(origin){
 const request=randomUUID();let timer;
 try{return await new Promise((resolve,reject)=>{
  pending.set(request,resolve);
  timer=setTimeout(()=>{pending.delete(request);reject(Error('Native ray timed out'));},10000);
  worker.send({type:'place',id,request,slot:'waypoint',radius:.1,origin,direction:{x:0,y:-1,z:0}});
 });}finally{clearTimeout(timer);}
}
const report={layoutSha256:createHash('sha256').update(bytes).digest('hex'),upperY:top(upper),plazaY:top(plaza),rows:[],complete:false,
 scope:'Four sampled X sections at two ray origins. Low rays can start below existing high floors; compare both origins. These sections do not prove that no alternate route exists.'};
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>joined);
 // Capture unsuccessful placement responses too: waypoint fit is separate from
 // the ray hit, and a rejected waypoint can still identify a physical surface.
 worker.socket.on('data',bytes=>{
  buffer+=bytes;let end;
  while((end=buffer.indexOf('\n'))>=0){
   const message=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);
   pending.get(message.request)?.(message);pending.delete(message.request);
  }
 });
 for(const y of [16.2,23])for(const z of [18,10,0,-5])for(let x=-48;x>=-80;x-=2){
  const result=await probe({x,y,z});
  report.rows.push({origin:{x,y,z},hit:result.disk?.center??null,surface:result.disk?.surface??null,placementOk:result.ok,message:result.message??null});
 }
 report.complete=true;
 console.log(JSON.stringify({samples:report.rows.length,upperY:report.upperY,plazaY:report.plazaY,verticalDifferenceM:report.plazaY-report.upperY}));
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
