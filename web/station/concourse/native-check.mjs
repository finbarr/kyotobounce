import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {PhysicsWorker} from '../../worker.ts';
const out=resolve(process.argv[2]);assert(out.includes('/.local/'));await mkdir(out,{recursive:true});
const digest=x=>createHash('sha256').update(x).digest('hex');
const layout=digest(await readFile(process.env.KYOTO_LAYOUT));process.env.KYOTO_WORKER_LOG=out+'/worker.log';
const all=JSON.parse(await readFile('web/starter-challenges.json')),latest=[...new Map(all.map(c=>[c.id,c])).values()];
const worker=new PhysicsWorker();let state,events=[];const checks=[];
worker.on('message',m=>{if(m.type==='state')state=m;events.push(m);});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(p,ms=20000){const end=performance.now()+ms;while(!p()){assert(performance.now()<end,'Native timeout');await delay(10);}}
const id='concourse-private-proof';
try{
 await worker.start();await until(()=>worker.ready,65000);worker.send({type:'join',id});await until(()=>state?.players?.length);
 // Every new accessible fixture face must be the native ray hit. This probes
 // each box at its largest exposed face, outside existing walls or neighbors.
 const receipt=JSON.parse(await readFile(resolve(process.env.KYOTO_LAYOUT,'../concourse.json')));
 let buffer='';const pending=new Map();worker.socket.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const m=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(m.request)?.(m);pending.delete(m.request);}});
 for(const r of receipt.solidFixtures){
  if(!/drink-machine|ticket-machine|recycling-\d|locker-column/.test(r.id))continue;
  const request=randomUUID(),reply=new Promise((res,rej)=>{const t=setTimeout(()=>rej(Error('ray timeout')),10000);pending.set(request,m=>{clearTimeout(t);res(m);});});
  worker.send({type:'place',id,slot:'waypoint',radius:.01,origin:{x:r.center.x,y:r.center.y+.08,z:r.center.z+r.size.z/2+.15},direction:{x:0,y:0,z:-1},request});
  const hit=await reply;assert.ok(hit.disk?.surface?.startsWith('concourse-'),r.id+': '+hit.disk?.surface);checks.push({fixture:r.id,surface:hit.disk.surface});
 }
 for(const original of [...latest,...latest.filter(c=>c.id==='atrium-last-order'),...latest.filter(c=>c.id==='atrium-last-order')]){
  const c={...structuredClone(original),layout,physics:state.physics};events=[];
  await worker.request({type:'select',id,challenge:c});await delay(150);
  const h=c.hint;const proof=JSON.parse(await readFile('web/levels/proof-inputs.json')).courses.find(p=>p.id===c.id)?.shot;worker.send({type:'input',id,x:0,z:0,yaw:h.yaw,pitch:h.pitch,top:h.top,kick:h.kick,fast:false});await delay(150);
  if(proof?.period){const target=proof.phase+Math.ceil((state.stationTime+h.holdMs/1000+.3-proof.phase)/proof.period)*proof.period;await delay(Math.max(0,(target-state.stationTime-h.holdMs/1000-.12)*1000));}
  worker.send({type:'charge',id,powerRange:h.powerRange||'precision'});await delay(h.holdMs);worker.send({type:'release',id,power:h.holdMs/2800});
  await until(()=>events.some(m=>['result','notice'].includes(m.type)),90000);await delay(100);
  const result=events.find(m=>m.type==='result');
  await writeFile(out+'/'+c.id+'.json',JSON.stringify({challenge:c,events,final:state}));
  assert.ok(result,c.name+' finishes at rest');assert.ok(Object.values(state.velocity).every(v=>v===0)&&Object.values(state.spin).every(v=>v===0),c.name+' full rest');
  if(c.goal)assert.equal(result.destinationReached,true,c.name+' destination');
  if(c.requiredSurface)assert.ok(events.some(e=>e.type==='impact'&&e.surface===c.requiredSurface),c.name+' required contact');
  if(c.waypoints?.length)assert.ok(result.waypointHits?.length,c.name+' waypoints');
  checks.push({course:c.id,sourceRevision:c.revision,rest:true,destinationReached:result.destinationReached,waypointHits:result.waypointHits?.length,duration:result.duration});console.log('PASS',c.name);worker.send({type:'recall',id});await delay(100);
 }
 await writeFile(out+'/receipt.json',JSON.stringify({status:'pass',layout,checks},null,2));
}finally{await worker.stop();}
