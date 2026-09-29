// Public lift between the subway South lobby and the Hachijo East foyer.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,color,roughness=.55,metallic=0)=>({name:'Subway lift | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const steel=mats.length;mats.push(mat('steel',[.46,.49,.5],.3,.8));const dark=mats.length;mats.push(mat('dark floor',[.11,.12,.12]));const ceiling=mats.length;mats.push(mat('ceiling',[.74,.74,.7]));const button=mats.length;mats.push(mat('button',[.1,.22,.45]));const wall=mats.length;mats.push(mat('enclosure',[.65,.64,.55]));const printed=mats.length;mats.push(mat('Hachijo signs',[1,1,1]));
const c=construction(mats,{flatNormals:true}),prefix='hachijo-lift-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],L=s.lower,H=s.upper,X=s.centerX,Z=s.centerZ;
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=wall,role='wall')=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab(p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));c.panels.at(-1).material=p.material;}
for(const[a,b,side]of[[X-1.75,X-1.6,'west'],[X+1.6,X+1.75,'east']])box('shaft-'+side,a,b,Z-1.6,Z+1.5,H+3.05,L-.5);
box('shaft-back',X-1.6,X+1.6,Z+1.35,Z+1.5,H+3.05,L-.5);
box('shaft-roof',X-1.75,X+1.75,Z-1.6,Z+1.5,H+3.05,H+2.85,ceiling,'shaft-roof');
box('pit-base',X-1.6,X+1.6,Z-1.6,Z+1.35,L-.35,L-.5,dark,'pit-floor');
for(const[a,b,side]of[[X-1.75,X-.7,'west'],[X+.7,X+1.75,'east']])box('front-side-'+side,a,b,Z-1.55,Z-1.4,H+2.85,L-.5);
for(const[a,b,label]of[[L-.5,L,'bottom'],[L+2.2,H,'between'],[H+2.2,H+2.85,'top']])box('front-'+label,X-.7,X+.7,Z-1.55,Z-1.4,b,a);
for(const[floor,name]of[[L,'passage'],[H,'foyer']]){
 box(name+'-sill',X-1.6,X+1.6,Z-1.6,Z-1.185,floor,floor-.12,steel,'lift-sill');
 for(const x of[X-.74,X+.74])box(name+'-jamb-'+x,x-.035,x+.035,Z-1.6,Z-1.38,floor+2.25,floor,steel,'lift-frame');
 box(name+'-head',X-.775,X+.775,Z-1.6,Z-1.38,floor+2.28,floor+2.18,steel,'lift-frame');
 box(name+'-call-plate',X+1,X+1.18,Z-1.62,Z-1.59,floor+1.27,floor+.95,steel,'call-button');
 box(name+'-call-button',X+1.045,X+1.135,Z-1.64,Z-1.62,floor+1.17,floor+1.06,button,'call-button');
 box(name+'-indicator',X-.2,X+.2,Z-1.62,Z-1.60,floor+2.60,floor+2.36,button,'lift-indicator');
 box(name+'-sign',X-1.55,X+1.55,Z-1.68,Z-1.64,floor+2.83,floor+2.60,printed,'sign');c.panels.at(-1).collision=false;
}
for(const p of c.panels)if(!s.slabs.some(r=>prefix+r.id===p.id))p.material=p.browserMaterial===steel?'steel':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Public passage to Hachijo lift',[point(151.25,L,-116),point(152.75,L,-135),point(X,L,-135)]);
pair('Hachijo lift to South subway gate',[point(X,L,-135),point(162.5,L,-134.7),point(162.5,L,-127.75),point(168,L,-127.75)]);
pair('Hachijo foyer entrance to lift',[point(150,0,-189),point(147.1,0,-172),point(147.1,0,-153),point(147.1,0,-135),point(X,0,-135)]);
pair('JR entrance bypass beside lift',[point(147.1,0,-155),point(147.1,0,-135),point(147.1,0,-126)]);
pair('Retained ticket machine approach',[point(152.75,L,-135),point(157.2,L,-135),point(159,L,-134.7)]);
const report=await c.save(out,'hachijo-lift.glb',{componentPrefix:prefix,sourceCollection:'Hachijo East public lift',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Operating public lift from the subway South lobby to the Hachijo East foyer and southern forecourt.',geometry:{routes,spawn:point(X,L,-135),retiredIds:s.retiredIds,retiredLights:[],opening:s.opening,lower:L,upper:H},references:['https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm','research/kyoto-station/maps/subway-kyoto-plan.pdf','https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_03.pdf'],limits:['Connected levels follow the operator plans; shaft alignment, car dimensions and finishes are fitted approximations.','The route reaches the station side of Hachijo; the crossing and lift on the south side of Hachijo Street remain unfinished.']});
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="256"><rect width="2048" height="256" fill="#113d35"/><g fill="#fff" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text x="1024" y="106" font-size="82">地下鉄・八条東口</text><text x="1024" y="205" font-size="62">Lift · Subway / Hachijo East</text></g></svg>',png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/hachijo-lift-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/hachijo-lift.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const floor=p.id.includes('passage')?L:H;p.uv=p.vertices.map(v=>{const u=(v.x-X+1.55)/3.1,t=1-(v.y-floor-2.60)/.23;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Hachijo lift directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=[];
const raw=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',raw);await writeFile(out+'/hachijo-lift.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'hachijo-lift-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/lift-spec.json',JSON.stringify(subwayLift({id:'subway-hachijo-east-lift',origin:{x:X,y:L,z:Z},height:H-L}))+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,height:H-L,routes:routes.length});
