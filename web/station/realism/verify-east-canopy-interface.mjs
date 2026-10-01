// Check the serialized repair against the parent, independently of source editing.
import assert from 'node:assert/strict';
import {appendJunction} from './append-canopy-junction.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(basePath),next=await read(component+'/station/assets.json'),spec=await read(component+'/spec.json'),audit=await read(component+'/removal-audit.json'),installed=await read(component+'/source-installation.json');
const oldRaw=await readFile(base.layout),newRaw=await readFile(next.layout);assert.equal(sha(oldRaw),base.layoutSha256);assert.equal(sha(newRaw),next.layoutSha256);assert.equal(installed.layoutSha256,next.layoutSha256);
const old=JSON.parse(oldRaw),layout=JSON.parse(newRaw),expected=structuredClone(old);
for(const cut of spec.panelCuts){const p=expected.panels.find(p=>p.id===cut.id),removed=new Set(cut.faces.map(f=>f.index));p.triangles=p.triangles.filter((_,i)=>!removed.has(Math.floor(i/3)));p.finishes[0].triangles=p.triangles;}
expected.beams=expected.beams.filter(b=>!spec.retiredBeams.includes(b.id));expected.boxes=expected.boxes.filter(b=>!spec.retiredBoxes.includes(b.id));let addedPanels=0;if(spec.addedPanelsSha256){const bytes=await readFile(component+'/native-panels.json');assert.equal(sha(bytes),spec.addedPanelsSha256);const panels=JSON.parse(bytes).panels;expected.panels.push(...panels);addedPanels=panels.length;assert.equal(installed.addedPanels,addedPanels);assert(installed.addedGeometryNormalsExact);}assert.deepEqual(layout,expected);
const removedFaces=spec.panelCuts.reduce((n,p)=>n+p.faces.length,0);assert.equal(removedFaces,spec.addedPanelsSha256?35:278);assert.equal(spec.retiredBeams.length,spec.addedPanelsSha256?0:45);assert.equal(spec.retiredBoxes.length,spec.addedPanelsSha256?0:9);
let maximumBoundaryErrorM=0;
if(addedPanels){
 const roof=layout.panels.find(p=>p.id==='east-canopy-junction-roof-glazing');
 for(const v of [...spec.westProfile,...spec.eastProfile]){
  const error=Math.min(...roof.vertices.map(p=>Math.hypot(v[0]-p.x,v[1]-p.y,v[2]+p.z)));
  maximumBoundaryErrorM=Math.max(maximumBoundaryErrorM,error);
 }
 assert(maximumBoundaryErrorM<1e-5,'Junction must meet both retained roof boundaries');
 assert.equal(spec.opening.north-spec.opening.south,3);
 assert(spec.opening.head-spec.opening.floor>3.2);
}
const oldBytes=await readFile(base.geometry),newBytes=await readFile(next.geometry);assert.equal(sha(oldBytes),base.geometrySha256);assert.equal(sha(newBytes),next.geometrySha256);const before=readGLB(oldBytes),after=readGLB(newBytes);assert(after.bin.subarray(0,before.bin.length).equals(before.bin));await MeshoptDecoder.ready;
function indices(g,index){const a=g.json.accessors[index],v=g.json.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,bytes={5123:2,5125:4}[a.componentType];assert(a.type==='SCALAR'&&bytes&&!a.sparse);let b=g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,g.bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}return Array.from({length:a.count},(_,i)=>b[bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||bytes)));}
const expectedJson=structuredClone(before.json),empty=new Set();let removedTriangles=0;
for(const change of audit.changes){const p=expectedJson.meshes[change.mesh].primitives[change.primitive];assert.equal(p.indices,change.oldIndices);const removed=new Set(change.removed.map(r=>r.face));assert.equal(removed.size,change.removed.length);const kept=indices(before,p.indices).filter((_,i)=>!removed.has(Math.floor(i/3)));if(change.newIndices===null){assert.equal(kept.length,0);empty.add(p);}else{assert.deepEqual(indices(after,change.newIndices),kept);p.indices=change.newIndices;}removedTriangles+=removed.size;}
const meshes=new Map();expectedJson.meshes=expectedJson.meshes.filter((m,i)=>{m.primitives=m.primitives.filter(p=>!empty.has(p));if(!m.primitives.length)return false;meshes.set(i,meshes.size);return true;});
const nodes=new Map();expectedJson.nodes=expectedJson.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshes.has(n.mesh)){assert(!n.children?.length);return false;}nodes.set(i,nodes.size);return true;});
for(const n of expectedJson.nodes){if(n.mesh!==undefined)n.mesh=meshes.get(n.mesh);if(n.children)n.children=n.children.filter(i=>nodes.has(i)).map(i=>nodes.get(i));}for(const scene of expectedJson.scenes)scene.nodes=scene.nodes.filter(i=>nodes.has(i)).map(i=>nodes.get(i));
assert.deepEqual(after.json.accessors.slice(0,before.json.accessors.length),before.json.accessors);assert.deepEqual(after.json.bufferViews.slice(0,before.json.bufferViews.length),before.json.bufferViews);
if(spec.componentGlbSha256){const report=await read(component+'/report.json'),proof=await read(component+'/browser-removal.json'),bytes=await readFile(component+'/'+report.outputs.glbFile);assert.equal(sha(bytes),spec.componentGlbSha256);const part=readGLB(bytes);expectedJson.accessors=after.json.accessors.slice(0,after.json.accessors.length-part.json.accessors.length);expectedJson.bufferViews=after.json.bufferViews.slice(0,after.json.bufferViews.length-part.json.bufferViews.length);const body=appendJunction(expectedJson,part,proof.additionOffset);assert(after.bin.subarray(proof.additionOffset,proof.additionOffset+body.length).equals(body));assert.deepEqual(expectedJson.accessors,after.json.accessors);assert.deepEqual(expectedJson.bufferViews,after.json.bufferViews);}
expectedJson.accessors=after.json.accessors;expectedJson.bufferViews=after.json.bufferViews;expectedJson.buffers=after.json.buffers;assert.deepEqual(after.json,expectedJson);
assert(installed.savedGeometryUVsExact&&installed.savedAuthoredNormalsExact&&installed.retainedBindingsMatch);assert.equal(sha(await readFile(next.sourceScene)),installed.sourceSha256);
const station=await read(next.station),oldStation=await read(base.station);assert.equal(station.layoutSha256,next.layoutSha256);assert.deepEqual({...station,layoutSha256:oldStation.layoutSha256},oldStation);
const detail=await read(next.detail),oldDetail=await read(base.detail);assert.equal(detail.candidateMotionIntegration.layoutSha256,next.layoutSha256);assert.deepEqual({...detail,candidateMotionIntegration:oldDetail.candidateMotionIntegration},oldDetail);
assert.equal(next.hardwareSha256,base.hardwareSha256);assert.equal(sha(await readFile(next.hardware)),base.hardwareSha256);
const report={pass:true,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,sourceSha256:installed.sourceSha256,addedPanels,maximumBoundaryErrorM,removedPanelFaces:removedFaces,removedBeams:spec.retiredBeams.length,removedBoxes:spec.retiredBoxes.length,removedBrowserTriangles:removedTriangles,allOtherNativeRecordsExact:true,retainedBrowserAttributesExact:true,movingHardwareExact:true};await writeFile(component+'/geometry-proof.json',JSON.stringify(report,null,2)+'\n');console.log(report);
