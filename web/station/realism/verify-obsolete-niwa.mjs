// Verify the complete native delta and every retained browser primitive/index.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(basePath),next=await read(component+'/station/assets.json'),spec=await read(component+'/spec.json'),audit=await read(component+'/removal-audit.json'),source=await read(component+'/source-installation.json');
assert.equal(spec.componentPrefix,'obsolete-niwa-');
const oldRaw=await readFile(base.layout),raw=await readFile(next.layout);
assert.equal(sha(oldRaw),base.layoutSha256);assert.equal(sha(raw),next.layoutSha256);
const expected=JSON.parse(oldRaw),layout=JSON.parse(raw);
for(const group of ['panels','boxes','routes','authoredLights']){
 assert.deepEqual(expected[group].filter(p=>p.id.startsWith('add-niwa-')).map(p=>p.id),spec.retired[group]);
 expected[group]=expected[group].filter(p=>!p.id.startsWith('add-niwa-'));
}
expected.concourseDetails.labels=expected.concourseDetails.labels.filter(p=>!p.id.startsWith('add-niwa-'));
assert.deepEqual(layout,expected);
const oldGeometry=await readFile(base.geometry);assert.equal(sha(oldGeometry),base.geometrySha256);
const before=readGLB(oldGeometry),newBytes=await readFile(next.geometry),after=readGLB(newBytes);
assert.equal(sha(newBytes),next.geometrySha256);assert(after.bin.subarray(0,before.bin.length).equals(before.bin));
await MeshoptDecoder.ready;
function indices(g,index){
 const a=g.json.accessors[index],v=g.json.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,bytes={5123:2,5125:4}[a.componentType];
 assert(a.type==='SCALAR'&&bytes&&!a.sparse);
 let b=g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
 if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,g.bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
 return Array.from({length:a.count},(_,i)=>b[bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||bytes)));
}
const j=structuredClone(before.json),empty=new Set();let triangles=0;
for(const change of audit.changes){
 const p=j.meshes[change.mesh].primitives[change.primitive];assert.equal(p.indices,change.oldIndices);
 assert(change.removed.every(r=>r.id.startsWith('add-niwa-')));
 const removed=new Set(change.removed.map(r=>r.face));assert.equal(removed.size,change.removed.length);
 const keep=indices(before,p.indices).filter((_,i)=>!removed.has(Math.floor(i/3)));
 if(change.newIndices===null){assert.equal(keep.length,0);empty.add(p);}else{assert.deepEqual(indices(after,change.newIndices),keep);p.indices=change.newIndices;}
 triangles+=removed.size;
}
const meshes=new Map();j.meshes=j.meshes.filter((m,i)=>{m.primitives=m.primitives.filter(p=>!empty.has(p));if(!m.primitives.length)return false;meshes.set(i,meshes.size);return true;});
const nodes=new Map();j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshes.has(n.mesh)){assert(!n.children?.length);return false;}nodes.set(i,nodes.size);return true;});
for(const n of j.nodes){if(n.mesh!==undefined)n.mesh=meshes.get(n.mesh);if(n.children)n.children=n.children.filter(i=>nodes.has(i)).map(i=>nodes.get(i));}for(const scene of j.scenes)scene.nodes=scene.nodes.filter(i=>nodes.has(i)).map(i=>nodes.get(i));
assert.deepEqual(after.json.accessors.slice(0,before.json.accessors.length),before.json.accessors);assert.deepEqual(after.json.bufferViews.slice(0,before.json.bufferViews.length),before.json.bufferViews);
j.accessors=after.json.accessors;j.bufferViews=after.json.bufferViews;j.buffers=after.json.buffers;assert.deepEqual(after.json,j);
// Source faces missing from the old export must not hide residual fragments,
// including fragments with a different material or a beveled normal.
const surfaces=await read(component+'/retired-surfaces.json');
assert.deepEqual(Object.keys(spec.browserSourceAreaGaps),['add-niwa-header','add-niwa-rear','add-niwa-window--1','add-niwa-window-1']);
const bounds=Object.keys(spec.browserSourceAreaGaps).map(id=>{
 const ss=surfaces.filter(s=>s.id===id);assert(ss.length);
 const coverage=audit.coverage.find(c=>c.id===id);assert(Math.abs(coverage.sourceArea-coverage.browserArea-spec.browserSourceAreaGaps[id])<.000002);
 return {id,axes:[0,1,2].map(k=>[Math.min(...ss.flatMap(s=>s.points.map(v=>v[k])))-.001,Math.max(...ss.flatMap(s=>s.points.map(v=>v[k])))+.001])};
});
const positions=new Map();
for(const mesh of after.json.meshes)for(const p of mesh.primitives){
 let vs=positions.get(p.attributes.POSITION);
 if(!vs){const a=after.json.accessors[p.attributes.POSITION],v=after.json.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression;assert(a.type==='VEC3'&&a.componentType===5126&&!a.sparse);
  let b=after.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
  if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,after.bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
  vs=Array.from({length:a.count},(_,i)=>[0,1,2].map(k=>b.readFloatLE((a.byteOffset||0)+i*(v.byteStride||12)+k*4)));positions.set(p.attributes.POSITION,vs);
 }
 const ix=indices(after,p.indices);
 for(let i=0;i<ix.length;i+=3)for(const box of bounds)assert(!ix.slice(i,i+3).every(k=>vs[k].every((n,a)=>n>=box.axes[a][0]&&n<=box.axes[a][1])),'Remaining obsolete object fragment '+box.id);
}
assert(source.pass&&source.retainedNearbyGeometryUVsNormalsExact&&source.retainedBindingsMatch);assert.equal(source.layoutSha256,next.layoutSha256);assert.equal(sha(await readFile(next.sourceScene)),source.sourceSha256);
const station=await read(next.station),oldStation=await read(base.station);
assert.deepEqual(station,{...oldStation,layoutSha256:next.layoutSha256,concourseDetails:layout.concourseDetails,authoredLights:layout.authoredLights});
const detail=await read(next.detail),oldDetail=await read(base.detail);assert.deepEqual(detail,{...oldDetail,candidateMotionIntegration:{...oldDetail.candidateMotionIntegration,layoutSha256:next.layoutSha256}});
assert.equal(next.hardwareSha256,base.hardwareSha256);assert.equal(sha(await readFile(next.hardware)),base.hardwareSha256);
const proof={pass:true,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256,sourceSha256:source.sourceSha256,removedPanels:spec.retired.panels.length,removedBoxes:spec.retired.boxes.length,removedBrowserTriangles:triangles,allOtherNativeRecordsExact:true,retainedBrowserAttributesExact:true,movingHardwareExact:true,legacySourceGapsM2:spec.browserSourceAreaGaps,noResidualObjectFragments:true};
await writeFile(component+'/geometry-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
