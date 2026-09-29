// Cut the Exit 5 shaft through the public corridor and textured forecourt.
import assert from 'node:assert/strict';
import {plazaId,subtractOpening} from './subway-passage-scope.mjs';
import * as T from 'three';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});await MeshoptDecoder.ready;
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw),glb=await readFile(m.geometry),{json:j,bin}=readGLB(glb);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(glb),m.geometrySha256);
const spec=await read(specPath);assert.equal(spec.parentLayoutSha256,m.layoutSha256);const ids=spec.retiredIds,northOpening=spec.opening;
const removed=l.panels.filter(p=>ids.includes(p.id));assert.equal(removed.length,ids.length);
const key=(vs)=>vs.map(v=>v.map(n=>Math.fround(n).toFixed(5)).join(',')).sort().join('|'),targets=new Map(),hits={};
for(const p of removed){const label=l.authoredMaterials.find(m=>m.id===p.appearance).label;for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(k=>{const v=p.vertices[k];return[v.x,v.y,-v.z];}));assert(!targets.has(k));targets.set(k,p.id);}hits[p.id]=0;}
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w=a.type==='VEC3'?3:a.type==='VEC2'?2:1,bytes={5123:2,5125:4,5126:4}[a.componentType];assert(bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const stride=v.byteStride||w*bytes;return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>{const off=(a.byteOffset||0)+i*stride+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));}
const parts=[bin];let offset=bin.length,count=0;
for(const [mi,mesh]of j.meshes.entries())for(const p of mesh.primitives){const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!removed.some(p=>l.authoredMaterials.find(m=>m.id===p.appearance).label===label))continue;for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const vs=values(p.attributes.POSITION),indices=values(p.indices).flat(),keep=[];let changed=0;for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3),k=label+'|'+key(tri.map(i=>vs[i])),id=targets.get(k);if(id){hits[id]++;count++;changed++;targets.delete(k);}else keep.push(...tri);}if(!changed)continue;if(!keep.length){p.removeForTransfer=true;continue;}const b=Buffer.from(new Uint32Array(keep).buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34963});parts.push(b);offset+=b.length;p.indices=j.accessors.length;j.accessors.push({bufferView:view,componentType:5125,count:keep.length,type:'SCALAR'});
}
for(const mesh of j.meshes)mesh.primitives=mesh.primitives.filter(p=>!p.removeForTransfer);
const meshMap=new Map(),nodeMap=new Map();j.meshes=j.meshes.filter((m,i)=>{if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh)){assert(!n.children);return false;}nodeMap.set(i,nodeMap.size);return true;});
for(const n of j.nodes){if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));}
for(const s of j.scenes)s.nodes=s.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));

