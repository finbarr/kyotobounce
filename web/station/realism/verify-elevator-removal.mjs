import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Client,delay} from '../../tests/api-client.mjs';
const [origin,out]=process.argv.slice(2);assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));
const proof=JSON.parse(await readFile(out+'/removal.json')),native=JSON.parse(await readFile(out+'/native-panels.json'));
const c=new Client(origin.replace(/^http/,'ws')),report={origin,doors:[],floors:[],walks:[]};
const player=()=>c.state.players.find(p=>p.id===c.id);
async function ray(origin,direction){return(await c.request('place',{slot:'waypoint',radius:.1,origin,direction},'placement')).disk;}
try{
 await c.join();report.layout=c.state.layout;assert(!('lifts'in c.state),'No elevator state is streamed');
 for(const d of proof.doors){
  const a=d.yaw*Math.PI/180,f={x:Math.sin(a),y:0,z:Math.cos(a)},[x,y,z]=d.center;
  const hit=await ray({x:x-f.x*.6,y,z:z-f.z*.6},f);assert.equal(hit?.surface,d.id,'Closed door collision '+d.id);report.doors.push({id:d.id,hit:hit.center});
 }
 for(const patch of proof.patches){
  const p=native.panels.find(p=>p.id==='public-frontage-'+patch.id);assert(p);let best=null,area=0;
  for(let i=0;i<p.triangles.length;i+=3){const v=p.triangles.slice(i,i+3).map(i=>p.vertices[i]),[a,b,c]=v,projected=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x));
   if(projected>area&&v.every(v=>patch.role?.includes('ceiling')?v.y<patch.boundsY[1]-.001:v.y>patch.boundsY[0]+.001)){best=v;area=projected;}}
  assert(best);const pt=Object.fromEntries(['x','y','z'].map(k=>[k,best.reduce((n,v)=>n+v[k]/3,0)]));
  const ceiling=patch.role?.includes('ceiling'),sign=ceiling?-1:1;const hit=await ray({...pt,y:pt.y+sign*.06},{x:0,y:-sign,z:0});assert.equal(hit?.surface,p.id,'Restored slab collision '+p.id);report.floors.push({id:p.id,point:pt});
 }
 for(const [id,floor]of [['station-central-lift',3],['station-east-public-lift',2],['isetan-north-lift',3]]){
  const d=proof.doors.find(d=>d.lift===id&&d.floor===floor),a=d.yaw*Math.PI/180,f={x:Math.sin(a),z:Math.cos(a)},pt={x:d.center[0]-f.x*1.4,y:d.height,z:d.center[2]-f.z*1.4};
  const disk=(await c.request('place',{slot:'start',radius:.25,origin:{...pt,y:pt.y+.5},direction:{x:0,y:-1,z:0}},'placement')).disk;assert(disk);
  await c.request('design-start',{start:disk},'design-ready');await delay(200);assert(player().grounded);
  for(let i=0;i<18;i++){c.input({yaw:d.yaw,z:1});await delay(70);}c.input();await delay(150);
  const p=player().feet,clearance=(d.center[0]-p.x)*f.x+(d.center[2]-p.z)*f.z;
  assert(clearance>.20&&clearance<.5,'Closed door stops the walker: '+JSON.stringify({id,p,clearance}));assert(player().grounded);report.walks.push({id,clearance,feet:p});
 }
 const door=proof.doors.find(d=>d.lift==='station-central-lift'&&d.floor===3),a=door.yaw*Math.PI/180,f={x:Math.sin(a),z:Math.cos(a)};
 const start={x:door.center[0]-f.x*1.8,y:door.height,z:door.center[2]-f.z*1.8};
 const disk=(await c.request('place',{slot:'start',radius:.25,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}},'placement')).disk;assert(disk);
 await c.request('design-start',{start:disk},'design-ready');await delay(200);c.input({yaw:door.yaw,pitch:0});await delay(120);
 c.send('charge',{layout:c.state.layout,physics:c.state.physics,challengeId:null,revision:null,powerRange:'precision'});await delay(300);
 const impact=c.next(m=>m.type==='impact'&&m.surface.startsWith('public-frontage-station-central-lift-landing-1-door-'),15000);c.send('release');report.doorImpact=await impact;assert(report.doorImpact.speed>1);await c.request('recall',{},'recalled');
 report.pass=true;console.log('PASS',report.doors.length,'closed door leaves,',report.floors.length,'restored slabs, and',report.walks.length,'blocked doorway approaches');
}catch(e){report.error=String(e);throw e;}finally{c.close();await writeFile(out+'/native-proof.json',JSON.stringify(report,null,2)+'\n');}
