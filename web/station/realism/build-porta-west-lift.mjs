// Connect the mapped C3 western Porta lift to the forecourt.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
function mat(name,color,roughness=.55,metallic=0){const i=mats.length;mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});return i;}
const steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),dark=mat('Subway lift | dark floor',[.11,.12,.12]),ceiling=mat('Subway lift | ceiling',[.74,.74,.7]),button=mat('Subway lift | button',[.1,.22,.45]),wall=mat('Subway lift | enclosure',[.65,.64,.55]),printed=mat('Porta west lift | directions',[1,1,1]);
const glass=mat('Porta west lift | glass',[.65,.79,.83],.16,.05);mats[glass].pbrMetallicRoughness.baseColorFactor[3]=.22;mats[glass].alphaMode='BLEND';mats[glass].doubleSided=true;
const c=construction(mats,{flatNormals:true}),prefix='porta-west-lift-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],L=s.lower,H=s.upper,X=s.origin.x,Z=s.origin.z;
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=wall,role='wall')=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
for(const p of s.slabs){assert.equal(typeof p.collision,'boolean');const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
// Place the underground shaft beside the aisle and a glazed pavilion on the forecourt.
for(const[a,b,side]of[[X-1.75,X-1.6,'west'],[X+1.6,X+1.75,'east']]){
 box('shaft-'+side,a,b,Z-1.6,Z+1.5,H+.12,L-.5);
 box('pavilion-'+side,a+.05,b-.05,Z-1.4,Z+1.4,H+3.2,H+.12,glass,'shaft-glazing');
}
box('shaft-back',X-1.6,X+1.6,Z+1.35,Z+1.5,H+.12,L-.5);
box('pavilion-back',X-1.6,X+1.6,Z+1.4,Z+1.45,H+3.2,H+.12,glass,'shaft-glazing');
box('pit',X-1.6,X+1.6,Z-1.6,Z+1.35,L-.35,L-.5,dark,'pit-floor');
box('pavilion-roof',X-1.95,X+1.95,Z-1.8,Z+1.7,H+3.35,H+3.2,ceiling,'shaft-roof');
for(const x of[X-1.65,X+1.65])for(const z of[Z-1.5,Z+1.4])box('pavilion-post-'+x+'-'+z,x-.05,x+.05,z-(z<Z?.07:.05),z+.05,H+3.2,H,steel,'frame');
for(const[a,b,side]of[[X-1.75,X-.7,'west'],[X+.7,X+1.75,'east']])box('front-'+side,a,b,Z-1.55,Z-1.4,H+3.2,L-.5);
for(const[a,b,label]of[[L-.5,L,'bottom'],[L+2.2,H,'between'],[H+2.2,H+3.2,'top']])box('front-'+label,X-.7,X+.7,Z-1.55,Z-1.4,b,a);
box('lower-sill',X-1.6,X+1.6,Z-1.6,Z-1.185,L,L-.12,steel,'lift-sill');
c.slab(prefix+'upper-sill',[[X-1.6,s.frontEdge[0],-(Z-1.6)],[X+1.6,s.frontEdge[1],-(Z-1.6)],[X+1.6,H,-(Z-1.185)],[X-1.6,H,-(Z-1.185)]],[],.12,steel,'lift-sill');
const faces=[];
for(const[y,name]of[[L,'mall'],[H,'forecourt']]){
 for(const x of[X-.74,X+.74])box(name+'-jamb-'+x,x-.035,x+.035,Z-1.6,Z-1.38,y+2.25,y,steel,'lift-frame');
 box(name+'-head',X-.775,X+.775,Z-1.6,Z-1.38,y+2.28,y+2.18,steel,'lift-frame');
 box(name+'-call-plate',X+1,X+1.18,Z-1.62,Z-1.59,y+1.27,y+.95,steel,'call-button');box(name+'-button',X+1.045,X+1.135,Z-1.64,Z-1.62,y+1.17,y+1.06,button,'call-button');
 box(name+'-indicator',X-.2,X+.2,Z-1.62,Z-1.60,y+2.60,y+2.36,button,'lift-indicator');
 box(name+'-sign',X-1.55,X+1.55,Z-1.655,Z-1.63,y+3.15,y+2.70,printed,'sign');c.panels.at(-1).collision=false;
 faces.push({id:prefix+name+'-sign',y:y+2.70,text:name==='mall'?['地上・京都駅前広場','Street / Station Forecourt']:['ポルタ 西エリア','Porta / West Area']});
}
for(const p of c.panels)if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===steel?'steel':p.browserMaterial===glass?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('South Street to west lift',[point(35,L,35),point(18,L,35),point(18,L,42),point(X,L,42)]);
pair('North Street to west lift',[point(35,L,52),point(18,L,52),point(18,L,42),point(X,L,42)]);
pair('West cross-passage bypass',[point(18,L,35),point(18,L,52)]);
pair('West lift forecourt approach',s.forecourtRoute.toReversed());
pair('Retained B2 stair approach',[point(18,L,42),point(18,L,35),point(18,L,31)]);
const report=await c.save(out,'porta-west-lift.glb',{componentPrefix:prefix,sourceCollection:'Porta western public lift',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the western Porta cross-passage to the station forecourt with a guarded passenger lift and clear shopping streets.',geometry:{routes,blocked:[],spawn:point(X,L,Z-3),retiredIds:s.retiredIds,retiredLights:[],lower:L,upper:H,origin:s.origin,opening:s.opening,modifiedPaving:s.modifiedPaving},references:['https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf','research/kyoto-station/maps/porta-shopguide-2026.pdf','https://omoiyarimap.jp/pages/kyoto-porta/index_hanrei.html'],limits:['The operator identifies the C3 lift in the west area; exact alignment, dimensions and pavilion finishes are fitted approximations.','The B2 lift, other street entrances, farther west shops and Kotochika remain unfinished.']});
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="768"><rect width="2048" height="768" fill="#eef0e7"/>';
for(const[i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256})" fill="#162b49" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="78">${f.text[0]}</text><text y="204" font-size="55">${f.text[1]}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/porta-west-lift-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/porta-west-lift.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-(Z-1.6425)),r=flat?row:2,u=flat?.5-side*(v.x-X)/3.1:.5,t=(r+1-(v.y-f.y)/.45)/3;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Porta west lift directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=[];
const raw=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',raw);await writeFile(out+'/porta-west-lift.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'porta-west-lift-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/lift-spec.json',JSON.stringify(subwayLift({id:'porta-west-public-lift',origin:s.origin,height:H-L}))+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
