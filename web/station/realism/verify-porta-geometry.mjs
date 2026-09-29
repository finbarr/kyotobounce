// Verify retained station data and the appended browser/native triangle stream.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,prepared,candidate,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),old=await read(parent.layout),a=await read(prepared),b=await read(candidate),base=await read(a.layout),next=await read(b.layout),report=await read(component+'/report.json');
const retiredIds=report.geometry.retiredIds,prefix=report.componentPrefix||'porta-connection-';
assert(eq(base.panels,old.panels.filter(p=>!retiredIds.includes(p.id))));assert(eq({...base,panels:old.panels},old));
const added=next.panels.slice(base.panels.length);assert.equal(added.length,report.geometry.panels);
const native=await read(component+'/native-panels.json');assert(eq(next.authoredLights.slice(0,base.authoredLights.length),base.authoredLights));assert(eq(next.authoredLights.slice(base.authoredLights.length),native.authoredLights));
assert(eq(next.panels.slice(0,base.panels.length),base.panels));
assert(eq({...next,panels:base.panels,authoredMaterials:base.authoredMaterials,authoredLights:base.authoredLights,architecture:base.architecture,escalators:base.escalators},base));
const motion=await read(component+'/motion.json');assert(eq(next.escalators,[...base.escalators,...motion.escalators]));assert(eq((await read(b.station)).escalators,next.escalators));assert.equal((await read(b.detail)).candidateMotionIntegration.layoutSha256,b.layoutSha256);
const bytes=await readFile(b.geometry);assert.equal(sha(bytes),b.geometrySha256);assert.equal(sha(await readFile(b.layout)),b.layoutSha256);
const before=readGLB(await readFile(a.geometry)),after=readGLB(bytes),{json:j,bin}=after;
assert(bin.subarray(0,before.bin.length).equals(before.bin));
for(const key of ['nodes','meshes','materials','accessors','bufferViews','images','textures','samplers'])assert(eq((j[key]||[]).slice(0,(before.json[key]||[]).length),before.json[key]||[]),key);
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],w=a.type==='SCALAR'?1:a.type==='VEC2'?2:3;assert(!v.extensions&&!a.sparse);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>bin[a.componentType===5126?'readFloatLE':'readUInt32LE']((v.byteOffset||0)+(a.byteOffset||0)+i*w*4+k*4)));}
let triangles=0,vertices=0;
for(const mesh of j.meshes.slice(before.json.meshes.length))for(const primitive of mesh.primitives){
 const positions=values(primitive.attributes.POSITION),normals=values(primitive.attributes.NORMAL),uv=primitive.attributes.TEXCOORD_0===undefined?null:values(primitive.attributes.TEXCOORD_0),indices=values(primitive.indices).flat(),label=j.materials[primitive.material].name;
 const rows=added.filter(p=>next.authoredMaterials.find(m=>m.id===p.appearance).label===label);let offset=0;const expected=[];
 for(const panel of rows){assert(panel.id.startsWith(prefix));for(let i=0;i<panel.vertices.length;i++){const v=panel.vertices[i];assert(positions[offset+i].every((n,k)=>n===[v.x,v.y,-v.z][k]),panel.id+' browser/native vertex '+i);if(panel.uv){assert(uv);assert(Math.abs(uv[offset+i][0]-panel.uv[i].x)<1e-6&&Math.abs(uv[offset+i][1]-(1-panel.uv[i].y))<1e-6);}vertices++;}for(let t=0;t<panel.triangles.length;t+=3){const tri=panel.triangles.slice(t,t+3).reverse().map(i=>i+offset);expected.push(...tri);const normal=new T.Triangle(...tri.map(i=>new T.Vector3(...positions[i]))).getNormal(new T.Vector3());for(const i of tri)assert(normal.distanceTo(new T.Vector3(...normals[i]))<1e-5,'Flat triangle normal mismatch');triangles++;}offset+=panel.vertices.length;}
 assert.equal(offset,positions.length);assert(eq(indices,expected));
}
const proof={pass:true,layoutSha256:b.layoutSha256,geometrySha256:b.geometrySha256,retiredSurfaces:retiredIds,removedBrowserTriangles:(await read(prepared.replace('assets.json','removal.json'))).removedTriangles,addedPanels:added.length,checkedVertices:vertices,checkedTriangles:triangles,unchangedNativeRecords:true,retainedBrowserBytesExact:true};await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(proof);
