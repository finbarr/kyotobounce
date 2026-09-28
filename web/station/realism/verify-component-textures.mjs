// Resolve texture references to embedded bytes and compare source semantics after composition.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [directory,out]=process.argv.slice(2);assert(directory&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex'),r=JSON.parse(await readFile(directory+'/report.json')),bytes=await readFile(directory+'/'+r.outputs.glbFile),result=readGLB(bytes);assert.equal(sha(bytes),r.outputs.glbSha256);
const imageBytes=(g,i)=>{const im=g.json.images[i],v=g.json.bufferViews[im.bufferView];assert(!im.uri&&im.mimeType==='image/png');return g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);};
function materialMeaning(g,mat){const m=structuredClone(mat);for(const info of [m.pbrMetallicRoughness?.baseColorTexture,m.pbrMetallicRoughness?.metallicRoughnessTexture,m.normalTexture,m.occlusionTexture,m.emissiveTexture])if(info){const t=g.json.textures[info.index];info.imageSha256=sha(imageBytes(g,t.source));info.sampler=g.json.samplers[t.sampler];delete info.index;}return m;}
function uvBytes(g,p){if(p.attributes.TEXCOORD_0===undefined)return null;const a=g.json.accessors[p.attributes.TEXCOORD_0],v=g.json.bufferViews[a.bufferView];assert(a.componentType===5126&&a.type==='VEC2'&&!a.sparse&&!v.byteStride);const start=(v.byteOffset||0)+(a.byteOffset||0);return g.bin.subarray(start,start+a.count*8);}
let material=0,mesh=0,uvVertices=0;const inputs=[];
for(const input of r.inputs){const report=JSON.parse(await readFile(input.directory+'/report.json')),b=await readFile(input.directory+'/'+report.outputs.glbFile),g=readGLB(b);assert.equal(sha(b),input.glbSha256);for(const m of g.json.materials)assert.deepEqual(materialMeaning(result,result.json.materials[material++]),materialMeaning(g,m));for(const m of g.json.meshes){const target=result.json.meshes[mesh++];assert.equal(target.primitives.length,m.primitives.length);for(let i=0;i<m.primitives.length;i++){const a=uvBytes(g,m.primitives[i]),b=uvBytes(result,target.primitives[i]);assert.equal(a===null,b===null);if(a){assert(a.equals(b));uvVertices+=a.length/8;}}}inputs.push({directory:input.directory,glbSha256:sha(b)});}
assert.equal(material,result.json.materials.length);assert.equal(mesh,result.json.meshes.length);
const images=[];for(let i=0;i<(result.json.images?.length||0);i++){const b=imageBytes(result,i),meta=await sharp(b).metadata();images.push({index:i,width:meta.width,height:meta.height,bytes:b.length,sha256:sha(b)});}
const report={glbSha256:sha(bytes),inputs,materialSemanticsMatch:true,uvVertices,embeddedImages:images,decodedRgba8MipEstimateBytes:images.reduce((n,i)=>n+i.width*i.height*4*4/3,0),pass:true};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
