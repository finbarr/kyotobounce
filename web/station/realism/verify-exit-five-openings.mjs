// Check the precise paving cut, including inherited UVs and smooth normals.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual as eq} from 'node:util';
import * as T from 'three';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
await MeshoptDecoder.ready;
const [parentPath,candidatePath,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
const parent=await read(parentPath),candidate=await read(candidatePath),old=await read(parent.layout),next=await read(candidate.layout),spec=await read(component+'/spec.json'),plazaId=spec.modifiedPaving,opening=spec.opening;
const oldPlaza=old.panels.find(p=>p.id===plazaId),plaza=next.panels.find(p=>p.id===plazaId);
assert(eq({...plaza,vertices:oldPlaza.vertices,triangles:oldPlaza.triangles,uv:oldPlaza.uv,normals:oldPlaza.normals,finishes:oldPlaza.finishes},oldPlaza));
assert(eq(plaza.finishes.map((f,i)=>({...f,triangles:oldPlaza.finishes[i].triangles})),oldPlaza.finishes));
const paving=verifyPaving(readGLB(await readFile(parent.geometry)),readGLB(await readFile(candidate.geometry)));
// The approach sill starts on the original paving and ends at the car floor.
const sill=next.panels.find(p=>p.id==='exit-five-upper-sill'),ys=sill.vertices.filter(v=>Math.abs(v.z-opening.minZ)<1e-5).map(v=>v.y);
assert(Math.abs(Math.max(...ys)-spec.frontEdge[0])<1e-6);
assert(Math.abs(Math.min(...ys)-(spec.frontEdge[1]-.12))<1e-6);
const proof={pass:true,layoutSha256:candidate.layoutSha256,geometrySha256:candidate.geometrySha256,paving,upperLanding:spec.upper,slopedThresholdMatches:true};
await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(proof);
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
 // Independent rectangle intersection checks that no output triangle covers the lift opening.
 function intersectionArea(vertices){let poly=vertices.map(v=>[v[0],-v[2]]);for(const[k,b,sign]of[[0,opening.minX,1],[0,opening.maxX,-1],[1,opening.minZ,1],[1,opening.maxZ,-1]]){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],da=sign*(a[k]-b),dc=sign*(c[k]-b);if(da>=0)next.push(a);if((da>=0)!==(dc>=0)){const t=da/(da-dc);next.push(a.map((v,k)=>v+(c[k]-v)*t));}}poly=next;}return Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;}
 let oldArea=0,newArea=0;const projected=vs=>Math.abs((vs[1][0]-vs[0][0])*(vs[2][2]-vs[0][2])-(vs[2][0]-vs[0][0])*(vs[1][2]-vs[0][2]))/2;
 for(const {ids}of source)oldArea+=projected(ids.map(i=>pos[i]));
 for(let i=0;i<vi.length;i+=3){const ids=vi.slice(i,i+3),v=ids.map(k=>new T.Vector3(...vp[k]));newArea+=projected(ids.map(k=>vp[k]));assert(intersectionArea(ids.map(k=>vp[k]))<.0002,'Paving closes the lift opening');
  const parent=source.find(({tri})=>v.every(q=>{const bary=tri.getBarycoord(q,new T.Vector3());return bary&&Math.min(...bary.toArray())>-.0001&&tri.closestPointToPoint(q,new T.Vector3()).distanceTo(q)<.0001;}));assert(parent,'Paving moved outside its original triangle');
  for(const k of ids){const p=plaza.vertices[k];assert(eq(vp[k],[p.x,p.y,-p.z]));assert(Math.abs(vu[k][0]-plaza.uv[k].x)<1e-6&&Math.abs(vu[k][1]-(1-plaza.uv[k].y))<1e-6);assert(eq(vn[k],[plaza.normals[k].x,plaza.normals[k].y,-plaza.normals[k].z]));const weights=parent.tri.getBarycoord(new T.Vector3(...vp[k]),new T.Vector3()).toArray();for(let c=0;c<2;c++)assert(Math.abs(vu[k][c]-weights.reduce((s,w,i)=>s+w*uv[parent.ids[i]][c],0))<.0001,'Retained paving UV changed');const n=new T.Vector3(...[0,1,2].map(c=>weights.reduce((s,w,i)=>s+w*norm[parent.ids[i]][c],0))).normalize();assert(n.distanceTo(new T.Vector3(...vn[k]))<.0001,'Retained paving normal changed');}
 }
 const removedArea=oldArea-newArea;assert(Math.abs(removedArea-(opening.maxX-opening.minX)*(opening.maxZ-opening.minZ))<.02);
 return {id:plazaId,triangles:vi.length/3,removedProjectedArea:removedArea,openingUnobstructed:true,originalSurfaceAndUVsPreserved:true};
}
