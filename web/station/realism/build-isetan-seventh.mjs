// Refit the 7F stair doorway and connect the store to 6F.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {addStoreEscalators} from './store-escalators.mjs';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan seventh | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('printed signs',[1,1,1]),mat('rubber handrail',[.035,.04,.043],.65)];
const originalMaterials=spec.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const nativeOffset=mats.length;mats.push(...originalMaterials);const index=id=>{const i=spec.materials.findIndex(r=>r.id===id);assert(i>=0);return nativeOffset+i;};
const c=construction(mats,{flatNormals:true}),prefix='isetan-seventh-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],F=spec.floor,C=spec.ceiling,lights=[],faces=[];
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
 if(i===4){
  // Fit the portal entirely on the public landing, clear of flight 07.
  const at=x=>[x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])];
  wall('front-return-east',a,at(-102.67));wall('front-return-west',at(-104.03),b);wall('door-upper-fill',at(-102.67),at(-104.03),F+2.8,C);
  for(const [id,x]of [['east',-102.67],['west',-104.03]]){const q=at(x);beam('door-jamb-'+id,[q[0],F,q[1]],[q[0],F+2.83,q[1]],.055,.055,1,'door-frame');}
  const u=at(-102.67),v=at(-104.03);beam('door-head',[u[0],F+2.8,u[1]],[v[0],F+2.8,v[1]],.06,.065,1,'door-frame');
 }else wall('perimeter-'+i,a,b);
}
box('door-warning',-103.8,-102.9,-11.95,-11.65,F+.006,F+.001,5,'tactile');decor();
function light(id,x,z){box('fixture-'+id,x-.7,x+.7,z-.1,z+.1,C-.18,C-.25,6,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:C-.32,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
for(const x of[-121.8,-115,-106,-96])light(x+'-south',x,-24);
for(const z of[-8,3,14.5])light('west-'+z,-121.8,z);
for(const z of[19,28])light('north-'+z,-115,z);
light('north-east',-96,28);light('door',-103.35,-13);
sign('floor-name',-104.9,-16.5,F+2.3,0,2);sign('lower-floors',-92.4,-18.5,F+2.3,1,3.2);sign('stair-direction',-120.5,-24,F+2.3,2,3.2);
for(const p of c.panels)if(p.browserMaterial<nativeOffset)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const motion=addStoreEscalators(c,spec,prefix,{glass:2,rubber:8,metal:1,index});
const G=spec.lowerFloor,point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);assert(d>1e-8);const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Seventh floor landing doorway',[point(-103.8,F,-6.5),point(-103.8,F,-8.7),point(-103.35,F,-9.3),point(-103.35,F,-11.8),point(-103.35,F,-15.9),point(-110,F,-15.9)]);
pair('Seventh floor receiving aisle',[point(-92.7,F,-20),point(-92.7,F,-23),point(-110,F,-23),point(-110,F,-15.9)]);
pair('Seventh floor north-south aisle',[point(-110,F,-23),point(-121.8,F,-23),point(-121.8,F,15.75),point(-115,F,15.75),point(-115,F,28),point(-95,F,28)]);
pair('Seventh floor west aisle',[point(-122.5,F,-24),point(-122.5,F,15.75),point(-115,F,15.75),point(-115,F,32),point(-95,F,32)]);
pair('Sixth floor successive banks',[point(-92.7,G,-20),point(-92.7,G,-23),point(-108,G,-23),point(-108,G,-20),point(-106.5,G,-20)]);
pair('Sixth floor middle aisle',[point(-92.7,G,-18.5),point(-108,G,-18.5)]);
const parent=await read(m.layout),flights=['daikaidan-flight-05','daikaidan-flight-06'].map(id=>parent.flights.find(f=>f.id===id));
const points=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[(row.points.length-1)*.75];return point(p.x,f.baseElevation+i*f.rise,p.y);}));
const [a,b]=points,d=Math.hypot(b.x-a.x,b.z-a.z);points.unshift(point(a.x-(b.x-a.x)/d*.7,a.y,a.z-(b.z-a.z)/d*.7));const e=points.at(-1),before=points.at(-2),delta=Math.hypot(e.x-before.x,e.z-before.z);points.push(point(e.x+(e.x-before.x)/delta*.7,e.y,e.z+(e.z-before.z)/delta*.7),point(-103.8,F,-6.5),point(-103.8,F,-8.7),point(-103.35,F,-9.3),point(-103.35,F,-11.8),point(-103.35,F,-15.9));pair('Sixth to seventh public stair',points);
const headroomRoutes=routes.slice(0,12).map(r=>r.label),chromeRoutes=['Seventh floor landing doorway','Seventh floor north-south aisle','Seventh floor west aisle','Sixth floor successive banks','Sixth to seventh public stair','Sixth to seventh public stair return'];
const blocked=[{label:'Seventh floor protected south well',start:point(-101,F,-23),yaw:0,axis:'z',limit:-20.55,sign:-1}];
const report=await c.save(out,'isetan-seventh.glb',{componentPrefix:prefix,sourceCollection:'Isetan seventh-floor connection',motionArchitecture:'isetanSeventhV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),helperSha256:sha(await readFile(new URL('./store-escalators.mjs',import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Refit the seventh-floor stair doorway clear of the public flight and open it into connected store aisles and add the operating 6F–7F escalator pair above the existing 5F–6F pair.',geometry:{F,G,C,routes,chromeRoutes,headroomStairs:[],headroomRoutes,generatedStairs:flights.map(f=>f.id),retainedEscalatorIds:spec.retainedEscalatorIds,blocked,spawn:point(-110,G,-23),retiredIds:spec.retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:spec.retiredSourceOnlyIds,modifiedFlightIds:spec.modifiedFlightIds,retiredLights:[],modifiedPanelIds:Object.keys(spec.cuts)},references:['https://www.kyoto-station-building.co.jp/floorguide/7f/?tenant=isetan','https://www.mistore.jp/store/kyoto/shops/floor7.html'],limits:['The source supplies the seventh-floor datum and public landing; operator plans establish the central store escalators and connected aisles.','Room dimensions, lane placement and direction, machinery dimensions and finishes are fitted approximations.','The complete lift bank, western parking connection, remaining escalator banks and tenant fitouts remain unfinished.']});
await writeFile(out+'/motion.json',JSON.stringify(motion)+'\n');
const labels=[['ジェイアール京都伊勢丹 7F','JR KYOTO ISETAN'],['6F・5F エスカレーター','Escalators to lower floors'],['大階段','Grand Stairway'],['',''],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-seventh-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-seventh.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
// Match export_browser_art.py's world UV fallback for the retained stone.
// Without this attribute the reused textured material samples one dark texel.
for(const [i,material]of spec.materials.entries())if(material.albedo){
 const mi=nativeOffset+i,coords=[];
 for(const p of native.panels.filter(p=>p.browserMaterial===mi))p.uv=p.vertices.map(v=>{const q={x:Math.fround(v.x/2.4),y:1-Math.fround(1-v.z/2.4)};coords.push(q.x,1-q.y);return q;});
 j.meshes[mi].primitives[0].attributes.TEXCOORD_0=j.accessors.length;
 j.accessors.push({bufferView:append(Buffer.from(new Float32Array(coords).buffer)),componentType:5126,count:coords.length/2,type:'VEC2'});
}
for(const p of native.panels.filter(p=>p.browserMaterial===7)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan seventh-floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-seventh.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-seventh-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');

await writeFile(out+'/views.json',JSON.stringify([['seventh-door',[-103.8,F+1.65,-6.5],[-103.35,F+1.65,-13]],['seventh-hall',[-105,F+1.7,-24],[-123,F+1.7,-24]],['seventh-arrival',[-92.7,F+1.7,-23],[-103,F-.5,-18.5]],['seventh-west',[-121.8,F+1.7,-8],[-121.8,F+1.7,16]],['seventh-north',[-115,F+1.7,28],[-94,F+1.7,28]],['sixth-boarding',[-109,G+1.65,-21.5],[-99,G+3,-19]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
