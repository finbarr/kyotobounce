import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial,DoubleSide,PerspectiveCamera,OrthographicCamera,Vector3,Vector4,Raycaster,PointLight,InstancedMesh} from 'three';
import {staticRenderCulling} from '../public/static-render-culling.js';
import {freezeStaticTransforms} from '../public/static-transforms.js';
import {staticRayQueries} from '../public/static-ray-queries.js';

const root=new Group(),geometry=new BoxGeometry(2,3,4),material=new MeshBasicMaterial({side:DoubleSide}),meshes=[];
root.position.set(3,2,-7);root.rotation.y=.3;root.scale.set(1.2,.9,1.1);root.renderOrder=7;
for(let z=0;z<12;z++)for(let x=0;x<12;x++){
 const mesh=new Mesh(geometry,material);mesh.position.set(x*8-44,(x+z)%4,z*8-44);mesh.rotation.y=x*.2;
 // Preserve explicitly hidden originals and authored nested render groups.
 mesh.visible=(x+z)%13!==0;
 if(x%5===0){const group=new Group();group.renderOrder=3;group.add(mesh);root.add(group);}else root.add(mesh);
 meshes.push(mesh);
}
const unculled=new Mesh(geometry,material);unculled.frustumCulled=false;root.add(unculled);
const instances=new InstancedMesh(geometry,material,1);root.add(instances);
const light=new PointLight();root.add(light);
root.updateMatrixWorld(true);
const groupOrder=mesh=>{for(let o=mesh.parent;o;o=o.parent)if(o.isGroup)return o.renderOrder;return 0;};
const originals=meshes.map(mesh=>({matrix:mesh.matrixWorld.clone(),geometry:mesh.geometry,material:mesh.material,visible:mesh.visible,order:groupOrder(mesh)}));
const queries=staticRayQueries(root),origin=meshes[70].getWorldPosition(new Vector3()).add(new Vector3(0,80,0));
const ray=new Raycaster(origin,new Vector3(0,-1,0),0,200);
const hit=queries.first(ray);
assert.ok(hit,'The query fixture actually hits architecture');
const culling=staticRenderCulling([root]);freezeStaticTransforms(root);
assert.equal(culling.stats.objects,meshes.length);
assert.equal(unculled.parent,root);assert.equal(instances.parent,root);assert.equal(light.parent,root);
for(const [i,mesh]of meshes.entries()){
 const original=originals[i];assert.deepEqual(mesh.matrixWorld,original.matrix);assert.equal(mesh.geometry,original.geometry);assert.equal(mesh.material,original.material);assert.equal(groupOrder(mesh),original.order);
}
const ancestorsVisible=mesh=>{for(let o=mesh.parent;o;o=o.parent)if(!o.visible)return false;return true;};
const perspective=new PerspectiveCamera(55,1.6,.035,350),orthographic=new OrthographicCamera(-25,25,25,-25,.1,350);
let visibleSamples=0,rejected=0;
// Transform actual vertices into clip space, independently of the culler's
// world boxes. Every in-view vertex must retain a visible ancestry, including
// camera returns, narrow views, a transformed root and orthographic views.
for(const camera of [perspective,orthographic])for(let i=0;i<80;i++){
 const angle=i*.43;camera.position.set(Math.cos(angle)*75,5+i%7*6,Math.sin(angle)*75);camera.lookAt(i%3*10-10,2,i%5*8-16);
 culling.update(camera);rejected=Math.max(rejected,culling.stats.skippedObjects);
 for(const [n,mesh]of meshes.entries()){
  assert.equal(mesh.visible,originals[n].visible);
  for(let v=0;v<geometry.attributes.position.count;v++){
   const p=new Vector3().fromBufferAttribute(geometry.attributes.position,v).applyMatrix4(mesh.matrixWorld);
   const clip=new Vector4(p.x,p.y,p.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
   if(clip.w>0&&Math.abs(clip.x)<=clip.w&&Math.abs(clip.y)<=clip.w&&Math.abs(clip.z)<=clip.w){assert.ok(ancestorsVisible(mesh),'An in-view vertex cannot disappear');visibleSamples++;}
  }
 }
}
assert.ok(visibleSamples>10000);assert.ok(rejected>0,'Mixed views reject some branches while retaining visible vertices');
perspective.position.set(5000,5000,5000);perspective.lookAt(6000,5000,5000);culling.update(perspective);
assert.equal(culling.stats.skippedObjects,meshes.length);
assert.equal(queries.first(ray)?.object,hit?.object,'Offscreen architecture still supports aim and contact-shadow rays');
culling.update(perspective,{shadowUpdate:true});assert.ok(meshes.every(ancestorsVisible),'Offscreen shadow casters restored');
culling.update(perspective);culling.showAll();assert.ok(meshes.every(ancestorsVisible));
for(const [i,mesh]of meshes.entries())assert.equal(mesh.visible,originals[i].visible);
console.log(`PASS static render culling: ${visibleSamples} visible vertex samples, camera return, transforms, render groups, original visibility, dynamic exclusions, rays and shadow refresh`);
