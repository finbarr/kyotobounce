// Place the retained garden on the actual western roof and connect its paths.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),s=await read(out+'/spec.json'),l=await read(m.layout),base=readGLB(await readFile(m.geometry)).json;
assert.equal(s.parentLayoutSha256,m.layoutSha256);
// Use existing material identities; composition retains their current textures.
const materials=['station-additions-garden-paving','garden-garden-steel','garden-garden-guard-glazing'].map(id=>{const r=l.authoredMaterials.find(r=>r.id===id);assert(r);const b=base.materials.find(b=>b.name.replace(/ \| Browser$/,'')===r.label);assert(b);return{name:b.name,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),metallicFactor:r.metallic,roughnessFactor:r.roughness},...(b.alphaMode?{alphaMode:b.alphaMode}:{}),...(b.doubleSided?{doubleSided:true}:{})};});
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],G=s.floor,prefix=s.componentPrefix;
const rings=s.footprint.coordinates.map(r=>r.slice(0,-1));c.slab(prefix+'public-floor',rings[0].map(([x,z])=>P(x,G,z)),rings.slice(1).map(r=>r.map(([x,z])=>P(x,G,z))),.62,0,'garden-floor');
const guard=(id,a,b)=>{
 const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
 c.beam(prefix+id+'-rail',P(a[0],G+1.12,a[1]),P(b[0],G+1.12,b[1]),.055,.055,1,'garden-guard');
 c.beam(prefix+id+'-glass',P(a[0],G+.57,a[1]),P(b[0],G+.57,b[1]),.025,1.04,2,'garden-guard');
 for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;c.beam(prefix+id+'-post-'+i,P(x,G,z),P(x,G+1.12,z),.05,.05,1,'garden-guard');}
};
// Guard every outer edge, including the small bridge from the previous arrival.
// Existing wall-backed edges retain their barrier while the roof shell is refined.
for(let i=0;i<rings[0].length;i++)guard('edge-'+i,rings[0][i],rings[0][(i+1)%rings[0].length]);
// The northern concrete screen has an inset viewing window, not a blind wall.
// Keep its sill and lintel; the fitted municipal cut makes the aperture.
c.beam(prefix+'north-window-glass',P(-197.5,G+1.575,9.05),P(-193.9,G+1.575,9.05),.035,1.35,2,'garden-viewing-window');
for(const y of [.9,2.25])c.beam(prefix+'north-window-horizontal-'+y,P(-197.5,G+y,9.05),P(-193.9,G+y,9.05),.075,.065,1,'garden-window-frame');
for(const x of [-197.5,-193.9])c.beam(prefix+'north-window-vertical-'+x,P(x,G+.9,9.05),P(x,G+2.25,9.05),.065,.075,1,'garden-window-frame');
const pt=(x,z)=>({x,y:G,z});
const paths=[
 ['Stair arrival to roof garden',[[-160,-23.8],[-166,-23.8],[-170,-23.8],[-180,-23.8],[-185,-23.8],[-185,-15],[-185,-10]]],
 ['Garden to northern view',[[-185,-10],[-185,-3],[-185,3],[-195,3],[-195,7.4]]],
 ['Garden to western promenade',[[-185,-10],[-185,-3],[-185,3],[-200,3],[-210,3],[-224,3],[-235,3],[-242.8,3]]],
 ['Garden southern path',[[-185,-10],[-185,-23.8],[-200,-23.8],[-200,-20],[-200,-10],[-200,3],[-185,3]]],
];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
let report=await c.save(out,'garden-promenade.glb',{componentPrefix:prefix,sourceCollection:'Rooftop garden court and public promenade',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Unify the rooftop garden with the retained western roof court and connect the northern viewing bay and western public path.',geometry:{routes,chromeRoutes:routes.map(r=>r.label),headroomStairs:[],generatedStairs:[],blocked:[{label:'Northern viewing edge',start:pt(-195,7.4),yaw:0,axis:'z',limit:8.15,sign:-1},{label:'Western promenade end',start:pt(-242.8,3),yaw:-90,axis:'x',limit:-243.8,sign:1},{label:'Southern garden edge',start:pt(-195,-24),yaw:180,axis:'z',limit:-24.8,sign:1}],spawn:m.spawn,retiredIds:s.retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(s.cuts),modifiedFlightIds:[],retiredBoxIds:s.retiredBoxIds,retiredSourceOnlyIds:s.retiredSourceOnlyIds,retiredRouteIds:s.retiredRouteIds,retiredLabelIds:s.retiredLabelIds,movedIds:[...s.movedIds,...s.movedSourceIds].map(id=>prefix+id),translation:s.translation},references:['https://www.kyoto-station-building.co.jp/floorguide/rf/','https://www.kyoto-station-building.co.jp/service/square/','https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/'],limits:['Roof court and passage follow the retained municipal shell and operator plan; furnishings remain an approximation.']});
const native=await read(out+'/native-panels.json'),part=readGLB(await readFile(out+'/garden-promenade.glb'));
// Carry exact authored normals into the new component, including curved plants
// and lamp columns. Relocation preserves their topology and texture coordinates.
for(let mi=0;mi<materials.length;mi++){
 const pr=part.json.meshes[mi].primitives[0],a=part.json.accessors[pr.attributes.NORMAL],v=part.json.bufferViews[a.bufferView];let at=0;
 for(const p of native.panels.filter(p=>p.browserMaterial===mi)){
  p.normals=p.vertices.map((_,i)=>{const k=(v.byteOffset||0)+(at+i)*12;return{x:part.bin.readFloatLE(k),y:part.bin.readFloatLE(k+4),z:-part.bin.readFloatLE(k+8)};});at+=p.vertices.length;p.material=mi===1?'steel':mi===2?'glass':'stone';
 }
}
for(const id of s.movedIds){
 const old=l.panels.find(p=>p.id===id);assert(old.normals&&old.uv);
 const label=l.authoredMaterials.find(a=>a.id===old.appearance).label,b=base.materials.find(b=>b.name.replace(/ \| Browser$/,'')===label);assert(b);
 let mi=materials.findIndex(m=>m.name===b.name);if(mi<0){mi=materials.length;const a=l.authoredMaterials.find(a=>a.id===old.appearance);materials.push({name:b.name,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>a.linearColor[k]),roughnessFactor:a.roughness,metallicFactor:a.metallic},...(b.alphaMode?{alphaMode:b.alphaMode}:{}),...(b.doubleSided?{doubleSided:true}:{})});}
 native.panels.push({...old,id:prefix+id,browserMaterial:mi,uv:old.uv.map(v=>({x:Math.fround(v.x),y:1-Math.fround(1-v.y)})),vertices:old.vertices.map(v=>Object.fromEntries(['x','y','z'].map(k=>[k,Math.fround(v[k]+s.translation[k])]))) });
}
const source=await read(out+'/retired-source.json');
for(const id of s.movedSourceIds){
 const o=source.find(o=>o.name===id),box=l.boxes.find(b=>b.id===id);assert(o&&o.materials.length===1);
 const label=o.materials[0],b=base.materials.find(b=>b.name.replace(/ \| Browser$/,'')===label);assert(b,label);
 let mi=materials.findIndex(m=>m.name===b.name);if(mi<0){mi=materials.length;const a=l.authoredMaterials.find(a=>a.label===label);assert(a,label);materials.push({name:b.name,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>a.linearColor[k]),roughnessFactor:a.roughness,metallicFactor:a.metallic},...(b.alphaMode?{alphaMode:b.alphaMode}:{}),...(b.doubleSided?{doubleSided:true}:{})});}
 const vertices=[],normals=[],uv=[],triangles=[];
 for(const f of o.faces){assert(f.vertices.length===3);const offset=vertices.length;
  for(let k=0;k<3;k++){const v=o.vertices[f.vertices[k]],n=f.normals[k],length=Math.hypot(...n);vertices.push({x:Math.fround(v[0]+s.translation.x),y:Math.fround(v[1]),z:Math.fround(-v[2]+s.translation.z)});normals.push({x:n[0]/length,y:n[1]/length,z:-n[2]/length});uv.push({x:Math.fround(f.uv[k][0]),y:1-Math.fround(1-f.uv[k][1])});}triangles.push(offset+2,offset+1,offset);
 }
 native.panels.push({id:prefix+id,vertices,normals,uv,triangles,browserMaterial:mi,material:box?.material||'stone',role:box?.role||'garden-decoration',collision:box?.collision??false});
}
const j={asset:{version:'2.0'},scene:0,scenes:[{nodes:materials.map((_,i)=>i)}],nodes:materials.map((m,i)=>({name:m.name,mesh:i})),meshes:[],materials,buffers:[],bufferViews:[],accessors:[]},parts=[];let offset=0,triangles=0;
function data(array,type,count,target){const b=Buffer.from(array.buffer),vi=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target});parts.push(b);offset+=b.length;const ai=j.accessors.length;j.accessors.push({bufferView:vi,componentType:array instanceof Float32Array?5126:5125,count,type});return ai;}
for(let mi=0;mi<materials.length;mi++){
 const ps=[],ns=[],uv=[],ix=[];
 for(const p of native.panels.filter(p=>p.browserMaterial===mi)){const n=ps.length/3;for(const v of p.vertices)ps.push(v.x,v.y,-v.z);for(const v of p.normals)ns.push(v.x,v.y,-v.z);for(let i=0;i<p.vertices.length;i++)uv.push(p.uv?.[i]?.x||0,1-(p.uv?.[i]?.y||0));for(let i=0;i<p.triangles.length;i+=3)ix.push(...p.triangles.slice(i,i+3).toReversed().map(k=>k+n));triangles+=p.triangles.length/3;}
 j.meshes.push({primitives:[{attributes:{POSITION:data(new Float32Array(ps),'VEC3',ps.length/3,34962),NORMAL:data(new Float32Array(ns),'VEC3',ns.length/3,34962),TEXCOORD_0:data(new Float32Array(uv),'VEC2',uv.length/2,34962)},indices:data(new Uint32Array(ix),'SCALAR',ix.length,34963),material:mi,mode:4}]});
}
j.buffers.push({byteLength:offset});const glb=writeGLB(j,Buffer.concat(parts)),raw=JSON.stringify(native)+'\n';await writeFile(out+'/garden-promenade.glb',glb);await writeFile(out+'/native-panels.json',raw);report.geometry.panels=native.panels.length;report.geometry.triangles=triangles;report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['arrival',[-162,G+1.65,-23.8],[-182,G+.8,-18]],['garden',[-185,G+1.65,-22],[-185,G+1,-4]],['north-view',[-195,G+1.65,5],[-195,G+1.4,12]],['west-path',[-210,G+1.65,2],[-241,G+1.3,2]],['roof-overview',[-191,89,24],[-185,54,-10]]])+'\n');console.log({panels:native.panels.length,triangles,relocated:s.movedIds.length});
