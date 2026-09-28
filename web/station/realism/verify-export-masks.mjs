// Verify actual exported image bytes, independently of Blender node traversal.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [root,input]=process.argv.slice(2);assert(root&&input,'Pass browser export and browser input directories');
const bytes=await readFile(root+'/atrium.glb'),layout=JSON.parse(await readFile(root+'/station.json')),glb=readGLB(bytes),files=await readdir(input+'/textures');
const report={exportSha256:createHash('sha256').update(bytes).digest('hex'),masks:[]};
for(const rec of layout.authoredMaterials.filter(m=>m.mask)){
 const material=glb.json.materials.find(m=>m.extras?.sourceLabel===rec.label);if(!material)continue;
 const texture=material.pbrMetallicRoughness.metallicRoughnessTexture;assert(texture,rec.label+' lost packed mask');
 const image=glb.json.images[glb.json.textures[texture.index].source],view=glb.json.bufferViews[image.bufferView];
 const actual=await sharp(glb.bin.subarray(view.byteOffset,view.byteOffset+view.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const stem=rec.mask.split('/').at(-1),name=files.find(f=>f.startsWith(stem+'.'));assert(name,'Missing mask source');
 const source=await sharp(input+'/textures/'+name).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(actual.info.width,source.info.width);assert.equal(actual.info.height,source.info.height);assert.equal(actual.data.length,source.data.length);let max=0;
 for(let i=0;i<source.data.length;i+=4)max=Math.max(max,Math.abs(actual.data[i+1]-(255-source.data[i+3])),Math.abs(actual.data[i+2]-source.data[i]));
 assert(max<=1,rec.label+' mask channel mismatch: '+max);report.masks.push({material:rec.label,sourceFile:name,width:source.info.width,height:source.info.height,maxByteError:max});
}
assert(report.masks.length,'No masks were exercised');await writeFile(root+'/mask-verification.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',report.masks.length,'exported masks');
