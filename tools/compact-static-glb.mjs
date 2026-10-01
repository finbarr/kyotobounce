// Repack a static GLB after triangle removal. Only live vertices, materials and
// image payloads are copied; compression must round-trip every attribute byte.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {readGLB,writeGLB} from './optimize-browser-assets.mjs';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},sizes={5121:1,5123:2,5125:4,5126:4};
export function readAccessor(j,bin,index){
 const a=j.accessors[index],v=j.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression;
 assert(!a.sparse&&widths[a.type]&&sizes[a.componentType]);
 const size=widths[a.type]*sizes[a.componentType],stride=v.byteStride||size;
 let src=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
 if(e){src=Buffer.alloc(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(src,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
 const data=Buffer.alloc(a.count*size);
 for(let i=0;i<a.count;i++)src.copy(data,i*size,(a.byteOffset||0)+i*stride,(a.byteOffset||0)+i*stride+size);
 return {data,size,definition:a};
}
export function indices(j,bin,p){
 if(p.indices===undefined)return Array.from({length:j.accessors[p.attributes.POSITION].count},(_,i)=>i);
 const a=readAccessor(j,bin,p.indices);
 return Array.from({length:a.definition.count},(_,i)=>a.size===4?a.data.readUInt32LE(i*4):a.size===2?a.data.readUInt16LE(i*2):a.data[i]);
}
function digest(streams,list){
 const hash=createHash('sha256');
 for(const i of list)for(const s of streams)hash.update(s.data.subarray(i*s.size,(i+1)*s.size));
 return hash.digest('hex');
}
export function compactStaticGLB(source,select){
 const {json:old,bin}=readGLB(source),j=structuredClone(old);
 assert(!j.animations?.length&&!j.skins?.length,'Only static geometry is supported');
 const chunks=[],proof=[],stats={sourceBytes:source.length,trianglesRemoved:0,trianglesKept:0,verticesRemoved:0};let offset=0,decoded=0;
 j.bufferViews=[];j.accessors=[];
 function append(b){const start=offset;chunks.push(b);offset+=b.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}return start;}
 function add(data,definition,target){
  const size=widths[definition.type]*sizes[definition.componentType],mode=target===34963?'INDICES':'ATTRIBUTES';
  const packed=Buffer.from(MeshoptEncoder.encodeGltfBuffer(data,definition.count,size,mode,0)),restored=Buffer.alloc(data.length);
  MeshoptDecoder.decodeGltfBuffer(restored,definition.count,size,packed,mode,'NONE');assert(restored.equals(data));
  const view=j.bufferViews.length;j.bufferViews.push({buffer:1,byteOffset:0,byteLength:data.length,...(target===34962?{byteStride:size}:{}),target,extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:append(packed),byteLength:packed.length,byteStride:size,count:definition.count,mode,filter:'NONE'}}});decoded+=data.length;
  const index=j.accessors.length;j.accessors.push({...definition,bufferView:view,byteOffset:0});return index;
 }
 for(let mi=0;mi<j.meshes.length;mi++){
  j.meshes[mi].primitives=[];
  for(const p of old.meshes[mi].primitives){
   assert((p.mode??4)===4&&!p.targets);
   const names=Object.keys(p.attributes).sort(),streams=names.map(n=>readAccessor(old,bin,p.attributes[n])),before=indices(old,bin,p),list=select(p,before,old,bin);
   assert.equal(list.length%3,0);stats.trianglesRemoved+=(before.length-list.length)/3;stats.trianglesKept+=list.length/3;
   if(!list.length)continue;
   const used=new Map(),vertices=[],remapped=new Uint32Array(list.length);
   list.forEach((v,i)=>{assert(Number.isInteger(v)&&v>=0&&v<streams[0].definition.count);if(!used.has(v)){used.set(v,vertices.length);vertices.push(v);}remapped[i]=used.get(v);});
   stats.verticesRemoved+=streams[0].definition.count-vertices.length;
   const output={...p,attributes:{}};
   for(let k=0;k<names.length;k++){
    const s=streams[k],b=Buffer.alloc(vertices.length*s.size),def={...s.definition,count:vertices.length};
    vertices.forEach((v,i)=>s.data.copy(b,i*s.size,v*s.size,(v+1)*s.size));
    if(def.type==='VEC3'&&def.componentType===5126){def.min=[Infinity,Infinity,Infinity];def.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<vertices.length;i++)for(let a=0;a<3;a++){const v=b.readFloatLE(i*12+a*4);def.min[a]=Math.min(def.min[a],v);def.max[a]=Math.max(def.max[a],v);}}
    output.attributes[names[k]]=add(b,def,34962);
   }
   const b=Buffer.from(remapped.buffer);output.indices=add(b,{type:'SCALAR',componentType:5125,count:remapped.length},34963);
   j.meshes[mi].primitives.push(output);proof.push({mesh:mi,primitive:j.meshes[mi].primitives.length-1,digest:digest(streams,list)});
  }
 }
 const materialMap=new Map();j.materials=j.materials.filter((m,i)=>{if(!j.meshes.some(m=>m.primitives.some(p=>p.material===i)))return false;materialMap.set(i,materialMap.size);return true;});
 for(const m of j.meshes)for(const p of m.primitives)if(p.material!==undefined)p.material=materialMap.get(p.material);
 const textureInfos=[];
 function textureInfo(o){for(const [k,v]of Object.entries(o||{})){if(!v||typeof v!=='object')continue;if(/texture$/i.test(k)&&Number.isInteger(v.index))textureInfos.push(v);else textureInfo(v);}}
 j.materials.forEach(textureInfo);const texMap=new Map();j.textures=(j.textures||[]).filter((t,i)=>{if(!textureInfos.some(v=>v.index===i))return false;texMap.set(i,texMap.size);return true;});textureInfos.forEach(v=>v.index=texMap.get(v.index));
 const imageRefs=j.textures.flatMap(t=>[t,...Object.values(t.extensions||{})]).filter(r=>r.source!==undefined),imageMap=new Map();
 j.images=(j.images||[]).filter((im,i)=>{if(!imageRefs.some(r=>r.source===i))return false;imageMap.set(i,imageMap.size);return true;});imageRefs.forEach(r=>r.source=imageMap.get(r.source));
 for(const im of j.images){assert(im.uri===undefined);const v=old.bufferViews[im.bufferView],data=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);im.bufferView=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:append(data),byteLength:data.length});}
 j.buffers=[{byteLength:offset},{byteLength:decoded,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 j.extensionsUsed=[...new Set([...(j.extensionsUsed||[]),'EXT_meshopt_compression'])];j.extensionsRequired=[...new Set([...(j.extensionsRequired||[]),'EXT_meshopt_compression'])];
 // Verify the serialized compressed result before dropping the now-empty nodes.
 let result=writeGLB(j,Buffer.concat(chunks)),reopened=readGLB(result);
 for(const row of proof){const p=reopened.json.meshes[row.mesh].primitives[row.primitive],streams=Object.keys(p.attributes).sort().map(n=>readAccessor(reopened.json,reopened.bin,p.attributes[n]));assert.equal(digest(streams,indices(reopened.json,reopened.bin,p)),row.digest,'Retained ordered triangle attributes changed');}
 const meshMap=new Map(),nodeMap=new Map();j.meshes=j.meshes.filter((m,i)=>{if(!m.primitives.length)return false;meshMap.set(i,meshMap.size);return true;});
 j.nodes=j.nodes.filter((n,i)=>{if(n.mesh!==undefined&&!meshMap.has(n.mesh)){assert(!n.children?.length);return false;}nodeMap.set(i,nodeMap.size);return true;});
 for(const n of j.nodes){if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);if(n.children)n.children=n.children.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));}
 for(const s of j.scenes)s.nodes=s.nodes.filter(i=>nodeMap.has(i)).map(i=>nodeMap.get(i));
 result=writeGLB(j,Buffer.concat(chunks));stats.outputBytes=result.length;stats.verifiedPrimitives=proof.length;stats.materials=j.materials.length;stats.images=j.images.length;
 return {buffer:result,stats};
}
