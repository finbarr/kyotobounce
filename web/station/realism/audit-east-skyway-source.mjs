// Read-only eastern landing and descent survey of the licensed municipal mesh.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [sourcePath,out]=process.argv.slice(2);assert(sourcePath&&out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const bytes=await readFile(sourcePath),hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,'0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1');const {json:j,bin}=readGLB(bytes);
function acc(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],c={SCALAR:1,VEC3:3}[a.type],b=a.componentType===5123?2:4;assert(c&&!a.sparse);return Array.from({length:a.count},(_,n)=>Array.from({length:c},(_,k)=>{const o=(v.byteOffset||0)+(a.byteOffset||0)+n*(v.byteStride||c*b)+k*b;return a.componentType===5126?bin.readFloatLE(o):b===2?bin.readUInt16LE(o):bin.readUInt32LE(o)}));}
const limits=[[68,118],[27,48],[-29,21]],faces=[],groups=new Map();
for(const node of j.nodes){assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale);if(node.mesh===undefined)continue;for(const [primitive,p] of j.meshes[node.mesh].primitives.entries()){
 const a=j.accessors[p.attributes.POSITION];if(a.min.some((v,k)=>v>limits[k][1])||a.max.some((v,k)=>v<limits[k][0]))continue;
 const vs=acc(p.attributes.POSITION),ids=acc(p.indices).flat();
 for(let i=0;i<ids.length;i+=3){const points=ids.slice(i,i+3).map(k=>vs[k]);if(limits.some(([lo,hi],k)=>Math.max(...points.map(v=>v[k]))<lo||Math.min(...points.map(v=>v[k]))>hi))continue;
 const cross=new T.Vector3(...points[1]).sub(new T.Vector3(...points[0])).cross(new T.Vector3(...points[2]).sub(new T.Vector3(...points[0]))),area=cross.length()/2;if(area<.002)continue;const normal=cross.normalize().toArray(),center=[0,1,2].map(k=>points.reduce((s,v)=>s+v[k],0)/3),bounds=[0,1,2].map(k=>[Math.min(...points.map(v=>v[k])),Math.max(...points.map(v=>v[k]))]);
 const row={object:node.name,primitive,face:i/3,points,normal,center,bounds,areaM2:area};faces.push(row);
 if(Math.abs(normal[1])>.985){const key=node.name+'|'+(normal[1]>0?'up':'down')+'|'+center[1].toFixed(1);const group=groups.get(key)||{object:node.name,orientation:normal[1]>0?'up':'down',elevationM:Number(center[1].toFixed(1)),faces:[],areaM2:0,bounds:[[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]]};group.faces.push(i/3);group.areaM2+=area;bounds.forEach((r,k)=>{group.bounds[k][0]=Math.min(group.bounds[k][0],r[0]);group.bounds[k][1]=Math.max(group.bounds[k][1],r[1]);});groups.set(key,group);}
 }
}}
const horizontalGroups=[...groups.values()].sort((a,b)=>b.areaM2-a.areaM2),inclines=faces.filter(f=>Math.abs(f.normal[1])>.5&&Math.abs(f.normal[1])<.97&&f.areaM2>.2);
const report={source:{path:sourcePath,sha256:hash,url:'https://data.city.kyoto.lg.jp/resource/?id=21224',attribution:'Kyoto City',license:'CC BY 4.0'},coordinates:'Renderer X east,Y up,Z south; metres',limits,faces,horizontalGroups,inclines,limitations:['Regional source geometry, not surveyed interior dimensions.','Horizontal up/down orientation helps distinguish upper surfaces and soffits; it does not establish public access.','Inclined faces may be roofs or stairs; photographic and connected-mesh interpretation is required.']};await writeFile(out+'/audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({faces:faces.length,horizontalGroups:horizontalGroups.slice(0,18).map(g=>({...g,faces:g.faces.length})),inclineCount:inclines.length},null,2));
