import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import*as THREE from'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
const [baseFile,candidateDir]=process.argv.slice(2);if(!candidateDir)throw Error('Usage: node tools/verify_structural_candidate.mjs BASE CANDIDATE_DIR');
const before=JSON.parse(await readFile(baseFile)),after=JSON.parse(await readFile(candidateDir+'/station-layout.json'));
const report=JSON.parse(await readFile(candidateDir+'/candidate.json')),added=new Set(report.added),removed=new Set(report.removed);
for(const kind of ['boxes','beams','panels','flights','escalators'])assert.deepEqual(after[kind].filter(p=>!added.has(p.id)),before[kind].filter(p=>!removed.has(p.id)),`${kind}: preserve all unrelated canonical records`);
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const meshes=after.panels.filter(p=>added.has(p.id)).map(p=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.vertices.flatMap(v=>[v.x,v.y,v.z]),3));g.setIndex(p.triangles);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.name=p.id;return m;});
const bytes=await readFile(candidateDir+'/repair-overlay.glb');
// This Node audit checks actual mesh geometry; image decoding belongs to the real browser check.
const loader=new GLTFLoader();loader.register(()=>({name:'GeometryAuditMaterial',loadMaterial:()=>Promise.resolve(new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
let checks=0;const rays=[];
for(const m of meshes){
 const visual=gltf.scene.getObjectByName(m.name);assert(visual,`Matching visual ${m.name}`);
 const bounds=new THREE.Box3().setFromObject(m),visualBounds=new THREE.Box3().setFromObject(visual);
 assert(Math.abs(bounds.min.x-visualBounds.min.x)<1e-4&&Math.abs(bounds.max.x-visualBounds.max.x)<1e-4&&Math.abs(bounds.min.y-visualBounds.min.y)<1e-4&&Math.abs(bounds.max.y-visualBounds.max.y)<1e-4&&Math.abs(bounds.min.z+visualBounds.max.z)<1e-4&&Math.abs(bounds.max.z+visualBounds.min.z)<1e-4,`Visual/collision bounds agree ${m.name}`);
 // All gap-candidate surfaces are horizontal slabs. Cast matching views into
 // both exported representations on a 2 cm grid, including the leading seam.
 if(report.issue==='gaps')for(let x=bounds.min.x+.003;x<bounds.max.x;x+=.02)for(let z=bounds.min.z+.003;z<bounds.max.z;z+=.02){
  const native=new THREE.Raycaster(new THREE.Vector3(x,bounds.max.y+.1,z),new THREE.Vector3(0,-1,0)).intersectObject(m)[0];
  const rendered=new THREE.Raycaster(new THREE.Vector3(x,bounds.max.y+.1,-z),new THREE.Vector3(0,-1,0)).intersectObject(visual,true)[0];
  assert(native&&rendered,`Both exports support ${x},${z} on ${m.name}`);assert(Math.abs(native.point.y-rendered.point.y)<1e-4);checks++;
 }
 rays.push({id:m.name,bounds:{min:bounds.min,max:bounds.max}});
}
const result={status:'pass',unchangedCanonicalRecords:true,matchedMeshes:meshes.length,matchedVerticalRays:checks,surfaces:rays};await writeFile(candidateDir+'/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,matchedMeshes:result.matchedMeshes,matchedVerticalRays:result.matchedVerticalRays}));
