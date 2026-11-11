import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {Firestore} from '@google-cloud/firestore';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {INPUT_FORMAT,ShotVerification} from '../verification.mjs';

assert.equal(process.env.GOOGLE_CLOUD_PROJECT,'demo-kyoto-verification');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/,'Container checks must use the isolated local emulator');
const runtime=process.env.KYOTO_CONTAINER_RUNTIME||'podman';assert(['podman','docker'].includes(runtime));
const execute=promisify(execFile),image='localhost/kyoto-verifier:local',directory='.local/verification/container';await mkdir(directory,{recursive:true});
const command=async(...args)=>(await execute(runtime,args,{maxBuffer:8*1024**2})).stdout.trim();
const db=new Firestore({projectId:process.env.GOOGLE_CLOUD_PROJECT}),root=db.collection('games').doc('kyoto'),containers=new Set(),receipts=[];
let world,current;
async function start(sliceMs=1000){
 const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const name='kyoto-verifier-test-'+randomUUID(),host=runtime==='podman'?'host.containers.internal':'host.docker.internal';
 const environment={GOOGLE_CLOUD_PROJECT:process.env.GOOGLE_CLOUD_PROJECT,FIRESTORE_EMULATOR_HOST:host+':'+process.env.FIRESTORE_EMULATOR_HOST.split(':')[1],KYOTO_ALLOWED_ORIGINS:'https://game.example',KYOTO_VERIFY_SLICE_MS:String(sliceMs)};
 containers.add(name);const started=performance.now();
 await command('run','--detach','--name',name,'--platform','linux/amd64','--read-only','--memory','1g','--cpus','1','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:size=16m','--publish',`127.0.0.1:${port}:8080`,...(runtime==='docker'?['--add-host','host.docker.internal:host-gateway']:[]),...Object.entries(environment).flatMap(([key,value])=>['--env',key+'='+value]),image);
 const endpoint={name,url:`http://127.0.0.1:${port}`},until=Date.now()+60000;
 while(true){
  try{const response=await fetch(endpoint.url+'/health',{signal:AbortSignal.timeout(1000)});if(response.ok){const health=await response.json();assert.equal(health.physics,BROWSER_PHYSICS);break;}}catch{}
  const state=JSON.parse(await command('inspect','--format','{{json .State}}',name));if(!state.Running)throw Error('Container stopped during startup: '+await command('logs',name));
  if(Date.now()>until)throw Error('Container startup observation deadline');await delay(100);
 }
 endpoint.startupMs=performance.now()-started;return endpoint;
}
async function stop(endpoint){
 const start=performance.now();await command('stop','--time','10',endpoint.name);
 const state=JSON.parse(await command('inspect','--format','{{json .State}}',endpoint.name)),logs=await command('logs',endpoint.name);
 assert.equal(state.ExitCode,0,logs);assert(logs.includes('verifier-stopped'),'SIGTERM must complete graceful shutdown');assert(!logs.includes('verifier-shutdown-deadline'));
 await command('rm',endpoint.name);containers.delete(endpoint.name);return performance.now()-start;
}
const player={id:randomUUID()};player.token=player.id+'.'+randomBytes(32).toString('base64url');
async function api(path,{method='GET',body,auth=true,status=[200]}={}){
 const response=await fetch(current.url+path,{method,signal:AbortSignal.timeout(60000),headers:{Origin:'https://game.example',...(auth?{Authorization:'Bearer '+player.token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const value=await response.json();assert(status.includes(response.status),`${path}: HTTP ${response.status}: ${JSON.stringify(value)}`);assert.equal(response.headers.get('access-control-allow-origin'),'https://game.example');return value;
}
const route=id=>'/v1/attempts/'+id;
const header=course=>{const a=course.hint;return {format:INPUT_FORMAT,courseId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,scoring:course.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:((a.yaw+180)%360+360)%360-180,pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange}};};
async function submit(course){const id=randomUUID(),h=header(course);await api(route(id),{method:'POST',body:{header:h},status:[201]});await api(route(id)+'/seal',{method:'POST',body:{}});return {id,h};}
async function finish(id){for(let count=0;count<1000;count++){const result=await api(route(id)+'/advance',{method:'POST',body:{},status:[200,202]});if(result.state==='verified')return result;assert(['pending','verifying'].includes(result.state),JSON.stringify(result));assert(!result.result,'A pending job has no final result');}throw Error('Verification observation limit');}
try{
 const built=await execute(process.execPath,['deploy/verification/image.mjs'],{maxBuffer:16*1024**2,env:{...process.env,KYOTO_CONTAINER_RUNTIME:runtime}});await writeFile(directory+'/build.log',built.stdout+built.stderr);
 const info=JSON.parse(await command('image','inspect',image))[0];assert.equal(info.Architecture,'amd64');assert.equal(info.Config.User,'node');
 assert.deepEqual(info.Config.Cmd,['node','server.mjs']);
 current=await start(1);console.log('PASS real Linux amd64 verifier image starts as a non-root user with a read-only filesystem');
 const catalog=(await api('/v1/courses',{auth:false})).courses;assert.equal(catalog.length,30);
 await api('/v1/identity',{method:'POST',body:{name:'Container acceptance'}});
 await api('/v1/progress',{auth:false,status:[401]});
 const pending=await submit(catalog[0]);await api(route(pending.id),{method:'POST',body:{header:{...pending.h,score:999999}},status:[400]});
 let initial;for(let i=0;i<10;i++){initial=await api(route(pending.id)+'/advance',{method:'POST',body:{},status:[202]});assert.equal(initial.state,'pending');if(initial.shotSteps>0)break;}assert(initial.shotSteps>0,'Reach an actual flight checkpoint before replacing the container');
 assert((await root.collection('attempts').doc(pending.id).get()).data().checkpoint.length>0);
 const coldStartMs=current.startupMs,shutdownMs=await stop(current);current=await start();
 const resumed=await finish(pending.id);assert(resumed.result.success);assert.equal(resumed.result.waypointHits.length,catalog[0].waypoints.length);
 assert.equal((await api('/v1/replays/'+pending.id,{auth:false})).result.score,resumed.result.score);
 console.log('PASS persisted mid-flight checkpoint survives container replacement and yields a fully verified result');
 world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 for(const course of catalog){
  const {id,h}=await submit(course),began=performance.now(),accepted=await finish(id),job=new ShotVerification(world,course,h,[],{attempt:id,subject:player.id});let reply;
  do{reply=await job.advance();}while(reply.status!=='verified');
  const expected={...reply.result,id:player.id,playerName:'Container acceptance',verified:true,local:false};
  assert.deepEqual(accepted.result,JSON.parse(JSON.stringify(expected)),'Linux container and host independently agree: '+course.id);
  assert(accepted.result.success);assert.equal(accepted.result.waypointHits.length,course.waypoints.length);assert.equal(Math.hypot(...Object.values(job.shot.ball.velocity)),0);assert.equal(Math.hypot(...Object.values(job.shot.ball.spin)),0);
  receipts.push({id:course.id,score:accepted.result.score,duration:accepted.result.duration,comparisonMs:performance.now()-began});
  console.log('PASS container verified full clear: '+course.name);
 }
 const concurrent=await Promise.all(catalog.slice(0,4).map(submit));
 const accepted=await Promise.all(concurrent.map(({id})=>finish(id)));
 for(let i=0;i<accepted.length;i++){assert(accepted[i].result.success);assert.equal(accepted[i].result.score,receipts[i].score);assert.equal(accepted[i].result.duration,receipts[i].duration);}
 console.log('PASS four concurrent verification requests at the configured one-CPU/1-GiB instance limit');
 const memory=await command('exec',current.name,'node','-e',"console.log(require('fs').readFileSync('/proc/1/status','utf8').split('\\n').filter(x=>/^VmRSS:|^VmHWM:|^Threads:/.test(x)).join('\\n'))");
 await stop(current);current=await start();const progress=await api('/v1/progress');assert.equal(progress.entries.filter(e=>e.completed).length,30);
 const finalShutdownMs=await stop(current);current=null;
 await writeFile(directory+'/receipt.json',JSON.stringify({imageId:info.Id,architecture:info.Architecture,bytes:info.Size,coldStartMs,shutdownMs,finalShutdownMs,memory,receipts},null,2)+'\n');
 console.log('PASS all 30 authoritative scores and progress survive complete container shutdown; no Unity, writable game volume or local credential file');
}finally{
 for(const name of containers){await command('logs',name).then(log=>writeFile(directory+'/failure.log',log)).catch(()=>{});await command('rm','--force',name).catch(()=>{});}
 await db.recursiveDelete(root);await db.terminate();world?.free();
}
