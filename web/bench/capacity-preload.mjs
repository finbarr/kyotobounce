// Opt-in observation only; loaded solely by capacity.mjs into its isolated server.
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {PhysicsWorker} from '../worker.ts';
if(process.env.KYOTO_PORT!=='4283'||process.env.KYOTO_PUBLIC_ORIGIN||!process.env.CAPACITY_METRICS)throw new Error('Capacity observation requires isolated port 4283');
const histogram=monitorEventLoopDelay({resolution:10});histogram.enable();
let worker,last=performance.now(),cpu=process.cpuUsage(),elu=performance.eventLoopUtilization();
const sent={},events={};
const start=PhysicsWorker.prototype.start,send=PhysicsWorker.prototype.send,emit=PhysicsWorker.prototype.emit;
PhysicsWorker.prototype.start=function(...args){worker=this;return start.apply(this,args);};
PhysicsWorker.prototype.send=function(message){sent[message.type]=(sent[message.type]||0)+1;return send.call(this,message);};
PhysicsWorker.prototype.emit=function(event,...args){if(event==='message'){const type=args[0]?.type;events[type]=(events[type]||0)+1;}else if(event==='status'||event==='failure')events[event]=(events[event]||0)+1;return emit.call(this,event,...args);};
setInterval(()=>{
 const now=performance.now(),nextCpu=process.cpuUsage(),nextElu=performance.eventLoopUtilization();
 const record={at:Date.now(),pid:process.pid,workerPid:worker?.child?.pid,workerStatus:worker?.status,requests:worker?.requests.size||0,workerWritableBytes:worker?.socket?.writableLength||0,workerBytesRead:worker?.socket?.bytesRead||0,workerBytesWritten:worker?.socket?.bytesWritten||0,rss:process.memoryUsage().rss,cpuPercent:100*(nextCpu.user+nextCpu.system-cpu.user-cpu.system)/((now-last)*1000),eventLoop:{p50Ms:histogram.percentile(50)/1e6,p99Ms:histogram.percentile(99)/1e6,maxMs:histogram.max/1e6,utilization:performance.eventLoopUtilization(nextElu,elu).utilization},sent,events};
 writeFileSync(process.env.CAPACITY_METRICS,JSON.stringify(record));histogram.reset();last=now;cpu=nextCpu;elu=nextElu;
},1000).unref();
