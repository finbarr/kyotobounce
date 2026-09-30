// Complete the basement stair's mapped 1F–B3 route into the east car park.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan parking | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('terrazzo',[.53,.51,.46],.45),mat('stainless',[.48,.51,.52],.32,.8),mat('warm wall',[.64,.61,.52]),mat('concrete',[.32,.33,.31]),mat('tactile',[.7,.48,.04]),{...mat('diffuser',[1,.94,.8]),emissiveFactor:[1,.94,.8]},mat('printed signs',[1,1,1]),mat('crossing',[.79,.77,.63])];
const c=construction(mats,{flatNormals:true}),prefix='isetan-parking-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],{B3,B2}=spec,mid=(B3+B2)/2,rise=(B2-B3)/22,well=rect(...spec.well.flat()),lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=2,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,w,h,row,ceiling){box(id,x-.025,x+.025,z-w/2,z+w/2,y+h,y,6,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h,y,side:1,row,back:row});for(const dz of[-w*.35,w*.35]){beam(id+'-hanger-'+dz,[x,y+h,z+dz],[x,ceiling,z+dz],.018,.018);decor();}}
// Retain the B2–B1 stair's exact top surfaces while opening the solid bases
// beneath them for the new flight. Its old collision path does not move.
for(const p of spec.retainedStair){const [[a,b],[bottom,top],[d,e]]=p.bounds,id='retained-'+p.id.slice('isetan-basement-'.length),depth=p.role==='stair-landing'?.22:(-4.913582801818848-B2)/22+.18;assert(top-bottom>=depth-1e-5);box(id,a,b,d,e,top,top-depth,0,p.role);}
slab('b2-floor',rect(-123,-43,-14,25),B2,.22,0,'floor',[well]);
slab('parking-extension-floor',rect(-83.5,-77,8,14.4),B3,.25,3);
slab('parking-extension-ceiling',rect(-83.5,-77,8,14.4),B3+3.15,.2,3,'ceiling',[well]);
box('outer-west',-83.5,-83.3,8,14.4,B2-.22,B3,3);
box('outer-south',-83.3,-77,8,8.2,B2-.22,B3,3);
box('outer-north',-83.3,-77,14.2,14.4,B2-.22,B3,3);
// Only the lower-flight doorway is open at garage level. The upper lane is
// enclosed below its B2 arrival, so the portal cannot lead under the stair.
for(const[id,a,b]of[['south',-23,8.35],['north',11.05,13]])box('garage-west-'+id,-77.2,-77,a,b,B3+2.95,B3,3);
box('garage-door-header',-77.2,-77,8.35,11.05,B3+2.95,B3+2.6,3);
box('extension-east-return',-77.2,-77,11.05,14.4,B2-.22,B3,3);
box('extension-east-upper',-77.2,-77,8.2,11.05,B2-.22,B3+2.95,3);
for(let i=0;i<11;i++){
 const lower=B3+(i+1)*rise,upper=mid+(i+1)*rise;
 box('lower-step-'+i,-78-(i+1)*.3,-78-i*.3,8.35,11.05,lower,lower-rise-.18,0,'stair-tread');
 box('upper-step-'+i,-81.3+i*.3,-81.3+(i+1)*.3,11.35,14.05,upper,upper-rise-.18,0,'stair-tread');
}
box('stair-landing',-83.15,-81.3,8.35,14.05,mid,mid-.22,0,'stair-landing');
box('b3-threshold',-78,-77,8.35,11.05,B3,B3-.22,0,'stair-landing');
box('b2-arrival',-78,-77.8,11.35,14.05,B2,B2-.22,0,'stair-landing');
box('b2-upper-core-threshold',-78,-77.8,8.35,11.05,B2,B2-.22,0,'stair-landing');
box('west-guard',-83.3,-83.15,8.2,14.2,B2,B3,2,'well-guard');
for(const z of[8.275,14.125])box('side-'+z,-83.15,-77.8,z-.075,z+.075,B2,B3,2,'well-guard');
box('divider',-81.3,-77.8,11.05,11.35,B2,B3,2,'well-guard');
beam('lower-handrail',[-78,B3+1,8.55],[-81.3,mid+1,8.55],.05,.05);
beam('upper-handrail',[-81.3,mid+1,13.85],[-78,B2+1,13.85],.05,.05);
for(const[id,y,z]of[['b3',B3,9.7],['b2',B2,12.7]]){box('warning-'+id,-77.55,-77.15,z-1,z+1,y+.006,y+.001,4,'tactile');decor();}
sign('garage-direction',-76.95,9.7,B3+2.62,2.5,.25,0,B3+2.94);
sign('b2-direction',-76.9,12.7,B2+2.2,2.2,.5,1,-5.313582801818848);
beam('landing-light-bracket',[-83.16,B2+.5,11.2],[-82.5,B2+.5,11.2],.06,.06);
for(const[id,x,z,y]of[['landing',-82.8,11.2,B2+.45],['garage-entry',-74,9.7,B3+2.85]]){box('fixture-'+id,x-.35,x+.35,z-.12,z+.12,y+.03,y-.04,5,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:y-.1,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
for(let z=3.7;z<8.8;z+=.7){box('garage-crossing-'+z,-75,-73,z,z+.3,B3+.004,B3+.001,7,'paint');decor();}
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(d<1e-8){assert(Math.abs(a.y-b.y)<1e-5);continue;}const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Parking to B2 stair',[point(-74,B3,9.7),point(-78,B3,9.7),point(-81.3,mid,9.7),point(-82.2,mid,9.7),point(-82.2,mid,12.7),point(-81.3,mid,12.7),point(-78,B2,12.7),point(-75,B2,12.7)]);
pair('Central lift to parking stair',[point(-35.7,B3,-3),point(-35.7,B3,3.5),point(-74,B3,3.5),point(-74,B3,9.7)]);
pair('Southern parking aisle to stair',[point(-35.7,B3,-14.5),point(-74,B3,-14.5),point(-74,B3,9.7)]);
pair('B2 food hall to parking stair',[point(-47,B2,18),point(-75,B2,18),point(-75,B2,12.7)]);
const prior=await read('.local/v2/current/components/isetan-stair/report.json');for(const label of['Isetan internal stair','Isetan internal stair return','B1 to ground stair','B1 to ground stair return','Ground to second stair','Ground to second stair return'])routes.push(prior.geometry.routes.find(r=>r.label===label));assert(routes.every(Boolean));
const blocked=[{label:'Garage wall beside stair door',start:point(-75.7,B3,7),yaw:-90,axis:'x',limit:-76.8,sign:1}];
const report=await c.save(out,'isetan-parking.glb',{componentPrefix:prefix,sourceCollection:'Isetan B3 parking stair connection',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Extend the mapped basement stair to B3 and open a usable route through the western garage wall, preserving the connected B2–2F core.',geometry:{B3,B2,well,stair:{steps:22,rise,going:.3,mid},routes,chromeRoutes:['Parking to B2 stair','Parking to B2 stair return','Central lift to parking stair','Southern parking aisle to stair','B2 food hall to parking stair','Isetan internal stair','Isetan internal stair return'],headroomStairs:[['isetan-parking-',11],['isetan-parking-retained-',11],['isetan-ground-',14],['isetan-stair-',21]],blocked,spawn:point(-74,B3,9.7),retiredIds:spec.retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:[],modifiedFlightIds:[],retiredLights:[],modifiedPanelIds:[]},references:['https://www.kyoto-station-building.co.jp/parking/','research/kyoto-station/maps/east-parking-access-2026.jpg','research/kyoto-station/maps/isetan-b2-2026.png','research/kyoto-station/maps/isetan-b1-2026.png'],limits:['The plans identify B3 service and the western Isetan connection; core registration, garage interface and dimensions are fitted.','The dedicated Isetan parking lift, hotel connection and vehicle ramps remain unfinished.']});
const labels=[['伊勢丹 B2F・B1F・1F','Isetan Food Halls / Boutiques'],['B3F 東駐車場','B3F East Parking'],['',''],['',''],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-parking-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-parking.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===6)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[6].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan parking directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[6].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-parking.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-parking-signs.png',sha256:sha(png),material:mats[6].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');


await writeFile(out+'/views.json',JSON.stringify([['garage-entry',[-72,B3+1.7,9.7],[-82,mid+1,9.7]],['b3-landing',[-82.2,mid+1.7,12.7],[-76,B2+1.1,12.7]],['b2-descent',[-75,B2+1.7,12.7],[-82,mid+1,12.7]],['retained-b2-ascent',[-75,B2+1.7,9.7],[-82,-5.2,9.7]],['garage-approach',[-65,B3+1.7,3.5],[-76,B3+1.7,9.7]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
