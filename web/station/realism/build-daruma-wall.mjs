// Framed photographs and lower-wall joinery from the actual Kyoto dining-room photo.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),cfg=await read(manifest),frame=(await read('.local/v2/current/components/daruma-frontage/report.json')).geometry,{origin:C,across:A,inward:N}=frame,sha=b=>createHash('sha256').update(b).digest('hex');
const original=readGLB(await readFile(cfg.geometry));
const reused=['Daruma | dark stained timber','Daruma kitchen | dark metal','Daruma | cream counter'];
const mats=reused.map(name=>{const m=original.json.materials.find(m=>m.name===name);assert(m);const p=m.pbrMetallicRoughness;return{name,pbrMetallicRoughness:{baseColorFactor:p.baseColorFactor,metallicFactor:p.metallicFactor,roughnessFactor:p.roughnessFactor}};});
mats.push({name:'Daruma wall | Kyoto historical prints',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.78}});
const c=construction(mats),point=(w,h,t)=>[C[0]+A[0]*w+N[0]*t,C[1]+h,C[2]+A[2]*w+N[2]*t];
function box(id,w,h,t,x,y,z,m,{collision=true,axis='h',photo=null}={}){
 const g=new T.BoxGeometry(x,y,z),p=g.attributes.position,n=g.attributes.normal,normals=[];
 for(let i=0;i<p.count;i++)normals.push(A[0]*n.getX(i)+N[0]*n.getZ(i),n.getY(i),A[2]*n.getX(i)+N[2]*n.getZ(i));
 c.add('daruma-wall-'+id,Array.from({length:p.count},(_,i)=>point(w+p.getX(i),h+p.getY(i),t+p.getZ(i))),Array.from(g.index.array),m,'restaurant-wall-fitting',normals);
 const panel=c.panels.at(-1);panel.material=m===0?'wood':m===1?'steel':'stone';panel.collision=collision;
 panel.normals=Array.from({length:p.count},(_,i)=>({x:normals[i*3],y:normals[i*3+1],z:-normals[i*3+2]}));
 panel.uv=Array.from({length:p.count},(_,i)=>{
  if(photo){const u=.5-p.getX(i)/x,v=.5-p.getY(i)/y,[left,top,right,bottom]=photo;return{x:(left+(right-left)*u)/640,y:1-(top+(bottom-top)*v)/480};}
  return{x:(axis==='h'?h+p.getY(i):axis==='t'?t+p.getZ(i):w+p.getX(i))/1.6,y:(axis==='h'?t+p.getZ(i):h+p.getY(i))/.4};
 });g.dispose();return panel;
}
// The left-hand dado visible in the reference continues to the service wall.
// Its 18 mm lining sits on the existing wall, outside the established walking loop.
box('left-lining',-4.192,.45,2.695,.018,.90,5.39,0);
box('left-cap',-4.181,.925,2.695,.04,.05,5.39,0,{axis:'t'});
box('left-kickplate',-4.178,.075,2.695,.036,.15,5.39,1);
for(let i=0;i<7;i++)box('left-panel-stile-'+i,-4.177,.5,.06+i*.875,.028,.72,.026,0);
// A header and jamb finish the staff opening; keep the existing 0.8 m access clear.
box('staff-header',-3.78,2.595,5.39,.86,.59,.10,2);
box('staff-header-trim',-3.78,2.295,5.32,.86,.035,.06,0,{axis:'w'});
box('staff-jamb-trim',-3.383,1.15,5.32,.025,2.3,.06,0);
// Complete the upper-wall junction against the diagonal outer wall.
box('right-header-join',2.065,2.595,5.39,.56,.59,.10,2);
box('right-header-trim',2.065,2.295,5.32,.56,.035,.06,0,{axis:'w'});
// Two framed prints above the hatch. The source JPEG is embedded unchanged;
// UV rectangles select the photographed prints without inventing archival content.
const prints=[{w:.52,pixels:[224,7,329,82]},{w:-1.65,pixels:[452,6,558,81]}];
for(const[i,{w,pixels}]of prints.entries()){
 box('frame-back-'+i,w,2.58,5.315,.79,.575,.035,1,{collision:false});
 box('frame-mat-'+i,w,2.58,5.293,.758,.543,.011,2,{collision:false});
 box('print-'+i,w,2.58,5.285,.73,.521,.006,3,{collision:false,photo:pixels});
 for(const side of[-1,1]){
  box('frame-horizontal-'+i+'-'+side,w,2.58+side*.279,5.282,.79,.017,.024,1,{collision:false});
  box('frame-vertical-'+i+'-'+side,w+side*.3865,2.58,5.282,.017,.558,.024,1,{collision:false});
 }
}
await c.save(out,'daruma-wall.glb',{sourceLayoutSha256:cfg.layoutSha256,geometry:{...frame,framedPrints:2,leftLiningLengthM:5.39,staffOpeningWidthM:.78},scope:'Kyoto-photo-guided framed prints, dark dado, kickplate and service-wall upper joins.'});
const source='research/kyoto-station/photos/daruma-kyotopi-interior-20260612.jpg',texture=await readFile(source);assert.equal(sha(texture),'e6ebcc47002ab96fcb042c2c075c1c7124f027b60b60c2c927ef3713ff90682f');await writeFile(out+'/daruma-wall-reference.jpg',texture);
const path=out+'/daruma-wall.glb',{json:j,bin}=readGLB(await readFile(path)),parts=[bin];let offset=bin.length;
function append(data){const index=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length});parts.push(data);offset+=data.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return index;}
for(const[mi,mesh]of j.meshes.entries()){
 const p=mesh.primitives[0],acc=j.accessors[p.attributes.POSITION],data=Buffer.alloc(acc.count*8);let i=0;
 for(const panel of c.panels.filter(p=>p.browserMaterial===mi))for(const uv of panel.uv){data.writeFloatLE(uv.x,i*8);data.writeFloatLE(1-uv.y,i*8+4);i++;}
 assert.equal(i,acc.count);p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(data),componentType:5126,count:acc.count,type:'VEC2'});
}
j.images=[{bufferView:append(texture),mimeType:'image/jpeg'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[3].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
const glb=writeGLB(j,Buffer.concat(parts));await writeFile(path,glb);const report=await read(out+'/report.json');Object.assign(report,{builder:'web/station/realism/build-daruma-wall.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),reference:'https://kyotopi.jp/articles/hakatadaruma',texture:{file:'daruma-wall-reference.jpg',sha256:sha(texture),material:mats[3].name,source:'https://image.kyotopi.jp/item_images/images/000/311/945/medium/e1a38a26-e7ea-4c82-9da0-d7492a24434b.jpg?1781106367',uvSelections:prints.map(p=>p.pixels)},limits:['Frame, dado and join dimensions are fitted estimates.','Prints use the actual Kyoto photo at its available resolution; original high-resolution scans remain unavailable.','Staff opening and upper joins are inferred within the existing footprint.','Research image provenance is recorded; no redistribution license has been established.']});report.outputs.glbSha256=sha(glb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.geometry);
