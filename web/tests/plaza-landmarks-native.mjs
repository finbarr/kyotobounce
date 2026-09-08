// Actual immutable native worker, isolated layout/log; no production or DB access.
import {PhysicsWorker} from '../worker.ts';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=resolve('artifacts/station-detail/plaza-landmarks'),candidate=dir+'/candidate';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const executable='/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64';
const assembly=hash(await readFile(executable.replace('KyotoPhysicsWorker.x86_64','KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll')));
assert.equal(assembly,'9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef');
process.env.KYOTO_WORKER_EXECUTABLE=executable;process.env.KYOTO_LAYOUT=candidate+'/station-layout.json';process.env.KYOTO_WORKER_LOG=dir+'/native.worker.log';
const layout=hash(await readFile(process.env.KYOTO_LAYOUT)),worker=new PhysicsWorker(),states=new Map(),traces=new Map(),checks=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
worker.on('message',m=>{if(m.type==='state')states.set(m.id,m);if(traces.has(m.id)&&['impact','state','result','notice'].includes(m.type))traces.get(m.id).push(m);});
try{
 await worker.start();for(let i=0;i<120&&!worker.ready;i++)await delay(500);assert.ok(worker.ready);
 // Capture the native hit even when a large waypoint cannot fit on a curved face.
 // This is ray/contact evidence, not a claim that waypoint validation passed.
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(m.type==='reply'&&pending.has(m.request)){pending.get(m.request)(m);pending.delete(m.request);}}});
 const ray=async(id,origin,direction)=>{const request=randomUUID();const response=new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Ray timeout')),10000);pending.set(request,m=>{clearTimeout(t);r(m);});});worker.send({type:'place',id,slot:'waypoint',radius:.1,origin:Object.fromEntries('xyz'.split('').map((k,i)=>[k,origin[i]])),direction:Object.fromEntries('xyz'.split('').map((k,i)=>[k,direction[i]])),request});return response;};
 const id='k028-ray';worker.send({type:'join',id});await delay(300);
 const y=19.585964912280705;
 const cases=[
  ['shukobu-plinth',[-64.5,y+1,3],[0,-1,0],'k028-shukobu-stone-plinth'],
  ['shukobu-leg',[-64.25,y+1.15,1],[0,0,1],'k028-shukobu-rounded-leg--1'],
  ['shukobu-plate',[-64.2,y+5,1],[0,0,1],'k028-shukobu-curved-armor--1-2'],
  ['shukobu-open-loop',[-63.5,y+4,1],[0,0,1],null,'k028-shukobu'],
  ['shukobu-fork-opening',[-63.5,y+1.3,1],[0,0,1],null,'k028-shukobu'],
  ['space-base',[63.9,21.5,-7],[0,-1,0],'k028-space-stone-upper-plinth'],
  ['space-frame',[63.85,23.6,-9],[0,0,1],'k028-space-asymmetric-open-frame'],
  ['space-opening',[63,23.85,-9],[0,0,1],null,'k028-space'],
  ['space-red-insert',[63.37,21.75,-9],[0,0,1],'k028-space-colored-insert-7'],
  ['kyoto-base',[63.35,21.5,-2],[0,-1,0],'k028-kyoto-monument-base'],
  ['kyoto-k',[63.65,21.5,-4],[0,0,1],'k028-kyoto-letter-0-K'],
  ['kyoto-o-opening',[67,21.75,-4],[0,0,1],null,'k028-kyoto-letter-2-O'],
  ['kyoto-o-side',[66.40,21.75,-4],[0,0,1],'k028-kyoto-letter-2-O']
 ];
 for(const [name,origin,direction,expected,excluded]of cases){const reply=await ray(id,origin,direction),surface=reply.disk?.surface||null;const pass=expected?surface===expected:!surface?.startsWith(excluded);checks.push({name,kind:'native-ray',origin,direction,expected,excluded,surface,hit:reply.disk,waypointValid:reply.ok,pass});console.log(name,pass,surface);}
 worker.send({type:'leave',id});
 // Native walking starts are validated on the actual supported plaza, then free walking.
 for(const s of [
  {id:'west-circulation',start:[-69,y,-5],yaw:0,seconds:6.0,minDistance:7.5},
  {id:'east-escalator-approach',start:[66,20.5,-16],yaw:0,seconds:6.0,minDistance:7.5},
  {id:'east-monument-approach',start:[66,20.5,-8],yaw:0,seconds:1.8,minDistance:2.3},
  {id:'west-plinth-block',start:[-63.5,y,.5],yaw:0,seconds:2.0,maxZ:2.25},
  {id:'space-plinth-block',start:[63,20.5,-4.5],yaw:180,seconds:2.0,minZ:-5.42},
  {id:'kyoto-base-block',start:[67,20.5,-4.2],yaw:0,seconds:2.0,maxZ:-2.7}
 ]){
  const id='k028-'+s.id;worker.send({type:'join',id});await delay(160);
  try{
   const start=(await worker.request({type:'place',id,slot:'start',radius:.25,origin:{x:s.start[0],y:s.start[1]+.08,z:s.start[2]},direction:{x:0,y:-1,z:0}})).disk;
   await worker.request({type:'select',id,challenge:{id,start,goal:{...start,radius:.25},layout,physics:states.get(id).physics,throwModel:'robot-v4'}});
   await worker.request({type:'select',id,challenge:null});await delay(200);const before=states.get(id).players[0].feet;
   for(let i=0;i<s.seconds*10;i++){worker.send({type:'input',id,x:0,z:1,yaw:s.yaw,pitch:0,fast:false});await delay(100);}
   worker.send({type:'input',id,x:0,z:0,yaw:s.yaw,pitch:0});await delay(150);const after=states.get(id).players[0].feet;const distance=Math.hypot(after.x-before.x,after.z-before.z);
   const pass=Math.abs(after.y-s.start[1])<.08&&(s.minDistance===undefined||distance>s.minDistance)&&(s.maxZ===undefined||after.z<s.maxZ)&&(s.minZ===undefined||after.z>s.minZ);
   checks.push({name:s.id,kind:'native-walk',before,after,distance,pass});console.log(s.id,pass,after);
  }catch(e){checks.push({name:s.id,pass:false,error:String(e)});console.log(s.id,String(e));}
  worker.send({type:'leave',id});
 }
 // Contact shots originate on existing floors; actual impact events prove sphere contact.
 for(const s of [
  {id:'red-leg-shot',start:[-64.45,y,1],yaw:0,pitch:0,power:.08,prefix:'k028-shukobu-rounded-leg'},
  {id:'space-frame-shot',start:[63.36,20.5,-4.5],yaw:180,pitch:0,power:.015,prefix:'k028-space-asymmetric-open-frame'},
  {id:'kyoto-letter-shot',start:[68.23,20.5,-4.2],yaw:0,pitch:0,power:.06,prefix:'k028-kyoto-letter-3-T'}
 ]){
  const id='k028-'+s.id;worker.send({type:'join',id});traces.set(id,[]);await delay(200);
  try{
   const start=(await worker.request({type:'place',id,slot:'start',radius:.25,origin:{x:s.start[0],y:s.start[1]+.08,z:s.start[2]},direction:{x:0,y:-1,z:0}})).disk;
   await worker.request({type:'select',id,challenge:{id,start,goal:{...start,radius:.25},layout,physics:states.get(id).physics,throwModel:'robot-v4'}});
   worker.send({type:'input',id,x:0,z:0,yaw:s.yaw,pitch:s.pitch,top:0,kick:0});await delay(200);worker.send({type:'charge',id,powerRange:'full'});await delay(100);worker.send({type:'release',id,power:s.power});await delay(6500);
   const trace=traces.get(id),surfaces=[...new Set(trace.filter(m=>m.type==='impact').map(m=>m.surface))],pass=surfaces.some(x=>x.startsWith(s.prefix));
   checks.push({name:s.id,kind:'native-ball-contact',surfaces,pass,final:states.get(id)});await writeFile(dir+'/'+s.id+'.json',JSON.stringify(trace));console.log(s.id,pass,surfaces);
  }catch(e){checks.push({name:s.id,pass:false,error:String(e)});console.log(s.id,String(e));}
  worker.send({type:'leave',id});
 }
 await writeFile(dir+'/native.json',JSON.stringify({layout,assembly,checks,status:checks.every(c=>c.pass)?'pass':'fail'},null,2));assert.ok(checks.every(c=>c.pass),'Native acceptance failures; see native.json');
}finally{worker.stop();}
