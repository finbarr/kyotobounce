// Verify retained station data and the appended browser/native triangle stream.
import assert from 'node:assert/strict';
import {retiredSubwayPanels,plazaId,northOpening} from './subway-passage-scope.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import * as T from 'three';
import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,prepared,candidate,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),old=await read(parent.layout),a=await read(prepared),b=await read(candidate),base=await read(a.layout),next=await read(b.layout),report=await read(component+'/report.json');
const retiredIds=retiredSubwayPanels(old);
const plaza=base.panels.find(p=>p.id===plazaId),oldPlaza=old.panels.find(p=>p.id===plazaId);
assert(eq(base.panels,old.panels.filter(p=>!retiredIds.includes(p.id)).map(p=>p.id===plazaId?plaza:p)));
assert(eq({...plaza,vertices:oldPlaza.vertices,triangles:oldPlaza.triangles,uv:oldPlaza.uv,normals:oldPlaza.normals,finishes:oldPlaza.finishes},{...oldPlaza,uv:oldPlaza.uv,normals:oldPlaza.normals}));
assert(eq(plaza.finishes.map((f,i)=>({...f,triangles:oldPlaza.finishes[i].triangles})),oldPlaza.finishes));assert(eq({...base,panels:old.panels},old));
const added=next.panels.slice(base.panels.length);assert.equal(added.length,report.geometry.panels);
const native=await read(component+'/native-panels.json');assert(eq(next.authoredLights.slice(0,base.authoredLights.length),base.authoredLights));assert(eq(next.authoredLights.slice(base.authoredLights.length),native.authoredLights));
assert(eq(next.panels.slice(0,base.panels.length),base.panels));
assert(eq({...next,panels:base.panels,authoredMaterials:base.authoredMaterials,authoredLights:base.authoredLights,architecture:base.architecture},base));
const bytes=await readFile(b.geometry);assert.equal(sha(bytes),b.geometrySha256);assert.equal(sha(await readFile(b.layout)),b.layoutSha256);
const before=readGLB(await readFile(a.geometry)),after=readGLB(bytes),{json:j,bin}=after;
assert(bin.subarray(0,before.bin.length).equals(before.bin));
for(const key of ['nodes','meshes','materials','accessors','bufferViews','images','textures','samplers'])assert(eq((j[key]||[]).slice(0,(before.json[key]||[]).length),before.json[key]||[]),key);
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],w=a.type==='SCALAR'?1:a.type==='VEC2'?2:3;assert(!v.extensions&&!a.sparse);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>bin[a.componentType===5126?'readFloatLE':'readUInt32LE']((v.byteOffset||0)+(a.byteOffset||0)+i*w*4+k*4)));}
let triangles=0,vertices=0;
for(const mesh of j.meshes.slice(before.json.meshes.length))for(const primitive of mesh.primitives){
 const positions=values(primitive.attributes.POSITION),normals=values(primitive.attributes.NORMAL),uv=primitive.attributes.TEXCOORD_0===undefined?null:values(primitive.attributes.TEXCOORD_0),indices=values(primitive.indices).flat(),label=j.materials[primitive.material].name;
 const rows=added.filter(p=>next.authoredMaterials.find(m=>m.id===p.appearance).label===label);let offset=0;const expected=[];
 for(const panel of rows){assert(panel.id.startsWith('subway-passage-'));for(let i=0;i<panel.vertices.length;i++){const v=panel.vertices[i];assert(eq(positions[offset+i],[v.x,v.y,-v.z]));if(panel.uv){assert(uv);assert(Math.abs(uv[offset+i][0]-panel.uv[i].x)<1e-6&&Math.abs(uv[offset+i][1]-(1-panel.uv[i].y))<1e-6);}vertices++;}for(let t=0;t<panel.triangles.length;t+=3){const tri=panel.triangles.slice(t,t+3).reverse().map(i=>i+offset);expected.push(...tri);const normal=new T.Triangle(...tri.map(i=>new T.Vector3(...positions[i]))).getNormal(new T.Vector3());for(const i of tri)assert(normal.distanceTo(new T.Vector3(...normals[i]))<1e-5,'Flat triangle normal mismatch');triangles++;}offset+=panel.vertices.length;}
 assert.equal(offset,positions.length);assert(eq(indices,expected));
}
const pavingProof=verifyPaving(readGLB(await readFile(parent.geometry)),before);
const proof={pass:true,modifiedPaving:pavingProof,layoutSha256:b.layoutSha256,geometrySha256:b.geometrySha256,retiredSurfaces:retiredSubwayPanels(old),removedBrowserTriangles:(await read(prepared.replace('assets.json','removal.json'))).removedTriangles,addedPanels:added.length,checkedVertices:vertices,checkedTriangles:triangles,otherNativeRecordsUnchanged:true,retainedBrowserBytesExact:true};await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(proof);

