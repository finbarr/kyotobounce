// Apply a verified browser texture profile without re-exporting or changing geometry.
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir,copyFile}from'node:fs/promises';
import{resolve,parse}from'node:path';import{createHash}from'node:crypto';
import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[input,profileDir,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex'),bytes=await readFile(input+'/atrium.glb'),{json:j,bin}=readGLB(bytes),profileBytes=await readFile(profileDir+'/texture-profile.json'),profile=JSON.parse(profileBytes);
assert(j.buffers.length===1&&(j.extensionsUsed||[]).every(x=>x==='KHR_materials_emissive_strength'));const exportReport=JSON.parse(await readFile(input+'/atrium-export.json'));assert.equal(exportReport.layoutSha256,profile.sourceLayoutSha256);
const byName=new Map(profile.rows.filter(r=>r.resized).map(r=>[parse(r.file).name,r])),changes=[],replacements=new Map();
for(const image of j.images||[]){const row=byName.get(image.name);if(!row)continue;const view=j.bufferViews[image.bufferView],old=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),data=await readFile(profileDir+'/textures/'+row.file);
 assert.equal(sha(old),row.sourceSha256,'GLB image must be the unmodified source: '+image.name);assert.equal(sha(data),row.outputSha256);assert(!j.accessors.some(a=>a.bufferView===image.bufferView),'Image view is used as geometry');
 assert(!replacements.has(image.bufferView));replacements.set(image.bufferView,data);changes.push({name:image.name,oldSha256:sha(old),newSha256:sha(data),oldSize:row.sourceSize,newSize:row.outputSize,oldBytes:old.length,newBytes:data.length});
}
assert(changes.length>0);const parts=[];let offset=0,unchangedViews=0;
for(const[i,v]of j.bufferViews.entries()){assert(v.buffer===0&&!v.extensions);const old=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),b=replacements.get(i)||old;if(!replacements.has(i)){assert.equal(sha(b),sha(old));unchangedViews++;}v.byteOffset=offset;v.byteLength=b.length;parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;}
j.buffers=[{byteLength:offset}];const output=writeGLB(j,Buffer.concat(parts));await mkdir(out,{recursive:false});await writeFile(out+'/atrium.glb',output);await copyFile(input+'/station.json',out+'/station.json');
const proof={pass:true,inputGlbSha256:sha(bytes),outputGlbSha256:sha(output),profileSha256:sha(profileBytes),changes,unchangedBufferViews:unchangedViews,allGeometryAndOtherImageBytesUnchanged:true,sourceBytes:bytes.length,outputBytes:output.length,limits:['Restores the preceding municipal texture resolution policy; does not accept close-up facade detail or measure GPU allocation.']};
await writeFile(out+'/texture-profile-applied.json',JSON.stringify(proof,null,2)+'\n');await writeFile(out+'/atrium-export.json',JSON.stringify({...exportReport,glbBytes:output.length,browserTextureProfile:{profileSha256:sha(profileBytes),appliedReceipt:'texture-profile-applied.json',images:changes.length}},null,2)+'\n');console.log(JSON.stringify({images:changes.length,outputBytes:output.length}));
