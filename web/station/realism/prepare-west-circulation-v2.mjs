// Extract current western circulation evidence from the municipal source mesh.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const out=process.argv[2];assert(out?.startsWith('.local/'));
const source='.local/station-realism/station-shell/municipal-station.glb',bytes=await readFile(source),{json:j,bin}=readGLB(bytes);
const sha=b=>createHash('sha256').update(b).digest('hex');
function access(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],w={SCALAR:1,VEC3:3}[a.type],size={5123:2,5125:4,5126:4}[a.componentType];assert(w&&size&&!a.sparse);return Array.from({length:a.count},(_,n)=>Array.from({length:w},(_,k)=>{const p=(v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||w*size)+k*size;return a.componentType===5126?bin.readFloatLE(p):size===2?bin.readUInt16LE(p):bin.readUInt32LE(p);}));}
const objects=[];
for(const node of j.nodes){if(node.mesh===undefined)continue;assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale);
 const faces=[];let points=[];
 for(const [primitive,p]of j.meshes[node.mesh].primitives.entries()){
  const vs=access(p.attributes.POSITION);const bounds=[0,1,2].map(k=>[Math.min(...vs.map(v=>v[k])),Math.max(...vs.map(v=>v[k]))]);
  if(bounds[0][0]>-8||bounds[0][1]<-60||bounds[1][0]>17||bounds[1][1]<0||bounds[2][0]>10||bounds[2][1]<-28)continue;
  const ids=access(p.indices).flat();points.push(...vs);
  for(let n=0;n<ids.length;n+=3){const vertices=ids.slice(n,n+3).map(i=>vs[i]),[a,b,c]=vertices.map(v=>new T.Vector3(...v)),normal=b.sub(a).cross(c.sub(a)),area=normal.length()/2;normal.normalize();const center=[0,1,2].map(k=>vertices.reduce((s,v)=>s+v[k]/3,0));
   faces.push({primitive,face:n/3,vertices,center,normal:normal.toArray(),area});
  }
 }
 if(!faces.length)continue;
 const bounds=[0,1,2].map(k=>[Math.min(...points.map(v=>v[k])),Math.max(...points.map(v=>v[k]))]);
 const horizontal=faces.filter(f=>(f.normal[1]>.9999||node.name==='BuildingInstallation.2030'&&f.normal[1]<-.9999)&&f.center[0]>-60&&f.center[0]<-8&&f.center[2]>-28&&f.center[2]<10&&f.center[1]>0&&f.center[1]<17);
 if(!horizontal.length)continue;
 objects.push({name:node.name,bounds,horizontal});
}
const levels={};for(const object of objects)for(const f of object.horizontal){const key=object.name+' '+f.center[1].toFixed(3);const row=levels[key]??={faces:0,area:0};row.faces++;row.area+=f.area;}
await mkdir(out,{recursive:true});await writeFile(out+'/source.json',JSON.stringify({source,sourceSha256:sha(bytes),builderSha256:sha(await readFile(new URL(import.meta.url))),objects,levels})+'\n');
console.log(JSON.stringify(Object.entries(levels).filter(([k,v])=>k.startsWith('Untitled.200')||v.area>8)));
