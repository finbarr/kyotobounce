// Verify the exact replacement scope and the appended browser/native triangle stream.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,prepared,candidate,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const a=await read(manifest),p=await read(prepared),b=await read(candidate),old=await read(a.layout),base=await read(p.layout),next=await read(b.layout),report=await read(component+'/report.json');
assert(eq(base.flights,old.flights.filter(f=>f.id!=='east-4f-7f')));
assert(eq(base.routes,old.routes.filter(r=>!/^east-lower-stair-|^east-court-lower-escalator-/.test(r.id))));
assert(eq({...base,flights:old.flights,routes:old.routes},old));
const added=next.panels.slice(base.panels.length);assert.equal(added.length,report.geometry.panels);
assert(eq(next.panels.slice(0,base.panels.length),base.panels));
assert(eq({...next,panels:base.panels,authoredMaterials:base.authoredMaterials,architecture:base.architecture},base));
const bytes=await readFile(b.geometry);assert.equal(sha(bytes),b.geometrySha256);assert.equal(sha(await readFile(b.layout)),b.layoutSha256);
const before=readGLB(await readFile(p.geometry)),after=readGLB(bytes),{json:j,bin}=after;
assert(bin.subarray(0,before.bin.length).equals(before.bin));
for(const key of ['nodes','meshes','materials','accessors','bufferViews','images','textures','samplers'])assert(eq((j[key]||[]).slice(0,(before.json[key]||[]).length),before.json[key]||[]),key);
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],w=a.type==='SCALAR'?1:3;assert(!v.extensions&&!a.sparse);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>bin[a.componentType===5126?'readFloatLE':'readUInt32LE']((v.byteOffset||0)+(a.byteOffset||0)+i*w*4+k*4)));}
let triangles=0,vertices=0;
for(const mesh of j.meshes.slice(before.json.meshes.length))for(const primitive of mesh.primitives){
 const positions=values(primitive.attributes.POSITION),normals=values(primitive.attributes.NORMAL),indices=values(primitive.indices).flat(),label=j.materials[primitive.material].name;
 const rows=added.filter(p=>next.authoredMaterials.find(m=>m.id===p.appearance).label===label);let offset=0;const expected=[];
 for(const panel of rows){assert(panel.id.startsWith('east-access-'));for(let i=0;i<panel.vertices.length;i++){const v=panel.vertices[i];assert(eq(positions[offset+i],[v.x,v.y,-v.z]));vertices++;}for(let t=0;t<panel.triangles.length;t+=3){const tri=panel.triangles.slice(t,t+3).reverse().map(i=>i+offset);expected.push(...tri);const normal=new T.Triangle(...tri.map(i=>new T.Vector3(...positions[i]))).getNormal(new T.Vector3());for(const i of tri)assert(normal.distanceTo(new T.Vector3(...normals[i]))<1e-5,'Flat triangle normal mismatch');triangles++;}offset+=panel.vertices.length;}
 assert.equal(offset,positions.length);assert(eq(indices,expected));
}
const proof={pass:true,layoutSha256:b.layoutSha256,geometrySha256:b.geometrySha256,retiredFlight:'east-4f-7f',removedSourceTriangles:2088,addedPanels:added.length,checkedVertices:vertices,checkedTriangles:triangles,unchangedNativeRecords:true,retainedBrowserBytesExact:true};await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(proof);
