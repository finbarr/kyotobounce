// Verify that a registration's stored landmarks come from the declared GLB.
import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import * as T from 'three';
import{readGLB}from'../../../tools/optimize-browser-assets.mjs';
const [specPath,out]=process.argv.slice(2);assert(specPath&&out);
const sb=await readFile(specPath),s=JSON.parse(sb),bytes=await readFile(s.sourceGeometry.file),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes),s.sourceGeometry.sha256);assert.equal(sha(await readFile(s.reference.localFile)),s.reference.sha256);
const {json:j,bin}=readGLB(bytes),cache=new Map();
function acc(i){if(cache.has(i))return cache.get(i);const a=j.accessors[i],v=j.bufferViews[a.bufferView],c={SCALAR:1,VEC2:2,VEC3:3}[a.type],b={5123:2,5125:4,5126:4}[a.componentType];assert(c&&b&&!a.sparse);const rows=Array.from({length:a.count},(_,n)=>Array.from({length:c},(_,k)=>{const o=(v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||c*b)+k*b;return a.componentType===5126?bin.readFloatLE(o):b===2?bin.readUInt16LE(o):bin.readUInt32LE(o)}));cache.set(i,rows);return rows;}
const rows=[];
for(const a of s.anchors){const matches=j.nodes.filter(n=>n.name===a.sourceObject||n.name?.replaceAll('.','')===a.sourceObject);assert.equal(matches.length,1);const n=matches[0];assert(!n.matrix&&!n.rotation&&!n.translation&&!n.scale);const ps=j.meshes[n.mesh].primitives;assert.equal(ps.length,1);const p=ps[0],vs=acc(p.attributes.POSITION);let actual;
 if(a.sourceVertexIndex!==undefined){actual=vs[a.sourceVertexIndex];assert(actual);}
 else{assert(a.sourceTexture&&Number.isInteger(a.face));const t=a.sourceTexture,mat=j.materials[p.material],imageIndex=j.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source;assert.equal(imageIndex,t.imageIndex);const image=j.images[imageIndex],v=j.bufferViews[image.bufferView];assert.equal(sha(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)),t.sha256);const ids=acc(p.indices).flat().slice(a.face*3,a.face*3+3),uvs=acc(p.attributes.TEXCOORD_0),uv=ids.map(i=>new T.Vector3(...uvs[i],0));const bc=T.Triangle.getBarycoord(new T.Vector3(t.pixel[0]/t.size[0],t.pixel[1]/t.size[1],0),...uv,new T.Vector3());assert(Math.min(...bc.toArray())>=-1e-6);const w=new T.Vector3();ids.forEach((i,k)=>w.addScaledVector(new T.Vector3(...vs[i]),bc.getComponent(k)));actual=w.toArray();}
 const error=Math.hypot(...actual.map((v,k)=>v-a.worldPoint[k]));assert(error<1e-6,a.id);rows.push({id:a.id,kind:a.sourceTexture?'texture-triangle':'vertex',worldErrorM:error});}
const report={specSha256:sha(sb),sourceSha256:sha(bytes),referenceSha256:s.reference.sha256,points:rows,status:'All declared point coordinates agree with their source vertices or texture triangles; correspondence identity still requires visual review.'};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({verifiedPoints:rows.length,maxWorldErrorM:Math.max(...rows.map(r=>r.worldErrorM))}));
