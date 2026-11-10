import {Vector3,Quaternion,Box3} from 'three';
import {v,clamp} from './math.js';
import {surfaceFor} from './materials.js';
import {boxSweep} from './sweeps.js';

const vector=p=>new Vector3(p.x,p.y,p.z);
const packed=p=>v(p.x,p.y,p.z);

// The closed rail is piecewise linear. Split sweeps at every turn so collision
// uses the actual translating tread, including the hidden return chain.
export class MovingEscalator{
 constructor(spec){
  this.spec=spec;this.points=spec.path.map(vector);this.distance=[0];
  for(let i=1;i<this.points.length;i++)this.distance.push(this.distance[i-1]+Math.fround(this.points[i].distanceTo(this.points[i-1])));
  this.length=this.distance.at(-1);this.pitch=this.length/spec.stepCount;
  this.half=new Vector3(spec.width/2,spec.stepHeight/2,Math.fround(this.pitch)/2);
  this.position=vector(spec.lowerCenter);
  this.rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(spec.uphill.x,spec.uphill.z));
  this.inverse=this.rotation.clone().invert();
  this.surface=surfaceFor({id:spec.id,material:'escalator',rolling:.024});
  const bounds=new Box3().setFromPoints(this.points);this.firstBucket=Math.floor(bounds.min.z);
  this.buckets=Array.from({length:Math.floor(bounds.max.z)-this.firstBucket+1},()=>[]);
  for(let i=1;i<this.points.length;i++){
   const low=Math.floor(Math.min(this.points[i-1].z,this.points[i].z))-this.firstBucket,high=Math.floor(Math.max(this.points[i-1].z,this.points[i].z))-this.firstBucket;
   for(let bin=low;bin<=high;bin++){
    const spans=this.buckets[bin],last=spans.at(-1);
    if(last&&last.high>=this.distance[i-1]-1e-9)last.high=this.distance[i];
    else spans.push({low:this.distance[i-1],high:this.distance[i]});
   }
  }
  this.envelope=bounds.expandByVector(new Vector3(spec.width+1,2*spec.stepHeight+1,this.pitch+1).multiplyScalar(.5));
  this.worldBounds=new Box3();
  for(const x of [this.envelope.min.x,this.envelope.max.x])for(const y of [this.envelope.min.y,this.envelope.max.y])for(const z of [this.envelope.min.z,this.envelope.max.z])this.worldBounds.expandByPoint(new Vector3(x,y,z).applyQuaternion(this.rotation).add(this.position));
 }
 local(p){return vector(p).sub(this.position).applyQuaternion(this.inverse);}
 pose(step,time){
  const {speed,phase}=this.spec;let at=(step*this.pitch+phase*this.pitch+speed*time)%this.length;
  if(at<0)at+=this.length;
  let low=0,high=this.distance.length-1;
  while(low+1<high){const mid=(low+high)>>1;if(this.distance[mid]<=at)low=mid;else high=mid;}
  if(speed<0&&Math.abs(at-this.distance[low])<1e-10){if(low===0){at=this.length;low=this.points.length-2;}else low--;}
  const span=this.distance[low+1]-this.distance[low],tangent=this.points[low+1].clone().sub(this.points[low]).divideScalar(span);
  const center=this.points[low].clone().addScaledVector(tangent,at-this.distance[low]);center.y-=this.half.y;
  return {center,velocity:tangent.multiplyScalar(speed),nextBoundary:speed>0?(this.distance[low+1]-at)/speed:speed<0?(this.distance[low]-at)/speed:Infinity};
 }
 candidates(p,d,radius,time,duration,exhaustive){
  if(exhaustive)return Array.from({length:this.spec.stepCount},(_,i)=>i);
  const travel=Math.abs(this.spec.speed)*duration,margin=this.half.z+radius+travel;
  const low=Math.max(0,Math.floor(Math.min(p.z,p.z+d.z)-margin)-this.firstBucket),high=Math.min(this.buckets.length-1,Math.floor(Math.max(p.z,p.z+d.z)+margin)-this.firstBucket);
  let offset=(this.spec.phase*this.pitch+this.spec.speed*time)%this.length;if(offset<0)offset+=this.length;
  const indices=new Set();
  for(let bin=low;bin<=high;bin++)for(const span of this.buckets[bin]){
   const start=Math.ceil((span.low-travel-offset)/this.pitch-1e-6),end=Math.floor((span.high+travel-offset)/this.pitch+1e-6);
   for(let i=start;i<=end;i++)indices.add((i%this.spec.stepCount+this.spec.stepCount)%this.spec.stepCount);
  }
  // Stable ties at adjoining treads must not depend on broadphase order.
  return [...indices].sort((a,b)=>a-b);
 }
 sweep(origin,displacement,radius,time,duration,{freeze=false,exhaustive=false}={}){
  const p=this.local(origin),d=vector(displacement).applyQuaternion(this.inverse);
  if(this.envelope.distanceToPoint(p)>d.length()+radius)return null;
  const travel=duration>0?d.clone().divideScalar(duration):new Vector3();let best=null;
  const record=(hit,pose,elapsed,span,step)=>{
   if(!hit)return;
   const at=freeze?hit.fraction:elapsed+span*hit.fraction;
   if(best&&at>=best.time)return;
   const point=hit.point.clone().add(pose.center);
   if(!freeze)point.addScaledVector(pose.velocity,span*hit.fraction);
   best={time:at,point:packed(point.applyQuaternion(this.rotation).add(this.position)),normal:packed(hit.normal.clone().applyQuaternion(this.rotation)),surface:{...this.surface,velocity:packed(pose.velocity.clone().applyQuaternion(this.rotation))},complex:false,step};
  };
  for(const step of this.candidates(p,d,radius,time,freeze?0:duration,exhaustive)){
   const initial=this.pose(step,time);
   if(freeze){record(boxSweep(p.clone().sub(initial.center),d,this.half,radius),initial,0,1,step);continue;}
   const margin=radius+Math.abs(this.spec.speed)*duration;
   if(['x','y','z'].some(axis=>Math.max(p[axis],p[axis]+d[axis])<initial.center[axis]-this.half[axis]-margin||Math.min(p[axis],p[axis]+d[axis])>initial.center[axis]+this.half[axis]+margin))continue;
   let elapsed=0;
   while(elapsed<duration-1e-10&&(!best||elapsed<=best.time)){
    const pose=this.pose(step,time+elapsed),span=Math.min(duration-elapsed,Math.max(1e-9,pose.nextBoundary));
    const relative=travel.clone().sub(pose.velocity).multiplyScalar(span);
    const hit=boxSweep(p.clone().addScaledVector(travel,elapsed).sub(pose.center),relative,this.half,radius);
    if(hit){record(hit,pose,elapsed,span,step);break;}
    elapsed+=span;
   }
  }
  return best;
 }
 walkingVelocity(feet){
  const q=this.local(feet),s=this.spec;
  if(Math.abs(q.x)>s.width/2||q.z < -s.flatLength||q.z>s.run+s.flatLength)return null;
  const index=clamp(Math.floor((q.z+s.flatLength)/(s.run+2*s.flatLength)*(s.publicPointCount-1)),0,s.publicPointCount-2),a=this.points[index],b=this.points[index+1];
  const y=a.y+(b.y-a.y)*clamp((q.z-a.z)/(b.z-a.z),0,1);
  if(q.y-y<-.08||q.y-y>.35)return null;
  return packed(b.clone().sub(a).normalize().multiplyScalar(s.speed).applyQuaternion(this.rotation));
 }
 overlaps(origin,radius,time){
  const p=this.local(origin);
  if(this.envelope.distanceToPoint(p)>radius)return false;
  for(const step of this.candidates(p,new Vector3(),radius,time,0,false)){
   const q=p.clone().sub(this.pose(step,time).center);
   const closest=q.clone().clamp(this.half.clone().negate(),this.half);
   if(q.distanceToSquared(closest)<radius*radius)return true;
  }
  return false;
 }
}

export class StationMotion{
 constructor(specs){this.lanes=specs.map(s=>new MovingEscalator(s));}
 sweep(p,d,radius,time,duration,options){
  let best=null;
  for(const lane of this.lanes){
   const bounds=lane.worldBounds;
   if(p.x+Math.max(0,d.x)+radius<bounds.min.x||p.x+Math.min(0,d.x)-radius>bounds.max.x||p.y+Math.max(0,d.y)+radius<bounds.min.y||p.y+Math.min(0,d.y)-radius>bounds.max.y||p.z+Math.max(0,d.z)+radius<bounds.min.z||p.z+Math.min(0,d.z)-radius>bounds.max.z)continue;
   const hit=lane.sweep(p,d,radius,time,duration,options);if(hit&&(!best||hit.time<best.time))best=hit;
  }
  return best;
 }
 probe(p,d,radius,time){return this.sweep(p,d,radius,time,1,{freeze:true});}
 overlaps(p,radius,time){return this.lanes.some(lane=>lane.worldBounds.distanceToPoint(vector(p))<=radius&&lane.overlaps(p,radius,time));}
 walkingVelocity(feet){for(const lane of this.lanes){const velocity=lane.walkingVelocity(feet);if(velocity)return velocity;}return v();}
}
