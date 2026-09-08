import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const base='.local/station-detail/candidate',manifest=JSON.parse(await readFile(`${base}/manifest.json`)),proposal=JSON.parse(await readFile(`${base}/collision-proposal.json`)),layout=await readFile(`${base}/station-layout.json`),spec=JSON.parse(await readFile('web/station/exhibits/spec.json'));
assert.equal(createHash('sha256').update(layout).digest('hex'),manifest.layoutSha256);
assert.equal(new Set(proposal.panels.map(p=>p.id)).size,proposal.panels.length,'Stable unique collision IDs');
const reports=[];
for(const e of spec.exhibits){
 const bytes=await readFile(`${base}/k029-${e.id}.glb`),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');asset.scene.updateMatrixWorld(true);
 const points=[],visualTriangles=new Set(),visualFaces=[],key=v=>[v.x,v.y,v.z].map(n=>Math.round(n*1000)).join(','),bounds=new T.Box3();let triangles=0,batches=0;
 asset.scene.traverse(o=>{if(o.isMesh){batches++;const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count||p.count)/3;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);points.push(v);bounds.expandByPoint(v);}const index=o.geometry.index;for(let j=0;j<(index?.count||p.count);j+=3){const tri=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(j+k):j+k).applyMatrix4(o.matrixWorld));visualTriangles.add(tri.map(key).sort().join('|'));visualFaces.push(new T.Triangle(...tri));}}});
 // Every authoritative collision vertex must exist in the visible export to 0.2mm.
 let maxError=0;for(const p of proposal.panels.filter(p=>p.id.startsWith(`k029-${e.id}-`)))for(const v of p.vertices){const q=new T.Vector3(v.x,v.y,-v.z);const error=Math.sqrt(Math.min(...points.map(p=>p.distanceToSquared(q))));maxError=Math.max(maxError,error);assert.ok(error<.0002,`${p.id} collision vertex missing from GLB: ${error}`);}
 for(const p of proposal.panels.filter(p=>p.id.startsWith(`k029-${e.id}-`)))for(let j=0;j<p.triangles.length;j+=3){const tri=p.triangles.slice(j,j+3).map(i=>{const v=p.vertices[i];return new T.Vector3(v.x,v.y,-v.z);});if(!visualTriangles.has(tri.map(key).sort().join('|'))){const probes=[tri[0].clone().add(tri[1]).add(tri[2]).multiplyScalar(1/3),...tri.map((v,k)=>v.clone().add(tri[(k+1)%3]).multiplyScalar(.5))];for(const q of probes)assert.ok(visualFaces.some(t=>t.closestPointToPoint(q,new T.Vector3()).distanceTo(q)<.0002),`${p.id} collision face departs from visible surface`);}}
 const actualMin=[bounds.min.x,bounds.min.y,-bounds.max.z],actualMax=[bounds.max.x,bounds.max.y,-bounds.min.z];for(let i=0;i<3;i++){assert.ok(actualMin[i]>=e.origin[i]+e.bounds[0][i]-.025,`${e.id} min anchor axis ${i}`);assert.ok(actualMax[i]<=e.origin[i]+e.bounds[1][i]+.025,`${e.id} max anchor axis ${i}`);}
 reports.push({id:e.id,triangles,batches,bytes:bytes.length,maxCollisionVertexError:maxError,actualMin,actualMax});
}
await writeFile('.local/station-detail/geometry-check.json',JSON.stringify({status:'pass',layout:manifest.layoutSha256,reports},null,2));console.log(reports);
