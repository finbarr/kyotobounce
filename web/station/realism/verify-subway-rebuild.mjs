// Component preflight only: prove browser/native agreement and prepare an isolated worker layout.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const report=await read(out+'/report.json'),raw=await readFile(out+'/native-panels.json'),native=JSON.parse(raw);
const glb=await readFile(out+'/'+report.outputs.glbFile),{json:j,bin}=readGLB(glb),motionBytes=await readFile(out+'/motion.json'),motion=JSON.parse(motionBytes);
assert.equal(sha(raw),report.outputs.nativePanelsSha256);assert.equal(sha(glb),report.outputs.glbSha256);
assert.equal(sha(motionBytes),report.motion.sha256);assert.equal(sha(await readFile(out+'/spec.json')),report.specSha256);
assert(j.nodes.every(n=>!n.matrix&&!n.translation&&!n.rotation&&!n.scale));
const values=ai=>{const a=j.accessors[ai],v=j.bufferViews[a.bufferView],w=a.type==='SCALAR'?1:3;assert(!a.sparse&&!v.extensions&&!v.byteStride);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>bin[a.componentType===5126?'readFloatLE':'readUInt32LE']((v.byteOffset||0)+(a.byteOffset||0)+(i*w+k)*4)));};
let vertices=0,triangles=0;
for(const mesh of j.meshes)for(const p of mesh.primitives){
 const positions=values(p.attributes.POSITION),normals=values(p.attributes.NORMAL),indices=values(p.indices).flat(),expected=[];
 let offset=0;
 for(const row of native.panels.filter(row=>row.browserMaterial===p.material)){
  for(const [i,v]of row.vertices.entries())assert.deepEqual(positions[offset+i],[Math.fround(v.x),Math.fround(v.y),-Math.fround(v.z)]);
  for(let i=0;i<row.triangles.length;i+=3){
   const ids=row.triangles.slice(i,i+3).reverse().map(v=>v+offset);expected.push(...ids);
   const normal=new T.Triangle(...ids.map(i=>new T.Vector3(...positions[i]))).getNormal(new T.Vector3());
   for(const ix of ids)assert(normal.distanceTo(new T.Vector3(...normals[ix]))<1e-5,row.id+' flat normal');
   triangles++;
  }
  offset+=row.vertices.length;
 }
 assert.equal(offset,positions.length);assert.deepEqual(indices,expected);vertices+=offset;
}
assert.equal(triangles,report.geometry.triangles);assert.equal(new Set(native.panels.map(p=>p.id)).size,native.panels.length);
const materials=j.materials.map((m,i)=>{const color=m.pbrMetallicRoughness.baseColorFactor;return{id:'refit-material-'+i,label:m.name,physical:'stone',linearColor:Object.fromEntries(['r','g','b','a'].map((k,i)=>[k,color[i]])),roughness:m.pbrMetallicRoughness.roughnessFactor,metallic:m.pbrMetallicRoughness.metallicFactor,alpha:color[3]};});
for(const lift of motion.lifts)for(const part of lift.parts){const m=materials.find(m=>m.label===part.appearance);assert(m,part.appearance);part.appearance=m.id;}
const layout={schemaVersion:2,status:'Isolated component preflight; incomplete whole-station replacement',units:'metres',axes:'X east, Y up, Z north',
 spawn:report.geometry.spawn,boxes:[],beams:[],flights:[],routes:[],cameras:[],inspectionCameras:[],
 panels:native.panels.map(({browserMaterial,...p})=>({...p,appearance:materials[browserMaterial].id,vertices:p.vertices.map(v=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,Math.fround(n)])))})),
 authoredMaterials:materials,authoredLights:native.authoredLights,escalators:motion.escalators,lifts:motion.lifts,limitations:report.limits};
const bytes=JSON.stringify(layout)+'\n';await writeFile(out+'/isolated-layout.json',bytes);
await writeFile(out+'/component-geometry-proof.json',JSON.stringify({pass:true,scope:'Component triangles and motion definitions; runtime and full-station integration checked separately',nativePanelsSha256:sha(raw),glbSha256:sha(glb),motionSha256:sha(motionBytes),specSha256:report.specSha256,isolatedLayoutSha256:sha(bytes),vertices,triangles,panels:native.panels.length},null,2)+'\n');
console.log({panels:native.panels.length,vertices,triangles,lifts:layout.lifts.length,escalators:layout.escalators.length});
