// One bounded pass: retire orphaned artwork, join the west fascia, detail the gate supports.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {appendJunction} from './append-canopy-junction.mjs';
import {compactStaticGLB,readAccessor,indices as readIndices} from '../../../tools/compact-static-glb.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw),geometry=await readFile(m.geometry);
assert.equal(sha(raw),m.layoutSha256);assert.equal(sha(geometry),m.geometrySha256);
const clock=await read(out+'/clock-source.json');assert.equal(clock.id,'concourse-hall-clock');
const retired=new Set(['central-lift-ground-front-south','central-lift-ground-front-north','central-lift-ground-entry-header','central-lift-ground-recess-south','central-lift-ground-shop-north','central-lift-ground-recess-north']);
const materials=[],appearances=[],materialIndex=new Map();
function material(id){
 if(materialIndex.has(id))return materialIndex.get(id);
 const a=l.authoredMaterials.find(a=>a.id===id||a.label===id);assert(a,id);
 const i=materials.length,c=a.linearColor;
 materials.push({name:a.label,pbrMetallicRoughness:{baseColorFactor:[c.r,c.g,c.b,1],roughnessFactor:a.roughness??.7,metallicFactor:a.metallic??0}});
 appearances.push(a);materialIndex.set(id,i);return i;
}
const blue=material('v2-material-760'),stone=material('v2-material-758'),steel=material('gate-bank-material-8'),black=material('gate-bank-material-9');
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],B=p=>Object.fromEntries(['x','y','z'].map(k=>[k,[Math.min(...p.vertices.map(v=>v[k])),Math.max(...p.vertices.map(v=>v[k]))]]));
function box(id,center,size,mat,collision=true){const g=new T.BoxGeometry(...size);g.translate(...P(...center));const a=g.attributes.position;c.add(id,Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)]),Array.from(g.index.array),mat,'atrium fixture');c.panels.at(-1).collision=collision;c.panels.at(-1).material='steel';g.dispose();}
function beam(id,a,b,w,h,mat,collision=false){c.beam(id,P(...a),P(...b),w,h,mat,'mounted gate detail');c.panels.at(-1).collision=collision;c.panels.at(-1).material='steel';}
// A 2 mm joint below the existing sloping fascia replaces intersecting face edges.
const replacements=[];
for(const id of [...retired].slice(0,3)){
 const old=l.panels.find(p=>p.id===id),b=B(old),top=3.278;
 box(id+'-joined',[(b.x[0]+b.x[1])/2,(b.y[0]+top)/2,(b.z[0]+b.z[1])/2],[b.x[1]-b.x[0],top-b.y[0],b.z[1]-b.z[0]],blue);
 c.panels.at(-1).material=old.material;replacements.push({old:id,new:id+'-joined',jointM:.002});
}
for(const id of [...retired].slice(3)){
 const old=l.panels.find(p=>p.id===id),b=B(old),slope=1.15/1.3,corner=-33.1-(4.5-3.278)/slope;
 // Extrude a five-sided wall profile. Its top follows the fascia underside.
 const profile=[[b.x[0],0],[b.x[1],0],[b.x[1],3.278+(-33.1-b.x[1])*slope],[corner,4.5],[b.x[0],4.5]],vs=[...profile.map(([x,y])=>P(x,y,b.z[0])),...profile.map(([x,y])=>P(x,y,b.z[1]))],n=profile.length,ix=[];
 const faces=T.ShapeUtils.triangulateShape(profile.map(p=>new T.Vector2(...p)),[]);
 for(const [a,b,d]of faces)ix.push(a,b,d,d+n,b+n,a+n);
 for(let i=0;i<n;i++){const j=(i+1)%n;ix.push(j,i,i+n,j,i+n,j+n);}
 c.add(id+'-joined',vs,ix,stone,'atrium frontage');c.panels.at(-1).material=old.material;replacements.push({old:id,new:id+'-joined',jointM:.002});
}
const rail=B(l.panels.find(p=>p.id==='gate-bank-board-rail')),railZ=(rail.z[0]+rail.z[1])/2,clockCenter=[(rail.x[0]+rail.x[1])/2,5.50,railZ];
box('atrium-gate-clock-body',clockCenter,[.78,.78,.10],black);
box('atrium-gate-clock-foot',[clockCenter[0],5.055,railZ],[.28,.11,.10],steel,false);
box('atrium-gate-clock-base',[clockCenter[0],5.015,railZ],[.43,.04,.18],steel,false);
const attachments=[];
for(let i=0;i<4;i++){
 const stem=B(l.panels.find(p=>p.id===`gate-bank-support-${i}-stem`)),x=(stem.x[0]+stem.x[1])/2,z=(stem.z[0]+stem.z[1])/2,id=`atrium-gate-support-${i}`;
 // Clamps join the existing cantilever hanger to the stem. Cable stays on its rear face.
 for(const y of [4.88,5.03])box(id+'-clamp-'+y,[x,y,z],[.135,.07,.135],steel,false);
 beam(id+'-conduit',[x+.06,4.99,z-.06],[x+.06,8.30,z-.06],.022,.022,black);
 for(const y of [5.6,6.7,7.8])box(id+'-cable-clip-'+y,[x+.045,y,z-.047],[.065,.025,.06],steel,false);
 box(id+'-camera-collar',[x,5.46,z],[.14,.10,.14],steel,false);
 beam(id+'-camera-arm',[x,5.46,z],[x+.27,5.60,z+.10],.04,.04,steel);
 box(id+'-camera-body',[x+.27,5.62,z+.20],[.16,.14,.29],steel,false);
 box(id+'-camera-lens',[x+.27,5.615,z+.351],[.095,.075,.012],black,false);
 box(id+'-camera-hood',[x+.27,5.701,z+.245],[.185,.018,.40],steel,false);
 for(const dx of [-.073,.073])for(const dz of [-.073,.073])box(id+'-anchor-'+dx+'-'+dz,[x+dx,.086,z+dz],[.021,.012,.021],black,false);
 const boardZ=railZ+(x-clockCenter[0])*.01665995;
 box(id+'-board-saddle',[x,4.945,boardZ],[.20,.14,.18],steel,false);
 // Short vertical straps close the existing 25 mm gap between the rail and display cases.
 box(id+'-board-strap',[x,4.83,boardZ],[.055,.27,.045],steel,false);
 attachments.push({stem:`gate-bank-support-${i}-stem`,center:[x,z],camera:id+'-camera-body'});
}
for(const p of c.panels)p.appearance=appearances[p.browserMaterial].id;
await c.save(out,'atrium-details.glb',{scope:'Existing public atrium and central gate; no rooms added',geometry:{attachments,replacements,clockCenter}});
const targets=new Map(),labels=new Set(),hits={};const key=vs=>vs.map(v=>v.map(n=>String(Math.fround(n)||0)).join(',')).sort().join('|');
for(const p of [...l.panels.filter(p=>retired.has(p.id)),clock]){
 const label=p.label||l.authoredMaterials.find(a=>a.id===p.appearance).label;labels.add(label);hits[p.id]=0;
 for(let i=0;i<p.triangles.length;i+=3){const k=label+'|'+key(p.triangles.slice(i,i+3).map(i=>{const v=p.vertices[i];return[v.x,v.y,-v.z];})),rows=targets.get(k)||[];rows.push(p.id);targets.set(k,rows);}
}
const compact=compactStaticGLB(geometry,(p,ix,j,bin)=>{
 const label=j.materials[p.material].name.replace(/ \| Browser$/,'');if(!labels.has(label))return ix;
 const pos=readAccessor(j,bin,p.attributes.POSITION),keep=[];assert.equal(pos.size,12);
 for(let i=0;i<ix.length;i+=3){const tri=ix.slice(i,i+3),k=label+'|'+key(tri.map(i=>[0,4,8].map(o=>pos.data.readFloatLE(i*12+o)))),rows=targets.get(k),id=rows?.pop();if(id){hits[id]++;if(!rows.length)targets.delete(k);}else keep.push(...tri);}return keep;
});
assert.equal(targets.size,0,'Every removed source triangle must have a rendered counterpart');
const {json:j,bin}=readGLB(compact.buffer),part=readGLB(await readFile(out+'/atrium-details.glb'));
const baseMaterials=j.materials.length,baseMeshes=j.meshes.length;
const materialMap=appearances.map(a=>{const i=j.materials.findIndex(m=>m.name.replace(/ \| Browser$/,'')===a.label);assert(i>=0,a.label);return i;});
const baseNodes=j.nodes.length,addition=appendJunction(j,part,bin.length);
for(const mesh of j.meshes.slice(baseMeshes))for(const p of mesh.primitives)p.material=materialMap[p.material-baseMaterials];j.materials.length=baseMaterials;
for(const n of j.nodes.slice(baseNodes))n.name=n.name.replace('east-canopy-junction | ','Atrium fixtures | ');
j.buffers[0].byteLength=bin.length+addition.length;const output=writeGLB(j,Buffer.concat([bin,addition]));
const checked=readGLB(output);let verifiedVertices=0,verifiedTriangles=0;
for(let batch=0;batch<materials.length;batch++){
 const p=checked.json.meshes[baseMeshes+batch].primitives[0],positions=readAccessor(checked.json,checked.bin,p.attributes.POSITION),ix=readIndices(checked.json,checked.bin,p);let offset=0,expected=[];
 assert.equal(checked.json.materials[p.material].name.replace(/ \| Browser$/,''),appearances[batch].label);
 for(const panel of c.panels.filter(p=>p.browserMaterial===batch)){
  for(const [i,v]of panel.vertices.entries())for(const [k,n]of [v.x,v.y,-v.z].entries())assert.equal(positions.data.readFloatLE((offset+i)*12+k*4),Math.fround(n));
  for(let i=0;i<panel.triangles.length;i+=3)expected.push(...panel.triangles.slice(i,i+3).reverse().map(k=>k+offset));offset+=panel.vertices.length;
 }
 assert.equal(offset,positions.definition.count);assert.deepEqual(ix,expected);verifiedVertices+=offset;verifiedTriangles+=ix.length/3;
}
const removedLabels=l.concourseDetails.labels.filter(p=>/^add-central-gate-departure-/.test(p.id)).map(p=>p.id);assert.equal(removedLabels.length,5);
l.concourseDetails.labels=l.concourseDetails.labels.filter(p=>!removedLabels.includes(p.id));
const clockLabel=l.concourseDetails.labels.find(p=>p.id===clock.id);assert(clockLabel);clockLabel.id='atrium-gate-clock-face';clockLabel.center=[clockCenter[0],clockCenter[1],clockCenter[2]+.054];
l.boxes=l.boxes.filter(p=>p.id!==clock.id);l.panels=l.panels.filter(p=>!retired.has(p.id)).concat(c.panels.map(({browserMaterial,...p})=>p));
l.architecture.atriumDetailRepair={removedLabels,replacements,attachments,clockCenter,scope:'Existing central gate fixtures and west atrium fascia joints only. Dimensions are fitted to source geometry; small hardware is photo-guided.'};
const nextRaw=JSON.stringify(l)+'\n',station=await read(m.station);station.layoutSha256=sha(nextRaw);station.concourseDetails=l.concourseDetails;
const next={...m,layout:out+'/station-layout.json',layoutSha256:sha(nextRaw),geometry:out+'/atrium.runtime.glb',geometrySha256:sha(output),station:out+'/station.json'};
await writeFile(next.layout,nextRaw);await writeFile(next.geometry,output);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
await writeFile(out+'/geometry-proof.json',JSON.stringify({pass:true,geometrySha256:sha(output),addedPanels:c.panels.length,verifiedVertices,verifiedTriangles,positionsIndicesMaterialsMatch:true,retainedAttributesExact:true,stats:compact.stats},null,2)+'\n');
await writeFile(out+'/repair.json',JSON.stringify({parent:m,retired:[...retired,clock.id],added:c.panels.map(p=>p.id),removedLabels,replacements,attachments,clockCenter,hits,layoutSha256:next.layoutSha256,geometrySha256:next.geometrySha256},null,2)+'\n');
console.log({removed:retired.size+1,removedLabels,added:c.panels.length,geometryBytes:output.length,...compact.stats});
