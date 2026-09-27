import {Box3,Vector3} from 'three';

// A broad phase over immutable station meshes. Keep each mesh's own raycast
// method so BVH material sides, custom exclusions and hit metadata stay intact.
// Rebuild after changing geometry/transforms; a new station root gets a new index.
const indices=new WeakMap();
export function staticRayQueries(root){
 let index=indices.get(root);
 if(!index){index=new StaticRayQueries(root);indices.set(root,index);}
 return index;
}
export function invalidateStaticRayQueries(root){indices.delete(root);}
export class StaticRayQueries {
 constructor(root){
  root.updateWorldMatrix(true,true);
  const entries=[];
  root.traverse(object=>{
   if(!object.isMesh)return;
   if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
   const bounds=object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
   entries.push({object,bounds,order:entries.length});
  });
  const build=items=>{
   const bounds=new Box3();for(const item of items)bounds.union(item.bounds);
   if(items.length<=8)return {bounds,items};
   const size=bounds.getSize(new Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
   items.sort((a,b)=>(a.bounds.min[axis]+a.bounds.max[axis])-(b.bounds.min[axis]+b.bounds.max[axis]));
   const middle=items.length>>1;
   return {bounds,left:build(items.slice(0,middle)),right:build(items.slice(middle))};
  };
  this.root=build(entries);this.candidates=[];this.hits=[];this.point=new Vector3();
  this.stats={meshes:entries.length,queries:0,boxes:0,candidates:0};
 }
 first(raycaster,accept=null){
  const {candidates,hits,point,stats}=this;candidates.length=0;hits.length=0;stats.queries++;
  const intersects=bounds=>{
   stats.boxes++;
   if(bounds.containsPoint(raycaster.ray.origin))return true;
   return !!raycaster.ray.intersectBox(bounds,point)&&point.distanceToSquared(raycaster.ray.origin)<=raycaster.far*raycaster.far;
  };
  const visit=node=>{
   if(!intersects(node.bounds))return;
   if(node.items){for(const item of node.items)if(intersects(item.bounds)&&item.object.layers.test(raycaster.layers))candidates.push(item);}
   else{visit(node.left);visit(node.right);}
  };
  visit(this.root);
  // Preserve traversal order for equal-distance/coplanar hits.
  candidates.sort((a,b)=>a.order-b.order);stats.candidates+=candidates.length;
  for(const {object}of candidates)object.raycast(raycaster,hits);
  hits.sort((a,b)=>a.distance-b.distance);
  return (accept?hits.find(accept):hits[0])||null;
 }
}
