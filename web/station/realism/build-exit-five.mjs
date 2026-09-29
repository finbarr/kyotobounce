// Public lift from the B1 passage to the northeast station forecourt.
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
const steel=mats.length;mats.push(mat('steel',[.46,.49,.5],.3,.8));const dark=mats.length;mats.push(mat('dark floor',[.11,.12,.12]));const ceiling=mats.length;mats.push(mat('ceiling',[.74,.74,.7]));const button=mats.length;mats.push(mat('button',[.1,.22,.45]));const wall=mats.length;mats.push(mat('enclosure',[.65,.64,.55]));const glass=mats.length;mats.push({...mat('Exit 5 glass',[.65,.79,.83],.16),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.22],roughnessFactor:.16,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true});const printed=mats.length;mats.push(mat('Exit 5 signs',[1,1,1]));
const c=construction(mats,{flatNormals:true}),prefix='exit-five-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],L=s.lower,H=s.upper,X=s.centerX,Z=s.centerZ;
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=wall,role='wall')=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab(p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));c.panels.at(-1).material=p.material;}
for(const[a,b]of[[32,35.7],[41.3,49.2]])box('retained-public-wall-'+a,146.925,147.075,a,b,-2.8,L);
box('recess-west',145.7,145.85,35.7,41.3,-2.8,L);
for(const z of[35.7,41.3])box('recess-return-'+z,145.7,147,z-.075,z+.075,-2.8,L);
// Enclosed underground shaft and a glazed street-level pavilion.
for(const[a,b,side]of[[145.85,146,'west'],[149.2,149.35,'east']]){
 box('shaft-'+side,a,b,38.2,41.3,H+.12,L-.5);
 box('pavilion-'+side,a+.05,b-.05,38.4,41.2,H+2.85,H+.12,glass,'shaft-glazing');
}
box('shaft-back',146,149.2,41.15,41.3,H+.12,L-.5);
box('pavilion-back',146,149.2,41.2,41.25,H+2.85,H+.12,glass,'shaft-glazing');
box('pit-base',146,149.2,38.2,41.15,L-.35,L-.5,dark,'pit-floor');
box('pavilion-roof',145.65,149.55,38.0,41.5,H+3.05,H+2.85,ceiling,'shaft-roof');
for(const x of[145.95,149.25])for(const z of[38.3,41.2])box('pavilion-post-'+x+'-'+z,x-.05,x+.05,z-.05,z+.05,H+2.85,H,steel,'frame');
for(const[a,b,side]of[[145.85,X-.7],[X+.7,149.35]].map((r,i)=>[...r,i]))box('front-side-'+side,a,b,38.25,38.4,H+2.85,L-.5);
for(const[a,b,label]of[[L-.5,L,'bottom'],[L+2.2,H,'between'],[H+2.2,H+2.85,'top']])box('front-'+label,X-.7,X+.7,38.25,38.4,b,a);
box('lower-sill',146,149.2,38.2,38.615,L,L-.12,steel,'lift-sill');
// Meet the original sloped paving along the entire front edge; the car end is level.
c.slab(prefix+'upper-sill',[[146,s.frontEdge[0],-38.2],[149.2,s.frontEdge[1],-38.2],[149.2,H,-38.615],[146,H,-38.615]],[],.12,steel,'lift-sill');
for(const[floor,name]of[[L,'passage'],[H,'street']]){
 for(const x of[X-.74,X+.74])box(name+'-jamb-'+x,x-.035,x+.035,38.2,38.42,floor+2.25,floor,steel,'lift-frame');
 box(name+'-head',X-.775,X+.775,38.2,38.42,floor+2.28,floor+2.18,steel,'lift-frame');
 box(name+'-call-plate',X+1,X+1.18,38.18,38.21,floor+1.27,floor+.95,steel,'call-button');
 box(name+'-call-button',X+1.045,X+1.135,38.16,38.18,floor+1.17,floor+1.06,button,'call-button');
 box(name+'-indicator',X-.2,X+.2,38.18,38.20,floor+2.60,floor+2.36,button,'lift-indicator');
}
// Both landing labels are original artwork. No reference photograph is shipped.
for(const[floor,name]of[[L,'passage'],[H,'street']]){box(name+'-sign',X-1.55,X+1.55,38.12,38.16,floor+2.83,floor+2.60,printed,'sign');c.panels.at(-1).collision=false;}
for(const p of c.panels)if(!s.slabs.some(r=>prefix+r.id===p.id))p.material=p.browserMaterial===steel?'steel':p.browserMaterial===glass?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Public hall to Exit 5 lift',[point(151.25,L,28),point(151.25,L,36.8),point(X,L,36.8)]);
pair('Public bypass beside Exit 5 shaft',[point(153,L,33),point(153,L,46),point(151.25,L,52)]);
pair('Exit 5 forecourt approach',s.forecourtRoute.toReversed());
pair('Central 1 lift landing to Exit 5',[point(177,L,3.4),point(177,L,0),point(168,L,0),point(168,L,-20),point(168,L,-41.1),point(151.25,L,-41.1),point(151.25,L,-15),point(151.25,L,10),point(151.25,L,36.8),point(X,L,36.8)]);
const report=await c.save(out,'exit-five.glb',{componentPrefix:prefix,sourceCollection:'Exit 5 public street lift',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Operating public lift between the subway concourse passage and the northeast station forecourt.',geometry:{routes,spawn:point(X,L,36.8),retiredIds:s.retiredIds,retiredLights:[],modifiedPaving:s.modifiedPaving,opening:s.opening,lower:L,upper:H},references:['https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm','research/kyoto-station/maps/subway-kyoto-plan.pdf'],limits:['Exit 5 level connection is operator-confirmed; shaft alignment, pavilion and finishes are fitted approximations.','Other Porta and Hachijo lifts remain unfinished.']});
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="256"><rect width="2048" height="256" fill="#113d35"/><g fill="#fff" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text x="1024" y="106" font-size="84">5 出入口　エレベーター</text><text x="1024" y="205" font-size="66">Exit 5 · Subway / Street</text></g></svg>',png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/exit-five-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/exit-five.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const floor=p.id.includes('passage')?L:H;p.uv=p.vertices.map(v=>{const u=(v.x-X+1.55)/3.1,t=1-(v.y-floor-2.60)/.23;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Exit 5 directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=[];
const raw=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',raw);await writeFile(out+'/exit-five.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'exit-five-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/lift-spec.json',JSON.stringify(subwayLift({id:'subway-exit-five-lift',origin:{x:X,y:L,z:Z},height:H-L}))+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,height:H-L,routes:routes.length});
