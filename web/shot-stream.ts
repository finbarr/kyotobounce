// Reliable, timestamped trajectory chunks. Keep the current shot in memory for
// reconnects; old chunks expire as presentation passes them. No client physics.
const shared=['type','id','attempt','layout','profile','physics','challenge','owner','releaseTime','chargeTime','launchPosition','radius','power'];
export class ShotStream {
 attempt:string;frames:any[]=[];events:any[]=[];chunks:any[]=[];sequence=0;
  releaseTime=0;started=performance.now();lastFlush=0;computeStarted=performance.now();bytes=0;
  rate=1;elapsedAtChange=0;
 constructor(attempt:string){this.attempt=attempt;}
 frame(frame:any){
  if(!this.sequence&&!this.frames.length){this.releaseTime=frame.releaseTime;this.started=performance.now()-frame.flightTime*1000;}
  this.frames.push(frame);
  // Start playback immediately, then amortize metadata over 200 ms of motion.
  return this.frames.length>=6||!this.sequence||(frame.phase!=='Flight'||frame.trajectoryEnd)?this.flush():null;
 }
 flush(){
  if(!this.frames.length)return null;
  const base:any={};for(const key of shared)base[key]=this.frames[0][key];base.type='state';
  const frames=this.frames.splice(0).map(frame=>{const copy={...frame};for(const key of shared)delete copy[key];return copy;});
  const chunk={type:'shot-chunk',attempt:this.attempt,sequence:this.sequence++,base,frames,events:this.events.splice(0),complete:frames.at(-1).phase==='Result'||frames.at(-1).trajectoryEnd===true};
  this.bytes+=Buffer.byteLength(JSON.stringify(chunk));
  if(chunk.complete)console.info(JSON.stringify({event:'shot-computed',duration:frames.at(-1).flightTime,computeMs:Math.round(performance.now()-this.computeStarted),chunks:this.sequence,bytes:this.bytes}));
  this.chunks.push(chunk);this.lastFlush=performance.now();
  const cutoff=this.releaseTime+this.elapsed()-2;
  while(this.chunks.length>1&&this.chunks[0].frames.at(-1).stationTime<cutoff)this.chunks.shift();
  return chunk;
 }
 elapsed(now=performance.now()){return this.elapsedAtChange+Math.max(0,(now-this.started)/1000)*this.rate;}
 setRate(rate:number,now=performance.now()){if(rate!==1&&rate!==2)throw new Error('Invalid playback rate');this.elapsedAtChange=this.elapsed(now);this.started=now;this.rate=rate;}
 resume(){return {type:'shot-resume',attempt:this.attempt,time:this.releaseTime+Math.max(0,this.elapsed()-.2)};}
}

// A stalled TCP connection may release a full reconnect window of ordinary
// 30 Hz input at once. Controls keep their stricter independent request budget.
export class RequestBudget {
 commands=180;inputs=1200;bytes=262144;updated=performance.now();
 accept(input:boolean,bytes:number,now=performance.now()){
  const elapsed=Math.max(0,now-this.updated)/1000;this.updated=now;
  this.commands=Math.min(180,this.commands+elapsed*90);
  this.inputs=Math.min(1200,this.inputs+elapsed*120);
  this.bytes=Math.min(262144,this.bytes+elapsed*131072)-bytes;
  if(input)this.inputs--;else this.commands--;
  return this.commands>=0&&this.inputs>=0&&this.bytes>=0;
 }
}
