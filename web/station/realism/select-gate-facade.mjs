// Select the lower gate facade without importing the obsolete sample floor or upper bay.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [dir,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const rb=await readFile(dir+'/report.json'),report=JSON.parse(rb),nb=await readFile(dir+'/native-panels.json'),native=JSON.parse(nb),gb=await readFile(dir+'/'+report.outputs.glbFile);
assert.equal(sha(nb),report.outputs.nativePanelsSha256);assert.equal(sha(gb),report.outputs.glbSha256);
const prefixes=['hall-bay-gate-','hall-bay-west-gate-','hall-bay-east-gate-','hall-bay-soffit-'];
const selected=native.panels.filter(p=>prefixes.some(s=>p.id.startsWith(s)));
assert.equal(selected.length,452);assert(!selected.some(p=>p.role.includes('floor')));
const {json:source,bin}=readGLB(gb),j=structuredClone(source),used=[...new Set(selected.map(p=>p.browserMaterial))].sort((a,b)=>a-b),remap=new Map(used.map((m,i)=>[m,i]));
assert(!source.extensionsUsed&&source.buffers.length===1);
// Keep original embedded images and append exact attribute slices. Unreferenced source
// accessors are harmless; no source geometry is referenced by the replacement scene.
j.materials=used.map(m=>source.materials[m]);j.meshes=[];j.nodes=[];j.scenes=[{nodes:used.map((_,i)=>i)}];j.scene=0;
const parts=[bin],padding=Buffer.alloc((4-bin.length%4)%4);parts.push(padding);let offset=bin.length+padding.length;
function append(bytes,type,componentType,count,target,min,max){
 const view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});parts.push(bytes);offset+=bytes.length;
 const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;
 const id=j.accessors.length;j.accessors.push({bufferView:view,componentType,count,type,...(min?{min,max}:{})});return id;
}
function sliceAccessor(id,start,count){const a=source.accessors[id],v=source.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5126:4,5125:4,5123:2}[a.componentType];assert(width&&size&&!a.sparse&&!v.byteStride);const from=(v.byteOffset||0)+(a.byteOffset||0)+start*width*size;return bin.subarray(from,from+count*width*size);}
const sourceOffsets=Array(source.materials.length).fill(0),rows=[];
for(const p of native.panels){const start=sourceOffsets[p.browserMaterial];sourceOffsets[p.browserMaterial]+=p.vertices.length;if(selected.includes(p))rows.push({p,start});}
for(const old of used){const mi=remap.get(old),primitive=source.meshes[old].primitives[0];assert.equal(primitive.material,old);const group=rows.filter(r=>r.p.browserMaterial===old),attributes={},count=group.reduce((n,r)=>n+r.p.vertices.length,0);
 for(const [key,id]of Object.entries(primitive.attributes)){const a=source.accessors[id],bytes=Buffer.concat(group.map(r=>sliceAccessor(id,r.start,r.p.vertices.length)));let min,max;
  if(key==='POSITION'){min=[Infinity,Infinity,Infinity];max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<count;i++)for(let k=0;k<3;k++){const x=bytes.readFloatLE(i*12+k*4);min[k]=Math.min(min[k],x);max[k]=Math.max(max[k],x);}}
  attributes[key]=append(bytes,a.type,a.componentType,count,34962,min,max);
 }
 let start=0;const indices=[];for(const {p}of group){for(let i=0;i<p.triangles.length;i+=3)indices.push(start+p.triangles[i+2],start+p.triangles[i+1],start+p.triangles[i]);start+=p.vertices.length;}
 const ix=new Uint32Array(indices),id=append(Buffer.from(ix.buffer),'SCALAR',5125,ix.length,34963);j.meshes.push({primitives:[{attributes,indices:id,material:mi,mode:4}]});j.nodes.push({name:j.materials[mi].name,mesh:mi});
}
j.buffers=[{byteLength:offset}];const outputGLB=writeGLB(j,Buffer.concat(parts)),outputNative=Buffer.from(JSON.stringify({schemaVersion:1,panels:selected.map(p=>({...p,browserMaterial:remap.get(p.browserMaterial)}))})+'\n');
await mkdir(out,{recursive:false});await writeFile(out+'/gate-facade.glb',outputGLB);await writeFile(out+'/native-panels.json',outputNative);
const result={status:'Lower gate facade selected for coordinated integration; no floor or upper bay.',source:{directory:dir,glbSha256:sha(gb),nativeSha256:sha(nb),reportSha256:sha(rb)},selection:{prefixes,selected:selected.map(p=>p.id),omitted:native.panels.filter(p=>!selected.includes(p)).map(p=>p.id)},geometry:{panels:selected.length,triangles:selected.reduce((n,p)=>n+p.triangles.length/3,0),materials:used.length},preservation:'Original native geometry and physical fields retained. POSITION, NORMAL and UV attribute bytes copied exactly; only browser material indices remapped.',outputs:{glbFile:'gate-facade.glb',glbSha256:sha(outputGLB),nativePanelsSha256:sha(outputNative)}};await writeFile(out+'/report.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.geometry));
