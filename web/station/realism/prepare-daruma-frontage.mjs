// Remove the six draft shopfront solids from matching native and browser triangles.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {MeshoptDecoder} from 'meshoptimizer';import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});await MeshoptDecoder.ready;const sha=b=>createHash('sha256').update(b).digest('hex'),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),layout=JSON.parse(raw),glb=await readFile(base.geometry),{json:j,bin}=readGLB(glb);
assert.equal(sha(raw),base.layoutSha256);assert.equal(sha(glb),base.geometrySha256);
const removed=layout.panels.filter(p=>/^west-restaurant-shop-4($|-)/.test(p.id));assert.equal(removed.length,6);
const key=vs=>vs.map(v=>v.map(n=>Math.round(n*10000)).join(',')).sort().join('|'),wanted=new Map();
for(const p of removed){const label=layout.authoredMaterials.find(m=>m.id===p.appearance).label+' | Browser';for(let k=0;k<p.triangles.length;k+=3){const id=label+'|'+key(p.triangles.slice(k,k+3).map(i=>{const v=p.vertices[i];return[v.x,v.y,-v.z];}));assert(!wanted.has(id));wanted.set(id,p.id);}}
function values(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,width=a.type==='VEC3'?3:1,bytes={5123:2,5125:4,5126:4}[a.componentType];assert(bytes&&!a.sparse);let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const stride=v.byteStride||width*bytes;return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>{const off=(a.byteOffset||0)+i*stride+k*bytes;return a.componentType===5126?b.readFloatLE(off):bytes===2?b.readUInt16LE(off):b.readUInt32LE(off);}));}
const pieces=[bin];let offset=bin.length;const hits=[],clippedBottom=[];
const slab=removed.find(p=>p.id==='west-restaurant-shop-4'),bottomY=Math.min(...slab.vertices.map(v=>v.y));
const triangleArea=vs=>{const a=vs[1].map((v,i)=>v-vs[0][i]),b=vs[2].map((v,i)=>v-vs[0][i]);return Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2;};
const bottoms=[];for(let k=0;k<slab.triangles.length;k+=3){const vs=slab.triangles.slice(k,k+3).map(i=>{const v=slab.vertices[i];return[v.x,v.y,-v.z];});if(vs.every(v=>Math.abs(v[1]-bottomY)<1e-5))bottoms.push(vs);}
const inside=(p,vs)=>{const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);const signs=vs.map((v,i)=>cross(v,vs[(i+1)%3],p));return signs.every(s=>s>=-.0001)||signs.every(s=>s<=.0001);};
for(const [mi,m]of j.meshes.entries())for(const p of m.primitives){const label=j.materials[p.material]?.name;if(!removed.some(r=>layout.authoredMaterials.find(a=>a.id===r.appearance).label+' | Browser'===label))continue;
 for(const n of j.nodes.filter(n=>n.mesh===mi))assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale);
 const pos=values(p.attributes.POSITION),indices=values(p.indices).flat(),keep=[];let count=0;
 for(let k=0;k<indices.length;k+=3){const tri=indices.slice(k,k+3),id=label+'|'+key(tri.map(i=>pos[i]));if(wanted.has(id)){hits.push(wanted.get(id));wanted.delete(id);count++;}else if(tri.every(i=>Math.abs(pos[i][1]-bottomY)<.00002&&bottoms.some(vs=>inside(pos[i],vs)))){clippedBottom.push(tri.map(i=>pos[i]));hits.push(slab.id);count++;}else keep.push(...tri);}
 if(!count)continue;assert(keep.length);const array=new Uint32Array(keep),b=Buffer.from(array.buffer),vi=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34963});pieces.push(b);offset+=b.length;p.indices=j.accessors.length;j.accessors.push({bufferView:vi,componentType:5125,count:keep.length,type:'SCALAR'});
}
// The full browser export clipped coplanar overlaps on two underside triangles.
// Remove their visible fragments only inside the retired footprint, and verify the
// missing area against that export's per-object clipping receipt.
const nativeBottom=[...wanted].map(([k,id])=>{assert.equal(id,slab.id);const vs=k.split('|').slice(-3).map(v=>v.split(',').map(n=>Number(n)/10000));assert(vs.every(v=>Math.abs(v[1]-bottomY)<.0001));return vs;});
assert.equal(nativeBottom.length,2);assert(clippedBottom.length>2);
const exportReport=JSON.parse(await readFile('.local/v2/current/station/atrium-export.json'));
const coveredAreaM2=exportReport.coplanarDeduplication.objects[slab.id];assert(coveredAreaM2>0);
const missingArea=nativeBottom.reduce((n,v)=>n+triangleArea(v),0)-clippedBottom.reduce((n,v)=>n+triangleArea(v),0);
assert(Math.abs(missingArea-coveredAreaM2)<.002,'Clipped underside must agree with full export receipt');
assert.equal(hits.length-clippedBottom.length,removed.reduce((n,p)=>n+p.triangles.length/3,0)-2);
j.buffers[0].byteLength=offset;
layout.panels=layout.panels.filter(p=>!removed.includes(p));const text=JSON.stringify(layout)+'\n',output=writeGLB(j,Buffer.concat(pieces));assert(readGLB(output).bin.subarray(0,bin.length).equals(bin));const station=JSON.parse(await readFile(base.station));station.layoutSha256=sha(text);
await writeFile(out+'/station-layout.json',text);await writeFile(out+'/atrium.runtime.glb',output);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');const next={...base,layout:out+'/station-layout.json',layoutSha256:sha(text),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');await writeFile(out+'/removal.json',JSON.stringify({parent:base,removedIds:removed.map(p=>p.id),removedTriangles:hits.length,clippedUndersideTriangles:clippedBottom.length,coveredAreaM2,exactMatchToleranceM:.0001,inheritedBufferBytesUnchanged:true,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256},null,2)+'\n');console.log('Removed six Daruma draft solids and '+hits.length+' corresponding browser triangles');
