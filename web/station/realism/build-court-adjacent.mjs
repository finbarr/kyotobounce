// Source-bound courtyard returns, service cladding and ventilation detail.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [specPath,materialSource,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),sb=await readFile(specPath),spec=JSON.parse(sb),mb=await readFile(materialSource),source=readGLB(mb);
assert.equal(sha(mb),'3206a8e8862a7560b74bfa4d9a4b7b609922a020bdb184614c62f7ffb1c8ad6d');
const material=(name,color,rough,metal=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:rough,metallicFactor:metal}});
const mats=[... [0,2,3,5,6,7].map(i=>structuredClone(source.json.materials[i])),material('court-service-pale',[.68,.70,.67],.72,.15),material('court-service-dark',[.085,.096,.10],.74,.08),material('court-vent-interior',[.015,.02,.022],.92)];
const indices={ceramic:0,joint:1,glass:2,mullion:3,frame:4,room:5,pale:6,dark:7,vent:8};
const c=construction(mats,{flatNormals:true}),patches=Object.fromEntries(spec.patches.map(p=>[p.id,p])),panelPatches=new Map();
const point=(p,u,y,d)=>p.origin.map((v,k)=>v+p.u[k]*u+(k===1?y:0)+p.normal[k]*d);
function prism(id,patch,outer,holes,front,back,m,role,collision=true){
 assert(front>back);const p=patches[patch],rings=[outer,...holes].map((r,i)=>{r=r.map(p=>new T.Vector2(...p));if(T.ShapeUtils.isClockWise(r)!==!!i)r.reverse();return r;}),ps=rings.flat(),n=ps.length,vs=[...ps.map(q=>point(p,q.x,q.y,front)),...ps.map(q=>point(p,q.x,q.y,back))],ix=[];
 for(const[a,b,d]of T.ShapeUtils.triangulateShape(rings[0],rings.slice(1)))ix.push(a,b,d,d+n,b+n,a+n);
 let off=0;for(const ring of rings){for(let i=0;i<ring.length;i++){const a=off+i,b=off+(i+1)%ring.length;ix.push(a,b+n,b,a,a+n,b+n);}off+=ring.length;}
 const name='court-adjacent-'+id;c.add(name,vs,ix,indices[m],role);const row=c.panels.at(-1);row.collision=collision;row.material=role.includes('glass')?'glass':'facade';panelPatches.set(name,p);
}
const rect=(id,p,l,b,r,t,f,z,m,role,collision=true)=>prism(id,p,[[l,b],[r,b],[r,t],[l,t]],[],f,z,m,role,collision);
for(const p of spec.parts)prism(p.id,p.patch,p.outer,p.holes,p.front,p.back,p.material,p.kind,p.collision!==false);
for(const o of spec.openings){const[u,y]=o.center,l=u-o.width/2,r=u+o.width/2,b=y-o.height/2,t=y+o.height/2,id=o.patch+'-'+o.id;
 if(o.kind==='window'){
  for(const[name,a,z,A,Z]of [['left',l,b,l+.045,t],['right',r-.045,b,r,t],['top',l+.045,t-.045,r-.045,t],['sill',l+.045,b,r-.045,b+.045]])rect(id+'-'+name,o.patch,a,z,A,Z,.038,-.14,'frame','window-frame');
  rect(id+'-pane',o.patch,l+.045,b+.045,r-.045,t-.045,-.115,-.135,'room','window-glass');
  rect(id+'-transom',o.patch,l+.045,y-.012,r-.045,y+.012,-.092,-.110,'frame','window-transom',false);
 }else{
  rect(id+'-recess',o.patch,l,b,r,t,-.047,-.070,'vent','vent-backing');
  for(let n=0;n<5;n++){const Y=b+.055+n*.12;rect(id+'-vane-'+n,o.patch,l+.008,Y,r-.008,Y+.018,-.012,-.045,'dark','vent-vane',false);}
 }
}
// Visible small fasteners follow panel intersections. Their dimensions remain inferred.
let fasteners=0;
for(const p of spec.patches.filter(p=>p.kind==='dark')){const[x0,y0,x1,y1]=p.bounds,[sx,sy]=p.construction.panelSizeM;const parts=spec.parts.filter(q=>q.patch===p.id&&q.kind==='panel');
 function inside(u,y){return parts.some(q=>{const pts=q.outer;let yes=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[a,b]=pts[i],[d,e]=pts[j];if((b>y)!==(e>y)&&u<(d-a)*(y-b)/(e-b)+a)yes=!yes;}return yes;});}
 for(let x=x0+sx;x<x1-.1;x+=sx)for(let y=y0+sy;y<y1-.1;y+=sy){if(!inside(x+.015,y+.015))continue;rect(p.id+'-fastener-'+fasteners,p.id,x-.018,y-.018,x+.018,y+.018,.030,.023,'frame','panel-fastener',false);fasteners++;}
}
const report=await c.save(out,'court-adjacent.glb',{meaning:'Source-bound adjacent courtyard walls; uninstalled candidate until full-station scope and runtime checks pass.',specSha256:sha(sb),materialSourceSha256:sha(mb),source:spec.source,geometry:{patches:spec.patches.length,windows:spec.openings.filter(o=>o.kind==='window').length,ventSlots:spec.openings.filter(o=>o.kind==='vent').length,fasteners},assumptions:spec.assumptions,toolSha256:sha(await readFile(new URL(import.meta.url)))});
let{json:j,bin}=readGLB(await readFile(out+'/court-adjacent.glb')),chunks=[bin.subarray(0,j.buffers[0].byteLength)],offset=chunks[0].length;
const append=(bytes,target)=>{const pad=Buffer.alloc((4-offset%4)%4);chunks.push(pad);offset+=pad.length;const v=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...(target?{target}:{})});chunks.push(bytes);offset+=bytes.length;return v;};
// Only ceramic uses image maps. Reuse the established original tile pixels.
j.images=[];j.textures=[];j.samplers=structuredClone(source.json.samplers);const mapping=new Map();
for(const info of [j.materials[0].pbrMetallicRoughness.baseColorTexture,j.materials[0].normalTexture,j.materials[0].pbrMetallicRoughness.metallicRoughnessTexture]){const old=info.index;if(!mapping.has(old)){const t=source.json.textures[old],im=source.json.images[t.source],v=source.json.bufferViews[im.bufferView],bytes=source.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);mapping.set(old,j.textures.length);j.textures.push({...t,source:j.images.length});j.images.push({...im,bufferView:append(bytes)});}info.index=mapping.get(old);}
const ceramic=c.panels.filter(p=>p.browserMaterial===0),uv=new Float32Array(ceramic.reduce((s,p)=>s+p.vertices.length*2,0));let at=0;
for(const row of ceramic){const p=panelPatches.get(row.id);for(const q of row.vertices){const a=[q.x,q.y,-q.z];uv[at++]=a.reduce((s,v,k)=>s+(v-p.origin[k])*p.u[k],0)/1.6;uv[at++]=(q.y-35.35)/1.6;}}
const pr=j.meshes[0].primitives[0];assert.equal(uv.length/2,j.accessors[pr.attributes.POSITION].count);pr.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(uv.buffer),34962),componentType:5126,type:'VEC2',count:uv.length/2});
j.buffers[0].byteLength=offset;const final=writeGLB(j,Buffer.concat(chunks));await writeFile(out+'/court-adjacent.glb',final);report.outputs.glbSha256=sha(final);report.outputs.glbBytes=final.length;report.geometry.decorativePanels=c.panels.filter(p=>!p.collision).length;report.images=j.images.length;report.note='Three existing original ceramic maps reused; untextured materials have no unused UVs.';await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
