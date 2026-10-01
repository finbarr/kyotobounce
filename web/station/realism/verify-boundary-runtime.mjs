import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Client,delay} from '../../tests/api-client.mjs';
const [origin,out,routeFile]=process.argv.slice(2);assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const c=new Client(origin.replace(/^http/,'ws')),report={origin,routes:[],rays:[]},distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const player=()=>c.state.players.find(p=>p.id===c.id);
async function place(start){const m=await c.request('place',{slot:'start',radius:.25,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}},'placement');assert(m.disk);await c.request('design-start',{start:m.disk},'design-ready');await delay(250);assert(player().grounded);return m.disk;}
try{
 await c.join();report.layout=c.state.layout;
 const routes=JSON.parse(await readFile(routeFile)).geometry.routes;
 routes.push({label:'North entrance through atrium',points:[{x:0,y:0,z:24},{x:0,y:0,z:14}]});
 const prior=process.env.KYOTO_REUSE_WALKS==='1'?JSON.parse(await readFile(out+'/report.json')):null;
 if(prior)assert.equal(prior.layout,report.layout,'Reused walks must use the same served layout');
 for(const route of routes){const passed=prior?.routes.find(r=>r.label===route.label&&r.pass);if(passed){report.routes.push(passed);continue;}await place(route.points[0]);const row={label:route.label,samples:[]};report.routes.push(row);
  for(const target of route.points.slice(1)){const deadline=performance.now()+30000;
   while(distance(player().feet,target)>.16){const p=player().feet,dist=distance(p,target);assert(performance.now()<deadline,'Blocked route '+route.label+' '+JSON.stringify(p));c.input({yaw:Math.atan2(target.x-p.x,target.z-p.z)*180/Math.PI,z:Math.min(1,dist/.6),fast:dist>1});row.samples.push({...p});await delay(70);}
   c.input();await delay(140);assert(player().grounded&&Math.abs(player().feet.y-target.y)<.09,'Supported route endpoint '+route.label);
  }row.pass=true;console.log('PASS walk',row.label);
 }
 for(const [name,origin,direction]of [
  ['tower shaft north side',{x:30,y:65,z:205},{x:0,y:0,z:-1}],
  ['tower shaft south side',{x:30,y:65,z:140},{x:0,y:0,z:1}],
  ['tower hotel façade',{x:30,y:15,z:130},{x:0,y:0,z:1}],
 ]){const m=await c.request('place',{slot:'waypoint',radius:.1,origin,direction},'placement');assert(m.disk?.surface?.startsWith('municipal-building-'),'Retained tower collision '+name);report.rays.push({name,...m.disk});}
 // A full throw from the forecourt clears the hotel base and strikes the shaft.
 const ground=await c.request('place',{slot:'start',radius:.25,origin:{x:30,y:12,z:125},direction:{x:0,y:-1,z:0}},'placement');assert(ground.disk);await c.request('design-start',{start:ground.disk},'design-ready');await delay(200);
 c.input({yaw:0,pitch:55});await delay(120);c.send('charge',{layout:c.state.layout,physics:c.state.physics,challengeId:null,revision:null,powerRange:'full'});await delay(2850);
 const contact=c.next(m=>m.type==='impact'&&['municipal-building-3207444640','municipal-building-3207476640'].includes(m.surface),30000);c.send('release');report.towerImpact=await contact;assert(report.towerImpact.speed>1);await c.request('recall',{},'recalled');
 report.pass=true;console.log('PASS native tower contact, forecourt façades, atrium, garden and platform routes');
}catch(e){report.error=String(e);throw e;}finally{c.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
