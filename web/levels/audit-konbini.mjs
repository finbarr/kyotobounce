// Check standalone GLB/native box agreement and doorway clearance, no base mutation.
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const dir=resolve(process.argv[2]||'.local/konbini/v1');
const records=JSON.parse(await readFile(resolve(dir,'colliders.json'),'utf8'));
const data=await readFile(resolve(dir,'konbini.glb'));
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');gltf.scene.updateMatrixWorld(true);
const boxBounds=b=>{const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-b.yaw*Math.PI/180);const size=new THREE.Vector3(b.size.x,b.size.y,b.size.z);const c=new THREE.Vector3(b.center.x,b.center.y,-b.center.z);const bounds=new THREE.Box3();for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])bounds.expandByPoint(new THREE.Vector3(x,y,z).multiply(size).applyQuaternion(q).add(c));return bounds;};
let maxError=0;
for(const b of records.boxes){let object;gltf.scene.traverse(o=>{if(o.userData.kyoto_candidate_record&&JSON.parse(o.userData.kyoto_candidate_record).id===b.id)object=o;});assert.ok(object,`Missing visible collider ${b.id}`);const actual=new THREE.Box3().setFromObject(object),expected=boxBounds(b);const error=Math.max(actual.min.distanceTo(expected.min),actual.max.distanceTo(expected.max));maxError=Math.max(maxError,error);assert.ok(error<.0001,`${b.id} mismatch ${error}`);}
// At doorway height, sampled ball centers plus radius fit between actual frame records.
const {threshold,inwardYaw,clearWidth,clearHeight}=records.doorway;
const angle=inwardYaw*Math.PI/180;const r=.0232;const right=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle)),forward=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
const native=new THREE.Vector3(threshold.x,threshold.y,threshold.z);let tested=0;
for(const u of [-clearWidth/2+r+.01,0,clearWidth/2-r-.01])for(const y of [r+.01,clearHeight/2,clearHeight-r-.01]){
 const point=native.clone().addScaledVector(right,u).add(new THREE.Vector3(0,y,0));
 for(const b of records.boxes){const p=point.clone().sub(new THREE.Vector3(b.center.x,b.center.y,b.center.z)).applyAxisAngle(new THREE.Vector3(0,1,0),-b.yaw*Math.PI/180);const closest=p.clone().clamp(new THREE.Vector3(-b.size.x/2,-b.size.y/2,-b.size.z/2),new THREE.Vector3(b.size.x/2,b.size.y/2,b.size.z/2));assert.ok(p.distanceTo(closest)>r,`Door obstructed by ${b.id}`);}tested++;
}
const report={scope:'Standalone candidate visual/collider parity; does not prove base-layout clearance or native completion',blockingMeshes:records.boxes.length,maxBoundsErrorMetres:maxError,doorwayBallSamples:tested,doorway:records.doorway,destination:records.destination};
await writeFile(resolve(dir,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