function decoded(glb,ai){
 const a=glb.json.accessors[ai],v=glb.json.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(w&&bytes&&!a.sparse);let buf=glb.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
 if(e){buf=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(buf,e.count,e.byteStride,glb.bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
 return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>buf[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));
}
function verifyPaving(original,prepared){
 assert(prepared.bin.subarray(0,original.bin.length).equals(original.bin));
 const label=old.authoredMaterials.find(m=>m.id===oldPlaza.appearance).label;
 const primitives=g=>g.json.meshes.flatMap(m=>m.primitives).filter(p=>g.json.materials[p.material].name.replace(/ \| Browser$/,'')===label);
 const key=v=>v.map(v=>v.map(n=>Math.fround(n).toFixed(5)).join(',')).sort().join('|');
 const panelKey=p=>key(p.triangles.slice(0,3).map(i=>{const v=p.vertices[i];return[v.x,v.y,-v.z];}));
 function matches(g,p,target){const vs=decoded(g,p.attributes.POSITION),ids=decoded(g,p.indices).flat();for(let i=0;i<ids.length;i+=3)if(key(ids.slice(i,i+3).map(k=>vs[k]))===target)return true;return false;}
 const originals=primitives(original).filter(p=>matches(original,p,panelKey(oldPlaza))),updates=primitives(prepared).filter(p=>matches(prepared,p,panelKey(plaza)));assert.equal(originals.length,1);assert.equal(updates.length,1);
 assert(eq(original.json.materials[originals[0].material],prepared.json.materials[updates[0].material]));
 const a=originals[0],b=updates[0],pos=decoded(original,a.attributes.POSITION),uv=decoded(original,a.attributes.TEXCOORD_0),norm=decoded(original,a.attributes.NORMAL),ix=decoded(original,a.indices).flat(),vp=decoded(prepared,b.attributes.POSITION),vu=decoded(prepared,b.attributes.TEXCOORD_0),vn=decoded(prepared,b.attributes.NORMAL),vi=decoded(prepared,b.indices).flat();
 assert.equal(vp.length,plaza.vertices.length);assert(eq(vi,plaza.triangles.flatMap((_,i)=>i%3?[]:plaza.triangles.slice(i,i+3).reverse())));
 const source=[];for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3);source.push({ids,tri:new T.Triangle(...ids.map(k=>new T.Vector3(...pos[k])))});}
 // Independent rectangle intersection checks that no output triangle covers the stair opening.
 function intersectionArea(vertices){let poly=vertices.map(v=>[v[0],-v[2]]);for(const[k,b,sign]of[[0,northOpening.minX,1],[0,northOpening.maxX,-1],[1,northOpening.minZ,1],[1,northOpening.maxZ,-1]]){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],da=sign*(a[k]-b),dc=sign*(c[k]-b);if(da>=0)next.push(a);if((da>=0)!==(dc>=0)){const t=da/(da-dc);next.push(a.map((v,k)=>v+(c[k]-v)*t));}}poly=next;}return Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;}
 let oldArea=0,newArea=0;const projected=vs=>Math.abs((vs[1][0]-vs[0][0])*(vs[2][2]-vs[0][2])-(vs[2][0]-vs[0][0])*(vs[1][2]-vs[0][2]))/2;
 for(const {ids}of source)oldArea+=projected(ids.map(i=>pos[i]));
 for(let i=0;i<vi.length;i+=3){const ids=vi.slice(i,i+3),v=ids.map(k=>new T.Vector3(...vp[k]));newArea+=projected(ids.map(k=>vp[k]));assert(intersectionArea(ids.map(k=>vp[k]))<.0002,'Paving closes the stair opening');
  const parent=source.find(({tri})=>v.every(q=>{const bary=tri.getBarycoord(q,new T.Vector3());return bary&&Math.min(...bary.toArray())>-.0001&&tri.closestPointToPoint(q,new T.Vector3()).distanceTo(q)<.0001;}));assert(parent,'Paving moved outside its original triangle');
  for(const k of ids){const p=plaza.vertices[k];assert(eq(vp[k],[p.x,p.y,-p.z]));assert(Math.abs(vu[k][0]-plaza.uv[k].x)<1e-6&&Math.abs(vu[k][1]-(1-plaza.uv[k].y))<1e-6);assert(eq(vn[k],[plaza.normals[k].x,plaza.normals[k].y,-plaza.normals[k].z]));const weights=parent.tri.getBarycoord(new T.Vector3(...vp[k]),new T.Vector3()).toArray();for(let c=0;c<2;c++)assert(Math.abs(vu[k][c]-weights.reduce((s,w,i)=>s+w*uv[parent.ids[i]][c],0))<.0001,'Retained paving UV changed');const n=new T.Vector3(...[0,1,2].map(c=>weights.reduce((s,w,i)=>s+w*norm[parent.ids[i]][c],0))).normalize();assert(n.distanceTo(new T.Vector3(...vn[k]))<.0001,'Retained paving normal changed');}
 }
 const removedArea=oldArea-newArea;assert(Math.abs(removedArea-(northOpening.maxX-northOpening.minX)*(northOpening.maxZ-northOpening.minZ))<.02);
 return {id:plazaId,triangles:vi.length/3,removedProjectedArea:removedArea,openingUnobstructed:true,originalSurfaceAndUVsPreserved:true};
}
