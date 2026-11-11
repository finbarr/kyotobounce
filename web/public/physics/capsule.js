import {Vector3,Line3,Plane,Box3} from 'three';
import {ExtendedTriangle} from 'three-mesh-bvh';
const V=p=>new Vector3(p.x,p.y,p.z);
// Conservative advancement of the entire capsule, not samples along its axis.
// The separating plane bounds the earliest possible contact with a convex face.
function advance(a,b,delta,radius,closest,overlap=false){
 let t=0;const axis=new Line3(),point=new Vector3(),center=new Vector3();
 for(let i=0;i<40;i++){
  axis.start.copy(a).addScaledVector(delta,t);axis.end.copy(b).addScaledVector(delta,t);
  closest(axis,point,center);const normal=center.clone().sub(point),distance=normal.length();
  if(overlap)return distance<radius-1e-7?{fraction:0,normal:normal.normalize()}:null;
  if(distance<1e-10)return {fraction:t,normal:delta.clone().negate().normalize()};
  normal.multiplyScalar(1/distance);const approach=-delta.dot(normal);
  if(approach<=1e-10)return null;
  if(distance<=radius+1e-7)return {fraction:t,normal};
  t+=(distance-radius)/approach;if(t>1)return null;
 }
 // Fail closed if a grazing contact exhausted refinement: no tunnelling.
 return {fraction:t,normal:center.sub(point).normalize()};
}
function triangleClosest(tri,axis,point,center){
 const plane=new Plane().setFromCoplanarPoints(tri.a,tri.b,tri.c),hit=plane.intersectLine(axis,new Vector3());
 if(hit&&tri.containsPoint(hit)){point.copy(hit);center.copy(hit);return;}
 tri.closestPointToSegment(axis,point,center);
}
function segmentClosest(axis,other,point,center){
 const d1=axis.delta(new Vector3()),d2=other.delta(new Vector3()),r=axis.start.clone().sub(other.start),a=d1.lengthSq(),e=d2.lengthSq(),b=d1.dot(d2),c=d1.dot(r),f=d2.dot(r),denom=a*e-b*b;
 let s=denom>1e-20?Math.max(0,Math.min(1,(b*f-c*e)/denom)):0,t=(b*s+f)/e;
 if(t<0){t=0;s=Math.max(0,Math.min(1,-c/a));}else if(t>1){t=1;s=Math.max(0,Math.min(1,(b-c)/a));}
 center.copy(axis.start).addScaledVector(d1,s);point.copy(other.start).addScaledVector(d2,t);
}
export function capsuleSweep(world,feet,displacement,radius,height,skin,mask=2,overlap=false){
 const a=V(feet).add(new Vector3(0,radius,0)),b=V(feet).add(new Vector3(0,height-radius,0)),d=V(displacement),r=radius+skin;
 if(!overlap&&d.lengthSq()<1e-20)return null;
 const bounds=new Box3().setFromPoints([a,b,a.clone().add(d),b.clone().add(d)]).expandByScalar(r);let best=null;
 const record=(hit,index)=>{if(hit&&(!best||hit.fraction<best.fraction-1e-10||Math.abs(hit.fraction-best.fraction)<1e-10&&index<best.index))best={...hit,index,surface:world.info[index].surface};};
 world.bvh?.shapecast({intersectsBounds:box=>box.intersectsBox(bounds),intersectsTriangle:(tri,i)=>{
  const index=world.triangleShape[i];if(world.info[index].mask&mask)record(advance(a,b,d,r,(axis,p,c)=>triangleClosest(tri,axis,p,c),overlap),index);return false;
 }});
 world.candidates(bounds,s=>{
  if(!(s.mask&mask))return;
  if(s.kind==='capsule'){
   const axis=new Line3(new Vector3(0,-s.half.y,0).applyQuaternion(s.quaternion).add(s.position),new Vector3(0,s.half.y,0).applyQuaternion(s.quaternion).add(s.position));
   record(advance(a,b,d,r+s.radius,(line,p,c)=>segmentClosest(line,axis,p,c),overlap),s.index);return;
  }
  if(!s.walkerFaces){
   s.walkerFaces=[];const h=s.half;
   for(const dim of ['x','y','z'])for(const sign of [-1,1]){
    const [j,k]=['x','y','z'].filter(x=>x!==dim),points=[[1,1],[-1,1],[-1,-1],[1,-1]].map(([sj,sk])=>{const p=new Vector3();p[dim]=h[dim]*sign;p[j]=h[j]*sj;p[k]=h[k]*sk;return p.applyQuaternion(s.quaternion).add(s.position);});
    for(const ids of [[0,1,2],[0,2,3]])s.walkerFaces.push(new ExtendedTriangle(...ids.map(i=>points[i])));
   }
  }
  for(const tri of s.walkerFaces)record(advance(a,b,d,r,(axis,p,c)=>triangleClosest(tri,axis,p,c),overlap),s.index);
 });return best;
}
export function capsuleOverlap(world,feet,radius,height,mask=2){
 // Surface distance covers the whole axis. Endpoint sphere checks also detect
 // a capsule wholly enclosed in a solid, without any nearby boundary face.
 return world.overlap({x:feet.x,y:feet.y+radius,z:feet.z},radius,mask)||world.overlap({x:feet.x,y:feet.y+height-radius,z:feet.z},radius,mask)||capsuleSweep(world,feet,{x:0,y:0,z:0},radius,height,0,mask,true);
}
