// Connect the retained fourth-floor store entrances around the public stairs.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan fourth | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('printed signs',[1,1,1]),mat('retained foundation',[.22,.25,.26],.72,.12)];
const c=construction(mats,{flatNormals:true}),prefix='isetan-fourth-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],F=spec.floor,C=spec.ceiling,lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=3,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,row,w=2.2){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,7,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back:row});}


for(const[i,p]of spec.infill.entries())slab('floor-infill-'+i,p.outer,F,.28,0,'floor',p.holes);
for(const f of spec.foundations)for(const[i,p]of f.pieces.entries())slab('foundation-'+f.flightId+'-'+i,p.outer,p.top,p.top-p.bottom,8,'foundation',p.holes);
slab('ceiling',spec.room,C,.2,4,'ceiling');
box('west-wall',-118.8,-118.6,-28.2,34.2,C,F);
box('north-wall',-118.6,-73,34,34.2,C,F);
box('south-wall',-118.6,-75,-28.2,-28,C,F);
// The inner boundary wraps around the retained Grand Stairway and northern
// side stairs; this store floor never crosses their treads or casings.
box('inner-south-wall',-91,-75,-6,-5.8,C,F);
box('inner-west-wall',-91,-90.8,-6,24.5,C,F);
box('inner-north-wall',-91,-73,24.3,24.5,C,F);
function frontage(id,x,start,end,z){
 box(id+'-south-wall',x-.2,x,start,z-3.2,C,F);
 box(id+'-north-wall',x-.2,x,z+3.2,end,C,F);
 for(const[i,a,b]of[[0,z-3.2,z-1.5],[1,z+1.5,z+3.2]]){
  box(id+'-fixed-glass-'+i,x-.14,x-.10,a,b,F+2.55,F,2,'shopfront-glazing');
  for(const q of[a,b])box(id+'-mullion-'+i+'-'+q,x-.19,x-.05,q-.03,q+.03,F+2.57,F,1,'steelwork');
  beam(id+'-sill-'+i,[x-.08,F+.05,a],[x-.08,F+.05,b],.06,.07);
 }
 box(id+'-header',x-.2,x,z-3.2,z+3.2,C,F+2.57,3,'door-header');
 for(const[i,a,b]of[[0,z-2.9,z-1.5],[1,z+1.5,z+2.9]])box(id+'-parked-door-'+i,x-.35,x-.31,a,b,F+2.53,F+.02,2,'door-glazing');
 sign(id+'-name',x+.05,z,F+2.55,0,3);
 box(id+'-threshold',x-.7,x-.3,z-1.45,z+1.45,F+.005,F+.001,5,'tactile');decor();
}
frontage('south-entrance',-75,-28,-6,-10.5);
frontage('north-entrance',-73,24.5,34,28);
// The new forecourt strip joins the square to the northern entrance. Its east
// rail guards the added floor edge beside the retained municipal frontage.
box('forecourt-east-glass',-71.24,-71.19,23.1,30,F+1.1,F,2,'balustrade');
beam('forecourt-east-rail',[-71.215,F+1.12,23.1],[-71.215,F+1.12,30],.045,.045);
box('forecourt-north-glass',-73,-71.19,29.95,30,F+1.1,F,2,'balustrade');
beam('forecourt-north-rail',[-73,F+1.12,29.975],[-71.215,F+1.12,29.975],.045,.045);
for(const z of[23.1,26.5,30])beam('forecourt-post-'+z,[-71.215,F,z],[-71.215,F+1.1,z],.04,.04);
function light(id,x,z){box('fixture-'+id,x-.7,x+.7,z-.1,z+.1,C-.18,C-.25,6,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:C-.32,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
for(const x of[-116.5,-105,-94,-79])for(const z of[-22,-10.5,28])light(x+'-'+z,x,z);
for(const x of[-116.5,-106,-95])for(const z of[2,16])light(x+'-'+z,x,z);
// Low fixtures make the two aisle loops legible while preserving sight lines.
for(const[id,a,b,d,e]of[['south',-113,-102,-19,-15],['west',-113,-103,4,12],['north',-113,-103,30,32]]){
 box('display-'+id,a,b,d,e,F+.78,F,3,'display-counter');
 box('display-top-'+id,a-.04,b+.04,d-.04,e+.04,F+.86,F+.78,0,'counter-top');
}
sign('south-directions',-94,-10.5,F+2.35,1,3.5);sign('north-directions',-95,28,F+2.35,2,3.5);
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(d<1e-8){assert(Math.abs(a.y-b.y)<1e-5);continue;}const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Muromachi north entrance',[point(-68,F,20),point(-72,F,20),point(-72,F,28),point(-78,F,28)]);
pair('Muromachi south entrance',[point(-66,F,-10.5),point(-80,F,-10.5),point(-95,F,-10.5)]);
pair('Fourth floor north-south aisle',[point(-78,F,28),point(-96,F,28),point(-96,F,-10.5),point(-80,F,-10.5)]);
pair('Fourth floor west aisle loop',[point(-96,F,-22),point(-116,F,-22),point(-116,F,28),point(-96,F,28),point(-96,F,-22)]);
const prior=await read('.local/v2/current/components/isetan-third/report.json');
for(const label of['Retained southern approach to plaza','Retained southern approach to plaza return'])routes.push(prior.geometry.routes.find(r=>r.label===label));
const parent=await read(m.layout);
for(const[prefix,label,indices]of[['daikaidan-flight-','Retained Grand Stairway square approach',[1]],['north-side-flight-','Retained northern side stairs',[1,2,3]]]){
 const flights=indices.map(i=>parent.flights.find(f=>f.id===prefix+String(i).padStart(2,'0')));assert(flights.every(Boolean));
 const points=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[Math.floor(row.points.length/2)];return point(p.x,f.baseElevation+i*f.rise,p.y);}));
 const a=points[0],b=points[1],e=points.at(-1),before=Math.hypot(b.x-a.x,b.z-a.z),next=parent.flights.find(f=>f.id===prefix+String(indices.at(-1)+1).padStart(2,'0')),q=next.contours[0].points[Math.floor(next.contours[0].points.length/2)];
 points.unshift(point(a.x-(b.x-a.x)/before*.7,a.y,a.z-(b.z-a.z)/before*.7));points.push(point((e.x+q.x)/2,e.y,(e.z+q.y)/2));pair(label,points);
}
const chromeRoutes=['Muromachi north entrance','Muromachi north entrance return','Muromachi south entrance','Fourth floor north-south aisle','Fourth floor west aisle loop'];
const blocked=[{label:'Northern forecourt edge',start:point(-72,F,27),yaw:90,axis:'x',limit:-71.45,sign:-1}];
const report=await c.save(out,'isetan-fourth.glb',{componentPrefix:prefix,sourceCollection:'Isetan fourth-floor receiving halls',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect both Muromachi Square entrances through Isetan 4F, with continuous floors and aisles around the retained public stairs.',geometry:{F,C,routes,chromeRoutes,headroomStairs:[],headroomRoutes:routes.slice(0,8).map(r=>r.label),blocked,spawn:point(-80,F,-24),retiredIds:spec.retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:spec.retiredSourceOnlyIds,modifiedFlightIds:spec.modifiedFlightIds,retiredLights:[],modifiedPanelIds:Object.keys(spec.cuts)},references:['research/kyoto-station/maps/floor-4f.svg','research/kyoto-station/maps/floor-4f-isetan.svg','https://www.mistore.jp/store/kyoto/shops/floor4.html'],limits:['Operator plans establish two square entrances and connected store aisles; dimensions, northern forecourt fit and finishes are approximations.','Internal store stairs and lifts above 3F, escalators, western parking access and tenant fitouts remain unfinished.']});
const labels=[['ジェイアール京都伊勢丹 4F','JR KYOTO ISETAN'],['4F 婦人服・婦人雑貨','Womenswear / Accessories'],['室町小路広場','Muromachi Square'],['',''],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-fourth-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-fourth.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===7)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan fourth-floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-fourth.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-fourth-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');

await writeFile(out+'/views.json',JSON.stringify([['south-entrance',[-66,F+1.7,-10.5],[-91,F+1.7,-10.5]],['north-approach',[-72,F+1.7,22],[-73,F+1.7,28]],['north-entrance',[-72,F+1.7,28],[-90,F+1.7,28]],['cross-aisle',[-96,F+1.7,-11],[-96,F+1.7,28]],['north-hall',[-116,F+1.7,28],[-77,F+1.7,28]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
