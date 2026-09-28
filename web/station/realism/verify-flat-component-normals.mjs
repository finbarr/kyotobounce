// Verify emitted normals against each emitted triangle's geometric normal.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [directory,out]=process.argv.slice(2);assert(directory&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const source=JSON.parse(await readFile(directory+'/report.json')),bytes=await readFile(directory+'/'+source.outputs.glbFile),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(bytes),source.outputs.glbSha256);
const {json:j,bin}=readGLB(bytes),rows=[];let triangles=0,minDot=1,maxLengthError=0;
for(const mesh of j.meshes)for(const p of mesh.primitives){
 const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],n=j.accessors[p.attributes.NORMAL],nv=j.bufferViews[n.bufferView],ix=j.accessors[p.indices],iv=j.bufferViews[ix.bufferView];assert.equal(ix.componentType,5125);assert.equal(a.count,n.count);
 const vector=(view,accessor,i)=>new T.Vector3(...[0,1,2].map(k=>bin.readFloatLE((view.byteOffset||0)+(accessor.byteOffset||0)+i*(view.byteStride||12)+k*4)));
 for(let i=0;i<ix.count;i+=3){
  const ids=[0,1,2].map(k=>bin.readUInt32LE((iv.byteOffset||0)+(ix.byteOffset||0)+(i+k)*4)),vs=ids.map(id=>vector(v,a,id)),normal=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();assert(normal.length()>.99);
  let triangleDot=1;for(const id of ids){const value=vector(nv,n,id);maxLengthError=Math.max(maxLengthError,Math.abs(value.length()-1));triangleDot=Math.min(triangleDot,normal.dot(value));}minDot=Math.min(minDot,triangleDot);if(triangleDot<.99999)rows.push({material:p.material,triangle:i/3,minimumDot:triangleDot});triangles++;
 }
}
const report={glbSha256:sha(bytes),triangles,minDot,maxLengthError,nonFlatTriangles:rows.length,examples:rows.slice(0,20),pass:!rows.length&&maxLengthError<1e-5,meaning:'Flat geometric face normals; does not validate material appearance, physical bevels or photographic shape.'};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert(report.pass,'Component contains smoothed hard faces');
