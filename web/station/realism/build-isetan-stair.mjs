// Extend the northern Isetan core to 2F without obstructing the basement stairs.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan stair | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('printed signs',[1,1,1])];
const c=construction(mats,{flatNormals:true}),prefix='isetan-stair-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],G=spec.ground,F=spec.second,mid=(G+F)/2,rise=(F-G)/(2*spec.stepsPerFlight),well=rect(...spec.well.flat()),lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=3,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,row){const w=2.2;box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,7,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back:row});}
slab('ground-ceiling',rect(-123,-73.12,-28,16),4.8,.2,4,'ceiling',[well]);
slab('second-floor',rect(-123,-69,-28,16),F,.24,0,'floor',[well]);
for(let i=0;i<spec.stepsPerFlight;i++){
 const lower=G+(i+1)*rise,upper=mid+(i+1)*rise;
 box('lower-step-'+i,-78-(i+1)*.3,-78-i*.3,8.35,11.05,lower,lower-rise-.18,0,'stair-tread');
 box('upper-step-'+i,-84.3+i*.3,-84.3+(i+1)*.3,11.35,14.05,upper,upper-rise-.18,0,'stair-tread');
}
box('stair-landing',-86.15,-84.3,8.35,14.05,mid,mid-.22,0,'stair-landing');
box('ground-threshold',-78,-77.8,8.35,11.05,G,G-.22,0,'stair-landing');
box('second-threshold',-78,-77.8,11.35,14.05,F,F-.24,0,'stair-landing');
// Vertical shaft linings also form the upper parapet. They lie outside both
// flights and the middle landing, with the ground and basement entries below.
box('west-lining',-86.3,-86.15,8.2,14.2,F+1.1,4.6);
box('south-lining',-86.15,-77.8,8.2,8.35,F+1.1,4.6);
box('north-lining',-86.15,-77.8,14.05,14.2,F+1.1,4.6);
box('lower-opening-guard',-77.95,-77.8,8.2,11.35,F+1.1,4.6,3,'well-guard');
box('upper-threshold-lining',-77.95,-77.8,11.35,14.05,F-.24,4.6);
// Closed sloping glass panels follow each flight; horizontal tops are reserved
// for the landing. The lower core's existing guards remain in place beneath.
function rail(id,x0,y0,x1,y1,z){
 c.slab(prefix+id+'-glass',[P(x0,y0+1.1,z-.025),P(x1,y1+1.1,z-.025),P(x1,y1+1.1,z+.025),P(x0,y0+1.1,z+.025)],[],1.1,2,'well-guard');
 beam(id+'-handrail',[x0,y0+1.12,z],[x1,y1+1.12,z],.045,.045);
 for(let i=0;i<=3;i++){const t=i/3,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;beam(id+'-post-'+i,[x,y,z],[x,y+1.1,z],.04,.04);}
}
for(const z of[8.425,11.015])rail('lower-'+z,-78,G,-84.3,mid,z);
for(const z of[11.385,13.9])rail('upper-'+z,-84.3,mid,-78,F,z);
box('landing-west-glass',-86.12,-86.075,8.35,14.05,mid+1.1,mid,2,'well-guard');
beam('landing-west-rail',[-86.1,mid+1.12,8.425],[-86.1,mid+1.12,13.9],.045,.045);
for(const z of[8.425,13.9]){box('landing-side-glass-'+z,-86.1,-84.3,z-.025,z+.025,mid+1.1,mid,2,'well-guard');beam('landing-side-rail-'+z,[-86.1,mid+1.12,z],[-84.3,mid+1.12,z],.045,.045);}
for(const[id,y,z,row]of[['ground',G,9.7,0],['second',F,12.7,1]]){sign('direction-'+id,-76.9,z,y+2.15,row);box('warning-'+id,-77.55,-77.1,z-1,z+1,y+.006,y+.001,5,'tactile');decor();}
// A wall bracket supports the middle-landing light above the walking envelope.
beam('light-bracket',[-86.17,6.65,11.2],[-85.55,6.65,11.2],.06,.08);
box('landing-fixture',-86.12,-85.5,10.9,11.5,6.64,6.57,6,'fixture');decor();
lights.push({id:prefix+'light-landing',position:{x:-85.65,y:6.5,z:11.2},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(d<1e-8){assert(Math.abs(a.y-b.y)<1e-5);continue;}const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Ground to second stair',[point(-75,G,9.7),point(-78,G,9.7),point(-84.3,mid,9.7),point(-85.2,mid,9.7),point(-85.2,mid,12.7),point(-84.3,mid,12.7),point(-78,F,12.7),point(-75,F,12.7)]);
pair('Second floor northern bypass',[point(-90,F,12),point(-90,F,15),point(-75,F,15),point(-75,F,12.7)]);
pair('Second entrance to stair',[point(-63,F,-20),point(-72,F,-20),point(-72,F,12.7),point(-75,F,12.7)]);
pair('Ground entrance to stair',[point(-69,0,-7),point(-75,G,-7),point(-78.5,G,-7),point(-78.5,G,7),point(-75,G,7),point(-75,G,9.7)]);
for(const[component,labels]of[['isetan-ground',['B1 to ground stair','B1 to ground stair return']],['isetan-basement',['Isetan internal stair','Isetan internal stair return']]]){const prior=await read('.local/v2/current/components/'+component+'/report.json');for(const label of labels)routes.push(prior.geometry.routes.find(r=>r.label===label));}
assert(routes.every(Boolean));
const blocked=[{label:'Second floor lower-flight guard',start:point(-76.8,F,9.7),yaw:-90,axis:'x',limit:-77.6,sign:1},{label:'Northern bypass well guard',start:point(-82,F,15),yaw:180,axis:'z',limit:14.35,sign:1}];
const report=await c.save(out,'isetan-stair.glb',{componentPrefix:prefix,sourceCollection:'Isetan connected internal stair',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Extend the existing B2-B1-ground stair to 2F, with protected openings and a clear northern bypass.',geometry:{G,F,well,stair:{steps:42,rise,going:.3,mid},routes,blocked,spawn:point(-75,G,9.7),retiredIds:spec.retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:[],modifiedFlightIds:[],retiredLights:spec.retiredLights,modifiedPanelIds:Object.keys(spec.cuts)},references:['research/kyoto-station/maps/isetan-1f-2026.png','research/kyoto-station/maps/isetan-2f-2026.png'],limits:['Official floor plans establish general location and connectivity; dimensions and finishes are fitted approximations.','Store escalators, store lifts and further upper floors remain unfinished.']});
const labels=[['2F 化粧品・フレグランス','2F Cosmetics / Fragrance'],['1F・B1F・B2F','1F Boutiques / B1F + B2F Food'],['',''],['',''],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-stair-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-stair.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===7)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan stair directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-stair.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-stair-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');

await writeFile(out+'/views.json',JSON.stringify([['ground-entry',[-75,G+1.7,9.7],[-85,mid+1,9.7]],['mid-landing',[-85.2,mid+1.7,9.7],[-78,F+.7,12.7]],['upper-arrival',[-75,F+1.7,12.7],[-85,mid+1.7,12.7]],['north-bypass',[-90,F+1.7,15],[-75,F+1.7,15]],['retained-ground-arrival',[-75,G+1.7,12.7],[-82,-1,12.7]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
