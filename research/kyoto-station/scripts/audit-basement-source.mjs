// Read-only municipal geometry inventory. Candidate triangles are AABB-selected;
// derived floor polygons are clipped separately by diagram-basement-source.py.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const [sourceArg,outArg]=process.argv.slice(2);
assert(sourceArg&&outArg,'Usage: node audit-basement-source.mjs SOURCE.glb OUT_DIR');
const source=resolve(sourceArg),out=resolve(outArg),bytes=await readFile(source);
const sha256=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256,'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1','Source geometry changed');
assert.equal(bytes.readUInt32LE(0),0x46546c67);
assert.equal(bytes.readUInt32LE(4),2);
const jsonLength=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binaryOffset=20+jsonLength;
assert.equal(bytes.readUInt32LE(binaryOffset+4),0x004e4942);
const bin=bytes.subarray(binaryOffset+8);
function access(id){
  const a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3}[a.type],size={5126:4,5125:4,5123:2}[a.componentType];
  assert(n&&size&&!a.sparse&&(!v.buffer||v.buffer===0));
  return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>{
    const off=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*size)+k*size;
    return a.componentType===5126?bin.readFloatLE(off):a.componentType===5125?bin.readUInt32LE(off):bin.readUInt16LE(off);
  }));
}
const bounds={min:[-17,-6,-26],max:[20,1.5,7]},triangles=[],objects={};
let sourceMinY=Infinity,sourceMaxY=-Infinity;
for(const node of j.nodes){
  assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale,'Transformed nodes require explicit world-space handling');
  if(node.mesh===undefined)continue;
  for(const [pi,p]of j.meshes[node.mesh].primitives.entries()){
    assert(p.mode===undefined||p.mode===4);
    const vs=access(p.attributes.POSITION),ix=p.indices===undefined?vs.map((_,i)=>[i]):access(p.indices);
    for(const v of vs){sourceMinY=Math.min(sourceMinY,v[1]);sourceMaxY=Math.max(sourceMaxY,v[1]);}
    for(let i=0;i<ix.length;i+=3){
      const ids=ix.slice(i,i+3).flat(),t=ids.map(k=>vs[k]),lo=[0,1,2].map(k=>Math.min(...t.map(v=>v[k]))),hi=[0,1,2].map(k=>Math.max(...t.map(v=>v[k])));
      if([0,1,2].some(k=>hi[k]<bounds.min[k]||lo[k]>bounds.max[k]))continue;
      const a=t[1].map((v,k)=>v-t[0][k]),b=t[2].map((v,k)=>v-t[0][k]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=Math.hypot(...n);
      if(len<1e-9)continue;
      triangles.push({object:node.name,primitive:pi,face:i/3,ids,vertices:t,normal:n.map(v=>v/len),area:len/2});
      objects[node.name]??={triangles:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
      const o=objects[node.name];o.triangles++;
      for(let k=0;k<3;k++){o.min[k]=Math.min(o.min[k],lo[k]);o.max[k]=Math.max(o.max[k],hi[k]);}
    }
  }
}
await mkdir(out,{recursive:true});
const report={source,sourceSha256:sha256,sourceVerticalExtent:[sourceMinY,sourceMaxY],coordinates:'Renderer: X east, Y up, Z south; metres in source coordinate system.',selection:{bounds,method:'Triangle AABB overlap only. Triangles and object bounds can extend outside the review volume; do not treat them as clipped geometry.'},objects,triangles};
await writeFile(out+'/source-triangles.json',JSON.stringify(report)+'\n');
console.log(JSON.stringify({triangles:triangles.length,objects:Object.keys(objects).length,sourceSha256:sha256}));
