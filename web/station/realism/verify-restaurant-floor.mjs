// Prove a finish changes only its material and UVs, preserving every physical record.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,candidatePath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const b=await read(basePath),c=await read(candidatePath),oldBytes=await readFile(b.layout),newBytes=await readFile(c.layout),old=JSON.parse(oldBytes),next=JSON.parse(newBytes);
assert.equal(sha(oldBytes),b.layoutSha256);assert.equal(sha(newBytes),c.layoutSha256);
const panel=next.panels.find(p=>p.id==='west-restaurant-floor');assert.equal(panel.uv.length,panel.vertices.length);delete panel.uv;
const oldMaterial=old.authoredMaterials.find(m=>m.id==='west-upper-west-material-2');next.authoredMaterials[next.authoredMaterials.findIndex(m=>m.id===oldMaterial.id)]=oldMaterial;
assert(eq(old,next),'Only floor UV and appearance metadata may change');
const ab=await readFile(b.geometry),db=await readFile(c.geometry);assert.equal(sha(ab),b.geometrySha256);assert.equal(sha(db),c.geometrySha256);
const a=readGLB(ab),d=readGLB(db);assert(d.bin.subarray(0,a.bin.length).equals(a.bin));assert.equal(d.json.meshes.length,a.json.meshes.length);
let changedPrimitives=0;for(let i=0;i<a.json.meshes.length;i++){
 const patched=structuredClone(d.json.meshes[i]);for(let k=0;k<patched.primitives.length;k++){
  const oldUV=a.json.meshes[i].primitives[k].attributes.TEXCOORD_0,newUV=patched.primitives[k].attributes.TEXCOORD_0;
  if(oldUV!==newUV){assert.equal(a.json.materials[patched.primitives[k].material].name,oldMaterial.label+' | Browser');patched.primitives[k].attributes.TEXCOORD_0=oldUV;changedPrimitives++;}
 }assert(eq(patched,a.json.meshes[i]),'Mesh geometry changed');
}
assert.equal(changedPrimitives,1);assert(eq(a.json.nodes,d.json.nodes));assert(eq(a.json.scenes,d.json.scenes));
assert.equal(a.json.materials.length,d.json.materials.length);for(let i=0;i<a.json.materials.length;i++)if(a.json.materials[i].name!==oldMaterial.label+' | Browser')assert(eq(a.json.materials[i],d.json.materials[i]));
for(const key of ['accessors','bufferViews','images','textures','samplers'])assert(eq(a.json[key],d.json[key].slice(0,a.json[key].length)),key+' prefix changed');
const proof={pass:true,parentLayoutSha256:b.layoutSha256,layoutSha256:c.layoutSha256,geometrySha256:c.geometrySha256,allPhysicalRecordsUnchanged:true,allPositionsNormalsIndicesAndNodesUnchanged:true,inheritedEncodedBytesUnchanged:true,changedUVPrimitives:changedPrimitives};
await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log('PASS floor finish: physical records, mesh geometry, nodes and inherited encoded buffers unchanged');
