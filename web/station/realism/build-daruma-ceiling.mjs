// Pale shop ceiling and fitted equipment below the retained dark corridor canopy.
import assert from'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import * as T from'three';import{construction}from'./component-mesh.mjs';import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));const read=async p=>JSON.parse(await readFile(p)),cfg=await read(manifest),frame=(await read('.local/v2/current/components/daruma-frontage/report.json')).geometry,{origin:C,across:A,inward:N}=frame,sha=b=>createHash('sha256').update(b).digest('hex');
const mat=(name,color,rough=.8,extra={})=>({name:'Daruma ceiling | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:0,roughnessFactor:rough},...extra});
const mats=[mat('warm white plaster',[.72,.70,.63]),mat('ivory equipment enamel',[.65,.64,.60],.42),mat('vent recess',[.028,.031,.029]),mat('grille slats',[.25,.27,.25],.55),mat('opal bulb',[.9,.82,.67],.32,{emissiveFactor:[1.5,1.2,.85]})],c=construction(mats,{flatNormals:true});
const point=(w,h,t)=>[C[0]+A[0]*w+N[0]*t,C[1]+h,C[2]+A[2]*w+N[2]*t];
const footprint=[[-4.20,.09],[4.19,.09],[4.19,3.44],[-.67,8.46],[-4.20,9.27]];
c.slab('daruma-ceiling-lining',footprint.map(([w,t])=>point(w,2.945,t)),[],.035,0,'restaurant-ceiling');c.panels.at(-1).material='wall';
function shape(id,g,w,h,t,m,collision=false){const p=g.attributes.position;c.add('daruma-ceiling-'+id,Array.from({length:p.count},(_,i)=>point(w+p.getX(i),h+p.getY(i),t+p.getZ(i))),Array.from(g.index.array),m,'restaurant-ceiling-fitting');const panel=c.panels.at(-1);panel.material=m===4?'glass':'steel';panel.collision=collision;g.dispose();}
const box=(id,w,h,t,x,y,z,m,collision=false)=>shape(id,new T.BoxGeometry(x,y,z),w,h,t,m,collision);
// Four-way cassette and access cover: equipment type is referenced; placement is fitted.
const unit={w:.68,t:2.85};
box('cassette-body',unit.w,2.89,unit.t,1.08,.04,1.08,1,true);
box('cassette-intake',unit.w,2.866,unit.t,.68,.012,.68,2);
for(let i=0;i<13;i++){
 box('intake-cross-'+i,unit.w,2.854,unit.t-.306+i*.051,.64,.012,.012,3);
 box('intake-long-'+i,unit.w-.306+i*.051,2.855,unit.t,.009,.01,.64,3);
}
for(const side of[-1,1]){
 box('outlet-long-'+side,unit.w,2.865,unit.t+side*.448,.78,.012,.086,2);
 box('outlet-side-'+side,unit.w+side*.448,2.865,unit.t,.086,.012,.78,2);
 for(let i=0;i<3;i++){
  box('vane-long-'+side+'-'+i,unit.w,2.852,unit.t+side*.448+(i-1)*.025,.77,.014,.008,1);
  box('vane-side-'+side+'-'+i,unit.w+side*.448+(i-1)*.025,2.852,unit.t,.008,.014,.77,1);
 }
}
box('access-reveal',-2.8,2.905,3.35,.62,.012,.62,2);
box('access-panel',-2.8,2.896,3.35,.594,.012,.594,0,true);
box('access-latch',-2.8,2.887,3.57,.035,.008,.022,3);
// Opal lamps sit under the four existing pendant bodies and retain their sources.
for(const[i,[w,t]]of[[-2.4,1.6],[-.8,1.6],[-2.1,4.75],[.5,4.75]].entries()){
 shape('bulb-'+i,new T.SphereGeometry(.046,20,12).scale(1,1.3,1),w,2.405,t,4);
 shape('socket-'+i,new T.CylinderGeometry(.027,.027,.045,16),w,2.461,t,1);
}
// A small ceiling detector and service grille keep the pale plane articulated.
shape('detector',new T.CylinderGeometry(.075,.084,.03,20),-1.5,2.893,3.4,1);
shape('detector-center',new T.CylinderGeometry(.038,.038,.009,20),-1.5,2.873,3.4,3);
box('return-recess',-3.58,2.905,5.85,.48,.012,.72,2);
for(let i=0;i<12;i++)box('return-slat-'+i,-3.58,2.891,5.535+i*.057,.46,.014,.021,1);
await c.save(out,'daruma-ceiling.glb',{sourceLayoutSha256:cfg.layoutSha256,geometry:{origin:C,across:A,inward:N,footprint,ceilingUndersideM:2.91,pendantBulbs:4,cassette:unit},scope:'Pale Daruma ceiling, fitted ventilation/access details and four opal pendant bulbs.'});
// Preserve identical explicit normals in the editable source and renderer.
const path=out+'/daruma-ceiling.glb',{json:j,bin}=readGLB(await readFile(path)),native=await read(out+'/native-panels.json'),parts=[bin];let offset=bin.length;
for(const[mi,mesh]of j.meshes.entries()){
 const p=mesh.primitives[0],a=j.accessors[p.attributes.NORMAL],v=j.bufferViews[a.bufferView],uv=Buffer.alloc(a.count*8);let index=0;
 for(const panel of native.panels.filter(p=>p.browserMaterial===mi)){
  panel.normals=panel.vertices.map(()=>{const off=v.byteOffset+index++*12;return{x:bin.readFloatLE(off),y:bin.readFloatLE(off+4),z:-bin.readFloatLE(off+8)};});panel.uv=panel.vertices.map(()=>({x:0,y:0}));
 }assert.equal(index,a.count);for(let i=0;i<a.count;i++)uv.writeFloatLE(1,i*8+4);
 const view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:uv.length});parts.push(uv);offset+=uv.length;p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:view,componentType:5126,count:a.count,type:'VEC2'});
}
j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts)),nb=Buffer.from(JSON.stringify(native)+'\n');await writeFile(path,glb);await writeFile(out+'/native-panels.json',nb);const report=await read(out+'/report.json');Object.assign(report,{builder:'web/station/realism/build-daruma-ceiling.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),references:['https://osumituki.com/kyoto-ramen/225895.html','https://kyotopi.jp/articles/hakatadaruma','https://prtimes.jp/main/html/rd/p/000000008.000131832.html'],limits:['Ceiling height follows the registered model; no measured interior ceiling survey is available.','The Kyoto frontage establishes pale interior and dark exposed corridor; the owner collage supports equipment type but does not establish exact Kyoto equipment placement.','Cassette, access panel, detector and return grille positions are fitted approximations.','Existing pendant light sources are retained; local material reflections use a separate one-time room capture.']});report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.geometry);
