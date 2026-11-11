// Large station files are split only for delivery. The decoder receives the
// original bytes, verified before use, on static hosts with per-file limits.
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
async function download(path,progress,fetcher,expected){
 const response=await fetcher(path);if(!response.ok)throw Error(`Asset unavailable: ${path}`);
 const reader=response.body?.getReader();
 if(!reader){const buffer=await response.arrayBuffer();if(expected!==undefined&&buffer.byteLength!==expected)throw Error(`Asset size mismatch: ${path}`);progress(buffer.byteLength);return new Uint8Array(buffer);}
 const chunks=[],bytes=expected===undefined?null:new Uint8Array(expected);let size=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;
   if(bytes&&size+value.byteLength>bytes.length)throw Error(`Asset size mismatch: ${path}`);
   if(bytes)bytes.set(value,size);else chunks.push(value);size+=value.byteLength;progress(size);
  }
 }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 if(bytes){if(size!==bytes.length)throw Error(`Asset size mismatch: ${path}`);return bytes;}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
export async function loadAsset(path,onProgress=()=>{},{fetcher=fetch,asset}={}){
 if(asset&&(!Number.isSafeInteger(asset.bytes)||asset.bytes<1||!checksum(asset.sha256)))throw Error(`Invalid asset manifest: ${path}`);
 let bytes;
 if(asset?.parts){
  let total=0;
  if(!Array.isArray(asset.parts)||!asset.parts.length||asset.parts.length>128)throw Error(`Invalid asset parts: ${path}`);
  const parts=asset.parts.map(p=>{
   if(!/^\/assets\/chunks\/[a-f0-9]{64}\/\d{4}\.bin$/.test(p.url)||!checksum(p.sha256)||!Number.isSafeInteger(p.bytes)||p.bytes<1||p.bytes>25*1024**2)throw Error(`Invalid asset part: ${path}`);
   const part={...p,offset:total,loaded:0};total+=p.bytes;return part;
  });
  if(total!==asset.bytes)throw Error(`Asset parts size mismatch: ${path}`);
  bytes=new Uint8Array(total);
  // Two bounded requests keep transfer moving without retaining a second full
  // copy of the station in a list of download buffers.
  let next=0;
  async function run(){while(next<parts.length){const part=parts[next++];
   const chunk=await download(part.url,n=>{part.loaded=n;onProgress(parts.reduce((sum,p)=>sum+p.loaded,0),false);},fetcher,part.bytes);
   if(await digest(chunk)!==part.sha256)throw Error(`Asset checksum mismatch: ${path}`);
   bytes.set(chunk,part.offset);
  }}
  await Promise.all([run(),run()]);
 }else bytes=await download(path,n=>onProgress(n,false),fetcher,asset?.bytes);
 if(asset&&await digest(bytes)!==asset.sha256)throw Error(`Asset checksum mismatch: ${path}`);
 onProgress(bytes.byteLength,true);return bytes.buffer;
}
export async function readAssetManifest({fetcher=fetch,required=false}={}){
 const response=await fetcher('/browser-build.json');
 if(!response.ok){if(!required&&response.status===404)return null;throw Error('The game release manifest is unavailable');}
 const manifest=await response.json();
 if(required&&(manifest.delivery!=='chunks-v1'||!manifest.files))throw Error('The game release manifest is invalid');
 return manifest;
}
let manifest;
export function assetManifest(){
 return manifest??=readAssetManifest({required:!!document.querySelector('meta[name=kyoto-assets]')});
}
