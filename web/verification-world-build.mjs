import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MeshBVH} from 'three-mesh-bvh';
import {StaticWorld} from './public/physics/static-world.js';
import {decodeCollisionPack} from './public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from './public/physics/shot.js';
import {VERIFICATION_WORLD} from './verification-world.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const preserveNumber=(_,value)=>Object.is(value,-0)?{negativeZero:true}:value;
const point=p=>({x:p.x,y:p.y,z:p.z});
const bounds=b=>({min:point(b.min),max:point(b.max)});
function saveTree(node,solid){
 if(!node)return null;
 return {bounds:bounds(node.bounds),...(node.items?{items:node.items.map(s=>solid?{
  index:s.index,mask:s.mask,bounds:bounds(s.bounds),origin:point(s.origin),planes:s.planes.map(p=>({normal:point(p.normal),constant:p.constant}))
 }:{kind:s.kind,index:s.index,mask:s.mask,position:point(s.position),half:s.half,...(s.radius===undefined?{}:{radius:s.radius}),quaternion:s.quaternion.toArray(),inverse:s.inverse.toArray(),bounds:bounds(s.bounds)})}:{left:saveTree(node.left,solid),right:saveTree(node.right,solid)})};
}

// Hash exact Float32 bits, retaining negative zero. Open addressing avoids a
// temporary string/Map entry for every vertex while compiling the station.
function sharedVertices(vertices,index,order){
 const bits=new Uint32Array(vertices.buffer,vertices.byteOffset,vertices.length),count=vertices.length/3;
 let capacity=1;while(capacity<count*2)capacity*=2;
 const table=new Uint32Array(capacity),remap=new Uint32Array(count),unique=new Float32Array(vertices.length);let used=0;
 for(let i=0;i<count;i++){
  const p=i*3;let slot=(Math.imul(bits[p],73856093)^Math.imul(bits[p+1],19349663)^Math.imul(bits[p+2],83492791))&(capacity-1);
  while(table[slot]){
   const other=(table[slot]-1)*3;
   if(bits[p]===bits[other]&&bits[p+1]===bits[other+1]&&bits[p+2]===bits[other+2])break;
   slot=(slot+1)&(capacity-1);
  }
  if(table[slot])remap[i]=remap[table[slot]-1];
  else{table[slot]=i+1;remap[i]=used;unique.set(vertices.subarray(p,p+3),used*3);used++;}
 }
 // Bake the indirect triangle permutation into the index buffer. Query order
 // and BVH bounds stay identical; runtime needs no 9.6 MB permutation array.
 const reordered=new Uint32Array(index.length);
 for(let i=0;i<order.length;i++)for(let j=0;j<3;j++)reordered[i*3+j]=remap[index[order[i]*3+j]];
 return {vertices:unique.slice(0,used*3),index:reordered};
}

export function compileVerificationWorld(world){
 const serialized=world.bvh?MeshBVH.serialize(world.bvh,{cloneBuffers:false}):{roots:[],indirectBuffer:new Uint32Array()};
 const geometry=sharedVertices(world.geometry.attributes.position.array,world.geometry.index.array,serialized.indirectBuffer);
 const ids=[],profiles=[],profileIds=new Map(),profileIndices=new Uint16Array(world.info.length);
 for(const [index,info]of world.info.entries()){
  const {id,...surface}=info.surface,profile={surface,mask:info.mask,complex:info.complex},key=JSON.stringify(profile,preserveNumber);
  let at=profileIds.get(key);if(at===undefined){at=profiles.length;assert(at<65536);profileIds.set(key,at);profiles.push(profile);}
  ids.push(id);profileIndices[index]=at;
 }
 const metadata={layoutSha256:world.layoutSha256,fallLimitY:world.fallLimitY,escalators:world.escalators,ids,profiles,roots:serialized.roots.map((_,i)=>'root'+i),tree:saveTree(world.tree,false),solidTree:saveTree(world.solidTree,true),stats:{triangles:world.stats.triangles,primitives:world.stats.primitives,solids:world.stats.solids}};
 const ShapeType=ids.length<=65536?Uint16Array:Uint32Array;
 const arrays={...geometry,triangleShape:ShapeType.from(serialized.indirectBuffer,i=>world.triangleShape[i]),profiles:profileIndices};
 serialized.roots.forEach((root,i)=>arrays['root'+i]=new Uint8Array(root));
 return {metadata,arrays};
}

export async function emitVerificationWorld(compiled,writePart,{sourceSha256,partBytes=4*1024**2}={}){
 assert(Number.isInteger(partBytes)&&partBytes>0&&partBytes<=4*1024**2);
 async function emit(name,bytes){
  const parts=[];for(let start=0,i=0;start<bytes.byteLength;start+=partBytes,i++){
   const data=bytes.subarray(start,Math.min(bytes.byteLength,start+partBytes)),part={name:`${name}-${i}.bin`,bytes:data.byteLength,sha256:hash(data)};
   await writePart(part.name,data);parts.push(part);
  }
  return {bytes:bytes.byteLength,parts};
 }
 const metadataBytes=new TextEncoder().encode(JSON.stringify(compiled.metadata,preserveNumber));
 const manifest={kind:VERIFICATION_WORLD,complete:true,physics:BROWSER_PHYSICS,layoutSha256:compiled.metadata.layoutSha256,sourceSha256,metadata:await emit('metadata',metadataBytes),arrays:{}};
 for(const [name,array]of Object.entries(compiled.arrays)){
  const type=array instanceof Float32Array?'f32':array instanceof Uint32Array?'u32':array instanceof Uint16Array?'u16':'u8';
  manifest.arrays[name]={type,...await emit(name,new Uint8Array(array.buffer,array.byteOffset,array.byteLength))};
 }
 return manifest;
}

export async function buildVerificationWorld(){
 const output='.local/verification/world',bytes=await readFile('.local/browser-physics/station.collision.bin');
 const sourceSha256=hash(bytes),receipt=JSON.parse(await readFile('.local/browser-physics/station.collision.bin.json','utf8'));
 assert.equal(sourceSha256,receipt.sha256);assert.equal(bytes.length,receipt.bytes);
 const world=new StaticWorld(decodeCollisionPack(bytes));
 try{
  const compiled=compileVerificationWorld(world);
  try{const prior=JSON.parse(await readFile(output+'/manifest.json','utf8'));assert.equal(prior.kind,VERIFICATION_WORLD,'Refusing to replace unrelated data');await rm(output,{recursive:true});}
  catch(error){if(error.code!=='ENOENT')throw error;try{assert.equal((await readdir(output)).length,0,'Refusing to replace unrelated data');}catch(e){if(e.code!=='ENOENT')throw e;}}
  await mkdir(output,{recursive:true});await writeFile(output+'/manifest.json',JSON.stringify({kind:VERIFICATION_WORLD,complete:false})+'\n');
  const manifest=await emitVerificationWorld(compiled,(name,data)=>writeFile(output+'/'+name,data),{sourceSha256});
  await writeFile(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({output,sourceSha256,metadataBytes:manifest.metadata.bytes,arrayBytes:Object.values(manifest.arrays).reduce((n,a)=>n+a.bytes,0),vertices:compiled.arrays.vertices.length/3,originalVertices:world.geometry.attributes.position.count,shapes:compiled.metadata.ids.length,profiles:compiled.metadata.profiles.length}));
  return manifest;
 }finally{world.free();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildVerificationWorld();
