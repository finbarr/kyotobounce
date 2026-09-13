import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, mkdir, readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Store } from './store.ts';
import {serveReplay} from './replay-http.ts';
import { Competition } from './competition.ts';
import type { Guest } from './types.ts';
import { WebSocketServer, WebSocket } from 'ws';
import { PhysicsWorker } from './worker.ts';
import {ConnectionQueue} from './connection-queue.ts';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {ConnectionMetrics,clientPerformance} from './performance.ts';
import {ShotStream,RequestBudget} from './shot-stream.ts';

const root = resolve('web/public');
const port = Number(process.env.KYOTO_PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid KYOTO_PORT');
const publicOrigin=process.env.KYOTO_PUBLIC_ORIGIN;
if(publicOrigin && (new URL(publicOrigin).origin!==publicOrigin||!publicOrigin.startsWith('https://')))throw new Error('KYOTO_PUBLIC_ORIGIN must be an HTTPS origin without a trailing slash');
const allowedOrigins=new Set(publicOrigin?[publicOrigin]:[`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
const dataDir=resolve(process.env.KYOTO_DATA_DIR||'web/data');
await mkdir(dataDir,{recursive:true});
const store = new Store(resolve(dataDir,'kyoto.sqlite'),{maxBytes:Number(process.env.KYOTO_REPLAY_CACHE_MB||128)*1024*1024});
const replayShell=await readFile(resolve(root,'index.html'),'utf8');
const starters=JSON.parse(await readFile(resolve('web/starter-challenges.json'),'utf8'));
store.syncCampaign(starters);
type Connection = {guest?:Guest;id:string;queue:ConnectionQueue;metrics:ConnectionMetrics;budget:RequestBudget;lastClientReport:number;requiresReload?:boolean;replaced?:boolean;intentional?:boolean;opened:number;alive:boolean;lastWrite:number;lastReplay:number};
const connections = new Map<WebSocket,Connection>();
const detached = new Map<string,ReturnType<typeof setTimeout>>();
const worker = new PhysicsWorker();
const shots=new Map<string,ShotStream>();
const eventLoop=monitorEventLoopDelay({resolution:20});eventLoop.enable();
let eventLoopMaxMs=0;
const competition = new Competition(store,worker,broadcast);
let workerFailure = '';
const mime: Record<string,string> = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const vendors = [
  ['/vendor/three/',resolve('node_modules/three')],
  ['/vendor/bvh/',resolve('node_modules/three-mesh-bvh')]
];
const server = createServer(async (request,response) => {
  try {
    if (!['GET','HEAD'].includes(request.method || '')) { response.writeHead(405);response.end();return; }
    const url = new URL(request.url || '/',`http://127.0.0.1:${port}`);
    if (url.pathname === '/api/health') {
      response.writeHead(worker.ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});
      response.end(JSON.stringify({status:worker.status,scope:publicOrigin?'online':'local',worker:worker.ready,shotPlayback:worker.capabilities.includes('shot-stream-v1'),error:publicOrigin?(workerFailure?'Physics temporarily unavailable':''):workerFailure}));return;
    }
    // Local read-only game state, without guest credentials. Reject other origins.
    if (['/api/debug/sessions','/api/debug/replay-cache'].includes(url.pathname)) {
      if(publicOrigin){response.writeHead(404);response.end();return;}
      const localOrigins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`];
      if(!localOrigins.includes(`http://${request.headers.host}`)||(request.headers.origin&&!localOrigins.includes(request.headers.origin))){response.writeHead(403);response.end();return;}
      response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      if(url.pathname==='/api/debug/replay-cache'){response.end(JSON.stringify(store.replayCache.stats()));return;}
      response.end(JSON.stringify({capturedAt:new Date().toISOString(),worker:worker.status,sessions:[...competition.members.values()].map(m=>({id:m.id,snapshotAgeMs:m.snapshotAt===undefined?null:Date.now()-m.snapshotAt,snapshot:m.snapshot}))}));return;
    }
    if(await serveReplay(request,response,url.pathname,store,replayShell))return;
    let base=root, relative=decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    for (const [prefix,path] of vendors) if (url.pathname.startsWith(prefix!)) {base=path!;relative=decodeURIComponent(url.pathname.slice(prefix!.length));break;}
    const path=resolve(base,relative);
    if (!path.startsWith(base+sep)) {response.writeHead(403);response.end();return;}
    const info=await stat(path).catch(()=>null);
    if (!info?.isFile()) {response.writeHead(404);response.end('Not found');return;}
    const etag=`"${info.size}-${info.mtimeMs}"`;
    if(request.headers['if-none-match']===etag){response.writeHead(304,{ETag:etag,'Cache-Control':'no-cache'});response.end();return;}
    response.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'});
    if (request.method==='HEAD') response.end();else createReadStream(path).on('error',()=>response.destroy()).pipe(response);
  } catch {if(!response.headersSent)response.writeHead(400);response.end('Invalid request');}
});
const wss=new WebSocketServer({server,maxPayload:65536,perMessageDeflate:{serverNoContextTakeover:true,clientNoContextTakeover:true,concurrencyLimit:4,threshold:2048,zlibDeflateOptions:{level:3,memLevel:7}},verifyClient:(info:{origin:string})=>connections.size<32&&(allowedOrigins.has(info.origin)||(!publicOrigin&&!info.origin))});
function send(socket:WebSocket,value:unknown){
  const metrics=connections.get(socket)?.metrics;if(metrics)metrics.bufferMax=Math.max(metrics.bufferMax,socket.bufferedAmount);
  // Snapshots are superseded every tick. Never queue seconds of stale motion
  // behind a slow network or a large replay; reliable results remain ordered.
  if((value as {type?:string})?.type==='state'&&socket.bufferedAmount>65536){if(metrics)metrics.droppedStates++;return;}
  if(socket.bufferedAmount>8_000_000){if(metrics)metrics.closeCause='outbound-backlog';socket.close(1013,'Connection too slow. Please reconnect.');return;}if(socket.readyState===WebSocket.OPEN){const raw=JSON.stringify(value);if(metrics)metrics.bytesOut+=Buffer.byteLength(raw);socket.send(raw,{compress:['shot-chunk','replay'].includes((value as {type:string}).type)});}}