// Cut the north stair aperture in the municipal paving without changing its texture mapping.
const plaza=l.panels.find(p=>p.id===plazaId);assert(plaza&&plaza.finishes.length===1);
const plazaLabel=l.authoredMaterials.find(m=>m.id===plaza.appearance).label;
const plazaKeys=new Map();for(let i=0;i<plaza.triangles.length;i+=3)plazaKeys.set(key(plaza.triangles.slice(i,i+3).map(k=>{const v=plaza.vertices[k];return[v.x,v.y,-v.z];})),i/3);
const vp=[],vn=[],vu=[],coverage=[],originalArea=plaza.triangles.reduce((sum,_,i)=>i%3?sum:sum+new T.Triangle(...plaza.triangles.slice(i,i+3).map(k=>{const v=plaza.vertices[k];return new T.Vector3(v.x,v.y,v.z);})).getArea(),0);
const append=(array,width,integer=false)=>{const typed=integer?new Uint32Array(array):new Float32Array(array),b=Buffer.from(typed.buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:integer?34963:34962});parts.push(b);offset+=b.length;const accessor={bufferView:view,componentType:integer?5125:5126,count:array.length/width,type:width===1?'SCALAR':width===2?'VEC2':'VEC3'};if(width===3&&!integer){accessor.min=[0,1,2].map(k=>Math.min(...array.filter((_,i)=>i%3===k)));accessor.max=[0,1,2].map(k=>Math.max(...array.filter((_,i)=>i%3===k)));}j.accessors.push(accessor);return j.accessors.length-1;};
let modifiedPrimitive,replacePlazaPrimitive=false;
for(const p of j.meshes.flatMap(m=>m.primitives)){
 if(j.materials[p.material].name.replace(/ \| Browser$/,'')!==plazaLabel)continue;
 const positions=values(p.attributes.POSITION),normals=values(p.attributes.NORMAL),uvs=values(p.attributes.TEXCOORD_0),indices=values(p.indices).flat(),keep=[];
 for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),k=key(ids.map(i=>positions[i]));if(!plazaKeys.has(k)){keep.push(...ids);continue;}coverage.push(plazaKeys.get(k));plazaKeys.delete(k);
  for(const poly of subtractOpening(ids.map(i=>({p:positions[i],n:normals[i],uv:uvs[i]})),northOpening))for(let k=1;k<poly.length-1;k++){const tri=[poly[0],poly[k],poly[k+1]];if(new T.Triangle(...tri.map(v=>new T.Vector3(...v.p))).getArea()<1e-10)continue;for(const v of tri){vp.push(...v.p.map(Math.fround));vn.push(...new T.Vector3(...v.n).normalize().toArray());vu.push(...v.uv);}}
 }
 if(keep.length===indices.length)continue;assert(!modifiedPrimitive,'One municipal paving batch expected');modifiedPrimitive=p;if(keep.length)p.indices=append(keep,1,true);else replacePlazaPrimitive=true;
}
assert.equal(plazaKeys.size,0,'Every original plaza triangle must match');assert.equal(coverage.length,plaza.triangles.length/3);
const primitive={attributes:{POSITION:append(vp,3),NORMAL:append(vn,3),TEXCOORD_0:append(vu,2)},indices:append(Array.from({length:vp.length/3},(_,i)=>i),1,true),material:modifiedPrimitive.material,mode:4};
if(replacePlazaPrimitive)Object.assign(modifiedPrimitive,primitive);else{j.meshes.push({primitives:[primitive]});j.nodes.push({name:'Exit 5 opening | retained municipal paving',mesh:j.meshes.length-1});j.scenes[j.scene||0].nodes.push(j.nodes.length-1);}
plaza.vertices=Array.from({length:vp.length/3},(_,i)=>({x:vp[3*i],y:vp[3*i+1],z:-vp[3*i+2]}));plaza.triangles=plaza.vertices.flatMap((_,i)=>i%3?[]:[i+2,i+1,i]);plaza.uv=Array.from({length:vu.length/2},(_,i)=>({x:Math.fround(vu[2*i]),y:1-Math.fround(vu[2*i+1])}));plaza.normals=Array.from({length:vn.length/3},(_,i)=>({x:Math.fround(vn[3*i]),y:Math.fround(vn[3*i+1]),z:-Math.fround(vn[3*i+2])}));plaza.finishes[0].triangles=plaza.triangles;
const retainedArea=plaza.triangles.reduce((sum,_,i)=>i%3?sum:sum+new T.Triangle(...plaza.triangles.slice(i,i+3).map(k=>{const v=plaza.vertices[k];return new T.Vector3(v.x,v.y,v.z);})).getArea(),0);
assert(originalArea>retainedArea&&Math.abs(originalArea-retainedArea-(northOpening.maxX-northOpening.minX)*(northOpening.maxZ-northOpening.minZ))<.1);
const plazaCut={id:plazaId,opening:northOpening,originalTriangles:coverage.length,retainedTriangles:plaza.triangles.length/3,originalArea,retainedArea,removedArea:originalArea-retainedArea,textureUVsInterpolated:true};
assert.equal(targets.size,0,'Every retired triangle must exist in the browser');assert.equal(count,removed.reduce((n,p)=>n+p.triangles.length/3,0));j.buffers[0].byteLength=offset;l.panels=l.panels.filter(p=>!ids.includes(p.id));
const bytes=JSON.stringify(l)+'\n',output=writeGLB(j,Buffer.concat(parts)),station=await read(m.station);station.layoutSha256=sha(bytes);assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));
const next={...m,layout:out+'/station-layout.json',layoutSha256:sha(bytes),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};
await writeFile(next.layout,bytes);await writeFile(next.geometry,output);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');await writeFile(out+'/removal.json',JSON.stringify({parent:m,removedIds:ids,removedTriangles:count,plazaCut,coverage:hits,retainedBufferBytesExact:true},null,2)+'\n');console.log({removedPanels:removed.length,removedTriangles:count});
