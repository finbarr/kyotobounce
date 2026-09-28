// Verify original ceramic image reuse, local UV coordinates and physical equivalence.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const[specPath,sourcePath,directory,previous,out]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex');
const sb=await readFile(specPath),spec=JSON.parse(sb),srcb=await readFile(sourcePath),src=readGLB(srcb),r=JSON.parse(await readFile(directory+'/report.json')),b=await readFile(directory+'/'+r.outputs.glbFile),g=readGLB(b),nb=await readFile(directory+'/native-panels.json'),n=JSON.parse(nb);
assert.equal(sha(sb),r.specSha256);assert.equal(sha(srcb),r.materialSourceSha256);assert.equal(sha(b),r.outputs.glbSha256);assert.equal(sha(nb),r.outputs.nativePanelsSha256);
function image(g,info){const t=g.json.textures[info.index],im=g.json.images[t.source],v=g.json.bufferViews[im.bufferView];return {sha256:sha(g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)),sampler:g.json.samplers[t.sampler],info:{...info,index:undefined}};}
const images=[];
for(const channel of ['baseColorTexture','metallicRoughnessTexture','normalTexture']){const a=channel==='normalTexture'?src.json.materials[0][channel]:src.json.materials[0].pbrMetallicRoughness[channel],c=channel==='normalTexture'?g.json.materials[0][channel]:g.json.materials[0].pbrMetallicRoughness[channel];const A=image(src,a),B=image(g,c);assert.deepEqual(A,B);images.push({channel,...B});}
const pr=g.json.meshes[0].primitives[0],a=g.json.accessors[pr.attributes.TEXCOORD_0],v=g.json.bufferViews[a.bufferView];let count=0;
for(const p of n.panels.filter(p=>p.browserMaterial===0)){const patch=spec.patches.find(q=>p.id.startsWith('court-adjacent-'+q.id+'-'));assert(patch);for(const q of p.vertices){const xyz=[q.x,q.y,-q.z],uv=[xyz.reduce((s,x,k)=>s+(x-patch.origin[k])*patch.u[k],0)/1.6,(q.y-35.35)/1.6];for(let k=0;k<2;k++)assert.equal(g.bin.readFloatLE(v.byteOffset+(count*2+k)*4),Math.fround(uv[k]));count++;}}
assert.equal(count,a.count);for(const mesh of g.json.meshes.slice(1))assert.equal(mesh.primitives[0].attributes.TEXCOORD_0,undefined);
const pb=await readFile(previous+'/native-panels.json'),old=JSON.parse(pb),physical=p=>p.panels.map(({browserMaterial,...q})=>q);assert.deepEqual(physical(n),physical(old));
const proof={glbSha256:sha(b),nativePanelsSha256:sha(nb),previousNativePanelsSha256:sha(pb),originalCeramicImageSemanticsMatch:true,images,uvVertices:count,unusedUVsAbsent:true,allNativeGeometryAndPhysicalMaterialsIdentical:true,meaning:'Final dark-joint appearance revision only changes browser material indices. All physical records match the component that received the native ray test. Source camera/dimension and full installation checks remain separate.',pass:true};await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,images:images.length}));
