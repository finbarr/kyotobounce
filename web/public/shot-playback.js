// A shot is a small local movie of authoritative physics, not a live snapshot
// clock. Network delivery may run far ahead; effects fire only at playback time.
export class ShotPlayback {
 shot=null;discarded=new Set();resumeAt=null;
 clear(discard=false){if(discard&&this.shot){this.discarded.add(this.shot.attempt);if(this.discarded.size>8)this.discarded.delete(this.discarded.values().next().value);}this.shot=null;this.resumeAt=null;}
 resume(message){if(this.shot?.attempt!==message.attempt)this.resumeAt=message;}
 accept(chunk,now){
  if(this.discarded.has(chunk.attempt))return;
  if(this.shot?.attempt!==chunk.attempt){
   const first={...chunk.base,...chunk.frames[0]},resume=this.resumeAt?.attempt===chunk.attempt?this.resumeAt.time:null;
   const start=resume??first.releaseTime-.12;
   const launch={...first,phase:'Release',stationTime:first.releaseTime,flightTime:0,ball:first.launchPosition,rotationSamples:[],liveScore:null};
   this.shot={attempt:chunk.attempt,sequence:-1,frames:[launch],events:[],clock:start,now,emitted:-Infinity,eventFloor:resume??-Infinity,complete:false,result:null,resultSent:false,underrunMs:0};this.resumeAt=null;
  }
  const s=this.shot;if(chunk.sequence<=s.sequence)return;
  s.sequence=chunk.sequence;
  for(const frame of chunk.frames)s.frames.push({...chunk.base,...frame});
  s.events.push(...chunk.events.map(event=>({...event,at:event.stationTime??chunk.base.releaseTime+event.time})).filter(event=>event.at>=s.eventFloor));
  s.complete=chunk.complete;
 }
 result(message){if(this.shot?.attempt!==message.attempt)return false;this.shot.result=message;return true;}
 get active(){return !!this.shot;}
 sample(now){
  const s=this.shot;if(!s)return null;
  const elapsed=Math.max(0,(now-s.now)/1000);s.now=now;
  const last=s.frames.at(-1);
  // A reconnect starts partway through the movie. The first cached chunk may
  // precede that point; wait for backfill instead of rewinding to its last frame.
  if(!s.complete&&last.stationTime<s.clock)return null;
  // Only an incomplete buffer can run dry. Once complete, station animation
  // continues locally forever and the resting ball stays at its final pose.
  if(!s.complete)s.underrunMs+=Math.max(0,s.clock+elapsed-last.stationTime)*1000;
  s.clock=s.complete?s.clock+elapsed:Math.min(s.clock+elapsed,last.stationTime);
  const messages=[];
  while(s.frames.length>2&&s.frames[1].stationTime<=s.clock)s.frames.shift();
  const before=s.frames[0],after=s.frames[1]||before;
  const current=after.stationTime<=s.clock?after:before;
  if(current.stationTime>s.emitted){s.emitted=current.stationTime;messages.push(current);}
  const events=s.events.filter(e=>e.at<=s.clock);s.events=s.events.filter(e=>e.at>s.clock);messages.push(...events);
  const phase=s.clock<after.releaseTime?'Release':s.complete&&s.clock>=last.stationTime&&last.phase==='Result'?'Result':'Flight';
  if(phase==='Result'&&s.result&&!s.resultSent){s.resultSent=true;messages.push(s.result);}
  return {before,after,alpha:Math.max(0,Math.min(1,(s.clock-before.stationTime)/(after.stationTime-before.stationTime||1))),time:s.clock,phase,messages};
 }
 stats(){const s=this.shot;return {shotBufferedSeconds:s?Math.max(0,s.frames.at(-1).stationTime-s.clock):0,shotComplete:!!s?.complete,shotPlaybackTime:s?.clock??0,shotUnderrunMs:s?.underrunMs??0};}
}
