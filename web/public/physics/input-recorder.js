export const INPUT_FORMAT='kyoto-inputs-1',INPUT_CHUNK_RUNS=128;

// One chunk may be in transit and one may be accumulating. Runs are immutable
// once sent, so many attempts can reference a prefix of the same walking route.
export class InputRecorder{
 constructor(course,emit){
  this.id=crypto.randomUUID();this.course=course;this.emit=emit;this.runs=[];this.steps=0;this.sequence=0;this.waiting=-1;this.closed=false;
  emit({type:'input-start',route:this.id,course});
 }
 record(input,yaw,fast){
  if(this.closed)return false;
  const current={steps:1,x:input.x,z:input.z,yaw:input.x||input.z?yaw:0,fast:!!fast},last=this.runs.at(-1);
  if(last&&['x','z','yaw','fast'].every(k=>last[k]===current[k]))last.steps++;
  else{
   if(this.runs.length===INPUT_CHUNK_RUNS){if(this.waiting!==null)return false;this.flush();}
   this.runs.push(current);
  }
  this.steps++;return true;
 }
 flush(){
  if(this.closed||this.waiting!==null||!this.runs.length)return;
  const runs=this.runs;this.runs=[];this.waiting=this.sequence++;
  this.emit({type:'input-chunk',route:this.id,sequence:this.waiting,runs});
 }
 acknowledge(sequence){if(this.closed||this.waiting===null||sequence!==this.waiting)return false;this.waiting=null;return true;}
 seal(){this.flush();return !this.closed&&this.waiting===null&&!this.runs.length;}
 proof(aim,power,powerRange,chargeTime,releaseTime){
  if(!this.seal())throw Error('Walking controls are not saved yet');
  const c=this.course;
  return {route:this.id,chunks:this.sequence,header:{format:INPUT_FORMAT,courseId:c.id,revision:c.revision,layout:c.layout,physics:c.physics,scoring:c.scoring,walkSteps:this.steps,chargeTime,releaseTime,aim:{yaw:aim.yaw,pitch:aim.pitch,top:aim.top,kick:aim.kick,power,powerRange}}};
 }
 close(){if(!this.closed){this.closed=true;this.runs=[];this.emit({type:'input-close',route:this.id});}}
}
