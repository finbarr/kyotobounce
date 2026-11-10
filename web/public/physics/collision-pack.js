// Layout-derived geometry only: no texture, normal, UV or research payloads.
const MAGIC='KYOTOCOL',VERSION=1,HEADER=16;
export function encodeCollisionPack(metadata,arrays){
 const json=new TextEncoder().encode(JSON.stringify(metadata)),offset=Math.ceil((HEADER+json.length)/4)*4;
 const bytes=new Uint8Array(offset+arrays.reduce((n,a)=>n+a.byteLength,0)),view=new DataView(bytes.buffer);
 bytes.set(new TextEncoder().encode(MAGIC));view.setUint32(8,VERSION,true);view.setUint32(12,json.length,true);bytes.set(json,HEADER);
 let at=offset;for(const a of arrays){bytes.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),at);at+=a.byteLength;}
 return bytes;
}
export function decodeCollisionPack(buffer){
 if(ArrayBuffer.isView(buffer))buffer=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
 const view=new DataView(buffer),text=new TextDecoder();
 if(buffer.byteLength<HEADER||text.decode(new Uint8Array(buffer,0,8))!==MAGIC||view.getUint32(8,true)!==VERSION)throw Error('Unsupported station collision pack');
 const size=view.getUint32(12,true),offset=Math.ceil((HEADER+size)/4)*4;
 if(offset>buffer.byteLength)throw Error('Truncated station collision metadata');
 const metadata=JSON.parse(text.decode(new Uint8Array(buffer,HEADER,size)));
 function array(spec,Type){
  if(!spec||!Number.isSafeInteger(spec.offset)||!Number.isSafeInteger(spec.count)||spec.offset<0||spec.count<0||spec.offset%4||offset+spec.offset+spec.count*4>buffer.byteLength)throw Error('Invalid station collision buffer');
  return new Type(buffer,offset+spec.offset,spec.count);
 }
 if(!Array.isArray(metadata.shapes))throw Error('Missing station collision shapes');
 return {...metadata,shapes:metadata.shapes.map(s=>{
  if(s.kind!=='mesh')return s;
  const vertices=array(s.vertices,Float32Array),indices=array(s.indices,Uint32Array);
  if(vertices.length%3||indices.length%3||vertices.some(x=>!Number.isFinite(x))||indices.some(i=>i>=vertices.length/3))throw Error('Invalid station collision triangles');
  return {...s,vertices,indices};
 })};
}