function broadcast(value:unknown,sessionId?:string){for(const [socket,c]of connections)if(c.guest&&(!sessionId||c.id===sessionId))send(socket,value);}
worker.on('message', message=>{
  if('challenge' in message&&!message.challenge?.id)message.challenge=null;
  if(message.type==='shot-frame'){
    message.type='state';const now=performance.now();for(const c of connections.values())if(c.id===message.id)c.metrics.state(now,message.stationTime);competition.state(message);
    let shot=shots.get(message.id);
    if(!shot||shot.attempt!==message.attempt){shot=new ShotStream(message.attempt);shots.set(message.id,shot);}
    const chunk=shot.frame(message);if(chunk)broadcast(chunk,message.id);return;
  }
  if(message.type==='state'){const now=performance.now();for(const c of connections.values())if(c.id===message.id)c.metrics.state(now,message.stationTime);competition.state(message);}
  if(message.type==='notice')competition.note(message);
  if(message.type==='impact')competition.impact(message);
  if(message.type==='waypoint-hit')competition.waypoint(message);
  if(['impact','waypoint-hit'].includes(message.type)){
    let shot=shots.get(message.id);
    if(!shot||shot.attempt!==message.attempt){shot=new ShotStream(message.attempt);shots.set(message.id,shot);}
    shot.events.push(message);return;
  }
  if(message.type==='notice'||(message.type==='state'&&['Aim','Charging'].includes(message.phase)))shots.delete(message.id);
  if(message.type==='ready'){workerFailure='';competition.ready(message).catch(error=>broadcast({type:'error',message:error.message}));}
  if(message.type==='result'){
    try{competition.result(message);}catch(error){competition.failed(message.id);broadcast({type:'error',message:`Result could not be saved: ${error instanceof Error?error.message:error}`},message.id);}return;
  }
  broadcast(message,['state','notice','impact','waypoint-hit'].includes(message.type)?message.id:undefined);
});
worker.on('failure',message=>{shots.clear();workerFailure=message;console.error(new Date().toISOString(),message);competition.failed();});
worker.on('status',message=>{
  if(message.status==='failed'){
    workerFailure=message.message;
    // In deployment, systemd replaces the entire service after worker recovery is exhausted.
    if(publicOrigin)setTimeout(()=>process.exit(1),1500).unref();
  }
  broadcast(message);
});
wss.on('connection',socket=>{
  const id=randomUUID();const c:Connection={id,queue:new ConnectionQueue(handle),metrics:new ConnectionMetrics(id),budget:new RequestBudget(),lastClientReport:0,opened:performance.now(),alive:true,lastWrite:0,lastReplay:0};connections.set(socket,c);
  const authTimer=setTimeout(()=>{if(!c.guest){c.metrics.closeCause='join-timeout';socket.close(1008,'Join timed out');}},5000);
  socket.on('pong',()=>{c.alive=true;});
  socket.on('error',()=>{});
  socket.on('message',raw=>{
    let m;const text=raw.toString();try{m=JSON.parse(text);if(!m||typeof m.type!=='string')m=null;}
    catch{m=null;}
    c.metrics.message(m?.type||'unknown',Buffer.byteLength(text));
    const now=performance.now();
    if(!c.budget.accept(!!c.guest&&m?.type==='input',Buffer.byteLength(text),now)){c.metrics.closeCause='request-rate';socket.close(1008,'Too many requests. Please reconnect.');return;}
    if(!m){send(socket,{type:'error',message:'Invalid message'});return;}
    if(c.guest&&m.type==='ping'){send(socket,{type:'pong',sequence:m.sequence,server:{eventLoopMaxMs,workerStateAgeMs:c.metrics.lastState?Math.round(now-c.metrics.lastState):0,pendingRequests:worker.requests.size}});return;}
    if(c.guest&&m.type==='client-performance'){
      if(now-c.lastClientReport<4000)return;c.lastClientReport=now;const report=clientPerformance(m.report);
      if(report)console.info(JSON.stringify({event:'client-performance',connection:c.metrics.tag,...report}));return;
    }
    if(c.guest&&m.type==='leave'){c.intentional=true;socket.close(1000,'Leaving');return;}
    if(!c.queue.push(m)){c.metrics.closeCause='command-queue';socket.close(1008,'Too many queued commands. Please reconnect.');}
    c.metrics.queueMax=Math.max(c.metrics.queueMax,c.queue.pending);
  });
  async function handle(m:any){
    try {
      if(socket.readyState!==WebSocket.OPEN||c.replaced)return;
      if(!c.guest){
        if(m.type!=='hello')throw new Error('Join first');
        const candidate=typeof m.sessionId==='string'?competition.members.get(m.sessionId):undefined;
        const resumed=candidate&&typeof m.token==='string'&&candidate.guest.token===m.token?candidate:undefined;
        if(!resumed&&competition.members.size>=16){socket.close(1013,'All 16 play slots are occupied. Please try again shortly.');return;}
        const guest=resumed?.guest||store.guest(typeof m.token==='string'?m.token:undefined);
        if(resumed){
          competition.disconnect(resumed.id);
          c.id=resumed.id;clearTimeout(detached.get(c.id));detached.delete(c.id);
          for(const [old,connection]of connections)if(old!==socket&&connection.id===c.id){connection.replaced=true;connection.queue.close();old.close(4009,'Session resumed on a new connection');}
        }
        c.guest=guest;clearTimeout(authTimer);send(socket,{type:'welcome',...guest,nameChosen:store.setting(`named:${guest.id}`)===true,sessionId:c.id,worker:worker.ready,resumed:!!resumed});
        if(m.protocol!=='shot-stream-v3'){c.requiresReload=true;send(socket,{type:'worker-status',status:'failed',message:'The game has been updated. Reload this page to load the new scoring and effects.'});return;}
        send(socket,worker.lifecycle());send(socket,competition.catalog());
        if(resumed){
          competition.sync(resumed);competition.board(resumed);
          const shot=shots.get(c.id);
          if(shot){send(socket,shot.resume());for(const chunk of shot.chunks)send(socket,chunk);}
          if(resumed.snapshot&&!resumed.attempt)send(socket,resumed.snapshot);
          if(resumed.snapshot?.phase==='Result'&&resumed.lastResult?.attempt!==m.lastResultAttempt&&resumed.lastResult)send(socket,resumed.lastResult);
        }else await competition.add(guest,c.id);
        return;
      }
      if(c.requiresReload){send(socket,{type:'notice',message:'Reload this page to load the new scoring and effects.'});return;}
      const id=c.id;
      if(['name','save-challenge'].includes(m.type)){
        const time=performance.now();if(c.lastWrite&&time-c.lastWrite<1000)throw new Error('Please wait a moment before saving again');c.lastWrite=time;
      }
      if(m.type==='replay'){
        const time=performance.now();if(c.lastReplay&&time-c.lastReplay<1000)throw new Error('Please wait a moment before loading another replay');c.lastReplay=time;
      }
      if(m.type==='name'){
        if(typeof m.name!=='string'||m.name.trim().length<1||m.name.length>32||/[\u0000-\u001f\u007f]/.test(m.name))throw new Error('Use a name of 1–32 characters');
        c.guest.name=m.name.trim();store.rename(c.guest.id,c.guest.name);store.setSetting(`named:${c.guest.id}`,true);send(socket,{type:'named',name:c.guest.name});competition.nameChanged(c.guest);return;
      }
      if(!worker.ready)throw new Error(workerFailure||'The physics worker is starting');
      if(m.type==='input'){
        for(const key of ['x','z','yaw','pitch','top','kick'])if(typeof m[key]!=='number'||!Number.isFinite(m[key]))throw new Error('Invalid input');
        if(Math.abs(m.x)>1||Math.abs(m.z)>1||Math.abs(m.yaw)>10000||m.pitch < -65||m.pitch>80||Math.abs(m.top)>200||Math.abs(m.kick)>200)throw new Error('Input out of range');
        worker.send({type:'input',id,x:m.x,z:m.z,yaw:m.yaw,pitch:m.pitch,top:m.top,kick:m.kick,fast:m.fast===true});
      }else {
        const member=competition.members.get(id);if(!member)throw new Error('Rejoin the session');
        const result=await competition.command(member,m);if(result)send(socket,result);
      }
    }catch(error){send(socket,{type:'error',message:error instanceof Error?error.message:'Invalid message'});}
  }
  socket.on('close',code=>{
    clearTimeout(authTimer);c.queue.close();connections.delete(socket);
    if(c.guest&&!c.replaced){
      if(c.intentional||stopping){shots.delete(c.id);competition.remove(c.id);}
      else{
        competition.disconnect(c.id);
        const timer=setTimeout(()=>{detached.delete(c.id);shots.delete(c.id);competition.remove(c.id);},30000);
        timer.unref();detached.set(c.id,timer);
      }
    }
    console.info(JSON.stringify({event:'connection-closed',code,cause:c.metrics.closeCause,receivedTotal:c.metrics.total,...c.metrics.take(),authenticated:!!c.guest,resumable:!!c.guest&&!c.intentional&&!c.replaced,seconds:Math.round((performance.now()-c.opened)/1000)}));
  });
});
let lastReplayCacheStats='';
const telemetry=setInterval(()=>{
  eventLoopMaxMs=Math.round(eventLoop.max/1e6);const loopP99Ms=Math.round(eventLoop.percentile(99)/1e6);eventLoop.reset();
  const replayCache=store.replayCache.stats(),cacheStats=JSON.stringify(replayCache);
  if(connections.size||cacheStats!==lastReplayCacheStats)console.info(JSON.stringify({event:'server-performance',replayCache,eventLoopMaxMs,eventLoopP99Ms:loopP99Ms,rssBytes:process.memoryUsage().rss,workerReady:worker.ready,pendingRequests:worker.requests.size,workerBufferedBytes:worker.socket?.writableLength||0,connections:[...connections.values()].map(c=>c.metrics.take())}));
  lastReplayCacheStats=cacheStats;
},5000);telemetry.unref();
const heartbeat=setInterval(()=>{for(const [socket,c]of connections){if(!c.alive){c.metrics.closeCause='heartbeat-timeout';socket.terminate();continue;}c.alive=false;socket.ping();}},30000);
heartbeat.unref();
server.on('error',error=>{console.error(error.message);if(worker.child)worker.stop();process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  console.log(`Kyoto Bounce · http://127.0.0.1:${port}`);
  worker.start().catch(error=>{workerFailure=error.message;console.error(workerFailure);});
});
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{
  if(stopping)return;stopping=true;clearInterval(heartbeat);clearInterval(telemetry);eventLoop.disable();for(const timer of detached.values())clearTimeout(timer);detached.clear();worker.stop();for(const socket of connections.keys())socket.close();wss.close();server.close();server.closeAllConnections();store.close();
});
