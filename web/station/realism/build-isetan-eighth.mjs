// Refit the 8F stair doorway and connect the store to 7F.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {addStoreEscalators} from './store-escalators.mjs';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan eighth | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('printed signs',[1,1,1]),mat('rubber handrail',[.035,.04,.043],.65),mat('retained foundation',[.22,.25,.26],.72,.12)];
const originalMaterials=spec.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const nativeOffset=mats.length;mats.push(...originalMaterials);const index=id=>{const i=spec.materials.findIndex(r=>r.id===id);assert(i>=0);return nativeOffset+i;};
const c=construction(mats,{flatNormals:true}),prefix='isetan-eighth-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],F=spec.floor,C=spec.ceiling,lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=3,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,row,w=2.2){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,7,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back:row});}
for(const p of spec.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1).map(([x,z])=>P(x,p.top,z)));c.slab(prefix+p.id,rings[0],rings.slice(1),p.top-p.bottom,index(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
for(const f of spec.foundations)for(const[i,p]of f.pieces.entries())slab('foundation-'+f.flightId+'-'+i,p.outer,p.top,p.top-p.bottom,9,'foundation',p.holes);
for(const[i,p]of spec.infill.entries())slab('floor-infill-'+i,p.outer,F,.322,0,'floor',p.holes);
// A sloped soffit follows the retained outdoor escalators crossing this hall.
// Keep its skin below the return trays and clear of the public tread surfaces.
const ceilingRoom=spec.room.flatMap(p=>p[0]===-127&&p[1]===-23?[p,[-127,-1.7],[-130,-1.7],[-130,2.4],[-127,2.4]]:[p]);
slab('ceiling',ceilingRoom,C,.2,4,'ceiling');
c.slab(prefix+'west-soffit',[[ -130,38.78,-1.7],[-127,37.28,-1.7],[-127,37.28,2.4],[-130,38.78,2.4]].map(p=>P(...p)),[],.08,4,'ceiling');
for(const [id,z]of [['south',-1.7],['north',2.34]]){
 const points=[[-130,C,z],[-127,C,z],[-127,C,z+.06],[-130,C,z+.06],[-130,38.70,z],[-127,37.20,z],[-127,37.20,z+.06],[-130,38.70,z+.06]];
 c.add(prefix+'west-soffit-'+id,points.map(p=>P(...p)),[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0],4,'ceiling');
}
function wall(id,a,b,bottom=F,top=C){beam(id,[a[0],(bottom+top)/2,a[1]],[b[0],(bottom+top)/2,b[1]],.16,top-bottom,3,'wall');}
for(let i=0;i<spec.room.length;i++){
 const a=spec.room[i],b=spec.room[(i+1)%spec.room.length];
 if(i===10){
  // Fit the portal entirely on the public landing, clear of flight 09.
  const at=x=>[x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])];
  wall('front-return-east',a,at(-112.2));wall('front-return-west',at(-113.8),b);wall('door-upper-fill',at(-112.2),at(-113.8),F+2.8,C);
  for(const [id,x]of [['east',-112.2],['west',-113.8]]){const q=at(x);beam('door-jamb-'+id,[q[0],F,q[1]],[q[0],F+2.83,q[1]],.055,.055,1,'door-frame');}
  const u=at(-112.2),v=at(-113.8);beam('door-head',[u[0],F+2.8,u[1]],[v[0],F+2.8,v[1]],.06,.065,1,'door-frame');
 }else if(i===2){
  wall('cafe-edge-west',a,[-119.2,-24.3]);wall('cafe-edge-east',[-117.5,-24.3],b);wall('cafe-header',[-119.2,-24.3],[-117.5,-24.3],F+2.6,C);
 }else wall('perimeter-'+i,a,b);
}
box('door-warning',-113.5,-112.5,-17.1,-16.9,F+.006,F+.001,5,'tactile');decor();
function light(id,x,z){box('fixture-'+id,x-.7,x+.7,z-.1,z+.1,C-.18,C-.25,6,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:C-.32,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
for(const x of[-130,-120,-110,-100,-94])light(x+'-south',x,x< -111.5&&x> -122.2?-23.65:-26);
for(const z of[-16,-5,6,14])light('west-'+z,-130,z);
for(const z of[14,23,30])light('north-'+z,-118,z);
light('north-east',-96,28);light('door',-113,-19);
sign('floor-name',-110.05,-19,F+2.3,0,2);sign('lower-floors',-92.4,-18.5,F+2.3,1,3.2);sign('stair-direction',-125,-26,F+2.3,2,3.2);sign('cafe-name',-122.25,-26.5,F+2.3,3,2.2);
for(const p of c.panels)if(p.browserMaterial<nativeOffset)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const cafe=await read(out+'/cafe-source.json');
for(const o of cafe){
 if(o.name==='add-fukunaga-floor')continue;assert.equal(o.materials.length,1,o.name);
 const mi=spec.materials.findIndex(m=>m.label===o.materials[0]);assert(mi>=0,o.materials[0]);
 const ids=o.faces.flatMap(f=>{assert.equal(f.material,0);return f.vertices.slice(2).flatMap((v,i)=>[f.vertices[0],f.vertices[i+1],v]);});
 c.add(prefix+o.name,o.vertices.map(([x,y,z])=>[x,y+spec.cafeDeltaY,z]),ids,nativeOffset+mi,'cafe-fixture');
 const old=[...spec.cafeBoxes,...spec.cafePanels].find(p=>p.id===o.name);Object.assign(c.panels.at(-1),{collision:old?.collision??false,material:old?.material??'glass'});
}
for(const l of spec.cafeLights)lights.push({...l,id:prefix+l.id,position:{...l.position,y:l.position.y+spec.cafeDeltaY},linearColor:l.linearColor||l.color,spotAngle:120,innerSpotAngle:80});
const motion=addStoreEscalators(c,spec,prefix,{glass:2,rubber:8,metal:1,index});
const G=spec.lowerFloor,point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);assert(d>1e-8);const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Eighth floor landing doorway',[point(-113,F,-14),point(-113,F,-17),point(-113,F,-21.5),point(-113,F,-23.65),point(-110,F,-23.65),point(-110,F,-26)]);
pair('Eighth floor receiving aisle',[point(-92.7,F,-20),point(-92.7,F,-26),point(-110,F,-26),point(-110,F,-23.5)]);
pair('Eighth floor north-south aisle',[point(-110,F,-26),point(-110,F,-23.65),point(-130,F,-23.65),point(-130,F,14),point(-118,F,14),point(-118,F,28),point(-95,F,28)]);
pair('Eighth floor west aisle',[point(-130.5,F,-26),point(-130.5,F,14),point(-118,F,14),point(-118,F,32),point(-95,F,32)]);
pair('Eighth cafe entrance',[point(-118.62,F,-23.65),point(-118.43155,F,-24.41638),point(-117.60634,F,-27.81771),point(-117.39414,F,-28.69234)]);
pair('Seventh floor successive banks',[point(-92.7,G,-20),point(-92.7,G,-23),point(-108,G,-23),point(-108,G,-20),point(-106.5,G,-20)]);
pair('Seventh floor middle aisle',[point(-92.7,G,-18.5),point(-108,G,-18.5)]);
const parent=await read(m.layout),flights=['daikaidan-flight-07','daikaidan-flight-08'].map(id=>parent.flights.find(f=>f.id===id));
const points=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[(row.points.length-1)*.75];return point(p.x,f.baseElevation+i*f.rise,p.y);}));
const [a,b]=points,d=Math.hypot(b.x-a.x,b.z-a.z);points.unshift(point(a.x-(b.x-a.x)/d*.7,a.y,a.z-(b.z-a.z)/d*.7));const e=points.at(-1),before=points.at(-2),delta=Math.hypot(e.x-before.x,e.z-before.z);points.push(point(e.x+(e.x-before.x)/delta*.7,e.y,e.z+(e.z-before.z)/delta*.7),point(-113,F,-14),point(-113,F,-17),point(-113,F,-21.5));pair('Seventh to eighth public stair',points);
const headroomRoutes=routes.slice(0,14).map(r=>r.label),chromeRoutes=['Eighth floor landing doorway','Eighth floor north-south aisle','Eighth floor west aisle','Seventh floor successive banks','Eighth cafe entrance','Seventh to eighth public stair','Seventh to eighth public stair return'];
const blocked=[{label:'Eighth floor protected south well',start:point(-101,F,-23),yaw:0,axis:'z',limit:-20.55,sign:-1}];
const report=await c.save(out,'isetan-eighth.glb',{componentPrefix:prefix,sourceCollection:'Isetan eighth-floor connection',motionArchitecture:'isetanEighthV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),helperSha256:sha(await readFile(new URL('./store-escalators.mjs',import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Refit the eighth-floor stair doorway clear of the public flight and open it into connected store aisles and add the operating 7F–8F escalator pair above the existing 6F–7F pair.',geometry:{F,G,C,routes,chromeRoutes,headroomStairs:[],headroomRoutes,generatedStairs:flights.map(f=>f.id),retainedEscalatorIds:spec.retainedEscalatorIds,blocked,spawn:point(-110,G,-23),retiredIds:spec.retiredIds,retiredBoxIds:spec.retiredBoxIds,retiredSourceOnlyIds:spec.retiredSourceOnlyIds,modifiedFlightIds:spec.modifiedFlightIds,retiredLights:spec.retiredLights,retiredRouteIds:spec.retiredRouteIds,retiredLabelIds:spec.retiredLabelIds,modifiedPanelIds:Object.keys(spec.cuts)},references:['https://www.kyoto-station-building.co.jp/floorguide/8f/?tenant=isetan','https://www.mistore.jp/store/kyoto/shops/floor8.html'],limits:['The source supplies the eighth-floor datum and public landing; operator plans establish the central store escalators and connected aisles.','Room dimensions, lane placement and direction, machinery dimensions and finishes are fitted approximations.','The complete lift bank, western parking connection, remaining escalator banks and tenant fitouts remain unfinished.']});
await writeFile(out+'/motion.json',JSON.stringify(motion)+'\n');
const labels=[['ジェイアール京都伊勢丹 8F','JR KYOTO ISETAN'],['7F・6F エスカレーター','Escalators to lower floors'],['大階段','Grand Stairway'],['FUKUNAGA901','8F CAFE'],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-eighth-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-eighth.glb')),parts=[bin];let offset=bin.length;
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
const prim=j.meshes[7].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan eighth-floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-eighth.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-eighth-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');

await writeFile(out+'/views.json',JSON.stringify([['eighth-door',[-113,F+1.65,-14],[-113,F+1.65,-21]],['eighth-hall',[-110,F+1.7,-23.65],[-131,F+1.7,-23.65]],['eighth-arrival',[-92.7,F+1.7,-23],[-103,F-.5,-18.5]],['eighth-west',[-130,F+1.7,-8],[-130,F+1.7,14]],['eighth-north',[-118,F+1.7,28],[-94,F+1.7,28]],['eighth-cafe',[-118.6,F+1.65,-23.65],[-117.4,F+1.4,-29]],['seventh-boarding',[-109,G+1.65,-21.5],[-99,G+3,-19]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
