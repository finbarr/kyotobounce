// Append a small authored component to a selected station, retaining its encoded buffers.
// This avoids re-exporting unrelated station geometry for every interior fitting.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,parse} from 'node:path';
import {createHash} from 'node:crypto';
import {readGLB,writeGLB} from '../../tools/optimize-browser-assets.mjs';
const [manifestPath,component,out]=process.argv.slice(2);assert(manifestPath&&component&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex'),config=JSON.parse(await readFile(manifestPath));
const layoutBytes=await readFile(config.layout),layout=JSON.parse(layoutBytes),baseBytes=await readFile(config.geometry),{json:base,bin:baseBin}=readGLB(baseBytes),station=JSON.parse(await readFile(config.station));
assert.equal(sha(layoutBytes),config.layoutSha256);assert.equal(sha(baseBytes),config.geometrySha256);assert.equal(station.layoutSha256,config.layoutSha256);
const report=JSON.parse(await readFile(component+'/report.json')),partBytes=await readFile(component+'/'+report.outputs.glbFile),nativeBytes=await readFile(component+'/native-panels.json'),native=JSON.parse(nativeBytes),{json:part,bin:partBin}=readGLB(partBytes);
assert.equal(report.sourceLayoutSha256,config.layoutSha256);assert.equal(sha(partBytes),report.outputs.glbSha256);assert.equal(sha(nativeBytes),report.outputs.nativePanelsSha256);
assert(!part.extensionsUsed&&part.buffers.length===1,'Only static components with one embedded buffer');
assert((part.images||[]).every(i=>Number.isInteger(i.bufferView)&&!i.uri&&['image/png','image/jpeg'].includes(i.mimeType)),'Component images must be embedded');
assert(!native.escalators&&!native.combSupports,'Moving hardware requires coordinated integration');
const j=structuredClone(base),viewOffset=j.bufferViews.length,accessorOffset=j.accessors.length,meshOffset=j.meshes.length,nodeOffset=j.nodes.length,byteOffset=j.buffers[0].byteLength;
assert.equal(byteOffset%4,0);assert.equal(baseBin.length,byteOffset);
const imageOffset=(j.images||[]).length,textureOffset=(j.textures||[]).length,samplerOffset=(j.samplers||[]).length;
if(part.images){j.images??=[];j.images.push(...part.images.map(i=>({...i,bufferView:i.bufferView+viewOffset})));}
if(part.samplers){j.samplers??=[];j.samplers.push(...part.samplers);}
if(part.textures){j.textures??=[];j.textures.push(...part.textures.map(t=>{assert(Number.isInteger(t.source)&&!t.extensions);return {...t,source:t.source+imageOffset,...(t.sampler===undefined?{}:{sampler:t.sampler+samplerOffset})};}));}
const materialMap=part.materials.map(input=>{const material=structuredClone(input);for(const info of [material.pbrMetallicRoughness?.baseColorTexture,material.pbrMetallicRoughness?.metallicRoughnessTexture,material.normalTexture,material.emissiveTexture,material.occlusionTexture])if(info)info.index+=textureOffset;return material;}).map(material=>{const index=j.materials.findIndex(m=>m.name===material.name);if(index>=0)return index;j.materials.push(material);return j.materials.length-1;});
j.bufferViews.push(...part.bufferViews.map(v=>{assert(v.buffer===0&&!v.extensions);return {...v,byteOffset:(v.byteOffset||0)+byteOffset};}));
j.accessors.push(...part.accessors.map(a=>{assert(!a.sparse);return {...a,bufferView:a.bufferView+viewOffset};}));
j.meshes.push(...part.meshes.map(m=>({...m,primitives:m.primitives.map(p=>{assert(!p.targets&&!p.extensions);return {...p,material:materialMap[p.material],indices:p.indices+accessorOffset,attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,v+accessorOffset]))};})})));
j.nodes.push(...part.nodes.map(n=>{assert(n.mesh!==undefined&&!n.children&&!n.matrix&&!n.translation&&!n.rotation&&!n.scale);return {...n,mesh:n.mesh+meshOffset};}));
j.scenes[j.scene||0].nodes.push(...part.scenes[part.scene||0].nodes.map(n=>n+nodeOffset));
j.buffers[0].byteLength=byteOffset+part.buffers[0].byteLength;
const names=new Set(layout.panels.map(p=>p.id));
for(const p of native.panels){assert(!names.has(p.id),'Duplicate component panel: '+p.id);names.add(p.id);const material=j.materials[materialMap[p.browserMaterial]],label=material.name.replace(/ \| Browser$/,'');
 let appearance=layout.authoredMaterials.find(m=>m.label===label);
 if(!appearance){const color=material.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1];appearance={id:'v2-material-'+materialMap[p.browserMaterial],label,physical:p.material,linearColor:Object.fromEntries(['r','g','b','a'].map((k,i)=>[k,color[i]])),alpha:color[3],metallic:material.pbrMetallicRoughness?.metallicFactor??1,roughness:material.pbrMetallicRoughness?.roughnessFactor??1};if(material.emissiveFactor)Object.assign(appearance,{emission:1,emissionColor:Object.fromEntries(['r','g','b'].map((k,i)=>[k,material.emissiveFactor[i]]))});layout.authoredMaterials.push(appearance);}
 if(report.texture?.material===material.name){assert(material.pbrMetallicRoughness?.baseColorTexture);appearance.albedo='AtriumTextures/'+parse(report.texture.file).name;}
 const {browserMaterial,...panel}=p;layout.panels.push({...panel,appearance:appearance.id,vertices:panel.vertices.map(v=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,Math.fround(n)])))});
}
const lightNames=new Set(layout.authoredLights.map(l=>l.id));
for(const light of native.authoredLights||[]){
 assert(!lightNames.has(light.id),'Duplicate component light: '+light.id);lightNames.add(light.id);
 for(const key of ['position','direction'])assert(['x','y','z'].every(k=>Number.isFinite(light[key]?.[k])));
 assert(Math.abs(Math.hypot(...['x','y','z'].map(k=>light.direction[k]))-1)<.0001);
 assert(['r','g','b'].every(k=>Number.isFinite(light.linearColor?.[k])&&light.linearColor[k]>=0));
 assert(light.intensity>=0&&Number.isFinite(light.intensity)&&light.range>0&&Number.isFinite(light.range));
 assert(light.innerSpotAngle>=0&&light.innerSpotAngle<=light.spotAngle&&light.spotAngle<180);
 layout.authoredLights.push(light);
}
station.authoredLights=layout.authoredLights;
// Exact prefix checks cover all inherited geometry, materials, images and compressed data.
for(const key of ['accessors','bufferViews','meshes','nodes','materials'])assert.deepEqual(j[key].slice(0,base[key].length),base[key]);
for(const key of ['images','textures','samplers'])assert.deepEqual((j[key]||[]).slice(0,(base[key]||[]).length),base[key]||[]);
layout.architecture.v2Components=[...(layout.architecture.v2Components||[]),{source:component,glbSha256:sha(partBytes),nativeSha256:sha(nativeBytes),panels:native.panels.length,scope:report.scope}];
const composedLayout=JSON.stringify(layout)+'\n',composed=writeGLB(j,Buffer.concat([baseBin,partBin.subarray(0,part.buffers[0].byteLength)]));
assert(readGLB(composed).bin.subarray(0,byteOffset).equals(baseBin),'Every inherited encoded buffer byte is unchanged');
station.layoutSha256=sha(composedLayout);station.authoredMaterials=layout.authoredMaterials;
await mkdir(out,{recursive:true});await writeFile(out+'/station-layout.json',composedLayout);await writeFile(out+'/atrium.runtime.glb',composed);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');
const next={...config,layout:out+'/station-layout.json',layoutSha256:sha(composedLayout),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(composed),station:out+'/station.json',sourceComponents:[...(config.sourceComponents||[]),{directory:component,builder:report.builder,builderSha256:report.builderSha256,glbSha256:sha(partBytes),nativeSha256:sha(nativeBytes)}]};
await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');await writeFile(out+'/composition.json',JSON.stringify({parent:config,component:report,layoutSha256:sha(composedLayout),geometrySha256:sha(composed),inheritedBinaryBytes:byteOffset,addedGeometryBytes:composed.length-baseBytes.length,addedPanels:native.panels.length,addedLights:(native.authoredLights||[]).length,addedDrawBatches:part.meshes.length,originalBuffersExact:true},null,2)+'\n');console.log(JSON.stringify({layout:next.layoutSha256,geometry:next.geometrySha256,addedBytes:composed.length-baseBytes.length,panels:native.panels.length}));
