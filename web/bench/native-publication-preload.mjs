// Read-only observation in the benchmark's owned service, never public traffic.
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {PhysicsWorker} from '../worker.ts';
if(process.env.KYOTO_PORT!=='4195'||process.env.KYOTO_PUBLIC_ORIGIN||!process.env.NATIVE_TIMING_METRICS)throw new Error('Native timing requires isolated4195');
let worker,previous=performance.now(),cpu=process.cpuUsage();const histogram=monitorEventLoopDelay({resolution:10});histogram.enable();
const start=PhysicsWorker.prototype.start;PhysicsWorker.prototype.start=function(...args){worker=this;return start.apply(this,args)};
setInterval(()=>{const now=performance.now(),next=process.cpuUsage();writeFileSync(process.env.NATIVE_TIMING_METRICS,JSON.stringify({at:Date.now(),workerPid:worker?.child?.pid,status:worker?.status,cpuPercent:100*(next.user+next.system-cpu.user-cpu.system)/(now-previous)/1000,rss:process.memoryUsage().rss,eventLoopP99Ms:histogram.percentile(99)/1e6,eventLoopMaxMs:histogram.max/1e6,workerWritableBytes:worker?.socket?.writableLength||0}));histogram.reset();previous=now;cpu=next},1000).unref();
