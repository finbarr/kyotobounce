// Exercise complete moving-bank turnbacks, B2 circulation and both subway links.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes);
process.env.KYOTO_LAYOUT=resolve(layoutPath);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='porta-connection',report={mode:process.env.KYOTO_PORTA_MODE||'all',laneFilter:process.env.KYOTO_PORTA_LANES||null,layoutSha256:createHash('sha256').update(bytes).digest('hex'),walks:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
const player=()=>state.players.find(p=>p.id===id),feet=()=>player().feet;
async function start(p){const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...p,y:p.y+.5},direction:{x:0,y:-1,z:0}}).catch(e=>{throw Error(e.message+' at '+JSON.stringify(p))});assert(placed.ok,'Unsupported route entry '+JSON.stringify(placed));await worker.request({type:'design-start',id,start:placed.disk});await delay(200);assert(player().grounded,'Route entry must remain grounded: '+JSON.stringify(p));}
async function walk(points,label,lane=null){const row={label,points,samples:[],pass:false};report.walks.push(row);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],deadline=performance.now()+35000,dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  while(true){const p=feet(),distance=Math.hypot(p.x-b.x,p.z-b.z),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length2)),expected=a.y+(b.y-a.y)*t;row.samples.push({...p,expected});assert(Math.abs(p.y-expected)<.36,`${label} floor height ${JSON.stringify({p,expected,target:b})}`);if(distance<.16)break;assert(performance.now()<deadline,`${label} blocked at ${JSON.stringify(p)}`);
   worker.send({type:'input',id,x:0,z:Math.min(1,Math.max(.6,distance/.6)),yaw:Math.atan2(b.x-p.x,b.z-p.z)*180/Math.PI,pitch:0,fast:label.startsWith('Porta ')});await delay(60);
  }
 }
 // A radius-.24 capsule with .025 skin rests about .062 above a 30-degree plane.
 worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);const endpointFloor=lane?lane.lowerCenter.y+((feet().x-lane.lowerCenter.x)*lane.uphill.x+(feet().z-lane.lowerCenter.z)*lane.uphill.z)*lane.height/lane.run:points.at(-1).y;assert(Math.abs(feet().y-endpointFloor)<(lane?.10:.06),`${label} endpoint floor mismatch`);assert(player().grounded,label+' endpoint must remain grounded');row.endpoint={...feet(),expectedFloor:endpointFloor,grounded:player().grounded};row.pass=true;console.log('PASS',label,row.samples.length,'samples');
}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 const construction=JSON.parse(await readFile(component+'/report.json'));
 function lanePoint(e,z){const p=e.path.slice(0,e.publicPointCount);let h=0;if(z>=p.at(-1).z)h=e.height;else if(z>p[0].z){let i=p.findIndex(p=>p.z>=z);h=p[i-1].y+(p[i].y-p[i-1].y)*(z-p[i-1].z)/(p[i].z-p[i-1].z);}return{x:e.lowerCenter.x+e.uphill.x*z,y:e.lowerCenter.y+h,z:e.lowerCenter.z+e.uphill.z*z};}
 if(process.env.KYOTO_PORTA_MODE!=='routes')for(const e of layout.escalators.filter(e=>e.id.startsWith('porta-connection-')&&(!process.env.KYOTO_PORTA_LANES||process.env.KYOTO_PORTA_LANES.split(',').some(s=>e.id.endsWith(s)))).sort((a,b)=>Number(b.id==='porta-connection-east-escalator-2')-Number(a.id==='porta-connection-east-escalator-2'))){
  const old=layout.escalators.find(o=>o.id===e.id.replace('porta-connection-','hall-basement-'));
  const oldBottom=lanePoint(old,-old.flatLength-1.3),top=lanePoint(e,e.run+e.flatLength+1.3),bottom=lanePoint(e,-e.flatLength-1.3);
  const outerZ=e.lowerCenter.z<4.5?2.5:7;
  const route=[lanePoint(old,old.run+old.flatLength+(e.id==='porta-connection-east-escalator-2'?1.7:1)),lanePoint(old,old.run),lanePoint(old,0),oldBottom,{...oldBottom,z:outerZ},{...top,z:outerZ},top,lanePoint(e,e.run),lanePoint(e,0),bottom];
  // The eastern down lane's centerline meets retained tactile bars. Place the
  // starting circle beside them, then actually walk across to the landing.
  if(e.id==='porta-connection-east-escalator-2')route.unshift({...route[0],z:4.8});
  await start(route[0]);await walk(route,e.id+' upper bank and B1 turnback down');
  await walk(route.toReversed(),e.id+' return to central hall');
  await start(bottom);await walk([bottom,lanePoint(e,0),lanePoint(e,e.run/2)],e.id+' ride approach',e);worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);const a={...feet()};await delay(2200);const b={...feet()},travel=(b.x-a.x)*e.uphill.x+(b.z-a.z)*e.uphill.z;
  assert(travel*Math.sign(e.speed)>.65&&Math.abs(travel)<1.5,e.id+' must carry an idle rider in its running direction');
  report.walks.push({label:e.id+' idle ride',start:a,end:b,travel,pass:true});console.log('PASS',e.id,'idle ride',travel);
 }

 if(process.env.KYOTO_PORTA_MODE!=='lanes')for(const row of construction.geometry.routes){await start(row.points[0]);await walk(row.points,row.label);}

 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
