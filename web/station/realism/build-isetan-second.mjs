// Open Isetan's public 2F entrance into a connected receiving hall.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan second | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.032,.036,.04]),mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('brass',[.45,.32,.13],.3,.65),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('display timber',[.22,.14,.08]),mat('printed signs',[1,1,1])];
const c=construction(mats,{flatNormals:true}),prefix='isetan-second-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],F=spec.floor,C=spec.ceiling,lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,w,row,back=row){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,9,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back});}
function light(id,x,z){box('fixture-'+id,x-.9,x+.9,z-.10,z+.10,C-.22,C-.27,7,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:C-.34,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
slab('floor',rect(-123,-69,-28,16),F,.24);
slab('ceiling',rect(-123,-69,-28,16),C,.2,5,'ceiling');
box('west-wall',-123.2,-123,-28.2,16.2,C,F);box('north-wall',-123,-69,16,16.2,C,F);box('south-wall',-123,-69,-28.2,-28,C,F);
box('east-north-wall',-69.2,-69,-13.5,16,C,F);
// Replace the one continuous public-passage box with its retained segments and
// a framed glass frontage. Door leaves park outside the clear 5 m opening.
box('passage-wall-south',-69.2,-69,-62.5,-26,11.45,F);
box('frontage-south-pier',-69.2,-69,-26,-25.7,11.45,F,3);
box('frontage-north-pier',-69.2,-69,-13.8,-13.5,11.45,F,3);
for(const [i,z0,z1]of [[0,-25.7,-22.5],[1,-17.5,-13.8]]){
 box('frontage-glass-'+i,-69.145,-69.105,z0,z1,F+2.8,F,2,'shopfront-glazing');
 beam('frontage-sill-'+i,[-69.09,F+.06,z0],[-69.09,F+.06,z1],.07,.08);
 for(const z of[z0,z1])box('frontage-mullion-'+i+'-'+z,-69.18,-69.06,z-.035,z+.035,F+2.85,F,1,'steelwork');
}
box('door-header',-69.24,-69.02,-25.7,-13.8,F+3.35,F+2.85,3,'door-header');
box('frontage-transom',-69.145,-69.105,-25.7,-13.8,11.45,F+3.35,2,'shopfront-glazing');
for(const [i,z0,z1]of[[0,-24,-22.5],[1,-17.5,-16]]){
 box('parked-door-'+i,-69.35,-69.31,z0,z1,F+2.78,F+.03,2,'door-glazing');
 beam('door-handle-'+i,[-69.29,F+1,z1-.15],[-69.29,F+1.5,z1-.15],.035,.035);
}
sign('entrance-name',-68.98,-20,F+2.88,5,0,1);
// Receiving aisle at Z-20, north aisle at Z12, cross aisles at X-119/-98/-75.
// Counter islands follow the operator plan's arrangement without branded art.
function counter(id,a,b,d,e,mi=8){
 box(id+'-plinth',a,b,d,e,F+.12,F,3,'display-plinth');
 box(id+'-body',a+.06,b-.06,d+.06,e-.06,F+.88,F+.12,mi,'display-counter');
 box(id+'-top',a-.04,b+.04,d-.04,e+.04,F+.95,F+.88,0,'counter-top');
 for(const x of[a+.25,b-.25])beam(id+'-inlay-'+x,[x,F+.97,d+.2],[x,F+.97,e-.2],.018,.018,6,'counter-trim');
}
for(const [id,a,b]of[['west',-113,-103],['east',-94,-84]]){
 counter(id+'-south-island',a,b,-13,-7);
 counter(id+'-north-island',a,b,0,7);
 // Glass cases remain low enough to preserve the view through the hall.
 for(const z of[-10,3.5])box(id+'-glass-'+z,a+2,b-2,z-.5,z+.5,F+1.3,F+.95,2,'display-glazing');
}
counter('information',-78,-75,-11,-8,4);
sign('information-sign',-74.95,-9.5,F+1.35,2.8,2);
for(const z of[-11,-2,7])counter('west-perimeter-'+z,-122.5,-121,z-2,z+2,4);
for(const x of[-115,-105,-95,-85])counter('north-perimeter-'+x,x-2,x+2,14,15.5,4);
for(const x of[-119,-109,-99,-89,-76])for(const z of[-20,-4,11])light(x+'-'+z,x,z);
for(let x=-121;x<-71;x+=3)for(const z of[-22,-18,10,13]){box('floor-joint-'+x+'-'+z,x-.008,x+.008,z,z+1,F+.002,F+.001,3,'floor-inlay');decor();}
beam('entrance-brass-line',[-70,F+.006,-25.5],[-70,F+.006,-14],.012,.008,6,'floor-inlay');decor();
sign('hall-directions',-96,-20,F+2.7,4,3,1);sign('north-cosmetics',-111,12,F+2.7,3.5,4,1);
for(const p of c.panels)p.material=p.browserMaterial===1||p.browserMaterial===6?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],distance=Math.hypot(b.x-a.x,b.z-a.z);if(distance<1e-8){assert(Math.abs(a.y-b.y)<1e-5);continue;}const n=Math.ceil(distance/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Second floor entrance and aisle loop',[point(-63,F,-20),point(-75,F,-20),point(-119,F,-20),point(-119,F,12),point(-75,F,12),point(-75,F,-4),point(-72,F,-4),point(-72,F,-20),point(-63,F,-20)]);
pair('Second floor counter cross aisle',[point(-75,F,-20),point(-98,F,-20),point(-98,F,-4),point(-119,F,-4),point(-98,F,-4),point(-98,F,12)]);
pair('Information desk approach',[point(-63,F,-20),point(-72,F,-20),point(-72,F,-9.5),point(-73.5,F,-9.5)]);
pair('Central lift to Isetan second floor',[point(-35.7,F,-3),point(-35.7,F,-8.5),point(-60.7,F,-8.5),point(-60.7,F,-20),point(-75,F,-20)]);
const prior=await read('.local/v2/current/components/isetan-ground/report.json');
for(const label of['B1 to ground stair','B1 to ground stair return'])routes.push(prior.geometry.routes.find(r=>r.label===label));
const parent=await read(m.layout),flights=['south-approach-lower','south-approach-midlanding','south-approach-upper'].map(id=>parent.flights.find(f=>f.id===id));assert(flights.every(Boolean));
const upperY=flights[0].baseElevation;
pair('Upper stair landing',[point(-70.5,upperY,-24),point(-73.2,upperY,-24)]);
const upperRoute=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[Math.floor(row.points.length/3)];return point(p.x,f.baseElevation+i*f.rise,p.y);}));
const a=upperRoute[0],b=upperRoute[1],d=upperRoute.at(-2),e=upperRoute.at(-1),before=Math.hypot(b.x-a.x,b.z-a.z),after=Math.hypot(e.x-d.x,e.z-d.z);
upperRoute.unshift(point(a.x-(b.x-a.x)/before*.8,a.y,a.z-(b.z-a.z)/before*.8));upperRoute.push(point(e.x+(e.x-d.x)/after*.8,e.y,e.z+(e.z-d.z)/after*.8),point(-65,e.y,8));
pair('Retained southern approach to plaza',upperRoute);
assert(routes.every(Boolean));
const blocked=[{label:'Closed frontage beside entrance',start:point(-67.7,F,-24),yaw:-90,axis:'x',limit:-68.85,sign:1}];
const report=await c.save(out,'isetan-second.glb',{componentPrefix:prefix,sourceCollection:'Isetan second-floor public entrance',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the 2F Isetan entrance from the north-south public passage into a continuous receiving hall and aisle loop.',geometry:{F,C,routes,blocked,spawn:point(-63,F,-20),retiredIds:spec.retiredIds,retiredBoxIds:spec.retiredBoxIds,retiredSourceOnlyIds:[],modifiedFlightIds:[],retiredLights:[],modifiedPanelIds:Object.keys(spec.cuts)},references:['https://www.kyoto-station-building.co.jp/directions/','research/kyoto-station/maps/isetan-2f-2026.png','research/kyoto-station/maps/floor-2f.svg','research/kyoto-station/photos/isetan-2f-passage-entrance.jpg'],limits:['Operator plans establish connectivity; room dimensions and counter placement are fitted approximations.','Internal store stairs, escalators, store lifts, remaining western rooms and branded fitouts remain unfinished.']});
const labels=[['ジェイアール京都伊勢丹 2F','JR KYOTO ISETAN'],['南北自由通路','North–South Passage / Station'],['店内ご案内','Information'],['化粧品・フレグランス','Cosmetics / Fragrance'],['2F 化粧品','2F Cosmetics'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-second-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-second.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===9)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[9].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan second-floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[9].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-second.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-second-signs.png',sha256:sha(png),material:mats[9].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['entrance',[-63,F+1.7,-20],[-90,F+1.7,-20]],['receiving-hall',[-74,F+1.7,-20],[-114,F+1.7,-4]],['north-aisle',[-119,F+1.7,12],[-77,F+1.7,12]],['cross-aisle',[-98,F+1.7,-19],[-98,F+1.7,12]],['information',[-71,F+1.7,-13],[-77,F+1.4,-9.5]],['exit',[-77,F+1.7,-20],[-60,F+1.7,-20]],['ground-retained',[-69,1.7,-7],[-89,1.7,-7]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
