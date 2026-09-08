// Local-only actual native/service load. Does not alter game completion rules.
import WebSocket from 'ws';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {cpus,totalmem,release} from 'node:os';
import {createHash} from 'node:crypto';
import {monitorEventLoopDelay} from 'node:perf_hooks';
const root=process.cwd(),origin='http://127.0.0.1:4283';
const worker=resolve(process.env.KYOTO_WORKER_EXECUTABLE||'');
if(!process.env.KYOTO_WORKER_EXECUTABLE)throw new Error('Explicit read-only KYOTO_WORKER_EXECUTABLE required');
const out=resolve(process.env.CAPACITY_OUTPUT||`.local/capacity/${new Date().toISOString().replaceAll(':','-')}`);
if(!out.startsWith(root+'/.local/'))throw new Error('Raw receipts must be inside this worktree .local');
const levels=(process.env.CAPACITY_LEVELS||'1,4,8,16').split(',').map(Number),reps=Number(process.env.CAPACITY_REPS||2),duration=Number(process.env.CAPACITY_SECONDS||30),warmup=Number(process.env.CAPACITY_WARMUP||5);
if(levels.some(n=>![1,4,8,16].includes(n))||reps<1||reps>3||duration<5||duration>60||warmup<1||warmup>15)throw new Error('Benchmark bounds exceeded');
await mkdir(resolve(out,'..'),{recursive:true});
await mkdir(out); // Refuse to overwrite an earlier experiment's receipts.
try{await fetch(origin+'/api/health',{signal:AbortSignal.timeout(500)});throw new Error('Port 4283 already occupied; refusing to reuse or stop another server');}catch(e){if(e.message.startsWith('Port'))throw e;}
const checksum=async()=>createHash('sha256').update(await readFile(worker)).digest('hex');
const beforeHash=await checksum(),metricsPath=resolve(out,'service-metrics.json'),log=await open(resolve(out,'server.log'),'w');
const env={...process.env,KYOTO_PORT:'4283',KYOTO_DATA_DIR:resolve(out,'data'),KYOTO_WORKER_LOG:resolve(out,'worker.log'),KYOTO_WORKER_EXECUTABLE:worker,CAPACITY_METRICS:metricsPath};delete env.KYOTO_PUBLIC_ORIGIN;
const server=spawn(process.execPath,['--import',resolve('web/bench/capacity-preload.mjs'),'web/server.ts'],{cwd:root,env,stdio:['ignore',log.fd,log.fd]});
let interrupted=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interrupted=true;});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const quantile=(a,q)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*q))]:null;
const stats=a=>({n:a.length,p50:quantile(a,.5),p95:quantile(a,.95),p99:quantile(a,.99),max:a.length?Math.max(...a):null});
const host=()=>readFile('/proc/meminfo','utf8').then(s=>({availableMb:Number(s.match(/MemAvailable:\s+(\d+)/)[1])/1024,swapFreeMb:Number(s.match(/SwapFree:\s+(\d+)/)[1])/1024}));
const ticks=Number(execFileSync('getconf',['CLK_TCK'],{encoding:'utf8'}).trim());
async function cgroup(){try{const path=(await readFile('/proc/self/cgroup','utf8')).trim().split('0::')[1];const base='/sys/fs/cgroup'+path;return {path,cpuMax:(await readFile(base+'/cpu.max','utf8')).trim(),cpuStat:(await readFile(base+'/cpu.stat','utf8')).trim(),memoryMax:(await readFile(base+'/memory.max','utf8')).trim()};}catch{return null;}}

