// Verify every emitted coordinate and triangle index, including composed material batches.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [directory,out]=process.argv.slice(2);assert(directory&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const report=JSON.parse(await readFile(directory+'/report.json')),glb=await readFile(directory+'/'+report.outputs.glbFile),nativeBytes=await readFile(directory+'/native-panels.json'),panels=JSON.parse(nativeBytes).panels,sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(glb),report.outputs.glbSha256);assert.equal(sha(nativeBytes),report.outputs.nativePanelsSha256);
const {json:j,bin}=readGLB(glb),vertices=j.materials.map(()=>0),triangles=j.materials.map(()=>0);let maximumErrorM=0;
for(const panel of panels){const m=panel.browserMaterial;assert(Number.isInteger(m)&&m>=0&&m<j.meshes.length);const primitive=j.meshes[m].primitives[0];assert.equal(primitive.material,m);const pa=j.accessors[primitive.attributes.POSITION],pv=j.bufferViews[pa.bufferView],ia=j.accessors[primitive.indices],iv=j.bufferViews[ia.bufferView];assert(pa.componentType===5126&&ia.componentType===5125);for(const [i,v] of panel.vertices.entries()){const at=pv.byteOffset+(vertices[m]+i)*12;const actual=[bin.readFloatLE(at),bin.readFloatLE(at+4),bin.readFloatLE(at+8)];maximumErrorM=Math.max(maximumErrorM,Math.hypot(actual[0]-v.x,actual[1]-v.y,actual[2]+v.z));}for(let i=0;i<panel.triangles.length;i+=3)for(let k=0;k<3;k++)assert.equal(bin.readUInt32LE(iv.byteOffset+(triangles[m]+i+k)*4),vertices[m]+panel.triangles[i+2-k]);vertices[m]+=panel.vertices.length;triangles[m]+=panel.triangles.length;}
assert(maximumErrorM<1e-5);for(let m=0;m<j.meshes.length;m++){const p=j.meshes[m].primitives[0];assert.equal(vertices[m],j.accessors[p.attributes.POSITION].count);assert.equal(triangles[m],j.accessors[p.indices].count);}
const result={glbSha256:sha(glb),nativePanelsSha256:sha(nativeBytes),panels:panels.length,vertices:vertices.reduce((a,b)=>a+b,0),triangles:triangles.reduce((a,b)=>a+b,0)/3,materials:j.materials.length,maximumErrorM,windingAndIndicesMatch:true};await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
