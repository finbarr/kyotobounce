// A small native world proves recovery follows geometry at arbitrary underground elevations.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../worker.ts';
const dir=await mkdtemp(join(tmpdir(),'kyoto-underground-'));
const floor=-30,id='underground-bounds';
const layout={schemaVersion:1,units:'meters',spawn:{x:0,y:floor,z:0},boxes:[{id:'deep-floor',role:'floor',material:'stone',collision:true,center:{x:0,y:floor-.25,z:0},size:{x:6,y:.5,z:6}}],panels:[],beams:[],flights:[],escalators:[]};
await writeFile(join(dir,'layout.json'),JSON.stringify(layout));
process.env.KYOTO_LAYOUT=join(dir,'layout.json');process.env.KYOTO_WORKER_LOG=join(dir,'worker.log');
const worker=new PhysicsWorker();let state,failure;const messages=[];
worker.on('message',m=>{messages.push(m);if(m.type==='state'&&m.id===id)state=m;});worker.on('failure',e=>{failure=e;});
const player=()=>state?.players.find(p=>p.id===id);
async function until(fn,label,timeout=20000){const end=performance.now()+timeout;while(!fn()){assert(!failure,failure);assert(performance.now()<end,label);await delay(30);}}
async function throwBall(request,power,powerRange){worker.send({type:'input',id,x:0,z:0,yaw:90,pitch:0});worker.send({type:'charge',id,request,powerRange});await until(()=>state.phase==='Charging','charge');worker.send({type:'release',id,power});}
try{
 await worker.start();await until(()=>worker.ready,'worker ready');
 assert.equal(messages.find(m=>m.type==='ready').fallLimitY,-35.5,'Scoring boundary includes floor thickness and five metres of recovery space');
 worker.send({type:'join',id});
 await until(()=>player()?.grounded,'Player must settle on the -30 m floor');await delay(300);
 assert(player().grounded&&Math.abs(player().feet.y-floor)<.05,'Underground standing is stable');
 await throwBall('rest',0,'precision');await until(()=>messages.some(m=>m.type==='result'&&m.attempt==='rest'),'Underground throw must finish');
 await until(()=>state.phase==='Result','rest state');assert(state.ball.y< -29);
 assert.equal(messages.find(m=>m.type==='result'&&m.attempt==='rest').fallLimitY,-35.5,'Replay records the same native boundary announced at startup');
 assert(Math.hypot(...Object.values(state.velocity))<.01&&Math.hypot(...Object.values(state.spin))<.01,'Result requires translation and spin at rest');
 worker.send({type:'recall',id});await until(()=>state.phase==='Aim','recall');
 await throwBall('escape',.5,'full');await until(()=>messages.some(m=>m.type==='notice'&&m.attempt==='escape'&&m.message.includes('no score awarded')),'Ball below the world must still be cancelled');
 assert(!messages.some(m=>m.type==='result'&&m.attempt==='escape'),'Escaped ball earns no result');await until(()=>state.phase==='Aim','escape reset');
 let fell=false,recovered=false;const end=performance.now()+10000;
 while(!recovered){assert(performance.now()<end,'Walker must recover after falling off the underground floor');worker.send({type:'input',id,x:0,z:1,yaw:0});await delay(60);const p=player();if(p.feet.y<floor-2)fell=true;if(fell&&p.feet.y>floor-.1)recovered=true;}
 worker.send({type:'input',id,x:0,z:0});worker.send({type:'home',id});await delay(300);assert(player().grounded);
 console.log('PASS native -30 m standing, full-rest throw, escaped-ball cancellation, fallen-player recovery and home');
}finally{worker.stop();await delay(250);await rm(dir,{recursive:true,force:true});}
