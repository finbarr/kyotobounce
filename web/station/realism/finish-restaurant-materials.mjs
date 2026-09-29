// Material/attribute pass: retain all physical vertices and indices, including stool cylinders.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,art,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:false});await mkdir(out+'/textures');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await readFile(p));
const base=await read(manifest),raw=await readFile(base.layout),layout=JSON.parse(raw),bytes=await readFile(base.geometry),{json:j,bin}=readGLB(bytes),station=await read(base.station);
assert.equal(sha(raw),base.layoutSha256);assert.equal(sha(bytes),base.geometrySha256);
const maps={};async function map(name,data){const file='restaurant-'+name+'.png';await writeFile(out+'/textures/'+file,data);maps[name]={file,sha256:sha(data),bytes:data.length,data};}
const original=await readFile(art),albedo=await sharp(original).resize(1024,1024).removeAlpha().png().toBuffer();await map('wood-albedo',albedo);
// Small, unbaked microstructure maps; relief is inferred, not measured from a photograph.
const size=512,gray=await sharp(original).resize(size,size).greyscale().raw().toBuffer(),normal=Buffer.alloc(size*size*3),mr=Buffer.alloc(size*size*3),mask=Buffer.alloc(size*size*4),clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,dx=(gray[y*size+(x+1)%size]-gray[y*size+(x+size-1)%size])*.0000008/(3.2/size),dy=(gray[((y+1)%size)*size+x]-gray[((y+size-1)%size)*size+x])*.0000008/(.8/size),len=Math.hypot(dx,dy,1);
 normal[i*3]=clamp(127.5-dx/len*127.5);normal[i*3+1]=clamp(127.5-dy/len*127.5);normal[i*3+2]=clamp(127.5+127.5/len);
 const rough=clamp(165+(gray[i]-190)*.22);mr.set([255,rough,0],i*3);mask.set([0,255,0,255-rough],i*4);
}
for(const [name,data,ch]of [['wood-normal',normal,3],['wood-metal-rough',mr,3],['wood-mask',mask,4]])await map(name,await sharp(data,{raw:{width:size,height:size,channels:ch}}).png().toBuffer());
const vn=Buffer.alloc(256*256*3),vr=Buffer.alloc(256*256*3),vm=Buffer.alloc(256*256*4);let seed=61963;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
for(let i=0;i<256*256;i++){const n=rand(),rough=clamp(138+n*22);vn.set([clamp(127.5+(rand()-.5)*5),clamp(127.5+(rand()-.5)*5),255],i*3);vr.set([255,rough,0],i*3);vm.set([0,255,0,255-rough],i*4);}
for(const [name,data,ch]of [['vinyl-normal',vn,3],['vinyl-metal-rough',vr,3],['vinyl-mask',vm,4]])await map(name,await sharp(data,{raw:{width:256,height:256,channels:ch}}).png().toBuffer());
const parts=[bin];let offset=bin.length;
function append(data,target){const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});parts.push(data);offset+=data.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return id;}
const sampler=(j.samplers??=[]).length;j.samplers.push({magFilter:9729,minFilter:9987,wrapS:33648,wrapT:33648});
function texture(name){const image=j.images.length;j.images.push({name,bufferView:append(maps[name].data),mimeType:'image/png'});const index=j.textures.length;j.textures.push({source:image,sampler});return{index};}
const wood={albedo:texture('wood-albedo'),normal:texture('wood-normal'),mr:texture('wood-metal-rough')},vinyl={normal:texture('vinyl-normal'),mr:texture('vinyl-metal-rough')};
const specs=[{label:'Kotetsu | warm timber',color:[.76,.49,.28,1],rough:.72,kind:'wood'},{label:'Daruma | counter maple',color:[1,1,1,1],rough:.9,kind:'wood'},{label:'Daruma | dark stained timber',from:'Daruma | dark timber',color:[.035,.025,.018,1],rough:1,kind:'wood'},{label:'Daruma | red stool upholstery',from:'Daruma | vermilion finish',color:[.39,.018,.012,1],rough:1,kind:'vinyl'}];
for(const s of specs){
 const source=j.materials.findIndex(m=>m.name===(s.from||s.label));assert(source>=0);s.oldMaterial=source;s.oldAppearance=layout.authoredMaterials.find(m=>m.label===(s.from||s.label)).id;
 const tex=s.kind==='wood'?wood:vinyl,material={...structuredClone(j.materials[source]),name:s.label,pbrMetallicRoughness:{baseColorFactor:s.color,metallicFactor:0,roughnessFactor:s.rough,...(s.kind==='wood'?{baseColorTexture:tex.albedo}:{}),metallicRoughnessTexture:tex.mr},normalTexture:{...tex.normal,scale:s.kind==='wood'?.45:.3}};
 s.material=s.from?j.materials.length:source;if(s.from)j.materials.push(material);else j.materials[source]=material;
 const old=layout.authoredMaterials.find(m=>m.id===s.oldAppearance),record={...old,id:s.from?'v2-material-'+s.material:old.id,label:s.label,linearColor:Object.fromEntries(['r','g','b','a'].map((k,i)=>[k,s.color[i]])),metallic:0,roughness:s.rough,normalScale:material.normalTexture.scale,normal:'AtriumTextures/restaurant-'+s.kind+'-normal',mask:'AtriumTextures/restaurant-'+s.kind+'-mask'};
 if(s.kind==='wood')record.albedo='AtriumTextures/restaurant-wood-albedo';s.appearance=record.id;
 if(s.from)layout.authoredMaterials.push(record);else layout.authoredMaterials[layout.authoredMaterials.indexOf(old)]=record;
}
const frames=Object.fromEntries(await Promise.all(['kotetsu','daruma'].map(async name=>[name,(await read('.local/v2/current/components/'+name+'-frontage/report.json')).geometry])));
const selected=p=>specs.find(s=>p.appearance===s.oldAppearance&&(!s.from||(s.kind==='vinyl'?p.id.startsWith('daruma-stool-cushion-'):/^daruma-(front-(display|return|fascia|post)|side-(base|header|post)|counter-.*-base|display-frame)/.test(p.id))));
const originalPanels=structuredClone(layout.panels),edits=new Map(),bounds=p=>['x','y','z'].map(k=>[Math.min(...p.vertices.map(v=>v[k])),Math.max(...p.vertices.map(v=>v[k]))]);
for(const p of layout.panels){
 const s=selected(p),stool=p.id.startsWith('daruma-stool-');if(!s&&!stool)continue;
 const f=frames[p.id.startsWith('kotetsu-')?'kotetsu':'daruma'],coords=p.vertices.map(v=>{const dx=v.x-f.origin[0],dz=-v.z-f.origin[2];return[dx*f.across[0]+dz*f.across[2],v.y-f.origin[1],dx*f.inward[0]+dz*f.inward[2]];}),ranges=[0,1,2].map(k=>Math.max(...coords.map(v=>v[k]))-Math.min(...coords.map(v=>v[k]))),along=ranges.indexOf(Math.max(...ranges)),normals=Array(p.vertices.length),uv=Array(p.vertices.length),box=bounds(p),cx=(box[0][0]+box[0][1])/2,cz=-(box[2][0]+box[2][1])/2;
 for(let t=0;t<p.triangles.length;t+=3){
  const ix=p.triangles.slice(t,t+3).reverse(),v=ix.map(i=>p.vertices[i]).map(v=>[v.x,v.y,-v.z]),a=v[1].map((x,i)=>x-v[0][i]),b=v[2].map((x,i)=>x-v[0][i]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=Math.hypot(...n);n.forEach((x,i)=>n[i]=x/len);
  const local=[n[0]*f.across[0]+n[2]*f.across[2],n[1],n[0]*f.inward[0]+n[2]*f.inward[2]],face=local.map(Math.abs).indexOf(Math.max(...local.map(Math.abs))),plane=[0,1,2].filter(k=>k!==face),u=plane.includes(along)?along:plane[0],vv=plane.find(k=>k!==u);
  for(const i of ix){let normal=n;if(stool&&Math.abs(n[1])<.5){const dx=p.vertices[i].x-cx,dz=-p.vertices[i].z-cz,r=Math.hypot(dx,dz);assert(r>0);normal=[dx/r,0,dz/r];}normals[i]={x:normal[0],y:normal[1],z:-normal[2]};if(s){const q=coords[i];uv[i]={x:q[u]/(s.kind==='wood'?1.6:.12),y:1-q[vv]/(s.kind==='wood'?.4:.12)};}}
 }
 if(s){p.uv=uv;p.appearance=s.appearance;}if(stool)p.normals=normals;
 edits.set(p.id,{id:p.id,uv:!!s,smooth:stool,material:s?.material??null,appearance:p.appearance,grainAxis:along});
}
// Component batches retain their per-material panel order and unshared corner vertices.
const nativeById=new Map(layout.panels.map(p=>[p.id,p])),labelByAppearance=new Map(layout.authoredMaterials.map(m=>[m.id,m.label])),panelsByLabel=new Map();
for(const p of originalPanels){const label=labelByAppearance.get(p.appearance),rows=panelsByLabel.get(label)||[];rows.push(p);panelsByLabel.set(label,rows);}
const touched=[];for(const [mi,mesh]of j.meshes.entries())for(const primitive of [...mesh.primitives]){
 const originalLabel=j.materials[primitive.material].name,panelRows=panelsByLabel.get(originalLabel)||[];
 if(!panelRows.some(p=>edits.has(p.id)))continue;
 const pos=j.accessors[primitive.attributes.POSITION],pv=j.bufferViews[pos.bufferView],normal=j.accessors[primitive.attributes.NORMAL],nv=j.bufferViews[normal.bufferView];assert(!pv.extensions&&!nv.extensions&&pos.componentType===5126);assert.equal(panelRows.reduce((n,p)=>n+p.vertices.length,0),pos.count);
 const uvBytes=Buffer.alloc(pos.count*8),normalBytes=Buffer.from(bin.subarray(nv.byteOffset,nv.byteOffset+nv.byteLength)),groups=new Map();let index=0,hasSmooth=false;
 for(const old of panelRows){const p=nativeById.get(old.id),edit=edits.get(p.id),material=edit?.material??primitive.material;const indices=groups.get(material)||[];for(const v of p.triangles.slice().reverse())indices.push(index+v);groups.set(material,indices);
  for(let i=0;i<p.vertices.length;i++){const v=p.vertices[i],n=index+i;for(const[k,expected]of [v.x,v.y,-v.z].entries())assert(Math.abs(bin.readFloatLE(pv.byteOffset+n*12+k*4)-expected)<.00002,p.id);
   if(p.uv){uvBytes.writeFloatLE(p.uv[i].x,n*8);uvBytes.writeFloatLE(1-p.uv[i].y,n*8+4);}if(edit?.smooth){normalBytes.writeFloatLE(p.normals[i].x,n*12);normalBytes.writeFloatLE(p.normals[i].y,n*12+4);normalBytes.writeFloatLE(-p.normals[i].z,n*12+8);hasSmooth=true;}}
  index+=p.vertices.length;
 }
 const uvi=j.accessors.length;j.accessors.push({bufferView:append(uvBytes,34962),componentType:5126,count:pos.count,type:'VEC2'});let ni=primitive.attributes.NORMAL;if(hasSmooth){ni=j.accessors.length;j.accessors.push({...normal,bufferView:append(normalBytes,34962)});}
 const replacements=[];for(const [material,indices]of groups){const ai=j.accessors.length,data=Buffer.from(new Uint32Array(indices).buffer);j.accessors.push({bufferView:append(data,34963),componentType:5125,count:indices.length,type:'SCALAR'});replacements.push({...primitive,indices:ai,material,attributes:{...primitive.attributes,TEXCOORD_0:uvi,NORMAL:ni}});}
 mesh.primitives.splice(mesh.primitives.indexOf(primitive),1,...replacements);touched.push({mesh:mi,primitives:replacements.length,vertices:pos.count});
}
assert(touched.length===5);j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));assert(readGLB(glb).bin.subarray(0,bin.length).equals(bin));
const adjustedLights=layout.authoredLights.filter(l=>l.id.startsWith('restaurant-practical-daruma-'));assert.equal(adjustedLights.length,6);
for(const light of adjustedLights){assert.equal(light.intensity,22);light.intensity=3.3;}station.authoredLights=layout.authoredLights;
const text=JSON.stringify(layout)+'\n';station.authoredMaterials=layout.authoredMaterials;station.layoutSha256=sha(text);
const report={parent:base,builderSha256:sha(await readFile(new URL(import.meta.url))),originalArtSha256:sha(original),maps:Object.fromEntries(Object.entries(maps).map(([k,{data,...v}])=>[k,v])),specs,adjustedLights:adjustedLights.map(l=>l.id),edits:[...edits.values()],touched,layoutSha256:sha(text),geometrySha256:sha(glb),addedBytes:glb.length-bytes.length,geometryUnchanged:true};
await writeFile(out+'/station-layout.json',text);await writeFile(out+'/atrium.runtime.glb',glb);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/assets.json',JSON.stringify({...base,layout:out+'/station-layout.json',layoutSha256:report.layoutSha256,geometry:out+'/atrium.runtime.glb',geometrySha256:report.geometrySha256,station:out+'/station.json'},null,2)+'\n');console.log(JSON.stringify({editedPanels:edits.size,touched,addedBytes:report.addedBytes,layoutSha256:report.layoutSha256}));
