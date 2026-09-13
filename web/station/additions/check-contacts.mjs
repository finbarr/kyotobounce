// Real sphere contacts against representative new architecture and fixtures.
// Runs an isolated native worker; never writes game records or contacts prod.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const layoutPath=resolve(process.argv[2]),out=resolve(process.argv[3]);
assert(out.startsWith(resolve('.local')+'/'));
const layout=createHash('sha256').update(await readFile(layoutPath)).digest('hex');
await mkdir(out,{recursive:true});process.env.KYOTO_LAYOUT=layoutPath;process.env.KYOTO_WORKER_LOG=out+'/worker.log';
const worker=new PhysicsWorker(),states=new Map(),contacts=new Map(),checks=[];
worker.on('message',m=>{if(m.type==='state')states.set(m.id,m);if(m.type==='impact')contacts.get(m.id)?.push(m);});
const until=async(f,ms=65000)=>{const end=performance.now()+ms;while(!f()){assert(performance.now()<end,'Native observation timed out');await delay(20);}};
const y4=19.585964912280705;
const cases=[
 ['heart-in-stock',[25.5,0,15.7],0,4,12,'add-heart1f-cold'],
 ['travel-counter',[15.5,0,15.7],0,0,6,'add-travel1f-service-counter'],
 ['porta-stairs',[-34,0,18],0,-12,5,'add-porta-north-entry'],
 ['isetan-doors',[-74,0,-7],-90,0,5,'add-isetan1f-inner-doors'],
 ['passage-wall',[-62.4,7.35,-75],90,0,9,'add-passage2f-wall'],
 ['west-square-wall',[-51,7.35,-26.2],0,0,5,'add-westsquare-curved-ground-wall'],
 ['theater-door',[65,7.35,-14],180,0,5,'add-theater2f-theater-door'],
 ['wood-square-play',[5,y4,-34],0,-5,5,'add-wood4f-timber-play'],
 ['niwa-counter',[108.1,34.62,-20],180,0,5,'add-niwa-tea-counter'],
 ['promenade-parapet',[0,15.5,-44],180,-5,6,'add-promenade3f-'],
 ['skyway-base',[-45,45.2,2.3],180,-35,3,'add-skyway-opaque-base'],
 ['museum-column',[-11,0,31],0,0,5,'add-stonemuseum-column'],
];
try{
 await worker.start();await until(()=>worker.ready);
 for(const [name,p,yaw,pitch,speed,prefix]of cases){
  const id='contact-'+name;worker.send({type:'join',id});await until(()=>states.get(id)?.players?.length);contacts.set(id,[]);
  try{
   const disk=(await worker.request({type:'place',id,slot:'start',radius:.25,origin:{x:p[0],y:p[1]+.3,z:p[2]},direction:{x:0,y:-1,z:0}})).disk;
   await worker.request({type:'select',id,challenge:{id,start:disk,goal:{...disk,radius:.1},layout,physics:states.get(id).physics,throwModel:'robot-v4'}});
   worker.send({type:'input',id,x:0,z:0,yaw,pitch,top:0,kick:0});await delay(100);
   worker.send({type:'charge',id,powerRange:'precision'});await delay(100);
   worker.send({type:'release',id,power:(speed-.5)/11.5});
   const end=performance.now()+6500;
   while(performance.now()<end&&!contacts.get(id).some(c=>c.surface.startsWith(prefix)))await delay(50);
   const trace=contacts.get(id),surfaces=[...new Set(trace.map(c=>c.surface))],pass=surfaces.some(s=>s.startsWith(prefix));
   checks.push({name,start:p,yaw,pitch,speed,prefix,surfaces,pass});
   await writeFile(out+'/'+name+'.json',JSON.stringify(trace));console.log(pass?'PASS':'FAIL',name,surfaces.slice(0,8));
  }catch(error){checks.push({name,pass:false,error:error.message});console.log('FAIL',name,error.message);}
  worker.send({type:'leave',id});
 }
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify({layout,checks},null,2));}
assert(checks.every(c=>c.pass),'Native contact failures; see '+out+'/report.json');
