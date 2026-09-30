// Connect the retained third-floor landing and the northern store stair.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json');assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan third | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.56,.53,.46],.4),mat('stainless',[.5,.52,.54],.28,.8),{...mat('glazing',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.14],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('warm wall',[.65,.61,.53]),mat('ceiling',[.76,.74,.67]),mat('tactile',[.73,.49,.04]),{...mat('diffuser',[1,.94,.81]),emissiveFactor:[1,.94,.81]},mat('printed signs',[1,1,1])];
const c=construction(mats,{flatNormals:true}),prefix='isetan-third-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],G=spec.ground,F=spec.second,mid=(G+F)/2,rise=(F-G)/(2*spec.stepsPerFlight),well=rect(...spec.well.flat()),lights=[],faces=[];
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=3,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function sign(id,x,z,y,row,w=2.2){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,7,'sign');decor();faces.push({id:prefix+id,pos:x,center:z,w,h:.5,y,side:1,row,back:row});}

// Fill only the absent floor area. Retained floor plates and the exterior
// landing remain byte-for-byte unchanged, including their visible top faces.
for(const [i,p]of spec.infill.entries())slab('floor-infill-'+i,p.outer,F,.2,0,'floor',p.holes);
slab('second-ceiling',rect(-123,-69,-28,16),11.15,.2,4,'ceiling',[well]);
slab('ceiling',[[-123,-28],[-76,-28],[-76,-8],[-69,-8],[-69,16],[-123,16]],spec.ceiling,.12,4,'ceiling');
const C=spec.ceiling;
box('west-wall',-123.2,-123,-28.2,16.2,C,F);
box('north-wall',-123,-69,16,16.2,C,F);
box('south-wall',-123,-76,-28.2,-28,C,F);
box('east-north-wall',-69.2,-69,-8,16,C,F);
box('frontage-return',-76,-69,-8.2,-8,C,F);
box('east-middle-wall',-76.2,-76,-20,-8,C,F);
box('east-south-wall',-76.2,-76,-28,-27,C,F);
// The entrance meets the clear landing south of the public approach stair.
for(const [i,z0,z1]of[[0,-27,-25.5],[1,-22.5,-20]]){
 box('frontage-glass-'+i,-76.14,-76.10,z0,z1,F+2.4,F,2,'shopfront-glazing');
 for(const z of[z0,z1])box('frontage-mullion-'+i+'-'+z,-76.19,-76.05,z-.03,z+.03,F+2.42,F,1,'steelwork');
 beam('frontage-sill-'+i,[-76.08,F+.05,z0],[-76.08,F+.05,z1],.06,.07);
}
box('door-header',-76.2,-76,-27,-20,C,F+2.42,3,'door-header');
for(const [i,z0,z1]of[[0,-26.9,-25.5],[1,-22.5,-21.1]])box('parked-door-'+i,-76.35,-76.31,z0,z1,F+2.38,F+.02,2,'door-glazing');
sign('entrance-name',-75.95,-24,F+2.3,0,3);
// Stack shorter flights over the existing 1F–2F flights; keep the lower
// stair's arrival open and remove only its now-obsolete entry parapet.
for(let i=0;i<spec.stepsPerFlight;i++){
 const lower=G+(i+1)*rise,upper=mid+(i+1)*rise;
 box('lower-step-'+i,-78-(i+1)*.3,-78-i*.3,8.35,11.05,lower,lower-rise-.18,0,'stair-tread');
 box('upper-step-'+i,-81.6+i*.3,-81.6+(i+1)*.3,11.35,14.05,upper,upper-rise-.18,0,'stair-tread');
}
box('stair-landing',-86.15,-81.6,8.35,14.05,mid,mid-.22,0,'stair-landing');
box('second-threshold',-78,-77.8,8.35,11.05,G,G-.24,0,'stair-landing');
box('third-threshold',-78,-77.8,11.35,14.05,F,F-.2,0,'stair-landing');
box('retained-second-threshold-lining',-77.95,-77.8,8.2,11.35,G-.24,4.6);
box('west-lining',-86.3,-86.15,8.2,14.2,F+1.1,G+1.1);
box('south-lining',-86.15,-77.8,8.2,8.35,F+1.1,G+1.1);
box('north-lining',-86.15,-77.8,14.05,14.2,F+1.1,G+1.1);
box('third-lower-opening-guard',-77.95,-77.8,8.2,11.35,F+1.1,F-.2,3,'well-guard');
box('upper-threshold-lining',-77.95,-77.8,11.35,14.05,F-.2,G+2.3);
function rail(id,x0,y0,x1,y1,z){
 c.slab(prefix+id+'-glass',[P(x0,y0+1.1,z-.025),P(x1,y1+1.1,z-.025),P(x1,y1+1.1,z+.025),P(x0,y0+1.1,z+.025)],[],1.1,2,'well-guard');
 beam(id+'-handrail',[x0,y0+1.12,z],[x1,y1+1.12,z],.045,.045);
 for(let i=0;i<=3;i++){const t=i/3,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;beam(id+'-post-'+i,[x,y,z],[x,y+1.1,z],.04,.04);}
}
for(const z of[8.425,11.015])rail('lower-'+z,-78,G,-81.6,mid,z);
for(const z of[11.385,13.9])rail('upper-'+z,-81.6,mid,-78,F,z);
box('landing-west-glass',-86.12,-86.075,8.35,14.05,mid+1.1,mid,2,'well-guard');
beam('landing-west-rail',[-86.1,mid+1.12,8.425],[-86.1,mid+1.12,13.9],.045,.045);
for(const z of[8.425,13.9]){box('landing-side-glass-'+z,-86.1,-81.6,z-.025,z+.025,mid+1.1,mid,2,'well-guard');beam('landing-side-rail-'+z,[-86.1,mid+1.12,z],[-81.6,mid+1.12,z],.045,.045);}
for(const[id,y,z,row]of[['second',G,9.7,1],['third',F,12.7,2]]){sign('direction-'+id,-76.9,z,y+2.05,row);box('warning-'+id,-77.55,-77.1,z-1,z+1,y+.006,y+.001,5,'tactile');decor();}
// Low display blocks establish the plan's aisle pattern without inventing
// unfinished escalator mouths or doors into inaccessible upper floors.
for(const [id,a,b,d,e]of[['south',-114,-103,-12,-7],['west',-113,-105,0,6],['east',-96,-89,-8,-1]]){
 box('display-'+id,a,b,d,e,F+.82,F,3,'display-counter');
 box('display-top-'+id,a-.04,b+.04,d-.04,e+.04,F+.9,F+.82,0,'counter-top');
}
function light(id,x,y,z){box('fixture-'+id,x-.7,x+.7,z-.10,z+.10,y+.07,y,6,'fixture');decor();lights.push({id:prefix+'light-'+id,position:{x,y:y-.07,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.81},intensity:12,range:12,spotAngle:120,innerSpotAngle:80});}
for(const x of[-117,-103,-90,-79])for(const z of[-24,-4,12])light(x+'-'+z,x,C-.2,z);
light('north-east',-72.5,C-.2,10);
light('stair',-83.5,C-.2,11.2);
sign('store-departments',-96,-20,F+2.05,3);
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(d<1e-8){assert(Math.abs(a.y-b.y)<1e-5);continue;}const n=Math.ceil(d/14);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Second to third stair',[point(-75,G,9.7),point(-78,G,9.7),point(-81.6,mid,9.7),point(-82.5,mid,9.7),point(-82.5,mid,12.7),point(-81.6,mid,12.7),point(-78,F,12.7),point(-75,F,12.7)]);
pair('Third entrance to stair',[point(-70.5,F,-24),point(-78.5,F,-24),point(-78.5,F,-4),point(-73,F,-4),point(-73,F,12.7),point(-75,F,12.7)]);
pair('Third floor aisle loop',[point(-79,F,-24),point(-119,F,-24),point(-119,F,12),point(-90,F,12),point(-90,F,15),point(-73,F,15),point(-73,F,-4),point(-79,F,-4),point(-79,F,-24)]);
pair('Third floor cross aisle',[point(-119,F,-4),point(-100,F,-4),point(-100,F,10),point(-90,F,10),point(-90,F,15),point(-73,F,15)]);
const prior=await read('.local/v2/current/components/isetan-lift/report.json');
for(const label of['Ground to second stair','Ground to second stair return','Second entrance to north lift','Second entrance to north lift return'])routes.push(prior.geometry.routes.find(r=>r.label===label));
const second=await read('.local/v2/current/components/isetan-second/report.json');
for(const label of['Upper stair landing','Upper stair landing return','Retained southern approach to plaza','Retained southern approach to plaza return'])routes.push(second.geometry.routes.find(r=>r.label===label));
assert(routes.every(Boolean));
const chromeRoutes=['Second to third stair','Second to third stair return','Third entrance to stair','Third floor aisle loop','Third floor cross aisle','Ground to second stair','Upper stair landing'];
const blocked=[{label:'Third floor stairwell guard',start:point(-76.8,F,9.7),yaw:-90,axis:'x',limit:-77.6,sign:1}];
const report=await c.save(out,'isetan-third.glb',{componentPrefix:prefix,sourceCollection:'Isetan third-floor connection',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect Isetan 3F to the western landing and northern internal stair, with continuous floors and protected aisle routes.',geometry:{G,F,C,well,stair:{steps:24,rise,going:.3,mid},headroomStairs:[['isetan-third-',12],['isetan-stair-',21],['isetan-ground-',14],['isetan-parking-retained-',11],['isetan-parking-',11]],routes,chromeRoutes,headroomRoutes:routes.slice(0,12).map(r=>r.label),blocked,spawn:point(-80,F,-24),retiredIds:spec.retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:[],modifiedFlightIds:[],retiredLights:[],modifiedPanelIds:Object.keys(spec.cuts)},references:['research/kyoto-station/maps/floor-3f.svg','research/kyoto-station/maps/floor-3f-isetan.svg','https://www.mistore.jp/store/kyoto/shops/floor3.html'],limits:['Operator diagrams establish an eastern entrance, aisle connections and a northern stair core; dimensions and finishes are fitted approximations.','Upper store lifts, escalators, distant rooms and branded fitouts remain unfinished.']});
const labels=[['ジェイアール京都伊勢丹 3F','JR KYOTO ISETAN'],['3F シューズ＆バッグス','3F Shoes / Bags / Accessories'],['2F・1F・B1F・B2F','Lower store floors'],['シューズ・バッグ・アクセサリー','Shoes / Bags / Accessories'],['',''],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="40">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-third-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-third.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===7)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):5,u=row===5?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/6;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan third-floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-third.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-third-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');

await writeFile(out+'/views.json',JSON.stringify([['entrance',[-71,F+1.7,-24],[-90,F+1.7,-24]],['hall',[-80,F+1.7,-24],[-115,F+1.7,-4]],['stair-lower',[-75,G+1.7,9.7],[-82,mid+1,9.7]],['stair-upper',[-75,F+1.7,12.7],[-83,mid+1.5,12.7]],['north-bypass',[-90,F+1.7,15],[-73,F+1.7,15]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
