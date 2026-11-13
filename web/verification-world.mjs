import {Vector3,Quaternion,Box3,BufferAttribute,BufferGeometry} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {StaticWorld} from './public/physics/static-world.js';
import {BROWSER_PHYSICS} from './public/physics/shot.js';

export const VERIFICATION_WORLD='kyoto-verification-world-1';
const vector=p=>new Vector3(p.x,p.y,p.z);
const box=b=>new Box3(vector(b.min),vector(b.max));
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const types={f32:Float32Array,u32:Uint32Array,u16:Uint16Array,u8:Uint8Array};
function restoreNumbers(value){
 if(!value||typeof value!=='object')return value;
 if(value.negativeZero===true&&Object.keys(value).length===1)return -0;
 for(const key of Object.keys(value))value[key]=restoreNumbers(value[key]);
 return value;
}

class CachedPrimitive{
 constructor(saved,faces){Object.assign(this,saved,{bounds:box(saved.bounds),position:vector(saved.position),quaternion:new Quaternion(...saved.quaternion),inverse:new Quaternion(...saved.inverse),faces});}
 get walkerFaces(){return this.faces.get(this.index);}
 set walkerFaces(value){if(this.faces.size>=128)this.faces.delete(this.faces.keys().next().value);this.faces.set(this.index,value);}
}
function restoreTree(saved,solid,faces){
 if(!saved)return null;
 const node={bounds:box(saved.bounds)};
 if(saved.items)node.items=saved.items.map(s=>solid?{
  ...s,bounds:box(s.bounds),origin:vector(s.origin),planes:s.planes.map(p=>({normal:vector(p.normal),constant:p.constant}))
 }:new CachedPrimitive(s,faces));
 else{node.left=restoreTree(saved.left,solid,faces);node.right=restoreTree(saved.right,solid,faces);}
 return node;
}

// Restore the exact build-time BVH. Geometry, traversal order, shape IDs and
// double-precision primitive/solid data are unchanged. Only equal Float32
// vertices are shared and surface descriptions are materialized on demand.
export class VerificationWorld extends StaticWorld{
 constructor(metadata,arrays){
  super({layoutSha256:metadata.layoutSha256,fallLimitY:metadata.fallLimitY,shapes:[],escalators:metadata.escalators});
  this.geometry.dispose();this.geometry=new BufferGeometry();
  this.geometry.setAttribute('position',new BufferAttribute(arrays.vertices,3));
  this.geometry.setIndex(new BufferAttribute(arrays.index,1));
  this.triangleShape=arrays.triangleShape;
  const roots=metadata.roots.map(name=>arrays[name].buffer);
  this.bvh=roots.length?MeshBVH.deserialize({version:1,roots,index:arrays.index,indirectBuffer:null},this.geometry,{setIndex:false}):null;
  this.tree=restoreTree(metadata.tree,false,new Map());this.solidTree=restoreTree(metadata.solidTree,true);
  this.stats={...metadata.stats,queries:0,triangleTests:0};
  const {ids,profiles}=metadata,indices=arrays.profiles,cache=new Map();
  // Existing sweep/capsule code indexes info directly. This bounded view keeps
  // those exact routines without allocating 60,179 surface objects at startup.
  this.info=new Proxy(Object.create(null),{get:(_,key)=>{
   if(key==='length')return ids.length;
   if(typeof key!=='string'||!/^\d+$/.test(key))return undefined;
   const index=Number(key);if(index>=ids.length)return undefined;
   let info=cache.get(index);if(info)return info;
   const p=profiles[indices[index]];
   info={surface:{id:ids[index],...p.surface},mask:p.mask,complex:p.complex};
   if(cache.size>=2048)cache.clear();cache.set(index,info);return info;
  }});
 }
}

// readPart is a trusted deployment asset reader, never a client-selected URL.
// Verify bounded chunks before copying into each final allocation. There is no
// full collision archive, decoded mesh tree, or BVH construction in the request.
export async function loadVerificationWorld(manifest,readPart){
 if(manifest.kind!==VERIFICATION_WORLD||!manifest.complete||manifest.physics!==BROWSER_PHYSICS)throw Error('Incompatible verification world');
 async function section(entry){
  if(!Number.isSafeInteger(entry.bytes)||entry.bytes<0||entry.bytes>64*1024**2||!Array.isArray(entry.parts))throw Error('Invalid verification world section');
  const bytes=new Uint8Array(entry.bytes);let offset=0;
  for(const part of entry.parts){
   if(!/^[a-zA-Z0-9-]+\.bin$/.test(part.name)||!Number.isSafeInteger(part.bytes)||part.bytes<=0||part.bytes>4*1024**2||offset+part.bytes>bytes.length)throw Error('Invalid verification world part');
   const data=await readPart(part.name);
   if(!(data instanceof Uint8Array)||data.byteLength!==part.bytes||hex(await crypto.subtle.digest('SHA-256',data))!==part.sha256)throw Error('Verification world checksum mismatch');
   bytes.set(data,offset);offset+=data.byteLength;
  }
  if(offset!==bytes.length)throw Error('Incomplete verification world section');
  return bytes;
 }
 // A JSON reviver makes V8 retain source-context objects for every scalar.
 // Restore the few signed zeros in place after an ordinary bounded parse.
 const metadata=restoreNumbers(JSON.parse(new TextDecoder().decode(await section(manifest.metadata))));
 if(metadata.layoutSha256!==manifest.layoutSha256)throw Error('Verification world layout mismatch');
 const arrays={};
 for(const [name,entry]of Object.entries(manifest.arrays)){
  const Type=types[entry.type];if(!Type||entry.bytes%Type.BYTES_PER_ELEMENT)throw Error('Invalid verification world array');
  arrays[name]=new Type((await section(entry)).buffer);
 }
 return new VerificationWorld(metadata,arrays);
}
