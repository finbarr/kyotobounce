import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
import {staticRayQueries,invalidateStaticRayQueries} from '../public/static-ray-queries.js';
const root=new Group(),material=new MeshBasicMaterial({side:DoubleSide});
let seed=712;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let i=0;i<120;i++){
 const geometry=new BoxGeometry(1+random()*5,.2+random()*3,1+random()*5);computeBoundsTree.call(geometry);
 const mesh=new Mesh(geometry,material);mesh.raycast=acceleratedRaycast;
 mesh.position.set((random()-.5)*40,(random()-.5)*10,(random()-.5)*40);mesh.rotation.set(random(),random(),random());mesh.scale.set(.5+random(),.5+random(),.5+random());
 if(i%9===0)mesh.layers.set(2);if(i%13===0)mesh.raycast=()=>{};
 root.add(mesh);
}
root.updateMatrixWorld(true);
const ray=new Raycaster();ray.firstHitOnly=true;ray.far=35;
const normal=new Vector3(),support=h=>h.face&&normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y>.45;
function compare(index,predicate=()=>true){
 const expected=ray.intersectObject(root,true).find(predicate)||null,actual=index.first(ray,predicate);
 assert.equal(actual?.object,expected?.object,'Same supporting/nearest mesh');
 if(expected){assert.ok(actual.point.distanceTo(expected.point)<1e-6);assert.equal(actual.faceIndex,expected.faceIndex);assert.ok(Math.abs(actual.distance-expected.distance)<1e-6);}
}
const index=staticRayQueries(root);
for(let i=0;i<1500;i++){
 ray.ray.origin.set((random()-.5)*50,random()*15,(random()-.5)*50);
 ray.ray.direction.set(random()-.5,-random(),random()-.5).normalize();ray.near=i%3;ray.far=5+i%30;
 compare(index);compare(index,support);
}
assert.ok(index.stats.candidates/index.stats.queries<index.stats.meshes/4,'Broad phase rejects most meshes');
root.position.x+=10;root.updateMatrixWorld(true);invalidateStaticRayQueries(root);
assert.notEqual(staticRayQueries(root),index);compare(staticRayQueries(root));
// A steep nearer face must not mask a separate horizontal supporting surface.
const stacked=new Group();
for(const [height,tilt]of [[0,0],[2,1.2]]){const mesh=new Mesh(new BoxGeometry(8,.2,8),material);mesh.position.y=height;mesh.rotation.z=tilt;computeBoundsTree.call(mesh.geometry);mesh.raycast=acceleratedRaycast;stacked.add(mesh);}
stacked.updateMatrixWorld(true);ray.near=0;ray.far=20;ray.ray.origin.set(0,10,0);ray.ray.direction.set(0,-1,0);
const expected=ray.intersectObject(stacked,true).find(support),actual=staticRayQueries(stacked).first(ray,support);
assert.equal(actual.object,expected.object);assert.equal(actual.object,stacked.children[0]);
console.log('PASS 3000 static station queries: nearest hits, support filtering, sides, layers, exclusions, transforms, finite ranges and invalidation');
