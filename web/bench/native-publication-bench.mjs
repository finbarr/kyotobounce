// Bounded actual native timing experiment; own service/db/log on4195.
import {spawn} from 'node:child_process';import {readFile,mkdir,writeFile,open} from 'node:fs/promises';import {resolve,dirname,basename} from 'node:path';import {createHash} from 'node:crypto';
import {Client,delay} from '../tests/api-client.mjs';
const origin='http://127.0.0.1:4195',out=resolve(process.env.NATIVE_TIMING_OUTPUT||'.local/native-timing/run'),worker=resolve(process.env.KYOTO_WORKER_EXECUTABLE||'');
const seconds=Number(process.env.NATIVE_TIMING_SECONDS||15),reps=Number(process.env.NATIVE_TIMING_REPS||2),levels=(process.env.NATIVE_TIMING_LEVELS||'1,16').split(',').map(Number);
if(!process.env.KYOTO_WORKER_EXECUTABLE||!out.startsWith(resolve('.local')+'/')||seconds<5||seconds>30||reps<1||reps>2||levels.some(n=>![1,16].includes(n)))throw new Error('Explicit worker and bounded local parameters required');
try{await fetch(origin+'/api/health',{signal:AbortSignal.timeout(500)});throw new Error('Port4195 occupied')}catch(e){if(e.message==='Port4195 occupied')throw e}
await mkdir(resolve(out,'..'),{recursive:true});await mkdir(out);
const assembly=worker.includes('/Contents/MacOS/')?resolve(dirname(worker),'../Resources/Data/Managed/Assembly-CSharp.dll'):resolve(dirname(worker),basename(worker).replace(/\.x86_64$/,'')+'_Data/Managed/Assembly-CSharp.dll');
const hash=async(path=worker)=>createHash('sha256').update(await readFile(path)).digest('hex'),beforeHash=await hash(),beforeAssemblyHash=await hash(assembly),log=await open(resolve(out,'server.log'),'w'),metrics=resolve(out,'service-metrics.json');
const env={...process.env,KYOTO_PORT:'4195',KYOTO_DATA_DIR:resolve(out,'data'),KYOTO_WORKER_LOG:resolve(out,'worker.log'),KYOTO_NATIVE_TIMING:'1',KYOTO_WORKER_EXECUTABLE:worker,NATIVE_TIMING_METRICS:metrics};delete env.KYOTO_PUBLIC_ORIGIN;
const server=spawn(process.execPath,['--import',resolve('web/bench/native-publication-preload.mjs'),'web/server.ts'],{env,stdio:['ignore',log.fd,log.fd]});
const stats=a=>{a=[...a].sort((a,b)=>a-b);const q=f=>a.length?a[Math.min(a.length-1,Math.floor(a.length*f))]:null;return {count:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:q(1)}};
let clients=[],input,pausedPid,interrupted=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interrupted=true;if(pausedPid){process.kill(pausedPid,'SIGCONT');pausedPid=null;}server.kill('SIGTERM');});const runs=[],summary={platform:process.platform,node:process.version,worker,workerSha256:beforeHash,workerAssemblySha256:beforeAssemblyHash,seconds,reps,runs};
async function make(index){const c=new Client(origin.replace('http','ws'));await c.join();const course=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');c.rows=[];c.faults=[];c.watch=false;c.releaseAt=0;c.nextCharge=0;c.chargePending=false;
 c.socket.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='error')c.faults.push(m);if(m.type==='state'&&c.watch)c.rows.push({at:performance.now(),stationTime:m.stationTime,phase:m.phase,flightTime:m.flightTime});if(m.type==='result'||m.type==='notice'){c.nextCharge=performance.now()+250;c.chargePending=false;}});
 c.tick=()=>{const now=performance.now();c.input({yaw:90,pitch:25,top:index%2?150:-150,kick:index%2?75:-75});if(c.releaseAt&&now>=c.releaseAt){c.send('release');c.releaseAt=0;}if(!c.chargePending&&['Aim','Result'].includes(c.state?.phase)&&now>=c.nextCharge){c.chargePending=true;c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,powerRange:'full'});c.releaseAt=now+1200;}};return c;
}
try{
 for(let i=0;i<120;i++){if(interrupted)throw new Error('Interrupted');try{if((await fetch(origin+'/api/health')).ok)break}catch{}if(i===119)throw new Error('Worker startup timeout');await delay(500)}
 for(const count of levels)for(let rep=1;rep<=reps;rep++){
  clients=[];for(let i=0;i<count;i++)clients.push(await make(i));input=setInterval(()=>clients.forEach(c=>c.tick()),1000/30);await delay(3000);clients.forEach(c=>c.watch=true);
  const start=performance.now(),resources=[];for(let i=0;i<seconds;i++){await delay(1000);if(interrupted)throw new Error('Interrupted');const row=JSON.parse(await readFile(metrics,'utf8'));resources.push(row);if(row.status!=='ready'||row.workerWritableBytes>1e6||clients.some(c=>c.faults.length))throw new Error('Worker/client fault or backpressure');}
  const duration=(performance.now()-start)/1000;clients.forEach(c=>c.watch=false);const sessions=clients.map(c=>({hz:c.rows.length/duration,gapsMs:stats(c.rows.slice(1).map((r,i)=>r.at-c.rows[i].at)),stationPace:(c.rows.at(-1).stationTime-c.rows[0].stationTime)/((c.rows.at(-1).at-c.rows[0].at)/1000),flightFraction:c.rows.filter(r=>r.phase==='Flight').length/c.rows.length,errors:c.faults}));
  const run={count,rep,duration,sessions,resources};runs.push(run);await writeFile(resolve(out,`raw-${count}-${rep}.json`),JSON.stringify({run,rows:clients.map(c=>c.rows)}));console.log(JSON.stringify({count,rep,hz:stats(sessions.map(s=>s.hz)),gapP99:stats(sessions.map(s=>s.gapsMs.p99)),pace:stats(sessions.map(s=>s.stationPace))}));
  clearInterval(input);input=null;clients.forEach(c=>c.close());clients=[];await delay(1000);
 }
 // Explicit owned-process suspension proves bounded recovery after a late frame.
 if(process.env.NATIVE_TIMING_OVERLOAD==='1'){
  const c=await make(0);clients=[c];await delay(1000);c.watch=true;await delay(500);
  const resource=JSON.parse(await readFile(metrics,'utf8'));pausedPid=resource.workerPid;if(!pausedPid)throw new Error('No owned worker pid');
  process.kill(pausedPid,'SIGSTOP');await delay(250);process.kill(pausedPid,'SIGCONT');pausedPid=null;await delay(1500);c.watch=false;
  const gaps=c.rows.slice(1).map((r,i)=>r.at-c.rows[i].at);summary.overload={pausedMs:250,rows:c.rows,gapsMs:stats(gaps),compressedGaps:gaps.filter(g=>g<10).length};c.close();clients=[];
 }
 summary.workerUnchanged=(await hash())===beforeHash&&(await hash(assembly))===beforeAssemblyHash;
}catch(error){summary.failure=String(error);throw error}finally{
 if(pausedPid)process.kill(pausedPid,'SIGCONT');if(input)clearInterval(input);clients.forEach(c=>c.close());server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('close',r)),delay(5000)]);if(server.exitCode===null&&server.signalCode===null)server.kill('SIGKILL');await log.close();
 const native=(await readFile(resolve(out,'worker.log'),'utf8').catch(()=>'' )).split('\n').filter(l=>l.startsWith('KYOTO_NATIVE_TIMING ')).map(l=>JSON.parse(l.slice('KYOTO_NATIVE_TIMING '.length)));summary.native=native;
 await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
}
