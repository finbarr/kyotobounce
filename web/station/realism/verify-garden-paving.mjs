// Independently check the finish scope, metric UVs and embedded material maps.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [directory]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const r=await read(directory+'/report.json'),m=await read(directory+'/assets.json'),b=r.parent;
const oldRaw=await readFile(b.layout),nextRaw=await readFile(m.layout),old=JSON.parse(oldRaw),next=JSON.parse(nextRaw);
assert.equal(sha(oldRaw),b.layoutSha256);assert.equal(sha(nextRaw),m.layoutSha256);
const panel=next.panels.find(p=>p.id===r.panelId),original=old.panels.find(p=>p.id===r.panelId);
assert.equal(panel.appearance,r.materialId);assert.equal(panel.uv.length,panel.vertices.length);
for(let i=0;i<panel.vertices.length;i++){const p=panel.vertices[i],uv=panel.uv[i];assert(Math.abs(uv.x-(p.x+202.3)/2.4)<1e-9);assert(Math.abs(uv.y-(1-(p.z+25)/2.4))<1e-9);}
delete panel.uv;panel.appearance=original.appearance;
const mat=next.authoredMaterials.pop();assert.equal(mat.id,r.materialId);assert.equal(mat.label,r.materialLabel);
assert.deepEqual(next,old,'Only the selected floor UVs and new appearance may change');
const oldGLB=await readFile(b.geometry),newGLB=await readFile(m.geometry);assert.equal(sha(oldGLB),b.geometrySha256);assert.equal(sha(newGLB),m.geometrySha256);
const a=readGLB(oldGLB),d=readGLB(newGLB),j=d.json;
assert(d.bin.subarray(0,a.bin.length).equals(a.bin));assert.equal(j.meshes.length,a.json.meshes.length);
const originalPrimitive=a.json.meshes[r.meshIndex].primitives[r.primitiveIndex],changed=j.meshes[r.meshIndex].primitives[r.primitiveIndex];
assert.equal(changed.material,a.json.materials.length);
const uvA=j.accessors[changed.attributes.TEXCOORD_0],uvV=j.bufferViews[uvA.bufferView],pA=j.accessors[changed.attributes.POSITION],pV=j.bufferViews[pA.bufferView];
assert.equal(uvA.type,'VEC2');assert.equal(uvA.componentType,5126);assert.equal(uvA.count,pA.count);
assert(!uvV.byteStride&&!uvV.extensions&&!uvA.sparse);
let maxUVError=0;
for(let i=0;i<pA.count;i++){
 const at=(pV.byteOffset||0)+(pA.byteOffset||0)+i*12,x=d.bin.readFloatLE(at),z=-d.bin.readFloatLE(at+8),u=(uvV.byteOffset||0)+(uvA.byteOffset||0)+i*8;
 maxUVError=Math.max(maxUVError,Math.abs(d.bin.readFloatLE(u)-(x+202.3)/2.4),Math.abs(d.bin.readFloatLE(u+4)-(z+25)/2.4));
}
assert(maxUVError<.000004);
const material=j.materials.at(-1);assert.equal(material.name,r.materialLabel+' | Browser');assert.equal(material.normalTexture.scale,.55);
const slots={albedo:material.pbrMetallicRoughness.baseColorTexture,'metal-rough':material.pbrMetallicRoughness.metallicRoughnessTexture,normal:material.normalTexture};
for(const[k,info]of Object.entries(slots)){
 const tex=j.textures[info.index],im=j.images[tex.source],v=j.bufferViews[im.bufferView],data=d.bin.subarray(v.byteOffset,v.byteOffset+v.byteLength);
 assert.equal(sha(data),r.maps[k].sha256);assert.equal(sha(await readFile(directory+'/textures/'+r.maps[k].file)),r.maps[k].sha256);
 assert.deepEqual(j.samplers[tex.sampler],{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497});
}
changed.material=originalPrimitive.material;changed.attributes.TEXCOORD_0=originalPrimitive.attributes.TEXCOORD_0;
assert.deepEqual(j.meshes,a.json.meshes);assert.deepEqual(j.nodes,a.json.nodes);assert.deepEqual(j.scenes,a.json.scenes);
for(const k of ['materials','accessors','bufferViews','images','textures','samplers'])assert.deepEqual(j[k].slice(0,a.json[k].length),a.json[k]);
assert.equal(j.materials.length,a.json.materials.length+1);assert.equal(j.textures.length,a.json.textures.length+3);
const oldDetail=await read(b.detail),newDetail=await read(m.detail);assert.equal(newDetail.candidateMotionIntegration.layoutSha256,m.layoutSha256);newDetail.candidateMotionIntegration.layoutSha256=b.layoutSha256;assert.deepEqual(newDetail,oldDetail);
const proof={pass:true,parentLayoutSha256:b.layoutSha256,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,allPhysicalRecordsUnchanged:true,allPositionsNormalsIndicesAndNodesUnchanged:true,inheritedEncodedBytesUnchanged:true,unchangedStairMaterial:true,changedPrimitives:1,maxUVError,embeddedMapsMatch:true,newTextures:3,estimatedRgba8MipBytes:3*512*512*4*4/3};
await writeFile(directory+'/geometry-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
