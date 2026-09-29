// Original tile maps and metric UVs; preserve all encoded station geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {MeshoptDecoder} from 'meshoptimizer';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifestPath,registrationPath,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:false});await mkdir(out+'/textures');await MeshoptDecoder.ready;
const hash=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await readFile(p));
const config=await read(manifestPath),layoutBytes=await readFile(config.layout),layout=JSON.parse(layoutBytes),bytes=await readFile(config.geometry),{json:j,bin}=readGLB(bytes),station=await read(config.station),r=await read(registrationPath);
assert.equal(hash(bytes),config.geometrySha256);assert.equal(hash(layoutBytes),config.layoutSha256);
const label='Registered West restaurant | dark stone floor',mi=j.materials.findIndex(m=>m.name===label+' | Browser');assert(mi>=0);
const panels=layout.panels.filter(p=>p.appearance==='west-upper-west-material-2');assert.deepEqual(panels.map(p=>p.id),['west-restaurant-floor']);
const E=r.entryRenderer,edge=r.sourceLandingEdgeRenderer,A=[edge[1][0]-edge[0][0],edge[1][2]-edge[0][2]],length=Math.hypot(...A);A.forEach((v,i)=>A[i]=v/length);const N=[-A[1],A[0]],span=1.8;
const uv=p=>[((p[0]-E[0])*A[0]+(p[2]-E[2])*A[1])/span,((p[0]-E[0])*N[0]+(p[2]-E[2])*N[1])/span];
const size=512,tile=.6,joint=.0025,albedo=Buffer.alloc(size*size*3),mr=Buffer.alloc(size*size*3),mask=Buffer.alloc(size*size*4),normal=Buffer.alloc(size*size*3),height=new Float32Array(size*size);
let seed=0x72616d65;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};const variations=Array.from({length:9},()=> (rand()-.5)*.018),clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,u=(x+.5)/size,v=(y+.5)/size,tx=u*3,ty=v*3,cx=Math.floor(tx),cy=Math.floor(ty),d=Math.min(tx-cx,1-tx+cx,ty-cy,1-ty+cy)*tile;
 const grout=Math.max(0,Math.min(1,(joint/2+span/size/2-d)/(span/size)));
 const cloud=.004*Math.sin(u*Math.PI*10+Math.cos(v*Math.PI*6))+.003*Math.cos(v*Math.PI*14+u*Math.PI*4),grain=(rand()-.5)*.014;
 const tone=.145+variations[cy*3+cx]+cloud+grain-grout*.033;
 for(let k=0;k<3;k++)albedo[i*3+k]=clamp((tone+[.003,.004,0][k])*255);
 const rough=clamp((.23+cloud*4+Math.abs(grain)+grout*.4)*255);
 mr[i*3]=255;mr[i*3+1]=rough;mr[i*3+2]=0;
 mask[i*4]=0;mask[i*4+1]=255;mask[i*4+2]=0;mask[i*4+3]=255-rough;
 height[i]=grain*.0008-grout*.0006;
}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])/(2*span/size),dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])/(2*span/size),len=Math.hypot(dx,dy,1);
 normal[i*3]=clamp((.5-.5*dx/len)*255);normal[i*3+1]=clamp((.5-.5*dy/len)*255);normal[i*3+2]=clamp((.5+.5/len)*255);
}
const maps={};for(const[k,b,ch]of [['albedo',albedo,3],['metal-rough',mr,3],['mask',mask,4],['normal',normal,3]]){
 const data=await sharp(b,{raw:{width:size,height:size,channels:ch}}).png().toBuffer(),file='restaurant-floor-'+k+'.png';await writeFile(out+'/textures/'+file,data);maps[k]={file,sha256:hash(data),bytes:data.length,data};
}
const parts=[bin];let offset=bin.length;
function append(data,target){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});parts.push(data);offset+=data.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const sampler=(j.samplers??=[]).length;j.samplers.push({magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497});
function texture(k){const image=(j.images??=[]).length;j.images.push({name:'Restaurant floor '+k,bufferView:append(maps[k].data),mimeType:'image/png'});const i=(j.textures??=[]).length;j.textures.push({source:image,sampler});return {index:i};}
j.materials[mi]={...j.materials[mi],pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:1,roughnessFactor:1,baseColorTexture:texture('albedo'),metallicRoughnessTexture:texture('metal-rough')},normalTexture:{...texture('normal'),scale:.6}};
function attribute(ai){const a=j.accessors[ai],v=j.bufferViews[a.bufferView],ext=v.extensions?.EXT_meshopt_compression;assert(a.componentType===5126&&!a.sparse);let data=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);if(ext){data=Buffer.alloc(ext.count*ext.byteStride);MeshoptDecoder.decodeGltfBuffer(data,ext.count,ext.byteStride,bin.subarray(ext.byteOffset,ext.byteOffset+ext.byteLength),ext.mode,ext.filter);}return{a,data,stride:v.byteStride||12};}
let vertices=0;for(const [i,m]of j.meshes.entries())for(const p of m.primitives)if(p.material===mi){
 for(const node of j.nodes.filter(n=>n.mesh===i))assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale);
 const{a,data,stride}=attribute(p.attributes.POSITION),values=Buffer.alloc(a.count*8);
 for(let k=0;k<a.count;k++){const at=(a.byteOffset||0)+k*stride,point=[0,1,2].map(c=>data.readFloatLE(at+c*4)),t=uv(point);values.writeFloatLE(t[0],k*8);values.writeFloatLE(t[1],k*8+4);}
 const index=j.accessors.length;j.accessors.push({bufferView:append(values,34962),componentType:5126,count:a.count,type:'VEC2'});p.attributes.TEXCOORD_0=index;vertices+=a.count;
}
assert(vertices>0);j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));assert(readGLB(glb).bin.subarray(0,bin.length).equals(bin));
const material=layout.authoredMaterials.find(m=>m.label===label);assert(material&&!material.albedo,'Floor finish already installed');Object.assign(material,{linearColor:{r:1,g:1,b:1,a:1},metallic:0,roughness:1,normalScale:.6,...Object.fromEntries(['albedo','normal','mask'].map(k=>[k,'AtriumTextures/restaurant-floor-'+k]))});
for(const p of panels)p.uv=p.vertices.map(v=>{const[u,t]=uv([v.x,v.y,-v.z]);return{x:u,y:1-t};});
const outputLayout=JSON.stringify(layout)+'\n';station.authoredMaterials=layout.authoredMaterials;station.layoutSha256=hash(outputLayout);
const report={parent:config,builderSha256:hash(await readFile(new URL(import.meta.url))),reference:{url:'https://soulkyoto.blog.fc2.com/blog-entry-395.html',photo:'soulkyoto-20140209kyotostation06_0326.jpg',date:'2014-02-09'},frame:{origin:E,across:A,inward:N,spanM:span},tileM:tile,jointM:joint,resolution:size,vertices,materialLabel:label,materialId:material.id,maps:Object.fromEntries(Object.entries(maps).map(([k,{data,...m}])=>[k,m])),layoutSha256:hash(outputLayout),geometrySha256:hash(glb),addedGlbBytes:glb.length-bytes.length,geometryAndPhysicsUnchanged:true,limits:['Tile size, reflectance and roughness are authored estimates from the historical photograph.','No photographic pixels or baked highlights. Existing station reflections are reused.']};
await writeFile(out+'/station-layout.json',outputLayout);await writeFile(out+'/atrium.runtime.glb',glb);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/assets.json',JSON.stringify({...config,layout:out+'/station-layout.json',layoutSha256:report.layoutSha256,geometry:out+'/atrium.runtime.glb',geometrySha256:report.geometrySha256,station:out+'/station.json'},null,2)+'\n');console.log(JSON.stringify({vertices,addedGlbBytes:report.addedGlbBytes,layout:report.layoutSha256}));
