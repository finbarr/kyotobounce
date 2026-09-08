// Isolated native worker: no service/database writes, no production endpoint.
import {PhysicsWorker} from '../web/worker.ts';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
const [layoutFile,scenarioFile,out]=process.argv.slice(2);
if(!layoutFile||!scenarioFile||!out)throw Error('Usage: node tools/probe_structural_native.mjs LAYOUT SCENARIOS OUTPUT');
process.env.KYOTO_LAYOUT=resolve(layoutFile);process.env.KYOTO_WORKER_LOG=resolve(out+'.worker.log');
const layout=JSON.parse(await readFile(layoutFile)),hash=createHash('sha256').update(await readFile(layoutFile)).digest('hex');
const scenarios=JSON.parse(await readFile(scenarioFile));
const worker=new PhysicsWorker(),results=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
const states=new Map(),events=new Map();
worker.on('message',m=>{if(m.type==='state'){states.set(m.id,m);events.get(m.id)?.states.push(m);}else events.get(m.id)?.events.push(m);});
await mkdir(dirname(out),{recursive:true});
try{
 await worker.start();for(let i=0;i<120&&!worker.ready;i++)await delay(500);if(!worker.ready)throw Error('Worker unavailable');
 const probe=async s=>{
  const id=s.id;events.set(id,{states:[],events:[]});worker.send({type:'join',id});await delay(150);
  try{
   const disk=(await worker.request({type:'place',id,slot:'start',radius:.25,origin:{x:s.start[0],y:s.start[1]+.1,z:s.start[2]},direction:{x:0,y:-1,z:0}})).disk;
   await worker.request({type:'select',id,challenge:{id:'structural-probe',start:disk,goal:{...disk,radius:.1},throwModel:'robot-v4',...s.challenge,layout:hash,physics:states.get(id).physics}});
   worker.send({type:'input',id,yaw:s.yaw??90,pitch:s.pitch??-65,top:s.top??0,kick:s.kick??0,x:0,z:0});await delay(150);
   if(s.walk){
    await worker.request({type:'select',id,challenge:null});
    for(let i=0;i<s.seconds*5;i++){worker.send({type:'input',id,yaw:s.yaw??90,pitch:0,x:0,z:1,fast:false});await delay(200);}
   }else{
    if(s.phase!==undefined){const period=s.period??.7900353236922196;const now=states.get(id).stationTime;const target=s.phase+Math.ceil((now+.5-s.phase)/period)*period;await delay(Math.max(0,(target-.22-now)*1000));}
    worker.send({type:'charge',id,powerRange:s.powerRange??'full'});await delay(100);worker.send({type:'release',id,power:s.power??0});await delay((s.seconds??6)*1000);
   }
   const trace=events.get(id),flight=trace.states.filter(v=>v.phase==='Flight'||v.phase==='Result');
   const summary={id,start:disk,frames:flight.length,minBallY:flight.length?Math.min(...flight.map(v=>v.ball.y)):null,final:states.get(id),surfaces:[...new Set(trace.events.filter(e=>e.type==='impact').map(e=>e.surface))]};
   if(s.maxFeetX!==undefined&&summary.final.players[0].feet.x>s.maxFeetX)summary.failure='Walker did not traverse the repaired surface';
   if(s.minFeetY!==undefined&&summary.final.players[0].feet.y<s.minFeetY)summary.failure='Walker lost support';
   if(s.minY!==undefined&&summary.minBallY<s.minY)summary.failure='Ball crossed minimum support elevation';
   if(s.contact&&!summary.surfaces.includes(s.contact))summary.failure='Expected repaired contact missing';
   results.push({...summary,trace});console.log(JSON.stringify({...summary,final:{ball:summary.final.ball,feet:summary.final.players[0].feet,phase:summary.final.phase}}));
  }catch(e){results.push({id,error:String(e),trace:events.get(id)});console.log(id,String(e));}
  worker.send({type:'leave',id});
 };
 for(let i=0;i<scenarios.length;i+=4)await Promise.all(scenarios.slice(i,i+4).map(probe));
 await writeFile(out,JSON.stringify({layout:resolve(layoutFile),layoutSha256:hash,results},null,2));
 if(results.some(r=>r.error||r.failure))process.exitCode=1;
}finally{worker.stop();}
