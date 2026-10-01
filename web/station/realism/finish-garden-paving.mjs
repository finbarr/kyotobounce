// Give the roof promenade its own metric paving finish, retaining its floor mesh.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';

const [manifest,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
await mkdir(out,{recursive:true});await mkdir(out+'/textures',{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await readFile(p));
const parent=await read(manifest),raw=await readFile(parent.layout),bytes=await readFile(parent.geometry);
assert.equal(sha(raw),parent.layoutSha256);assert.equal(sha(bytes),parent.geometrySha256);
const layout=JSON.parse(raw),station=await read(parent.station),detail=await read(parent.detail),{json:j,bin}=readGLB(bytes);
const panel=layout.panels.find(p=>p.id==='garden-promenade-public-floor');assert(panel&&!panel.uv);
const previous=layout.authoredMaterials.find(m=>m.id===panel.appearance);
assert.equal(previous.label,'station-additions-garden-paving');
const oldIndex=j.materials.findIndex(m=>m.name===previous.label+' | Browser');assert(oldIndex>=0);
const candidates=j.meshes.flatMap((mesh,i)=>mesh.primitives.flatMap((p,k)=>p.material===oldIndex&&j.accessors[p.attributes.POSITION].count===panel.vertices.length?[{p,i,k}]:[]));
assert.equal(candidates.length,1,'Locate only the promenade floor, preserving the stair material');
const {p:primitive,i:meshIndex,k:primitiveIndex}=candidates[0];
const pos=j.accessors[primitive.attributes.POSITION],view=j.bufferViews[pos.bufferView];
assert.equal(pos.componentType,5126);assert(!view.extensions&&!view.byteStride&&!pos.sparse);
for(const node of j.nodes.filter(n=>n.mesh===meshIndex))assert(!node.matrix&&!node.translation&&!node.rotation&&!node.scale);
const nativeKey=v=>[v.x,v.y,-v.z].map(n=>n.toFixed(5)).join(','),wanted=new Set(panel.vertices.map(nativeKey));
for(let k=0;k<pos.count;k++){const at=(view.byteOffset||0)+(pos.byteOffset||0)+k*12;assert(wanted.has([0,1,2].map(i=>bin.readFloatLE(at+i*4).toFixed(5)).join(',')));}

// Four 0.6 m slabs per repeat. Tone and dimensions are estimates from the
// operator's photos; this is original material data, without baked lighting.
const size=512,span=2.4,tile=.6,joint=.004,origin=[-202.3,-25],normalScale=.55;
const albedo=Buffer.alloc(size*size*3),mr=Buffer.alloc(size*size*3),mask=Buffer.alloc(size*size*4),normal=Buffer.alloc(size*size*3),height=new Float32Array(size*size);
let seed=0x67617264;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
const variations=Array.from({length:16},()=> (rand()-.5)*.06),clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,u=(x+.5)/size,v=(y+.5)/size,tx=u*4,ty=v*4,cx=Math.floor(tx),cy=Math.floor(ty);
 const edge=Math.min(tx-cx,1-tx+cx,ty-cy,1-ty+cy)*tile,pixel=span/size;
 const grout=Math.max(0,Math.min(1,(joint/2+pixel/2-edge)/pixel));
 const cloud=.006*Math.sin(u*Math.PI*12+Math.cos(v*Math.PI*6))+.004*Math.cos(v*Math.PI*18+u*Math.PI*4),grain=(rand()-.5)*.035;
 const tone=.73+variations[cy*4+cx]+cloud+grain-grout*.19;
 for(let k=0;k<3;k++)albedo[i*3+k]=clamp((tone+[.018,-.014,-.041][k])*255);
 const rough=clamp((.79+cloud*2+Math.abs(grain)+grout*.12)*255);
 mr[i*3]=255;mr[i*3+1]=rough;mr[i*3+2]=0;
 mask[i*4]=0;mask[i*4+1]=255;mask[i*4+2]=0;mask[i*4+3]=255-rough;
 height[i]=grain*.001-grout*.0012;
}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*size+x,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])/(2*span/size),dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])/(2*span/size),len=Math.hypot(dx,dy,1);
 normal[i*3]=clamp((.5-.5*dx/len)*255);normal[i*3+1]=clamp((.5-.5*dy/len)*255);normal[i*3+2]=clamp((.5+.5/len)*255);
}
const maps={};for(const[k,b,channels]of [['albedo',albedo,3],['metal-rough',mr,3],['mask',mask,4],['normal',normal,3]]){
 const data=await sharp(b,{raw:{width:size,height:size,channels}}).png().toBuffer(),file='garden-paving-'+k+'.png';
 await writeFile(out+'/textures/'+file,data);maps[k]={file,sha256:sha(data),bytes:data.length,data};
}
const parts=[bin];let offset=bin.length;
function append(data,target){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});parts.push(data);offset+=data.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const sampler=j.samplers.length;j.samplers.push({magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497});
function texture(k){const image=j.images.length;j.images.push({name:'Garden paving '+k,bufferView:append(maps[k].data),mimeType:'image/png'});const i=j.textures.length;j.textures.push({source:image,sampler});return{index:i};}
const materialId='garden-paving-pale-stone',materialLabel='Rooftop garden | pale stone paving';
assert(!layout.authoredMaterials.some(m=>m.id===materialId));
primitive.material=j.materials.length;
j.materials.push({...j.materials[oldIndex],name:materialLabel+' | Browser',extras:{sourceLabel:materialLabel,physical:'stone'},pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:1,roughnessFactor:1,baseColorTexture:texture('albedo'),metallicRoughnessTexture:texture('metal-rough')},normalTexture:{...texture('normal'),scale:normalScale}});
const uv=(x,z)=>[(x-origin[0])/span,(z-origin[1])/span],values=Buffer.alloc(pos.count*8);
for(let k=0;k<pos.count;k++){const at=(view.byteOffset||0)+(pos.byteOffset||0)+k*12,[u,v]=uv(bin.readFloatLE(at),-bin.readFloatLE(at+8));values.writeFloatLE(u,k*8);values.writeFloatLE(v,k*8+4);}
primitive.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(values,34962),componentType:5126,count:pos.count,type:'VEC2'});
j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));
layout.authoredMaterials.push({...previous,id:materialId,label:materialLabel,linearColor:{r:1,g:1,b:1,a:1},emission:0,emissionColor:{r:0,g:0,b:0},roughness:1,metallic:0,normalScale,...Object.fromEntries(['albedo','normal','mask'].map(k=>[k,'AtriumTextures/garden-paving-'+k]))});
panel.appearance=materialId;panel.uv=panel.vertices.map(v=>{const[u,t]=uv(v.x,v.z);return{x:u,y:1-t};});
const output=JSON.stringify(layout)+'\n';station.authoredMaterials=layout.authoredMaterials;station.layoutSha256=sha(output);
const F=Math.max(...panel.vertices.map(v=>v.y)),pt=(x,z)=>({x,y:F,z});
const route=[pt(-162,-23.8),pt(-185,-23.8),pt(-185,-15),pt(-185,-10),pt(-185,3),pt(-201,3),pt(-207,2),pt(-240,2),pt(-247,2)];
const routes=[{label:'Garden paving to western store',points:route},{label:'Garden paving return',points:route.toReversed()}];
const report={parent,builderSha256:sha(await readFile(new URL(import.meta.url))),panelId:panel.id,previousMaterialId:previous.id,materialId,materialLabel,meshIndex,primitiveIndex,frame:{origin,spanM:span},tileM:tile,jointM:joint,resolution:size,normalScale,vertices:pos.count,maps:Object.fromEntries(Object.entries(maps).map(([k,{data,...m}])=>[k,m])),layoutSha256:sha(output),geometrySha256:sha(glb),addedGlbBytes:glb.length-bytes.length,geometry:{routes,chromeRoutes:routes.map(r=>r.label),blocked:[],spawn:parent.spawn},references:['https://www.kyoto-station-building.co.jp/service/square/'],limits:['Slab pitch and reflectance are authored estimates; current photographs do not provide surveyed dimensions.','Existing inset squares and planting retain their authored placement.']};
await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');
await writeFile(out+'/station-layout.json',output);await writeFile(out+'/atrium.runtime.glb',glb);await writeFile(out+'/station.json',JSON.stringify(station)+'\n');await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
detail.candidateMotionIntegration.layoutSha256=report.layoutSha256;
await writeFile(out+'/atrium-detail.json',JSON.stringify(detail)+'\n');
await writeFile(out+'/assets.json',JSON.stringify({...parent,layout:out+'/station-layout.json',layoutSha256:report.layoutSha256,geometry:out+'/atrium.runtime.glb',geometrySha256:report.geometrySha256,station:out+'/station.json',detail:out+'/atrium-detail.json',motionLayout:out+'/station-layout.json'},null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([
 ['garden-arrival',[-163,F+1.65,-23.8],[-182,F+.4,-18]],
 ['garden-court',[-185,F+1.65,-20],[-185,F+.6,-4]],
 ['paving-detail',[-185,F+1.65,-10],[-185,F,-7]],
 ['western-passage',[-210,F+1.65,2],[-242,F+.8,2]],
 ['garden-return',[-198,F+1.65,3],[-183,F+.8,-12]]
 ],null,2)+'\n');
console.log({vertices:pos.count,addedGlbBytes:report.addedGlbBytes,layoutSha256:report.layoutSha256});
