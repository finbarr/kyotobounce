// Exercise the usable dining loop, entrance and public aisle in native physics.
import assert from 'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve}from'node:path';import{createHash}from'node:crypto';import{setTimeout as delay}from'node:timers/promises';import{PhysicsWorker}from'../../worker.ts';
const [manifest,component,out,...options]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});const m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),g=JSON.parse(await readFile(component+'/report.json')).geometry;process.env.KYOTO_LAYOUT=resolve(m.layout);process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');const worker=new PhysicsWorker(),id='daruma-table-check',report={layoutSha256:createHash('sha256').update(raw).digest('hex'),walks:[],pass:false};let state;worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});const feet=()=>state.players.find(p=>p.id===id).feet;
async function until(fn){const end=performance.now()+90000;while(!fn()){assert(performance.now()<end,'Native state timeout');await delay(30);}}
const E=g.origin,A=g.across,N=g.inward,P=(w,t,h=0)=>({x:E[0]+A[0]*w+N[0]*t,y:E[1]+h,z:-(E[2]+A[2]*w+N[2]*t)});
const routes=[...[1.45,1.7,1.95].map(w=>({name:'door-'+w,a:P(w,-1),b:P(w,1.75)})),{name:'public-aisle',a:P(-3.3,-1.2),b:P(3.3,-1.2)},...g.aisleLoop.map((p,i)=>({name:'table-loop-'+i,a:P(...p),b:P(...g.aisleLoop[(i+1)%g.aisleLoop.length])}))];
if(options.includes('--staff-access'))routes.push({name:'staff-access',a:P(-3.78,3.575),b:P(-3.78,6.1)});
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.length);
 const top=await worker.request({type:'place',id,slot:'start',radius:.25,origin:P(...g.table.center,1.5),direction:{x:0,y:-1,z:0}});assert(top.ok);assert.equal(top.disk.surface,'daruma-table-cream-top');assert(Math.abs(top.disk.center.y-E[1]-g.table.top)<.002);report.tabletop={surface:top.disk.surface,height:top.disk.center.y-E[1]};
 for(const route of routes){const {a,b}=route,placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...b,y:b.y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok);assert(Math.abs(placed.disk.center.y-b.y)<.01,route.name+' starts on floor');await worker.request({type:'design-start',id,start:placed.disk});await delay(200);
  for(const target of[a,b]){const row={route:route.name,target,samples:0,pass:false};report.walks.push(row);const end=performance.now()+12000;
   while(true){const p=feet(),d=Math.hypot(target.x-p.x,target.z-p.z);assert(Math.abs(p.y-target.y)<.12,route.name+' grounded');row.samples++;if(d<.12)break;assert(performance.now()<end,route.name+' blocked '+JSON.stringify(p));worker.send({type:'input',id,x:0,z:Math.min(1,d/.5),yaw:Math.atan2(target.x-p.x,target.z-p.z)*180/Math.PI,pitch:0,fast:true});await delay(60);}
   worker.send({type:'input',id,x:0,z:0});row.pass=true;
  }
 }
 report.pass=true;console.log(`PASS ${report.walks.length} native entrance, public aisle, dining-loop and requested staff-access walks; tabletop height/surface`);
}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
