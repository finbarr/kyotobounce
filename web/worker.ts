import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import type { Socket } from 'node:net';
import { EventEmitter } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, mkdir, access, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

type Run = {
  token: string;
  child: ChildProcess;
  failed: boolean;
  startupTimer?: ReturnType<typeof setTimeout>;
  killTimer?: ReturnType<typeof setTimeout>;
};

export class PhysicsWorker extends EventEmitter {
  socket: Socket | undefined;
  child: ChildProcess | undefined;
  ready = false;
  status = 'starting';
  statusMessage = 'Physics is starting.';
  requests = new Map<string,{resolve:(value:any)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  stopping = false;
  listener = createServer();
  private sockets = new Set<Socket>();
  private run?: Run;
  private started = false;
  private restarts: number[] = [];
  private restartTimer?: ReturnType<typeof setTimeout>;
  private executable = resolve(process.env.KYOTO_WORKER_EXECUTABLE || (process.platform==='linux'?'Builds/PhysicsWorkerLinux/KyotoPhysicsWorker.x86_64':'Builds/PhysicsWorker/Kyoto Physics Worker.app/Contents/MacOS/Kyoto Physics Worker'));
  private layout = resolve(process.env.KYOTO_LAYOUT || 'runtime/station-layout.json');
  private log = resolve(process.env.KYOTO_WORKER_LOG || 'artifacts/phase3/worker/player.log');
  private sha = '';

  lifecycle() { return {type:'worker-status',status:this.status,message:this.statusMessage}; }
  private setStatus(status:string,message:string) {
    this.status=status;this.statusMessage=message;this.emit('status',this.lifecycle());
  }
  async start() {
    if(this.started||this.stopping)return;
    this.started=true;
    try {
      await access(this.executable).catch(()=>{throw new Error('Physics worker missing. Run npm run build:worker first.');});
      this.sha=createHash('sha256').update(await readFile(this.layout)).digest('hex');
      await mkdir(dirname(this.log),{recursive:true});
      if(this.stopping)return;
      this.listener.on('connection',socket=>this.connect(socket));
      await new Promise<void>((done,reject)=>{
        this.listener.once('error',reject);
        this.listener.listen(0,'127.0.0.1',()=>{this.listener.off('error',reject);done();});
      });
      if(this.stopping){this.listener.close();return;}
      this.launch();
    } catch(error) {
      if(!this.stopping){
        const message=error instanceof Error?error.message:String(error);
        this.emit('failure',message);this.setStatus('failed',message);
      }
    }
  }
  private connect(socket:Socket) {
    const run=this.run;
    if(!run||run.failed||this.stopping){socket.destroy();return;}
    this.sockets.add(socket);
    let buffer='',authenticated=false;
    socket.setNoDelay(true);socket.setEncoding('utf8');
    const timer=setTimeout(()=>socket.destroy(),3000);
    socket.on('data',data=>{
      if(run!==this.run||run.failed||this.stopping){socket.destroy();return;}
      buffer+=data;
      if(buffer.length>8_000_000){socket.destroy();return;}
      let index;
      while((index=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,index);buffer=buffer.slice(index+1);
        let message;
        try{message=JSON.parse(line);if(!message||typeof message.type!=='string')throw new Error('Invalid message');}
        catch{socket.destroy();return;}
        if(!authenticated){
          if(message.type!=='auth'||message.token!==run.token||this.socket){socket.destroy();return;}
          authenticated=true;clearTimeout(timer);this.socket=socket;continue;
        }
        if(message.type==='ready'){
          if(this.ready)continue;
          clearTimeout(run.startupTimer);this.ready=true;
          console.log('Native physics ready',message.profile,String(message.layout).slice(0,12));
          this.setStatus('ready','Physics is ready.');
        }
        if(message.type==='reply'){
          const pending=this.requests.get(message.request);
          if(pending){clearTimeout(pending.timer);this.requests.delete(message.request);if(message.ok)pending.resolve(message);else pending.reject(new Error(message.message||'Physics validation failed'));}
          continue;
        }
        this.emit('message',message);
      }
    });
    socket.on('error',()=>{});
    socket.on('close',()=>{
      clearTimeout(timer);this.sockets.delete(socket);
      if(this.socket===socket){this.socket=undefined;this.fail(run,'Physics worker disconnected.');}
    });
  }
  private launch() {
    if(this.stopping)return;
    const address=this.listener.address();
    if(!address||typeof address==='string')throw new Error('Worker port unavailable');
    const token=randomUUID();
    const child=spawn(this.executable,['-batchmode','-nographics','-logFile',this.log],{
      env:{...process.env,KYOTO_WORKER_PORT:String(address.port),KYOTO_WORKER_TOKEN:token,KYOTO_LAYOUT:this.layout,KYOTO_LAYOUT_SHA:this.sha},stdio:'ignore'
    });
    const run:Run={token,child,failed:false};this.run=run;this.child=child;
    run.startupTimer=setTimeout(()=>this.fail(run,'Physics worker did not become ready within 60 seconds.'),60000);
    child.on('error',error=>this.fail(run,error.message));
    // A replacement starts only after the old process has closed, never alongside it.
    child.on('close',(code,signal)=>{
      clearTimeout(run.startupTimer);clearTimeout(run.killTimer);
      if(this.stopping||this.run!==run)return;
      const reason=`Physics worker stopped (${signal??code}).`;
      if(run.failed)console.error(new Date().toISOString(),reason);
      this.fail(run,reason);
      this.scheduleRestart();
    });
  }
  private rejectRequests(message:string) {
    for(const pending of this.requests.values()){clearTimeout(pending.timer);pending.reject(new Error(message));}
    this.requests.clear();
  }
  private fail(run:Run,reason:string) {
    if(this.stopping||run!==this.run||run.failed)return;
    run.failed=true;this.ready=false;clearTimeout(run.startupTimer);
    this.rejectRequests('Physics interrupted. The unfinished action was cancelled.');
    this.socket=undefined;for(const socket of this.sockets)socket.destroy();
    this.emit('failure',reason);
    this.setStatus('recovering','Physics interrupted. Restoring the session; the unfinished shot was cancelled.');
    this.terminate(run);
  }
  private terminate(run:Run) {
    const alive=()=>run.child.exitCode===null&&run.child.signalCode===null;
    if(!alive())return;
    run.child.kill('SIGTERM');
    run.killTimer=setTimeout(()=>{if(alive())run.child.kill('SIGKILL');},2000);
    run.killTimer.unref();
  }
  private scheduleRestart() {
    const now=performance.now();this.restarts=this.restarts.filter(time=>now-time<300000);
    if(this.restarts.length>=3){
      this.setStatus('failed',process.env.KYOTO_PUBLIC_ORIGIN?'Physics is unavailable. Please try again shortly.':'Physics stopped repeatedly. Run npm stop, then npm start. Details: artifacts/phase3/worker/player.log');return;
    }
    const delay=1000*2**this.restarts.length;this.restarts.push(now);
    this.restartTimer=setTimeout(async()=>{
      this.restartTimer=undefined;
      // Keep the previous run's evidence before Unity overwrites player.log.
      try{await copyFile(this.log,this.log.replace(/player\.log$/,'previous-player.log'));}catch(error){console.error('Could not preserve worker log:',error);}
      if(this.stopping)return;
      this.launch();
    },delay);
  }
  send(message:unknown) { if(this.ready)this.socket?.write(JSON.stringify(message)+'\n'); }
  request(message:Record<string,unknown>):Promise<any> {
    if(!this.ready)return Promise.reject(new Error('Physics worker is not ready'));
    const request=randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.requests.delete(request);reject(new Error('Physics request timed out'));},10000);
      this.requests.set(request,{resolve,reject,timer});this.send({...message,request});
    });
  }
  stop() {
    if(this.stopping)return;
    this.stopping=true;clearTimeout(this.restartTimer);
    this.send({type:'shutdown'});this.ready=false;
    this.rejectRequests('Local service stopped');
    if(this.listener.listening)this.listener.close();
    for(const socket of this.sockets)socket.destroy();this.socket=undefined;
    if(this.run){clearTimeout(this.run.startupTimer);clearTimeout(this.run.killTimer);this.terminate(this.run);}
    this.setStatus('stopped','Local service stopped.');
  }
}
