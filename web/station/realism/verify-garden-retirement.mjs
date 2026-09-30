// Reject retired garden guards still present in the composed browser geometry.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import{readFile,writeFile}from'node:fs/promises';
import * as T from'three';
import{MeshoptDecoder}from'meshoptimizer';
import{readGLB}from'../../../tools/optimize-browser-assets.mjs';
const [manifest,c,out]=process.argv.slice(2);
assert(out?.startsWith('.local/'));
const m=JSON.parse(await readFile(manifest)),source=JSON.parse(await readFile(c+'/retired-source.json'));
assert.equal(source.length,42);
const bytes=await readFile(m.geometry);
assert.equal(createHash('sha256').update(bytes).digest('hex'),m.geometrySha256);
const {json:j,bin}=readGLB(bytes);await MeshoptDecoder.ready;const cache=new Map();
function values(ai){if(cache.has(ai))return cache.get(ai);const a=j.accessors[ai],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression,w={SCALAR:1,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];let b=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(e){b=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(b,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}const rows=Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,k)=>b[a.componentType===5126?'readFloatLE':bytes===2?'readUInt16LE':'readUInt32LE']((a.byteOffset||0)+i*(v.byteStride||w*bytes)+k*bytes)));cache.set(ai,rows);return rows;}
const targets = source.filter(o => /rail|posts|infill|guard/.test(o.name)).map(o => {
 const triangles=[];
 for(const f of o.faces) for(let i=1;i<f.vertices.length-1;i++) triangles.push(new T.Triangle(...[f.vertices[0],f.vertices[i],f.vertices[i+1]].map(k=>new T.Vector3(...o.vertices[k]))));
 return {...o,bounds:new T.Box3().setFromPoints(o.vertices.map(v=>new T.Vector3(...v))).expandByScalar(.001),triangles};
});
const rows=[];
for(const [mi,mesh]of j.meshes.entries())for(const [pi,p]of mesh.primitives.entries()){
 const label=j.materials[p.material].name.replace(/ \| Browser$/,''),ts=targets.filter(o=>o.materials.some(m=>m.replace(/ \| Browser$/,'')===label));if(!ts.length)continue;
 for(const n of j.nodes.filter(n=>n.mesh===mi)) assert(!n.matrix&&!n.translation&&!n.rotation&&!n.scale,'Retirement check requires baked browser coordinates');
 const ps=values(p.attributes.POSITION),ix=values(p.indices).flat();
 for(let i=0;i<ix.length;i+=3){const vs=ix.slice(i,i+3).map(k=>new T.Vector3(...ps[k]));
  for(const o of ts){if(!vs.every(v=>o.bounds.containsPoint(v)))continue;
   const samples=[...vs,new T.Vector3().add(vs[0]).add(vs[1]).add(vs[2]).multiplyScalar(1/3)];
   const distance=Math.max(...samples.map(v=>Math.min(...o.triangles.map(t=>t.closestPointToPoint(v,new T.Vector3()).distanceTo(v)))));
   if(distance<.003)rows.push({id:o.name,mesh:mi,primitive:pi,offset:i,distance,vertices:vs.map(v=>v.toArray()),area:new T.Triangle(...vs).getArea()});
  }
 }
}
const removal=JSON.parse(await readFile(c+'/station/removal.json'));
for(const id of ['k008-garden-stair-well-rail','k008-garden-access-rail']) assert(removal.areaCoverage.find(r=>r.id===id).error<.0001,id+' complete handrail retirement');
const report={pass:rows.length===0,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,guardObjects:targets.length,sourceTriangles:targets.reduce((n,o)=>n+o.triangles.length,0),distanceToleranceM:.003,remnants:rows};
await writeFile(out,JSON.stringify(report,null,2)+'\n');
assert.equal(rows.length,0,'Retired garden guards remain in the browser geometry');
console.log('PASS retired garden guards removed',report.guardObjects,'source objects');
