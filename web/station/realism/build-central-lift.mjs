// Central elevator and receiving routes, fitted to the operator's plans.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import sharp from 'sharp';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
import {multiStopLift} from './multi-stop-lift-spec.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
function mat(name,color,roughness=.6,metallic=0){const i=mats.length;mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});return i;}
const stone=mat('Central lift | pale limestone',[.56,.53,.45]),floor=mat('Central lift | terrazzo',[.43,.42,.38]),ceiling=mat('Subway lift | ceiling',[.74,.74,.7]),steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),dark=mat('Subway lift | dark floor',[.11,.12,.12]),button=mat('Subway lift | button',[.1,.22,.45]),blue=mat('Central lift | blue fascia',[.11,.23,.34],.4,.2),glass=mat('Central lift | shop glazing',[.22,.37,.40],.16,.05),concrete=mat('Central lift | parking concrete',[.32,.33,.31]),white=mat('Central lift | markings',[.79,.77,.63]),yellow=mat('Central lift | parking yellow',[.7,.48,.09]),light=mat('Central lift | diffuser',[.9,.88,.74]);mats[light].emissiveFactor=[.5,.48,.39];
const printed=mat('Central lift | directions',[1,1,1]);
const c=construction(mats,{flatNormals:true}),prefix='central-lift-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],X=s.origin.x,Z=s.origin.z,[B3,B2,B1,G,U]=s.levels,hole=s.opening.coordinates[0].slice(0,-1);
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=stone,role='wall')=>{assert(top>bottom&&x1>x0&&z1>z0,id);slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);};
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
// Continuous core; openings exist only at the five occupied floors.
box('shaft-west',X-1.5,X-1.35,Z-1.75,Z+1.75,U+3.3,B3-.5);
for(const [a,b,id]of[[Z-1.75,Z-1.6,'south'],[Z+1.6,Z+1.75,'north']])box('shaft-'+id,X-1.35,X+1.6,a,b,U+3.3,B3-.5);
for(const [a,b,id]of[[Z-1.75,Z-.7,'south'],[Z+.7,Z+1.75,'north']])box('shaft-front-'+id,X+1.4,X+1.6,a,b,U+3.3,B3-.5);
let bottom=B3-.5;for(const [i,y]of s.levels.entries()){if(y>bottom)box('front-infill-'+i,X+1.4,X+1.6,Z-.7,Z+.7,y,bottom);bottom=y+2.2;}box('front-head',X+1.4,X+1.6,Z-.7,Z+.7,U+3.3,bottom);
box('pit',X-1.35,X+1.6,Z-1.6,Z+1.6,B3-.35,B3-.5,dark);box('core-roof',X-1.5,X+1.6,Z-1.75,Z+1.75,U+3.45,U+3.3,stone,'roof');
for(const [i,y]of s.levels.entries()){
 box('sill-'+i,X+1.185,X+1.6,Z-1.6,Z+1.6,y,y-.12,steel,'lift-sill');
 for(const z of[Z-.74,Z+.74])box('jamb-'+i+'-'+z,X+1.38,X+1.64,z-.035,z+.035,y+2.25,y,steel,'lift-frame');
 box('door-head-'+i,X+1.38,X+1.64,Z-.775,Z+.775,y+2.28,y+2.18,steel,'lift-frame');
 box('call-plate-'+i,X+1.60,X+1.63,Z+1,Z+1.18,y+1.27,y+.95,steel,'call-button');box('call-button-'+i,X+1.63,X+1.65,Z+1.045,Z+1.135,y+1.17,y+1.06,button,'call-button');
 box('indicator-'+i,X+1.6,X+1.64,Z-.22,Z+.22,y+2.63,y+2.37,button,'indicator');
}
// B1: replace the exposed western void with a receiving hall joined to both
// retained aisles. The shaft has the same cutout through floor and ceiling.
const b1Outline=rect(-43,s.b1JoinX,-6.5,s.b1NorthZ);
slab('b1-floor',b1Outline,B1,.18,floor,'floor',[hole]);slab('b1-ceiling',b1Outline,-1.37,.18,ceiling,'ceiling',[hole]);
box('b1-west',-43.2,-43,-6.5,s.b1NorthZ,-1.55,B1);box('b1-north',-43,s.b1JoinX,s.b1NorthZ,s.b1NorthZ+.18,-1.55,B1);box('b1-south',-43,s.b1JoinX,-6.68,-6.5,-1.55,B1);box('b1-east-return',s.b1JoinX-.18,s.b1JoinX,-6.5,-1.49357,-1.55,B1);
// Recessed shop fronts make the enclosed perimeter legible from the hall.
for(const x of[-35,-28,-21]){box('b1-shop-frame-'+x,x-2.5,x+2.5,s.b1NorthZ-.11,s.b1NorthZ,B1+2.85,B1,blue,'shop-frame');box('b1-shop-window-'+x,x-2.35,x+2.35,s.b1NorthZ-.13,s.b1NorthZ-.11,B1+2.5,B1+.2,glass,'shop-window');}
// B2: the western dining aisle now turns into the lift lobby.
const b2Outline=rect(-43,-24,-6.5,6.5);slab('b2-floor',b2Outline,B2,.22,floor,'floor',[hole]);slab('b2-ceiling',b2Outline,B2+3.58,.18,ceiling,'ceiling',[hole]);
box('b2-west',-43.2,-43,-6.5,6.5,B2+3.4,B2);box('b2-south',-43,-24,-6.68,-6.5,B2+3.4,B2);box('b2-north',-43,-24,6.5,6.68,B2+3.4,B2);
for(const [a,b,id]of[[-14,-5,'south'],[4,25,'north']])box('b2-retained-west-'+id,-24.1,-23.9,a,b,B2+3.4,B2);box('b2-portal-head',-24.1,-23.9,-5,4,B2+3.4,B2+2.85);
// 1F: a recessed entrance and neighboring shop frontage, beneath a sloped
// blue fascia. The photographed glazing establishes this form, not dimensions.
box('ground-recess-south',-40.75,-33.1,-6.5,-6.35,4.5,0);box('ground-recess-north',-37.4,-33.25,-1.25,-1.1,4.5,0);
for(const[a,b,id]of[[-6.35,-4.25,'south'],[-1.75,6.5,'north']])box('ground-front-'+id,-33.25,-33.1,a,b,3.35,0,blue);
box('ground-entry-header',-33.25,-33.1,-4.25,-1.75,3.35,2.75,blue);box('ground-shop-glass',-33.08,-33.06,-.7,6.15,2.8,.25,glass,'shop-window');
box('ground-shop-north',-41,-33.1,6.5,6.65,4.5,0);box('ground-shop-west',-41.15,-41,-1.1,6.5,4.5,0);
c.slab(prefix+'ground-sloped-fascia',[P(-33.1,3.35,-6.5),P(-33.1,3.35,6.65),P(-34.4,4.5,6.65),P(-34.4,4.5,-6.5)],[],.07,blue,'roof-fascia');
for(let z=-6.2;z<6.6;z+=1) c.slab(prefix+'fascia-seam-'+z,[P(-33.08,3.36,z),P(-33.08,3.36,z+.025),P(-34.38,4.51,z+.025),P(-34.38,4.51,z)],[],.012,steel,'fascia-joint');
// 2F: the landing bridges over the lower intermediate deck only inside a solid
// plinth. The public walk runs outside that deck so it never creates low headroom.
slab('upper-lobby',rect(-40.75,-33.1,-6.5,-1.25),U,U-5.6520280838012695,floor,'landing',[hole]);
slab('upper-passage',rect(-63,-33.1,-10.75,-6.5),U,.3,floor);
// Open the retained entry wall into the north-south public passage.
for(const[a,b,id]of[[-69,-63,'west'],[-59,-49.9,'east']])box('public-entry-north-'+id,a,b,-10.9,-10.75,9.94,7.05);
box('public-entry-head',-63,-59,-10.9,-10.75,9.94,9.74);
for(const[a,b,id]of[[-63,-40.75,'west']])box('upper-north-guard-'+id,a,b,-6.58,-6.5,U+1.1,U,stone,'guard');
box('upper-west-guard',-63.08,-63,-10.75,-6.5,U+1.1,U,stone,'guard');box('upper-east-guard',-33.1,-33.02,-10.75,-1.25,U+1.1,U,stone,'guard');box('upper-lobby-north-guard',-37.4,-33.1,-1.25,-1.17,U+1.1,U,stone,'guard');
// South guard stops at the actual opening into the retained passage.
box('upper-south-guard',-59,-33.1,-10.83,-10.75,U+1.1,U,stone,'guard');
// B3 parking receiving area. Bay arrangement follows the operator's access
// diagram; dimensions and vertical datum remain fitted approximations.
const garage=rect(-77,40,-23,13);slab('parking-floor',garage,B3,.25,concrete,'floor',[hole]);slab('parking-ceiling',garage,B3+3.15,.2,concrete,'ceiling',[hole]);
for(const[a,b,id]of[[-77.2,-77,'west'],[40,40.2,'east']])box('parking-'+id,a,b,-23,13,B3+2.95,B3,concrete);
for(const[a,b,id]of[[-23.2,-23,'south'],[13,13.2,'north']])box('parking-'+id,-77,40,a,b,B3+2.95,B3,concrete);
let bay=0;function stalls(a,b,z0,z1){const n=Math.floor((b-a)/2.7),w=(b-a)/n;for(let i=0;i<=n;i++){const x=a+i*w;box('bay-line-'+bay+'-'+i,x-.045,x+.045,z0,z1,B3+.003,B3+.001,white,'paint');c.panels.at(-1).collision=false;}for(let i=0;i<n;i++){const x=a+(i+.5)*w,z=z1>0?z1-.6:z0+.6;box('wheel-stop-'+bay+'-'+i,x-.65,x+.65,z-.075,z+.075,B3+.10,B3,concrete,'wheel-stop');}bay+=n;}
for(const[a,b]of[[-68,-41.5],[-31.5,32]]){stalls(a,b,-4.6,.4);stalls(a,b,-11.5,-6.5);}stalls(-70,-48,7.6,12.6);stalls(-28,-.5,-22.6,-17.6);
for(const x of[-70,-54,-23,-7,9,25])for(const z of[-5.5,6.7]){box('parking-column-'+x+'-'+z,x-.3,x+.3,z-.3,z+.3,B3+2.95,B3,concrete,'column');box('parking-column-band-'+x+'-'+z,x-.31,x+.31,z-.31,z+.31,B3+1.2,B3+.8,yellow,'column-band');}
// Flush pedestrian crossing from the central car to both parking aisles.
for(let z=-16;z<7;z+=.7){box('parking-crossing-'+z,-36.8,-33,z,z+.3,B3+.003,B3+.001,white,'paint');c.panels.at(-1).collision=false;}
const lights=[];for(const [id,level,x,z]of [['b1',B1,-27,3],['b1-west',B1,-38,6],['b2',B2,-31,0],['b3-lobby',B3,-35,-3],['parking-west',B3,-55,3],['parking-east',B3,-7,3],['parking-south',B3,-16,-15]]){
 const y=level+(id.startsWith('b1')?3.1:id==='b2'?3.1:2.7);box('light-'+id,x-.6,x+.6,z-.18,z+.18,y+.025,y,light,'light');lights.push({id:prefix+'lamp-'+id,position:{x,y:y-.02,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.78},intensity:5,range:12,spotAngle:110,innerSpotAngle:85});
}
const faces=[];
for(const [i,y]of s.levels.entries()){
 const text=[['B3 駐車場','Parking'],['B2 ポルタ','Porta'],['B1 伊勢丹方面','Isetan frontage'],['1F 中央口','Central Gate'],['2F 南北自由通路','North–south passage']][i];
 box('floor-label-'+i,X+1.65,X+1.67,Z-1.35,Z+1.35,y+2.8,y+2.44,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+'floor-label-'+i,x:X+1.66,z:Z,bottom:y+2.44,width:2.7,height:.36,text});
}
box('entrance-label',-33.08,-33.06,-4.4,-1.6,3.28,2.90,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+'entrance-label',x:-33.07,z:-3,bottom:2.90,width:2.8,height:.38,text:['中央エレベーター','Central Elevator']});
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('B1 north aisle to central lift',[point(-9,B1,9),point(-20,B1,8),point(-35.7,B1,8),point(-35.7,B1,Z)]);
pair('B1 south aisle to central lift',[point(-9,B1,0),point(-20,B1,0),point(-35.7,B1,0),point(-35.7,B1,Z)]);
pair('B2 dining aisle to central lift',[point(-17,B2,-3),point(-35.7,B2,-3)]);
pair('Ground concourse to central lift',[point(-22,0,-3),point(-35.7,0,-3)]);
pair('Central lift to north-south public passage',[point(-35.7,U,Z),point(-35.7,U,-8.5),point(-60.7,U,-8.5),point(-60.7,U,-19)]);
pair('Parking lift to north aisle',[point(-35.7,B3,Z),point(-35.7,B3,3.5),point(-60,B3,3.5)]);
pair('Parking lift to south aisle',[point(-35.7,B3,Z),point(-35.7,B3,-14.5),point(-12,B3,-14.5)]);
for(const p of c.panels){if(typeof p.collision!=='boolean')p.collision=true;if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===steel?'steel':'stone';}
const report=await c.save(out,'central-lift.glb',{componentPrefix:prefix,sourceCollection:'Central lift and western receiving halls',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Five-floor central elevator with connected B1 and B2 western receiving halls, ground recess, upper public passage and B3 parking aisles.',geometry:{routes,blocked:[],spawn:point(-35.7,B2,Z),retiredIds:s.retiredIds,modifiedPanelIds:s.modifiedPanelIds,retiredLights:[],levels:s.levels,origin:s.origin,yaw:s.yaw,parkingBays:bay,opening:s.opening},references:['https://www.porta.co.jp/common/pdf/company/evacuation.pdf','https://www.kyoto-station-building.co.jp/parking/','https://kyoto-rys.com/facility/elevator/'],limits:['Floor and shaft coordinates are fitted to the existing model, not a measured survey. B3 datum is provisional.','Parking bay arrangement follows the operator diagram; vehicle ramps, service rooms and retail interiors remain unfinished.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1792"><rect width="2048" height="1792" fill="#f0eee4"/>';
for(const[i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256})" fill="#163047" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="115" font-size="90">${f.text[0]}</text><text y="212" font-size="62">${f.text[1]}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/central-lift-signs.png',png);
const {json:j,bin}=readGLB(await readFile(out+'/central-lift.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.x),u=flat?.5+side*(v.z-f.z)/f.width:.5,t=((flat?row:6)+1-(v.y-f.bottom)/f.height)/7;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original central elevator directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/central-lift.glb',glb);report.outputs.glbSha256=sha(glb);report.texture={file:'central-lift-signs.png',sha256:sha(png),material:mats[printed].name};
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
const names=[['b3','B3 · Parking'],['b2','B2 · Porta'],['b1','B1 · Isetan frontage'],['1','1F · Central Gate'],['2','2F · North–south passage']];await writeFile(out+'/lift-spec.json',JSON.stringify(multiStopLift({id:'station-central-lift',origin:s.origin,yaw:s.yaw,stops:names.map(([id,label],i)=>({id,label,height:s.levels[i]-B3}))}))+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,parkingBays:bay,routes:routes.length});
