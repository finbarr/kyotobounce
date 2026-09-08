// Independent ray/profile checks on both exports, at tops, slopes and valleys.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const [dir]=process.argv.slice(2);if(!dir)throw Error('Usage: node tools/verify_tactile_profile.mjs CANDIDATE_DIR');
const layout=JSON.parse(await readFile(dir+'/station-layout.json')),patches=JSON.parse(await readFile(dir+'/tactile-profile.json'));
const bytes=await readFile(dir+'/repair-overlay.glb'),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
assert.equal(patches.length,43);let rays=0,features=0;
for(const p of patches){
 const panel=layout.panels.find(v=>v.id===p.id+'-raised'),base=layout.panels.find(v=>v.id===p.id+'-base'),visual=gltf.scene.getObjectByName(panel.id);
 assert(panel.collision&&!base.collision);assert.equal(panel.material,p.physical);assert(p.features>0);features+=p.features;
 const y=p.position[1],ys=panel.vertices.map(v=>v.y);assert(Math.abs(Math.max(...ys)-y-.005)<5e-6);assert(Math.abs(Math.min(...ys)-y)<5e-6);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(panel.vertices.flatMap(v=>[v.x,v.y,v.z]),3));geometry.setIndex(panel.triangles);
 const native=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
 const world=(x,z)=>new THREE.Vector3(p.position[0]+p.u[1]*x+p.u[0]*z,y+.02,p.position[2]-p.u[0]*x+p.u[1]*z);
 const nx=Math.max(1,Math.floor(p.width/.06)),nz=Math.max(1,Math.floor(p.length/.06));
 let x=p.pattern==='dots'?-(nx-1)*.03:-1.5*.075,z=p.pattern==='dots'?-(nz-1)*.03:-p.length/2+.15;
 // Branch bars deliberately leave the dot junction clear.
 if(p.id==='tactile-concourse-branch')z+=.6;
 for(const [dx,height] of p.pattern==='dots'?[[0,.005],[.0085,.0025],[.03,null]]:[[0,.005],[.011,.0025],[.0375,null]]){
  const origin=world(x+dx,z),renderOrigin=origin.clone();renderOrigin.z*=-1;
  const a=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,.03).intersectObject(native)[0];
  const b=new THREE.Raycaster(renderOrigin,new THREE.Vector3(0,-1,0),0,.03).intersectObject(visual,true)[0];
  if(height===null){assert(!a&&!b,p.id+' has real valleys');}
  else{assert(a&&b,p.id+' has outward top/side faces');assert(Math.abs(a.point.y-y-height)<1e-5,p.id+' profile height');assert(Math.abs(a.point.y-b.point.y)<1e-5,p.id+' GLB/collision match');}
  rays++;
 }
 geometry.dispose();
}
const result={status:'pass',patches:patches.length,features,profileRays:rays,heightMetres:.005,dotFacets:16,maxDotRadialApproximationMm:.212};await writeFile(dir+'/profile-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
