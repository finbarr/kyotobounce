// A single bounded recording chunk may be in transit. The consumer acknowledges
// only after IndexedDB commits it; a slow/hidden tab cannot accumulate messages.
export const SHOT_LOOKAHEAD=30,SHOT_BATCH_STEPS=180;
export class ShotRunner{
 constructor(shot,base,emit){
  this.shot=shot;this.base=base;this.emit=emit;this.played=0;this.skipping=false;
  this.sequence=0;this.waiting=null;this.closed=false;this.began=performance.now();this.maxBatchMs=0;
  this.rotations=shot.poses.map(p=>({t:p.t,q:p.q}));this.wake();
 }
 close(){this.closed=true;clearTimeout(this.timer);this.timer=null;}
 progress(time){
  if(!Number.isFinite(time))return;
  this.played=Math.max(this.played,Math.min(this.shot.ball.clock,Math.max(0,time-this.shot.releaseTime)));this.wake();
 }
 skip(){this.skipping=true;this.wake();}
 acknowledge(sequence){
  if(this.closed||sequence!==this.waiting)return;
  this.waiting=null;
  if(this.shot.done){
   this.close();const {poses,contacts,...result}=this.shot.result();
   this.emit({type:'local-result',result:{...result,id:this.base.id,recordingChunks:this.sequence},computeMs:performance.now()-this.began,maxBatchMs:this.maxBatchMs});
  }else this.wake();
 }
 wake(){
  if(this.closed||this.timer!=null||this.waiting!==null||(!this.skipping&&this.shot.ball.clock>=this.played+SHOT_LOOKAHEAD))return;
  this.timer=setTimeout(()=>{this.timer=null;this.compute();},0);
 }
 compute(){
  if(this.closed)return;
  try{
   const shot=this.shot,start=performance.now(),frames=[],events=[],scoreFrames=[];let steps=0;
   while(!shot.done&&steps<SHOT_BATCH_STEPS&&(this.skipping||shot.ball.clock<this.played+SHOT_LOOKAHEAD)){
    shot.step();steps++;const b=shot.ball,last=shot.poses.at(-1);
    this.rotations.push({t:last.t,q:last.q});events.push(...shot.events.splice(0).map(e=>({...e,id:this.base.id})));
    if(shot.steps%6===0||shot.done){
     const score=shot.breakdown;scoreFrames.push({t:b.clock,score});
     frames.push({stationTime:shot.releaseTime+b.clock,flightTime:b.clock,phase:shot.done?'Result':'Flight',ball:b.position,rotation:b.rotation,velocity:b.velocity,spin:b.spin,rotationSamples:this.rotations,liveScore:score,impacts:shot.impacts,surfaces:shot.surfaces.size,diagnostics:{simulating:!shot.done,sleeping:b.sleeping,supported:b.supported,contactBudgetExhaustions:b.budgetExhaustions}});this.rotations=[];
    }
    if(performance.now()-start>=8)break;
   }
   if(!steps)return;
   this.maxBatchMs=Math.max(this.maxBatchMs,performance.now()-start);
   const sequence=this.sequence++;this.waiting=sequence;
   this.emit({type:'recording-chunk',attempt:shot.attempt,sequence,recording:{...shot.drain(),scoreFrames},playback:{type:'shot-chunk',attempt:shot.attempt,sequence,base:this.base,frames,events,complete:shot.done}});
  }catch(error){this.close();this.emit({type:'recording-error',attempt:this.shot.attempt,message:String(error)});}
 }
}