async function proc(pid){try{const [stat,status]=await Promise.all([readFile(`/proc/${pid}/stat`,'utf8'),readFile(`/proc/${pid}/status`,'utf8')]);const fields=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);return {ticks:Number(fields[11])+Number(fields[12]),rssMb:Number(status.match(/VmRSS:\s+(\d+)/)?.[1]||0)/1024,threads:Number(status.match(/Threads:\s+(\d+)/)?.[1]||0)};}catch{return null;}}
const summary={created:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),host:{cpus:cpus().length,model:cpus()[0]?.model,memoryMb:totalmem()/1024**2,kernel:release(),node:process.version,cgroup:await cgroup()},worker:{path:worker,sha256:beforeHash},parameters:{levels,reps,duration,warmup,port:4283,inputHz:30,profile:'First Bank, real charge 1.2s full range, 25-degree launch, alternating spin; auto-rethrow only on natural result/Aim cancellation'},runs:[]};
class Player{
 constructor(index){this.index=index;this.state=null;this.id=null;this.selected=null;this.lastStateAt=0;this.nextThrow=0;this.phase='joining';this.errors=[];this.notices=[];this.recoveries=[];this.states=[];this.inputs=[];this.commands=[];this.latencies=[];this.results=0;this.charges=0;this.releases=0;this.closed=false;this.pendingInput=null;this.pendingCharge=null;this.pendingRelease=null;this.yaw=90;this.releaseAt=0;this.observing=false;this.joinAt=performance.now();this.socket=new WebSocket(origin.replace('http','ws'),{origin});this.socket.on('open',()=>this.send({type:'hello'}));this.socket.on('error',e=>this.errors.push({at:performance.now(),message:e.message}));this.socket.on('close',(code,reason)=>{this.closed=true;if(!this.cleaning)this.errors.push({at:performance.now(),message:`closed ${code}: ${reason}`});});this.socket.on('message',raw=>this.message(JSON.parse(raw.toString())));}
 send(m){if(this.socket.readyState!==WebSocket.OPEN)return;this.socket.send(JSON.stringify(m));if(m.type!=='input')this.commands.push({at:performance.now(),type:m.type});}
 message(m){const now=performance.now();if(m.type==='welcome')this.id=m.sessionId;
  if(m.type==='catalog'&&!this.selected){this.selected=m.challenges.find(c=>c.id==='atrium-first-bank');}
  if(m.type==='selected')this.phase='ready';
  if(m.type==='worker-status'&&m.status!=='ready')this.recoveries.push({at:now,status:m.status});
  if(m.type==='error')this.errors.push({at:now,message:m.message});
  if(m.type==='notice'){this.notices.push({at:now,message:m.message});this.nextThrow=now+200;}
  if(m.type==='result'){this.results++;this.nextThrow=now+250;}
  if(m.type!=='state')return;
  const previous=this.state;this.state=m;this.lastStateAt=now;
  if(this.phase==='joining'&&this.selected&&m.players.some(p=>p.id===this.id)){this.phase='selecting';this.send({type:'select-challenge',challengeId:this.selected.id,revision:this.selected.revision});}
  if(this.observing)this.states.push({at:now,stationTime:m.stationTime,flightTime:m.flightTime,phase:m.phase,impacts:m.impacts,sleeping:m.diagnostics?.sleeping,contactBudgetExhaustions:m.diagnostics?.contactBudgetExhaustions,overlapRecoveries:m.diagnostics?.overlapRecoveries,spin:Math.hypot(...Object.values(m.spin||{})),velocity:Math.hypot(...Object.values(m.velocity||{}))});
  const p=m.players.find(p=>p.id===this.id);
  if(this.pendingInput&&p&&Math.abs(p.yaw-this.pendingInput.yaw)<.01){this.latencies.push({type:'aim-input',ms:now-this.pendingInput.at,observing:this.observing});this.pendingInput=null;}
  if(this.pendingCharge&&m.phase==='Charging'){this.latencies.push({type:'charge-to-state',ms:now-this.pendingCharge,observing:this.observing});this.pendingCharge=null;}
  if(this.pendingRelease&&m.phase==='Flight'){this.latencies.push({type:'release-to-flight',ms:now-this.pendingRelease,observing:this.observing});this.pendingRelease=null;}
 }
 tick(now){if(this.phase!=='ready'||!this.state)return;
  // Flight/Release/Result intentionally freeze aim; do not label that wait as input latency.
  const canAim=this.state.phase==='Aim'&&!this.releaseAt&&!this.pendingRelease;
  if(canAim&&!this.pendingInput&&now-(this.lastProbe||0)>250){this.yaw=this.yaw===90?91:90;this.lastProbe=now;this.pendingInput={yaw:this.yaw,at:now};}
  this.send({type:'input',x:0,z:0,yaw:this.yaw,pitch:25,top:this.index%2?150:-150,kick:this.index%2?75:-75,fast:false});if(this.observing)this.inputs.push(now);
  if(this.releaseAt){if(now>=this.releaseAt){this.send({type:'release'});this.releases++;this.pendingRelease=now;this.releaseAt=0;this.nextThrow=now+2000;}return;}
  if(['Aim','Result'].includes(this.state.phase)&&now>=this.nextThrow&&!this.pendingCharge){this.send({type:'charge',challengeId:this.selected.id,revision:this.selected.revision,layout:this.state.layout,physics:this.state.physics,powerRange:'full'});this.charges++;this.pendingCharge=now;this.releaseAt=now+1200;this.nextThrow=Infinity;}
 }
 close(){this.cleaning=true;this.socket.close();}
}
let players=[],inputTimer;
try{
 for(let i=0;i<120;i++){if(interrupted)throw new Error('Interrupted');try{const r=await fetch(origin+'/api/health');if(r.ok)break;}catch{}if(i===119)throw new Error('Worker startup timeout');await sleep(500);}
 console.log('Isolated native service ready',out);
 let saturated=false;
 for(const count of levels){for(let rep=1;rep<=reps;rep++){
  if(saturated||interrupted)break;
  players=Array.from({length:count},(_,i)=>new Player(i));let joinWait=0;
  while(players.some(p=>p.phase!=='ready')){if(players.some(p=>p.errors.length||p.closed)||joinWait++>120)throw new Error('Session join/select failed: '+JSON.stringify(players.map(p=>p.errors)));await sleep(250);}
  const joined=performance.now(),joinMs=players.map(p=>joined-p.joinAt);inputTimer=setInterval(()=>players.forEach(p=>p.tick(performance.now())),1000/30);
  await sleep(warmup*1000);players.forEach(p=>p.observing=true);const start=performance.now(),resources=[],reasons=[];let previousResource=null,bad=0;
  const loadDelay=monitorEventLoopDelay({resolution:10});loadDelay.enable();
  while(performance.now()-start<duration*1000&&!interrupted){await sleep(1000);let service;try{service=JSON.parse(await readFile(metricsPath,'utf8'));}catch{continue;}const now=performance.now(),native=await proc(service.workerPid),memory=await host(),load=await proc(process.pid);const row={at:now,elapsed:(now-start)/1000,service,native,memory,load,cgroup:await cgroup()};
   if(native&&previousResource?.native)row.workerCpuPercent=100*(native.ticks-previousResource.native.ticks)/ticks/((now-previousResource.at)/1000);resources.push(row);previousResource=row;
   const maxAge=Math.max(...players.map(p=>now-p.lastStateAt));const fault=players.some(p=>p.errors.length||p.closed)||service.workerStatus!=='ready';const recentPaces=players.map(p=>{const a=p.states.filter(s=>s.at>=now-4000);return a.length>3&&a.at(-1).at-a[0].at>2500?(a.at(-1).stationTime-a[0].stationTime)/((a.at(-1).at-a[0].at)/1000):1;});const minPace=Math.min(...recentPaces);const pressure=minPace<.8||memory.availableMb<1024||(native?.rssMb||0)+service.rss/1024**2>5500||maxAge>1000||service.eventLoop.p99Ms>200||service.workerWritableBytes>1000000;bad=pressure?bad+1:0;
   if(fault||bad>=3){reasons.push({fault,maxAge,minPace,availableMb:memory.availableMb,workerStatus:service.workerStatus,p99EventLoopMs:service.eventLoop.p99Ms,workerWritableBytes:service.workerWritableBytes});saturated=true;break;}
  }
  clearInterval(inputTimer);inputTimer=null;players.forEach(p=>p.observing=false);loadDelay.disable();
  const elapsed=(performance.now()-start)/1000,perSession=players.map(p=>{const gaps=p.states.slice(1).map((s,i)=>s.at-p.states[i].at),first=p.states[0],last=p.states.at(-1);return {index:p.index,states:p.states.length,hz:p.states.length/elapsed,gapsMs:stats(gaps),stationPace:first&&last?(last.stationTime-first.stationTime)/((last.at-first.at)/1000):null,flightFraction:p.states.filter(s=>s.phase==='Flight').length/(p.states.length||1),charges:p.charges,releases:p.releases,results:p.results,latency:Object.fromEntries(['aim-input','charge-to-state','release-to-flight'].map(type=>[type,stats(p.latencies.filter(l=>l.type===type&&l.observing).map(l=>l.ms))])),allPhaseLatency:Object.fromEntries(['aim-input','charge-to-state','release-to-flight'].map(type=>[type,stats(p.latencies.filter(l=>l.type===type).map(l=>l.ms))])),errors:p.errors,notices:p.notices,recoveries:p.recoveries};});
  const run={count,rep,elapsed,joinMs:stats(joinMs),saturated,reasons,perSession,serviceCpuPercent:stats(resources.map(r=>r.service.cpuPercent)),workerCpuPercent:stats(resources.map(r=>r.workerCpuPercent).filter(Number.isFinite)),serviceRssMb:stats(resources.map(r=>r.service.rss/1024**2)),workerRssMb:stats(resources.map(r=>r.native?.rssMb).filter(Number.isFinite)),eventLoopP99Ms:stats(resources.map(r=>r.service.eventLoop.p99Ms)),pendingRequestsMax:Math.max(0,...resources.map(r=>r.service.requests)),workerWritableBytesMax:Math.max(0,...resources.map(r=>r.service.workerWritableBytes)),loadGeneratorEventLoopP99Ms:loadDelay.percentile(99)/1e6};
  await writeFile(resolve(out,`raw-${count}-${rep}.json`),JSON.stringify({resources,players:players.map(p=>({index:p.index,states:p.states,inputs:p.inputs,commands:p.commands,latencies:p.latencies,errors:p.errors,notices:p.notices}))}));summary.runs.push(run);await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({count,rep,elapsed,hz:stats(perSession.map(p=>p.hz)),gapP99:stats(perSession.map(p=>p.gapsMs.p99)),pace:stats(perSession.map(p=>p.stationPace)),workerCpu:run.workerCpuPercent,workerRss:run.workerRssMb,saturated,reasons}));
  players.forEach(p=>p.close());await sleep(250);players.forEach(p=>{if(p.socket.readyState!==WebSocket.CLOSED)p.socket.terminate();});players=[];
  // Let the native worker dispose only our departed sessions before the next replicate.
  await sleep(3000);
 }if(saturated||interrupted)break;}
 summary.interrupted=interrupted;summary.worker.unchanged=(await checksum())===beforeHash;
}catch(error){summary.failure=String(error);throw error;}finally{
 if(inputTimer)clearInterval(inputTimer);players.forEach(p=>p.close());await sleep(200);players.forEach(p=>p.socket.terminate());
 server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('close',r)),sleep(5000)]);if(server.exitCode===null&&server.signalCode===null)server.kill('SIGKILL');await log.close();await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2));
}
console.log('Receipts:',out);
