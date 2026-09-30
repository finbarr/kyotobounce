// Open the retained 5F stair doorway and connect the store to 4F.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {addStoreEscalators} from './store-escalators.mjs';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan fifth | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('printed signs',[1,1,1]),mat('rubber handrail',[.035,.04,.043],.65)];
const originalMaterials=spec.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const nativeOffset=mats.length;mats.push(...originalMaterials);const index=id=>{const i=spec.materials.findIndex(r=>r.id===id);assert(i>=0);return nativeOffset+i;};
const c=construction(mats,{flatNormals:true}),prefix='isetan-fifth-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],F=spec.floor,C=spec.ceiling,lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=3,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,row,w=2.2){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,7,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back:row});}
for(const p of spec.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1).map(([x,z])=>P(x,p.top,z)));c.slab(prefix+p.id,rings[0],rings.slice(1),p.top-p.bottom,index(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
for(const[i,p]of spec.infill.entries())slab('floor-infill-'+i,p.outer,F,.322,0,'floor',p.holes);
slab('ceiling',spec.room,C,.2,4,'ceiling');
function wall(id,a,b,bottom=F,top=C){beam(id,[a[0],(bottom+top)/2,a[1]],[b[0],(bottom+top)/2,b[1]],.16,top-bottom,3,'wall');}
for(let i=0;i<spec.room.length;i++){
 const a=spec.room[i],b=spec.room[(i+1)%spec.room.length];
 if(i===2){
  // Retained door head and jambs frame a 1.65 m clear opening. Match the
  // sloping frontage at the retired leaf, leaving the original frame intact.
  const at=x=>[x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])];
  wall('front-return-east',a,at(-81.98));wall('front-return-west',at(-83.89),b);wall('door-upper-fill',at(-81.98),at(-83.89),23.70,C);
 }else wall('perimeter-'+i,a,b);
}
for(const[i,a,b]of [[0,spec.approach[0],spec.approach[3]],[1,spec.approach[1],spec.approach[2]]]){
 beam('threshold-glass-'+i,[a[0],F+.52,a[1]],[b[0],F+.52,b[1]],.025,1.0,2,'balustrade');
 beam('threshold-rail-'+i,[a[0],F+1.05,a[1]],[b[0],F+1.05,b[1]],.055,.055,1,'steelwork');
 for(const[j,q]of [a,b].entries())beam('threshold-post-'+i+'-'+j,[q[0],F,q[1]],[q[0],F+1.05,q[1]],.04,.04,1,'steelwork');
}
box('door-warning',-83.65,-82.25,-4.35,-4.05,F+.006,F+.001,5,'tactile');decor();
function light(id,x,z){box('fixture-'+id,x-.7,x+.7,z-.1,z+.1,C-.18,C-.25,6,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:C-.32,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
for(const x of[-115.5,-106,-95,-86])for(const z of[-24,-11])light(x+'-'+z,x,z);
for(const x of[-115.5,-105])for(const z of[0,12,28])light(x+'-'+z,x,z);
light('north',-90,28);sign('floor-name',-85.8,-10.5,F+2.3,0,3.2);sign('lower-floors',-91.5,-18.5,F+2.3,1,3.2);sign('stair-direction',-103,-10.5,F+2.3,2,3.2);
for(const p of c.panels)if(p.browserMaterial<nativeOffset)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const motion=addStoreEscalators(c,spec,prefix,{glass:2,rubber:8,metal:1,index});
const G=spec.lowerFloor,point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);assert(d>1e-8);const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Fifth floor retained doorway',[point(-83.4,F,-1.3),point(-82.93,F,-4.5),point(-83,F,-9),point(-94,F,-10.5)]);
pair('Fifth floor receiving aisle',[point(-91.9,F,-20),point(-89,F,-20),point(-89,F,-10.5),point(-83,F,-9)]);
pair('Fifth floor north-south aisle',[point(-94,F,-10.5),point(-105,F,-10.5),point(-105,F,28),point(-89,F,28)]);
pair('Fifth floor west aisle',[point(-115.5,F,-24),point(-115.5,F,30),point(-104,F,30),point(-104,F,-10.5),point(-115.5,F,-10.5)]);
pair('Fourth floor successive banks',[point(-93.7,G,-20),point(-93.7,G,-23),point(-108,G,-23),point(-108,G,-20),point(-106.5,G,-20)]);
pair('Fourth floor middle aisle',[point(-93.7,G,-18.5),point(-108,G,-18.5)]);
const parent=await read(m.layout),flights=['daikaidan-flight-01','daikaidan-flight-02'].map(id=>parent.flights.find(f=>f.id===id));
const points=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[(row.points.length-1)*.75];return point(p.x,f.baseElevation+i*f.rise,p.y);}));
const [a,b]=points,d=Math.hypot(b.x-a.x,b.z-a.z);points.unshift(point(a.x-(b.x-a.x)/d*.7,a.y,a.z-(b.z-a.z)/d*.7));const e=points.at(-1),before=points.at(-2),delta=Math.hypot(e.x-before.x,e.z-before.z);points.push(point(e.x+(e.x-before.x)/delta*.7,e.y,e.z+(e.z-before.z)/delta*.7),point(-83.05,F,-2.35),point(-82.93,F,-4.5),point(-83,F,-9));pair('Fourth to fifth public stair',points);
const headroomRoutes=routes.slice(0,12).map(r=>r.label),chromeRoutes=['Fifth floor retained doorway','Fifth floor north-south aisle','Fifth floor west aisle','Fourth floor successive banks','Fourth to fifth public stair','Fourth to fifth public stair return'];
const blocked=[{label:'Fifth floor protected south well',start:point(-101,F,-23),yaw:0,axis:'z',limit:-20.55,sign:-1}];
const report=await c.save(out,'isetan-fifth.glb',{componentPrefix:prefix,sourceCollection:'Isetan fifth-floor connection',motionArchitecture:'isetanFifthV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),helperSha256:sha(await readFile(new URL('./store-escalators.mjs',import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the retained fifth-floor stair doorway into connected store aisles and add the operating 4F–5F escalator pair above the existing 3F–4F pair.',geometry:{F,G,C,routes,chromeRoutes,headroomStairs:[],headroomRoutes,generatedStairs:flights.map(f=>f.id),retainedEscalatorIds:spec.retainedEscalatorIds,blocked,spawn:m.spawn,retiredIds:spec.retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:[],modifiedFlightIds:[],retiredLights:[],modifiedPanelIds:Object.keys(spec.cuts)},references:['research/kyoto-station/maps/floor-5f.svg','research/kyoto-station/maps/floor-5f-isetan.svg','https://www.mistore.jp/store/kyoto/shops/floor5.html'],limits:['The source supplies the fifth-floor datum and stair doorway; operator plans establish the central store escalators and connected aisles.','Room dimensions, lane placement and direction, machinery dimensions and finishes are fitted approximations.','The complete lift bank, western parking connection, remaining escalator banks and tenant fitouts remain unfinished.']});
await writeFile(out+'/motion.json',JSON.stringify(motion)+'\n');
const labels=[['ジェイアール京都伊勢丹 5F','JR KYOTO ISETAN'],['4F・3F エスカレーター','Escalators to lower floors'],['大階段','Grand Stairway'],['',''],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-fifth-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-fifth.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===7)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan fifth-floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-fifth.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-fifth-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');

await writeFile(out+'/views.json',JSON.stringify([['fifth-door',[-83.05,F+1.65,-1.65],[-83,F+1.65,-8]],['fifth-hall',[-85,F+1.7,-11],[-115,F+1.7,-11]],['fifth-arrival',[-89,F+1.7,-20],[-102,F-.5,-18.5]],['fifth-north',[-105,F+1.7,28],[-88,F+1.7,28]],['fourth-boarding',[-109,G+1.65,-21.5],[-99,G+3,-19]],['third-retained',[-109,13.18,-21.5],[-99,14.5,-19]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
