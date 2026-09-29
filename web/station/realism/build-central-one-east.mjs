// Restore the east-facing gate bank shown in the operator's Central 1 plan.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json'),raw=await readFile(m.layout),layout=JSON.parse(raw);
assert.equal(sha(raw),m.layoutSha256);assert(spec.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,rgb,roughness=.5,metallic=0)=>({name:'Central 1 east gate | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('stone',[.58,.56,.50],.45),mat('steel',[.38,.41,.42],.3,.8),mat('dark trim',[.055,.061,.058]),mat('blue lining',[.045,.16,.26],.4),mat('tactile',[.70,.47,.045]),mat('directions',[1,1,1])];
const prefix='central-one-east-',c=construction(materials,{flatNormals:true}),Y=spec.floor,C=spec.ceiling,P=(x,y,z)=>[x,y,-z];
function box(id,x0,x1,z0,z1,top,bottom,mi=0,role='wall'){
 assert(x1>x0&&z1>z0&&top>bottom,id);
 c.slab(prefix+id,[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>P(x,top,z)),[],top-bottom,mi,role);
}
const decorative=()=>{c.panels.at(-1).collision=false;};
box('retained-wall',189.925,190.075,-36,2,C,Y);
box('wall-base',190.075,190.125,-35.95,1.95,Y+.16,Y,2,'skirting');
box('wall-band',190.075,190.095,-35.95,1.95,Y+2.55,Y+2.3,3,'wall-band');
decorative();
// Gate cabinets and closed leaves preserve the paid/public boundary. The third
// lane is open for exploration and meets the existing western gate's clear lane.
const gates=[-46.6,-44.4,-42.2,-40,-37.8];
for(const [i,z]of gates.entries()){
 box('cabinet-'+i,188.95,190.85,z-.25,z+.25,Y+1.02,Y+.04,1,'ticket-gate');
 box('reader-'+i,190.38,190.7,z-.16,z+.16,Y+1.06,Y+1.02,2,'reader');
 box('reader-indicator-'+i,190.51,190.65,z-.07,z+.07,Y+1.067,Y+1.061,3,'indicator');decorative();
 if(i<gates.length-1&&i!==2)box('closed-leaf-'+i,190.15,190.25,z+.25,gates[i+1]-.25,Y+.92,Y+.10,3,'closed-gate');
}
for(const z of[-41.9,-40.3])box('open-leaf-'+z,189.05,190.75,z-.025,z+.025,Y+.92,Y+.10,1,'retracted-gate');
for(const [a,b,id]of [[-48,-46.85,'south'],[-37.55,-36,'north']])box('gate-end-'+id,189.925,190.075,a,b,Y+1.1,Y,1,'gate-boundary');
for(const z of[-47.93,-36.07])box('frame-'+z,189.925,190.075,z-.035,z+.035,C,Y+1.1,1,'gate-frame');
box('header',189.875,190.125,-47.96,-36.04,C,Y+3.17,1,'gate-frame');
box('directions',189.78,189.84,-47.3,-36.7,Y+3.12,Y+2.57,5,'sign');decorative();
box('gate-guide',185,194,-41.3,-40.9,Y+.004,Y+.001,4,'floor-inlay');decorative();
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':'stone';
const point=(x,z,y=Y)=>({x,y,z}),routes=[];
function pair(label,points){
 const divided=[points[0]];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/24);
  for(let j=1;j<=n;j++)divided.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n,z:a.z+(b.z-a.z)*j/n});
 }
 routes.push({label,points:divided},{label:label+' return',points:divided.toReversed()});
}
pair('Central 1 east and west entrances',[point(194,-41.1),point(185,-41.1),point(168,-41.1),point(151.25,-41.1)]);
pair('East entrance to platform lift',[point(194,-41.1),point(185,-41.1),point(185,-20),point(185,-1),point(177,-1),point(177,3.4)]);
pair('East entrance to platform stairs',[point(194,-41.1),point(185,-41.1),point(185,-17),point(177,-17),point(177,-15),point(177,-10.2,-8.7),point(177,-8.4,-8.7),point(177,-3.6,-11.2),point(177,-1.6,-11.2)]);
pair('Eastern public bypass at the gate',[point(194,-50),point(194,-35),point(194,-20)]);
const blocked=[...[-45.5,-43.3,-38.9].map((z,i)=>({label:'Closed eastern gate lane '+i,start:point(193,z),yaw:-90,axis:'x',limit:190.35,sign:1})),{label:'Retained east paid wall',contactLedge:prefix+'wall-base',start:point(193,-30),yaw:-90,axis:'x',limit:190.25,sign:1}];
const browserRoute=[...routes[0].points,point(151.25,-50),point(173,-50),point(194,-50),point(194,-41.1),point(185,-41.1),point(185,-20),point(185,-17),point(177,-17),point(177,-1.6,-11.2),point(177,-17),point(185,-17),point(185,-1),point(177,-1),point(177,3.4)];
const report=await c.save(out,'central-one-east.glb',{componentPrefix:prefix,sourceCollection:'Central 1 eastern gate',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the missing eastern Central 1 gate bank and connect the public passage to both the platform lift and stairs.',geometry:{floor:Y,ceiling:C,opening:spec.opening,routes,blocked,browserRoute,spawn:point(194,-41.1),retiredIds:spec.retiredIds,retiredLights:[]},references:['https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf','research/kyoto-station/maps/subway-kyoto-plan.pdf'],limits:['The operator map establishes the east-facing gate bank. Cabinet dimensions, finishes and alignment within the current model are fitted.','This repairs circulation only. The wider subway geographic registration and Exit 5 relocation remain unresolved.']});
// One original two-sided sign, with preserved readable orientation on both faces.
const labels=[['中央1改札　地下鉄のりば','Central 1 Gate / Subway Platforms'],['ポルタ・東側自由通路','Porta / Eastern Public Passage'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="768"><rect width="2048" height="768" fill="#112a62"/>';
for(const[i,[jp,en]]of labels.entries())svg+=`<g transform="translate(1024,${i*256}) scale(.42,1)" fill="#f6f4e7" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="112" font-size="76">${jp}</text><text y="194" font-size="53">${en}</text></g>`;
svg+='</svg>';const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/gate-signs.png',png);
const {json:j,bin}=readGLB(await readFile(out+'/central-one-east.glb')),parts=[bin];let offset=bin.length;
function append(b){const view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return view;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===5))p.uv=p.vertices.map((v,i)=>{
 const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-189.81),row=flat?(side>0?0:1):2;
 const u=row===2?.5:.5+side*(v.z+42)/10.6,t=(row+1-(v.y-Y-2.57)/.55)/3;uv.push(u,t);return{x:u,y:1-t};
});
const prim=j.meshes[5].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);
prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});
j.images=[{name:'Original Central 1 east directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[5].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=[];
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/central-one-east.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'gate-signs.png',sha256:sha(png),material:materials[5].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:0});
