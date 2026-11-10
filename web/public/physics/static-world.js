import {Vector3,Quaternion,Box3,BufferGeometry,BufferAttribute} from 'three';
import {MeshBVH,CENTER} from 'three-mesh-bvh';
import {v} from './math.js';
import {surfaceFor} from './materials.js';
import {boxSweep,triangleSweep,segmentSweep} from './sweeps.js';
const vector=p=>new Vector3(p.x,p.y,p.z);
function shapeBounds(s){const h=vector(s.half);if(s.kind==='capsule')h.set(s.radius,s.half.y+s.radius,s.radius);const q=new Quaternion(s.rotation.x,s.rotation.y,s.rotation.z,s.rotation.w),p=vector(s.position),box=new Box3();for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])box.expandByPoint(new Vector3(h.x*x,h.y*y,h.z*z).applyQuaternion(q).add(p));return box;}
function tree(items){if(!items.length)return null;const bounds=new Box3();for(const s of items)bounds.union(s.bounds);if(items.length<=8)return {bounds,items};const size=bounds.getSize(new Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';items.sort((a,b)=>(a.bounds.min[axis]+a.bounds.max[axis])-(b.bounds.min[axis]+b.bounds.max[axis]));const half=items.length>>1;return {bounds,left:tree(items.slice(0,half)),right:tree(items.slice(half))};}
export class StaticWorld{
 static async create(pack){return new StaticWorld(pack);}
 constructor(pack){
  this.layoutSha256=pack.layoutSha256;this.fallLimitY=pack.fallLimitY;this.escalators=pack.escalators||[];
  this.info=pack.shapes.map(s=>({surface:surfaceFor(s),mask:s.mask,complex:s.kind!=='box'}));
  const meshes=pack.shapes.filter(s=>s.kind==='mesh'),vertices=new Float32Array(meshes.reduce((n,s)=>n+s.vertices.length,0)),indices=new Uint32Array(meshes.reduce((n,s)=>n+s.indices.length,0));
  this.triangleShape=new Uint32Array(indices.length/3);let vi=0,ii=0;const primitives=[];
  pack.shapes.forEach((s,index)=>{
   if(s.kind==='mesh'){vertices.set(s.vertices,vi);for(let j=0;j<s.indices.length;j++)indices[ii+j]=s.indices[j]+vi/3;this.triangleShape.fill(index,ii/3,(ii+s.indices.length)/3);vi+=s.vertices.length;ii+=s.indices.length;}
   else {const q=new Quaternion(s.rotation?.x||0,s.rotation?.y||0,s.rotation?.z||0,s.rotation?.w??1);primitives.push({...s,position:vector(s.position),quaternion:q,inverse:q.clone().invert(),index,bounds:shapeBounds({...s,rotation:q})});}
  });
  this.geometry=new BufferGeometry();this.geometry.setAttribute('position',new BufferAttribute(vertices,3));this.geometry.setIndex(new BufferAttribute(indices,1));
  this.bvh=indices.length?new MeshBVH(this.geometry,{strategy:CENTER,indirect:true,targetLeafSize:8}):null;this.tree=tree(primitives);
  this.stats={triangles:indices.length/3,primitives:primitives.length,queries:0,triangleTests:0};
 }
 candidates(bounds,fn){const visit=node=>{if(!node||!bounds.intersectsBox(node.bounds))return;if(node.items){for(const s of node.items)if(bounds.intersectsBox(s.bounds))fn(s);}else{visit(node.left);visit(node.right);}};visit(this.tree);}
 sweep(position,displacement,radius,mask=1){
  this.stats.queries++;const p=vector(position),d=vector(displacement),distance=d.length();if(distance<1e-9)return null;
  const scale=Math.max(Math.abs(p.x)+Math.abs(d.x),Math.abs(p.y)+Math.abs(d.y),Math.abs(p.z)+Math.abs(d.z)),guard=Math.max(.000001,scale*2.3841858e-7);
  d.multiplyScalar((distance+guard)/distance);const bounds=new Box3().setFromPoints([p,p.clone().add(d)]).expandByScalar(radius),size=d.length();let best=null,bestIndex=Infinity;
  const record=(hit,index)=>{if(!hit)return;const at=hit.fraction*size;if(best&&(at>best.distance+1e-10||(Math.abs(at-best.distance)<=1e-10&&index>=bestIndex)))return;bestIndex=index;best={distance:at,point:v(hit.point.x,hit.point.y,hit.point.z),normal:v(hit.normal.x,hit.normal.y,hit.normal.z),...this.info[index]};};
  this.bvh?.shapecast({intersectsBounds:b=>b.intersectsBox(bounds),intersectsTriangle:(tri,i)=>{const index=this.triangleShape[i];if(!(this.info[index].mask&mask))return false;this.stats.triangleTests++;record(triangleSweep(p,d,radius,tri),index);return false;}});
  this.candidates(bounds,s=>{
   if(!(s.mask&mask))return;const local=p.clone().sub(s.position).applyQuaternion(s.inverse),delta=d.clone().applyQuaternion(s.inverse);let hit;
   if(s.kind==='box')hit=boxSweep(local,delta,s.half,radius);
   else {const a=new Vector3(0,-s.half.y,0),b=new Vector3(0,s.half.y,0),fraction=segmentSweep(local,delta,a,b,radius+s.radius);if(fraction<=1){const center=local.clone().addScaledVector(delta,fraction),axis=new Vector3(0,Math.max(a.y,Math.min(b.y,center.y)),0),normal=center.clone().sub(axis).normalize();hit={fraction,normal,point:axis.addScaledVector(normal,s.radius)};}}
   if(hit){hit.point.applyQuaternion(s.quaternion).add(s.position);hit.normal.applyQuaternion(s.quaternion);record(hit,s.index);}
  });return best;
 }
 overlap(position,radius,mask=1){
  const p=vector(position),bounds=new Box3(p.clone(),p.clone()).expandByScalar(radius+.0002);let best=null,bestIndex=Infinity;
  const record=(depth,normal,point,index)=>{if(depth<=1e-9||best&&(depth<best.depth-1e-10||(Math.abs(depth-best.depth)<=1e-10&&index>=bestIndex)))return;bestIndex=index;best={depth,normal:v(normal.x,normal.y,normal.z),point:v(point.x,point.y,point.z),...this.info[index]};};
  this.bvh?.shapecast({intersectsBounds:b=>b.intersectsBox(bounds),intersectsTriangle:(tri,i)=>{const index=this.triangleShape[i];if(!(this.info[index].mask&mask))return false;const point=tri.closestPointToPoint(p,new Vector3()),delta=p.clone().sub(point),distance=delta.length();if(distance>1e-12&&distance<radius)record(radius-distance,delta.multiplyScalar(1/distance),point,index);return false;}});
  this.candidates(bounds,s=>{
   if(!(s.mask&mask))return;const local=p.clone().sub(s.position).applyQuaternion(s.inverse),point=local.clone();let normal,depth;
   if(s.kind==='box'){
    point.clamp(vector(s.half).negate(),vector(s.half));normal=local.clone().sub(point);const distance=normal.length();depth=radius-distance;
    if(distance>1e-12)normal.multiplyScalar(1/distance);else{const axis=['x','y','z'].sort((a,b)=>(s.half[a]-Math.abs(local[a]))-(s.half[b]-Math.abs(local[b])))[0];normal.set(0,0,0);normal[axis]=local[axis]<0?-1:1;point[axis]=normal[axis]*s.half[axis];depth=radius+s.half[axis]-Math.abs(local[axis]);}
   }else {point.set(0,Math.max(-s.half.y,Math.min(s.half.y,local.y)),0);normal=local.clone().sub(point);depth=radius+s.radius-normal.length();normal.normalize();point.addScaledVector(normal,s.radius);}
   normal.applyQuaternion(s.quaternion);point.applyQuaternion(s.quaternion).add(s.position);record(depth,normal,point,s.index);
  });return best;
 }
 free(){this.geometry.dispose();this.bvh=null;this.tree=null;this.info=[];}
}
