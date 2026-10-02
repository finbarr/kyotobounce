import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Client,delay} from '../../tests/api-client.mjs';
const [origin,out]=process.argv.slice(2);assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));
const proof=JSON.parse(await readFile(out+'/repair.json')),c=new Client(origin.replace(/^http/,'ws')),report={origin,rays:[],routes:[]};
const player=()=>c.state.players.find(p=>p.id===c.id),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
try{
 await c.join();report.layout=c.state.layout;
 const [x,y,z]=proof.clockCenter;
 for(const [id,origin,direction]of [
  ['atrium-gate-clock-body',{x,y,z:z+1},{x:0,y:0,z:-1}],
  ['central-lift-ground-front-south-joined',{x:-32.5,y:1.5,z:-5.2},{x:-1,y:0,z:0}],
  ['central-lift-ground-front-north-joined',{x:-32.5,y:1.5,z:-1.4},{x:-1,y:0,z:0}],
  ['central-lift-ground-entry-header-joined',{x:-32.5,y:3.0,z:-3},{x:-1,y:0,z:0}],
 ]){const {disk}=await c.request('place',{slot:'waypoint',radius:.1,origin,direction},'placement');assert.equal(disk?.surface,id);report.rays.push({id,hit:disk.center});}
 for(const [label,points]of [
  ['Atrium approach',[{x:1,y:0,z:-7},{x:1,y:0,z:-10}]],
  ['Wide gate lane',[{x:5.1733,y:0,z:-12},{x:5.1733,y:0,z:-16}]],
  ['West frontage approach',[{x:-30,y:0,z:-9},{x:-30,y:0,z:8}]],
  ['Bridge crossing',[{x:-6,y:9.5894,z:-13.2},{x:9,y:9.5894,z:-13.2}]],
 ]){
  const start=points[0],{disk}=await c.request('place',{slot:'start',radius:.25,origin:{...start,y:start.y+.5},direction:{x:0,y:-1,z:0}},'placement');assert(disk,label);
  await c.request('design-start',{start:disk},'design-ready');await delay(200);assert(player().grounded,label);
  const row={label,start:player().feet};report.routes.push(row);
  for(const target of points.slice(1)){const deadline=performance.now()+15000;
   while(distance(player().feet,target)>.16){const p=player().feet,dist=distance(p,target);assert(performance.now()<deadline,'Blocked '+label+' '+JSON.stringify(p));c.input({yaw:Math.atan2(target.x-p.x,target.z-p.z)*180/Math.PI,z:Math.min(1,dist/.6),fast:dist>1});await delay(70);}
   c.input();await delay(150);assert(player().grounded&&Math.abs(player().feet.y-target.y)<.09,label);
  }row.end=player().feet;row.pass=true;console.log('PASS',label);
 }
 report.pass=true;console.log('PASS native mounted clock, frontage collision, atrium and gate routes');
}catch(e){report.error=String(e);throw e;}finally{c.close();await writeFile(out+'/native-proof.json',JSON.stringify(report,null,2)+'\n');}
