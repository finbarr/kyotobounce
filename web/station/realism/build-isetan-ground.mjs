// Connect Isetan's ground entrance to the existing two basement food halls.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan ground | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83],.15,.05),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.16],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.032,.036,.04]),mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('display timber',[.22,.14,.08]),mat('printed signs',[1,1,1]),mat('retained foundation',[.22,.25,.26],.72,.12)];
const c=construction(mats,{flatNormals:true}),prefix='isetan-ground-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],G=spec.ground,B1=spec.b1,mid=(G+B1)/2,rise=(G-B1)/28,well=rect(...spec.well.flat()),lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,w,row,back=row){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,9,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back});}
function light(id,x,z,y){box('fixture-'+id,x-.7,x+.7,z-.075,z+.075,y-.02,y-.075,7,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:y-.14,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
slab('floor',rect(-123,-73.12,-28,16),G,.22,0,'floor',[well]);
slab('ceiling',rect(-123,-73.12,-28,16),4.8,.2,5,'ceiling');
slab('b1-ceiling',rect(-123,-43,-14,25),-1.37,.18,5,'ceiling',[well]);
// The retained concourse is cut through its full thickness. These narrow reveals
// close its exposed edges beneath the new floor finish.
for(const [id,a,b,d,e]of[['west',-84.225,-84.2,8.2,14.2],['east',-77.8,-77.775,8.2,14.2],['south',-84.2,-77.8,8.175,8.2],['north',-84.2,-77.8,14.2,14.225]])box('well-reveal-'+id,a,b,d,e,G,-.61,0,'floor-edge');
box('west-wall',-123.2,-123,-28.2,16.2,4.8,G);box('north-wall',-123,-73.12,16,16.2,4.8,G);box('south-wall',-123,-73.12,-28.2,-28,4.8,G);
for(const [i,a,b]of [[0,-28,-10.6],[1,-3.4,16]])box('east-wall-'+i,-73.32,-73.12,a,b,4.8,G);
box('entrance-upper-wall',-73.32,-73.12,-10.6,-3.4,4.8,3.35);
// Preserve the glazed outer vestibule; replace its sealed inner wall with open
// leaves parked beside the aisle and a clear 3.6 m inner opening.
for(const z of[-9.9,-4.1]){box('open-inner-leaf-'+z,-77.61,-77.585,z-.65,z+.65,2.6,G,2,'door-glazing');for(const y of[.08,2.55])beam('inner-frame-'+z+'-'+y,[-77.57,y,z-.65],[-77.57,y,z+.65],.04,.04);}
box('inner-header',-77.68,-77.5,-10.6,-3.4,3.35,2.8,3,'door-header');sign('inner-directory',-79,-7,2.95,4,0,1);
// Fitted boutique receiving rooms: their doors and the perimeter aisle are open.
function boutique(id,a,b,d,e,doorZ,row){
 box(id+'-rear',a,b,e-.12,e,4.6,G);for(const x of[a,b])box(id+'-side-'+x,x-.06,x+.06,d,e,4.6,G);
 const center=(a+b)/2,door=3;
 for(const [i,x0,x1]of [[0,a,center-door/2],[1,center+door/2,b]]){box(id+'-front-'+i,x0,x1,d-.04,d+.04,2.85,G,2,'shopfront-glazing');beam(id+'-front-trim-'+i,[x0,2.9,d],[x1,2.9,d],.06,.06);}
 box(id+'-front-header',a,b,d-.1,d+.1,4.6,2.95,3,'shopfront-header');
 // Low displays leave a complete path from the doorway around either side.
 box(id+'-display',center-1.3,center+1.3,e-3.4,e-2.2,G+.85,G,8,'display-counter');box(id+'-top',center-1.35,center+1.35,e-3.45,e-2.15,G+.91,G+.85,0,'counter-top');
 light(id,center,(d+e)/2,4.5);
}
boutique('east-boutique',-93,-79,-2,6);boutique('west-boutique',-111,-97,-2,6);
// South side display zone follows the mapped boutiques and florist. Leave the
// main aisle and the west cross-aisle unobstructed.
for(const [id,a,b,d,e]of[['south-display',-115,-96,-24,-18],['florist-display',-84,-79,-24,-19]]){
 box(id+'-plinth',a,b,d,e,G+.12,G,3,'display-plinth');box(id+'-counter',a+.1,b-.1,d+.1,e-.1,G+.82,G+.12,8,'display-counter');
}
for(const x of[-119,-109,-99,-88,-76])for(const z of[-11,11])light(x+'-'+z,x,z,4.55);
for(const x of[-114,-102,-90,-78])light('south-'+x,x,-26,4.55);
for(let x=-121;x<-75;x+=4)for(const z of[-11,-5,9,14]){box('floor-joint-'+x+'-'+z,x-.009,x+.009,z,z+1,G+.002,G+.001,3,'floor-inlay');decor();}
// Stack the new flights over the corresponding B2 flights. Each tread has a
// thin structural waist, leaving the existing stair and B1 arrivals open below.
for(let i=0;i<14;i++){
 const lower=B1+(i+1)*rise,upper=mid+(i+1)*rise;
 box('lower-step-'+i,-78-(i+1)*.3,-78-i*.3,8.35,11.05,lower,lower-rise-.18,0,'stair-tread');
 box('upper-step-'+i,-82.2+i*.3,-82.2+(i+1)*.3,11.35,14.05,upper,upper-rise-.18,0,'stair-tread');
}
box('stair-landing',-84.05,-82.2,8.35,14.05,mid,mid-.22,0,'stair-landing');box('b1-threshold',-78,-77.75,8.35,11.05,B1,B1-.22,0,'stair-landing');box('ground-threshold',-78,-77.8,11.35,14.05,G,G-.22,0,'stair-landing');
box('stair-west-wall',-84.2,-84.05,8.2,14.2,G+1.1,B1,4,'well-guard');
for(const z of[8.275,14.125])box('stair-side-'+z,-84.05,-77.8,z-.075,z+.075,G+1.1,B1,4,'well-guard');
box('stair-divider',-82.2,-77.8,11.05,11.35,G+1.1,B1+.45,4,'well-guard');box('lower-opening-guard',-77.95,-77.8,8.2,11.35,G+1.1,G-.22,4,'well-guard');
beam('lower-handrail',[-78,B1+1,8.55],[-82.2,mid+1,8.55],.05,.05);beam('upper-handrail',[-82.2,mid+1,13.85],[-78,G+1,13.85],.05,.05);
for(const [id,y,z,row]of [['lower',B1,9.7,2],['upper',G,12.7,3]]){sign('stair-'+id,-76.9,z,y+2.15,2.2,row);box('warning-'+id,-77.55,-77.1,z-1,z+1,y+.006,y+.001,6,'tactile');decor();}
light('stair',-83.1,11.2,4.55);sign('main-direction',-115,-7,3,4,4,1);
const foundations=(await read(out+'/retired-source.json')).filter(p=>spec.retiredSourceOnlyIds.includes(p.name)&&!p.dynamic);
for(const o of foundations){const bottom=Math.min(...o.vertices.map(v=>v[1]));assert(Math.abs(bottom)<1e-4);const vertices=o.vertices.map(v=>[v[0],Math.abs(v[1]-bottom)<1e-4?4.8:v[1],v[2]]),indices=o.faces.flatMap(f=>Array.from({length:f.vertices.length-2},(_,i)=>[f.vertices[0],f.vertices[i+1],f.vertices[i+2]]).flat());c.add(prefix+o.name.replaceAll(' ','-'),vertices,indices,10,'foundation');}
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Ground entrance and aisle loop',[point(-69,0,-7),point(-75,G,-7),point(-118,G,-7),point(-118,G,11),point(-95,G,11),point(-95,G,-7),point(-75,G,-7)]);
pair('Ground south aisle',[point(-75,G,-7),point(-88,G,-7),point(-88,G,-26),point(-118,G,-26),point(-118,G,-7)]);
pair('Ground boutique doors',[point(-87,G,-7),point(-86,G,-7),point(-86,G,1),point(-89,G,1),point(-86,G,1),point(-86,G,-7),point(-104,G,-7),point(-104,G,1),point(-107,G,1),point(-104,G,1),point(-104,G,-7)]);
pair('B1 to ground stair',[point(-75,B1,9.7),point(-78,B1,9.7),point(-82.2,mid,9.7),point(-83.1,mid,9.7),point(-83.1,mid,12.7),point(-82.2,mid,12.7),point(-78,G,12.7),point(-75,G,12.7),point(-75,G,7),point(-78.5,G,7),point(-78.5,G,-7),point(-75,G,-7)]);
const oldReport=await read('.local/v2/current/components/isetan-basement/report.json');
for(const label of ['Isetan internal stair','Isetan internal stair return'])routes.push(oldReport.geometry.routes.find(r=>r.label===label));
pair('B1 stair to main aisle',[point(-75,B1,9.7),point(-75,B1,3.5),point(-47,B1,3.5)]);
const parentLayout=await read(m.layout);
for(const id of ['daikaidan-flight-09','north-side-flight-07']){
 const f=parentLayout.flights.find(f=>f.id===id);assert(f);const k=Math.floor((f.contours[0].points.length-1)*(id.startsWith('daikaidan')?.25:.5)),rows=f.contours.map(row=>row.points[k]);
 const points=rows.slice(0,-1).map((a,i)=>{const b=rows[i+1];return point((a.x+b.x)/2,f.baseElevation+(i+1)*f.rise,(a.y+b.y)/2);});
 // Start on the flat receiving landings: the placement disk cannot fit on a tread.
 const landing=(a,b,y)=>{const length=Math.hypot(a.x-b.x,a.y-b.y);return point(a.x+(a.x-b.x)*.65/length,y,a.y+(a.y-b.y)*.65/length);};
 pair('Retained '+id,[landing(rows[0],rows[1],f.baseElevation),...points,landing(rows.at(-1),rows.at(-2),f.baseElevation+(rows.length-1)*f.rise)]);
}
const blocked=[{label:'Ground lower-flight guard',start:point(-76.8,G,9.7),yaw:-90,axis:'x',limit:-77.6,sign:1}];
const report=await c.save(out,'isetan-ground.glb',{componentPrefix:prefix,sourceCollection:'Isetan ground entrance and connected basement stair',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the ground Isetan entrance into a receiving hall and aisle loop, and connect ground to the existing B1–B2 stair core.',geometry:{G,B1,well,stair:{steps:28,rise,going:.3,mid},routes,blocked,spawn:point(-69,0,-7),retiredIds:spec.retiredIds,retiredBoxIds:spec.retiredBoxIds,retiredSourceOnlyIds:spec.retiredSourceOnlyIds,modifiedFlightIds:spec.modifiedFlightIds,retiredUnrenderedIds:spec.retiredUnrenderedIds,retiredLights:[],modifiedPanelIds:Object.keys(spec.cuts)},references:['https://www.mistore.jp/store/kyoto/shops/floor1.html','research/kyoto-station/maps/isetan-1f-2026.png','research/kyoto-station/maps/floor-1f.svg','research/kyoto-station/maps/isetan-b1-2026.png'],limits:['Operator plans establish connectivity. Room boundaries, stair dimensions and finishes are fitted approximations.','The western store, north/west entrances, further lifts/escalators, upper floors and branded fitouts remain unfinished.']});
const labels=[['ジェイアール京都伊勢丹 1F','Boutiques / Hair Accessories / Flowers'],['京都駅 中央口','Station Central Entrance'],['1F ジェイアール京都伊勢丹','1F Isetan'],['B1F 和洋菓子・パン・酒','B1F Sweets / Bread / Wine'],['1F ブティック','1F Boutiques'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-ground-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-ground.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===9)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[9].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan ground directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[9].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-ground.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-ground-signs.png',sha256:sha(png),material:mats[9].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['entrance',[-69,1.7,-7],[-89,1.7,-7]],['main-aisle',[-82,1.7,-7],[-120,1.7,-7]],['north-aisle',[-118,1.7,11],[-87,1.7,11]],['south-aisle',[-88,1.7,-26],[-118,1.7,-26]],['boutique',[-86,1.7,-5],[-86,1.7,5]],['ground-stair',[-75,1.7,12.7],[-82,-1,12.7]],['stair-mid',[-83.1,mid+1.7,9.7],[-76,B1+1.7,9.7]],['b1-stair',[-75,B1+1.7,9.7],[-82,mid+1,9.7]],['b1-old-arrival',[-75,B1+1.7,12.7],[-82,-5.5,12.7]],['b2-retained',[-75,-7,9.7],[-82,-5.5,9.7]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
