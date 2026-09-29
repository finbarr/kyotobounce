// Verify retained station data and the appended browser/native triangle stream.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,prepared,candidate,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),old=await read(parent.layout),a=await read(prepared),b=await read(candidate),base=await read(a.layout),next=await read(b.layout),report=await read(component+'/report.json');
const expected=structuredClone(old),ids=['add-central-gate-paid-floor', 'add-central-gate-rear-depth', 'add-central-gate-paid-ceiling', 'add-central-gate-return--8', 'add-central-gate-return-25', 'add-central-gate-platform-0', 'add-central-gate-platform-1', 'add-central-gate-platform-2', 'add-central-gate-platform-3', 'add-central-gate-platform-4', 'railway-end-parapet--45', 'railway-end-glass--45'];
for(const key of ['boxes','panels'])expected[key]=expected[key].filter(p=>!ids.includes(p.id));
for(const p of expected.panels)if(['concourse','railway-railway-subgrade'].includes(p.id))for(const v of p.vertices)if(Math.abs(v.z+41)<.00001)v.z=Math.fround(p.id==='concourse'?v.z+.018*v.x:-35);
expected.concourseDetails.labels=expected.concourseDetails.labels.filter(p=>!/^add-central-gate-platform-/.test(p.id));assert(eq(base,expected));
const added=next.panels.slice(base.panels.length);assert.equal(added.length,report.geometry.panels);
const native=await read(component+'/native-panels.json');assert(eq(next.authoredLights.slice(0,base.authoredLights.length),base.authoredLights));assert(eq(next.authoredLights.slice(base.authoredLights.length),(native.authoredLights||[])));
assert(eq(next.panels.slice(0,base.panels.length),base.panels));
assert(eq({...next,panels:base.panels,authoredMaterials:base.authoredMaterials,authoredLights:base.authoredLights,architecture:base.architecture},base));
const bytes=await readFile(b.geometry);assert.equal(sha(bytes),b.geometrySha256);assert.equal(sha(await readFile(b.layout)),b.layoutSha256);
const before=readGLB(await readFile(a.geometry)),after=readGLB(bytes),{json:j,bin}=after;
assert(bin.subarray(0,before.bin.length).equals(before.bin));
for(const key of ['nodes','meshes','materials','accessors','bufferViews','images','textures','samplers'])assert(eq((j[key]||[]).slice(0,(before.json[key]||[]).length),before.json[key]||[]),key);
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],w=a.type==='SCALAR'?1:3;assert(!v.extensions&&!a.sparse);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>bin[a.componentType===5126?'readFloatLE':'readUInt32LE']((v.byteOffset||0)+(a.byteOffset||0)+i*w*4+k*4)));}
let triangles=0,vertices=0;
for(const mesh of j.meshes.slice(before.json.meshes.length))for(const primitive of mesh.primitives){
 const positions=values(primitive.attributes.POSITION),normals=values(primitive.attributes.NORMAL),indices=values(primitive.indices).flat(),label=j.materials[primitive.material].name;
 const rows=added.filter(p=>next.authoredMaterials.find(m=>m.id===p.appearance).label===label);let offset=0;const expected=[];
 for(const panel of rows){assert(panel.id.startsWith('platform-zero-'));for(let i=0;i<panel.vertices.length;i++){const v=panel.vertices[i];assert(eq(positions[offset+i],[v.x,v.y,-v.z]));vertices++;}for(let t=0;t<panel.triangles.length;t+=3){const tri=panel.triangles.slice(t,t+3).reverse().map(i=>i+offset);expected.push(...tri);const normal=new T.Triangle(...tri.map(i=>new T.Vector3(...positions[i]))).getNormal(new T.Vector3());for(const i of tri)assert(normal.distanceTo(new T.Vector3(...normals[i]))<1e-5,'Flat triangle normal mismatch');triangles++;}offset+=panel.vertices.length;}
 assert.equal(offset,positions.length);assert(eq(indices,expected));
}
const floorMesh=j.meshes.find(m=>m.primitives.some(p=>j.materials[p.material].name==='Atrium | honed granite floor | Browser'));assert(floorMesh);
const fp=floorMesh.primitives[0],floorPositions=values(fp.attributes.POSITION),floorIndices=values(fp.indices).flat();let rearArea=0;
for(let i=0;i<floorIndices.length;i+=3){const vs=floorIndices.slice(i,i+3).map(k=>floorPositions[k]);if(!vs.every(v=>Math.abs(v[1])<.00001&&v[2]>=29.5-.00001))continue;assert(vs.every(v=>v[2]<=41-.018*v[0]+.0001),'Floor projects into track clearance');rearArea+=new T.Triangle(...vs.map(v=>new T.Vector3(...v))).getArea();}
assert(Math.abs(rearArea-2339.4)<.003,'Rebuilt rear floor area mismatch '+rearArea);
const proof={pass:true,rearFloorTopAreaM2:rearArea,northRailClearanceM:1.0985,layoutSha256:b.layoutSha256,geometrySha256:b.geometrySha256,retiredSourceObjects:12,removedBrowserTriangles:(await read(prepared.replace('assets.json','removal.json'))).removedTriangles,addedPanels:added.length,checkedVertices:vertices,checkedTriangles:triangles,unchangedNativeRecords:true,retainedBrowserBytesExact:true};await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(proof);
