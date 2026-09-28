// Verify the semantic glass split preserves every exported triangle/attribute.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [beforePath,afterPath,outputPath]=process.argv.slice(2);
for(const p of [beforePath,afterPath,outputPath])assert.ok(p&&resolve(p).startsWith(resolve('.local')+'/'),'Use isolated .local inputs/output');
const hash=b=>createHash('sha256').update(b).digest('hex');
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},bytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
async function inspect(path){
 const source=await readFile(path),{json,bin}=readGLB(source),groups=new Map(),uvs=new Map();let triangles=0,canopyTriangles=0;
 function accessor(i){const a=json.accessors[i],v=json.bufferViews[a.bufferView],size=components[a.type]*bytes[a.componentType];assert.ok(size&&!a.sparse);const data=Buffer.alloc(a.count*size);for(let n=0;n<a.count;n++){const start=(v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||size);bin.copy(data,n*size,start,start+size);}return {a,size,data};}
 for(const node of json.nodes){if(node.mesh===undefined)continue;
  const name=node.name.replace('Canopy envelope glazing','Glass - placeholder');assert.ok(!node.matrix&&!node.translation&&!node.rotation&&!node.scale,'World-space batch assumption changed');
  const glass=name.startsWith('Glass - placeholder @ '),group=groups.get(name)||[];groups.set(name,group);
  for(const p of json.meshes[node.mesh].primitives){
   assert.ok(p.mode===undefined||p.mode===4);const index=accessor(p.indices),attrs=Object.keys(p.attributes).sort().map(k=>[k,accessor(p.attributes[k])]);triangles+=index.a.count/3;
   if(node.name.startsWith('Canopy envelope glazing'))canopyTriangles+=index.a.count/3;
   if(!glass){
    const geometry=attrs.filter(([k])=>!k.startsWith('TEXCOORD'));
    group.push(hash(Buffer.concat([Buffer.from(JSON.stringify(geometry.map(([k,{a,size}])=>[k,a.componentType,a.type,a.count,size]))),...geometry.map(([,v])=>v.data),index.data])));
    for(const [k,v] of attrs.filter(([k])=>k.startsWith('TEXCOORD'))){assert.equal(v.a.componentType,5126);uvs.set(name+' / '+k,v.data);}
    continue;
   }
   const at=n=>index.a.componentType===5125?index.data.readUInt32LE(n*4):index.a.componentType===5123?index.data.readUInt16LE(n*2):index.data.readUInt8(n);
   for(let n=0;n<index.a.count;n+=3){const parts=[];for(let v=0;v<3;v++)for(const [k,a] of attrs){const start=at(n+v)*a.size;parts.push(Buffer.from(k),a.data.subarray(start,start+a.size));}group.push(hash(Buffer.concat(parts)));}
  }
 }
 for(const g of groups.values())g.sort();
 return {sha256:hash(source),triangles,canopyTriangles,groups,uvs};
}
const before=await inspect(beforePath),after=await inspect(afterPath);
assert.equal(after.triangles,before.triangles);assert.ok(after.canopyTriangles>0);assert.equal(before.canopyTriangles,0);
assert.equal(after.groups.size,before.groups.size);
for(const [name,values] of before.groups)assert.deepEqual(after.groups.get(name),values,`Geometry, normals, winding or glass UVs changed: ${name}`);
assert.equal(after.uvs.size,before.uvs.size);
const uvDifferences=[];
for(const [name,a] of before.uvs){const b=after.uvs.get(name);assert.ok(b,name);assert.equal(a.length,b.length);let count=0,max=0;
 for(let i=0;i<a.length;i+=4){const delta=Math.abs(a.readFloatLE(i)-b.readFloatLE(i));assert.ok(Number.isFinite(delta)&&delta<=1e-7,`UV drift: ${name}, ${delta}`);if(delta){count++;max=Math.max(max,delta);}}
 if(count)uvDifferences.push({batch:name,changedComponents:count,maxDifference:max});
}
const report={before:{file:beforePath,sha256:before.sha256},after:{file:afterPath,sha256:after.sha256},triangles:after.triangles,canopyTriangles:after.canopyTriangles,verifiedBatchGroups:after.groups.size,uvDifferences,result:'Triangle positions, normals and winding match exactly. Glass UVs match exactly; other UV drift is bounded to 1e-7 (float rounding).'};
await writeFile(outputPath,JSON.stringify(report,null,2)+'\n');console.log(report);
