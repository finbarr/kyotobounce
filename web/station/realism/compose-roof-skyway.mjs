// Package explicitly selected construction components for inspection.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [out,...directories]=process.argv.slice(2);assert(out&&directories.length>=1);assert(resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const j={asset:{version:'2.0',generator:'Kyoto construction assembly'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],buffers:[],bufferViews:[],accessors:[]},parts=[],panels=[],escalators=[],combSupports=[],inputs=[];let offset=0;
for(const dir of directories){assert(resolve(dir).startsWith(resolve('.local')+'/'));const report=JSON.parse(await readFile(dir+'/report.json')),bytes=await readFile(dir+'/'+(report.outputs.glbFile||'west-roof.glb')),nativeBytes=await readFile(dir+'/native-panels.json'),native=JSON.parse(nativeBytes),g=readGLB(bytes);assert.equal(sha(bytes),report.outputs.glbSha256);assert.equal(sha(nativeBytes),report.outputs.nativePanelsSha256);assert(g.json.buffers.length===1&&!g.json.extensionsUsed);
const imageOffset=j.images?.length||0,textureOffset=j.textures?.length||0,samplerOffset=j.samplers?.length||0;
const mat=j.materials.length,mesh=j.meshes.length,accessor=j.accessors.length,view=j.bufferViews.length,node=j.nodes.length;
const remapMaterial=source=>{const m=structuredClone(source);for(const info of [m.pbrMetallicRoughness?.baseColorTexture,m.pbrMetallicRoughness?.metallicRoughnessTexture,m.normalTexture,m.occlusionTexture,m.emissiveTexture])if(info)info.index+=textureOffset;return m;};
j.materials.push(...g.json.materials.map(remapMaterial));
if(g.json.images?.length){j.images||=[];j.images.push(...g.json.images.map(i=>{assert(Number.isInteger(i.bufferView)&&!i.uri,'Construction images must be embedded');return {...i,bufferView:i.bufferView+view};}));}
if(g.json.samplers?.length){j.samplers||=[];j.samplers.push(...g.json.samplers);}
if(g.json.textures?.length){j.textures||=[];j.textures.push(...g.json.textures.map(t=>({...t,source:t.source+imageOffset,...(t.sampler!==undefined?{sampler:t.sampler+samplerOffset}:{})})));}
j.bufferViews.push(...g.json.bufferViews.map(v=>({...v,byteOffset:(v.byteOffset||0)+offset})));j.accessors.push(...g.json.accessors.map(a=>({...a,bufferView:a.bufferView+view})));
j.meshes.push(...g.json.meshes.map(m=>({...m,primitives:m.primitives.map(p=>({...p,material:p.material+mat,indices:p.indices+accessor,attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,v+accessor]))}))})));
for(const n of g.json.nodes){assert(!n.children&&!n.matrix&&!n.translation&&!n.rotation&&!n.scale);j.nodes.push({...n,mesh:n.mesh+mesh});}j.scenes[0].nodes.push(...g.json.scenes[g.json.scene||0].nodes.map(n=>n+node));
const bytesLength=g.json.buffers[0].byteLength,body=g.bin.subarray(0,bytesLength),padding=Buffer.alloc((4-bytesLength%4)%4);parts.push(body,padding);offset+=body.length+padding.length;
escalators.push(...(native.escalators||[]));combSupports.push(...(native.combSupports||[]));
panels.push(...native.panels.map(p=>({...p,browserMaterial:(p.browserMaterial??(p.material==='glass'?0:1))+mat})));inputs.push({directory:dir,glbSha256:sha(bytes),nativePanelsSha256:sha(nativeBytes),panels:native.panels.length});}
assert(new Set(panels.map(p=>p.id)).size===panels.length,'Duplicate assembly IDs');j.buffers.push({byteLength:offset});
assert(new Set(escalators.map(e=>e.id)).size===escalators.length,'Duplicate escalator IDs');
const glb=writeGLB(j,Buffer.concat(parts)),nativeBytes=Buffer.from(JSON.stringify({schemaVersion:1,panels,...(escalators.length?{escalators,combSupports}:{})})+'\n');await writeFile(out+'/assembly.glb',glb);await writeFile(out+'/native-panels.json',nativeBytes);await writeFile(out+'/report.json',JSON.stringify({meaning:'Construction components only, not a complete station',inputs,panels:panels.length,outputs:{glbFile:'assembly.glb',glbSha256:sha(glb),nativePanelsSha256:sha(nativeBytes)}},null,2)+'\n');console.log(JSON.stringify({components:inputs.length,panels:panels.length,glbBytes:glb.length}));
