// Complete the South-gate/platform connection identified in the city's station plan.
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
const steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),dark=mat('Subway lift | dark floor',[.11,.12,.12]),ceiling=mat('Subway lift | ceiling',[.74,.74,.7]),button=mat('Subway lift | button',[.1,.22,.45]),wall=mat('Subway lift | enclosure',[.65,.64,.55]),printed=mat('South platform lift | directions',[1,1,1]);
const c=construction(mats,{flatNormals:true}),prefix='subway-south-lift-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],L=s.lower,H=s.upper,X=s.origin.x,Z=s.origin.z;
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=wall,role='wall')=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
for(const p of [...s.slabs,...s.joints]){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
// The existing hall and platform supply both landings. Only the shaft is cut.
for(const[a,b,side]of[[X-1.75,X-1.6,'west'],[X+1.6,X+1.75,'east']])box('shaft-'+side,a,b,Z-1.6,Z+1.5,s.ceiling,L-.5);
box('shaft-back',X-1.6,X+1.6,Z+1.35,Z+1.5,s.ceiling,L-.5);box('shaft-roof',X-1.75,X+1.75,Z-1.6,Z+1.5,s.ceiling+.15,s.ceiling,ceiling,'shaft-roof');box('pit',X-1.6,X+1.6,Z-1.6,Z+1.35,L-.35,L-.5,dark,'pit-floor');
for(const[a,b,side]of[[X-1.75,X-.7,'west'],[X+.7,X+1.75,'east']])box('front-'+side,a,b,Z-1.55,Z-1.4,s.ceiling,L-.5);
for(const[a,b,label]of[[L-.5,L,'bottom'],[L+2.2,H,'between'],[H+2.2,s.ceiling,'top']])box('front-'+label,X-.7,X+.7,Z-1.55,Z-1.4,b,a);
const faces=[];
for(const[y,name]of[[L,'platform'],[H,'south-gate']]){
 box(name+'-sill',X-1.6,X+1.6,Z-1.6,Z-1.185,y,y-.12,steel,'lift-sill');
 for(const x of[X-.74,X+.74])box(name+'-jamb-'+x,x-.035,x+.035,Z-1.6,Z-1.38,y+2.25,y,steel,'lift-frame');
 box(name+'-head',X-.775,X+.775,Z-1.6,Z-1.38,y+2.28,y+2.18,steel,'lift-frame');
 box(name+'-call-plate',X+1,X+1.18,Z-1.62,Z-1.59,y+1.27,y+.95,steel,'call-button');box(name+'-button',X+1.045,X+1.135,Z-1.64,Z-1.62,y+1.17,y+1.06,button,'call-button');
 box(name+'-indicator',X-.2,X+.2,Z-1.62,Z-1.60,y+2.60,y+2.36,button,'lift-indicator');
 box(name+'-sign',X-1.55,X+1.55,Z-1.655,Z-1.63,y+3.15,y+2.70,printed,'sign');c.panels.at(-1).collision=false;
 faces.push({id:prefix+name+'-sign',y:y+2.70,text:name==='platform'?['南改札・八条口','South Gate / Hachijo Exit']:['地下鉄 のりば','Subway Platforms 1 / 2']});
}
for(const p of c.panels)if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===steel?'steel':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('South gate to lift landing',[point(160,H,-127.75),point(170,H,-127.75),point(172,H,-132),point(177,H,-132)]);
pair('South lift to retained stair approach',[point(177,H,-132),point(182,H,-132),point(182,H,-121),point(177,H,-121),point(177,H,-118.6)]);
for(const x of[172.3,181.7])pair('Platform aisle beside south lift '+x,[point(x,L,-138),point(x,L,-121),point(x,L,-104)]);
pair('South platform end to lift',[point(177,L,-138),point(177,L,-132)]);
const report=await c.save(out,'subway-south-lift.glb',{componentPrefix:prefix,sourceCollection:'South gate subway passenger lift',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the subway South paid hall to the southern island platform with a guarded passenger lift and clear surrounding aisles.',geometry:{routes,blocked:[],spawn:point(X,L,Z-3),retiredIds:s.retiredIds,retiredLights:[],lower:L,upper:H,origin:s.origin,hole:s.hole},references:['https://www.city.kyoto.lg.jp/kotsu/page/0000009812.html','research/kyoto-station/maps/subway-kyoto-plan.pdf'],limits:['The operator identifies the South gate/platform connection; shaft placement, dimensions and finishes are fitted approximations.','Platform toilets, detailed services and the remaining Porta lifts are still unfinished.']});
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="768"><rect width="2048" height="768" fill="#eef0e7"/>';
for(const[i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256})" fill="#162b49" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="78">${f.text[0]}</text><text y="204" font-size="55">${f.text[1]}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/subway-south-lift-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/subway-south-lift.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-(Z-1.6425)),r=flat?row:2,u=flat?.5-side*(v.x-X)/3.1:.5,t=(r+1-(v.y-f.y)/.45)/3;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original South gate lift directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=[];
const raw=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',raw);await writeFile(out+'/subway-south-lift.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'subway-south-lift-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/lift-spec.json',JSON.stringify(subwayLift({id:'subway-south-platform-lift',origin:s.origin,height:H-L}))+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
