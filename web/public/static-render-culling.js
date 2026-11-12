import {Box3,Frustum,Matrix4,Object3D,Vector3,WebGLCoordinateSystem} from 'three';

// Only immutable architecture belongs here. Identity containers let Three
// reject an entire offscreen branch before visiting its individual meshes.
// Keep the original objects, geometry, materials and visibility flags intact.
export function staticRenderCulling(roots){
 const trees=[],containers=[],frustum=new Frustum(),projection=new Matrix4();
 const stats={objects:0,groups:0,tested:0,culled:0,skippedObjects:0};
 for(const root of roots){
  root.updateWorldMatrix(true,true);
  const entries=[];
  for(const object of [...root.children]){
   let safe=true,meshes=0;const bounds=new Box3();
   object.traverse(child=>{
    if(child.isSkinnedMesh||child.isInstancedMesh||child.isLOD||child.isLight||child.isCamera||child.isSprite||child.isLine||child.isPoints||!child.frustumCulled)safe=false;
    if(!child.isMesh)return;
    if(Object.keys(child.geometry.morphAttributes).length)safe=false;
    if(!child.geometry.boundingBox)child.geometry.computeBoundingBox();
    bounds.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld));meshes++;
   });
   if(safe&&meshes&&!bounds.isEmpty())entries.push({object,bounds,meshes});
  }
  if(entries.length<=8)continue;
  const build=items=>{
   const bounds=new Box3();let meshes=0;
   for(const item of items){bounds.union(item.bounds);meshes+=item.meshes;}
   // Object3D, not Group: a Group would reset inherited renderOrder.
   const object=new Object3D();object.name='Static render branch';containers.push(object);
   const node={object,bounds:bounds.clone().expandByScalar(.0001),meshes};
   if(items.length<=8){for(const item of items)object.add(item.object);}
   else{
    const size=bounds.getSize(new Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
    items.sort((a,b)=>(a.bounds.min[axis]+a.bounds.max[axis])-(b.bounds.min[axis]+b.bounds.max[axis]));
    const middle=items.length>>1;
    node.children=[build(items.slice(0,middle)),build(items.slice(middle))];
    for(const child of node.children)object.add(child.object);
   }
   return node;
  };
  const tree=build(entries);root.add(tree.object);trees.push(tree);stats.objects+=tree.meshes;
 }
 stats.groups=containers.length;
 function showAll(){for(const object of containers)object.visible=true;stats.tested=stats.culled=stats.skippedObjects=0;}
 function update(camera,{shadowUpdate=false}={}){
  // Shadow passes can need casters outside the view. The game normally uses
  // its captured static shadow map; expose all architecture if it is refreshed.
  if(shadowUpdate){showAll();return;}
  camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projection,WebGLCoordinateSystem,camera.reversedDepth);
  stats.tested=stats.culled=stats.skippedObjects=0;
  const visit=node=>{
   stats.tested++;node.object.visible=frustum.intersectsBox(node.bounds);
   if(!node.object.visible){stats.culled++;stats.skippedObjects+=node.meshes;return;}
   if(node.children)for(const child of node.children)visit(child);
  };
  for(const tree of trees)visit(tree);
 }
 return {update,showAll,stats};
}
