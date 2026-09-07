import * as THREE from 'three';
const next=new THREE.Quaternion();
const nativeQuaternion=(out,q)=>out.set(-q.x,-q.y,q.z,q.w);
export function rotationBetween(out,a,b,alpha){
 nativeQuaternion(out,a);nativeQuaternion(next,b);return out.slerp(next,alpha);
}
export function rotationSpeed(a,b,seconds){
 if(seconds<=0)return 0;
 return 2*Math.acos(Math.min(1,Math.abs(a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w)))/seconds;
}
// A 30 Hz pair cannot distinguish a partial turn from one or more full turns.
// Keep the worker's 180 Hz orientations to resolve the launch-spin range.
export class BallRotationBuffer{
 samples=[];releaseTime=null;speed=0;
 add(state){
  if(!['Flight','Result'].includes(state.phase)){this.samples=[];this.releaseTime=null;return;}
  if(this.releaseTime!==state.releaseTime){this.samples=[];this.releaseTime=state.releaseTime;}
  for(const s of state.rotationSamples||[])if(!this.samples.length||s.t>this.samples.at(-1).t)this.samples.push(s);
  if(this.samples.length>360)this.samples.splice(0,this.samples.length-360);
 }
 sample(worldTime,out){
  const samples=this.samples;if(samples.length<2)return false;
  const time=worldTime-this.releaseTime;let lo=0,hi=samples.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].t<=time)lo=mid;else hi=mid;}
  const a=samples[lo],b=samples[hi],span=b.t-a.t;
  rotationBetween(out,a.q,b.q,THREE.MathUtils.clamp((time-a.t)/span,0,1));
  this.speed=rotationSpeed(a.q,b.q,span);return true;
 }
}
// Blend out sharp seams over a camera exposure before their repeating pattern
// aliases into a stationary/reversing wheel at low display frame rates.
export function spinMarkOpacity(speed,frameSeconds){
 const angle=Math.abs(speed)*Math.max(1/120,Math.min(.1,frameSeconds));
 return 1-THREE.MathUtils.smoothstep(angle,.3,1.3);
}
