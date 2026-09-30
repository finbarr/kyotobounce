// North Isetan lift and B3 receiving lobby, fitted to the operator plans.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import sharp from 'sharp';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
import {multiStopLift} from './multi-stop-lift-spec.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert.equal(s.parentLayoutSha256,m.layoutSha256);
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
function mat(name,color,roughness=.6,metallic=0){const i=mats.length;mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});return i;}
const stone=mat('Isetan lift | warm stone',[.64,.61,.52]),floor=mat('Isetan lift | terrazzo',[.53,.51,.46],.45),ceiling=mat('Subway lift | ceiling',[.74,.74,.7]),steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),dark=mat('Subway lift | dark floor',[.11,.12,.12]),button=mat('Subway lift | button',[.1,.22,.45]),concrete=mat('Isetan lift | concrete',[.32,.33,.31]),light=mat('Isetan lift | diffuser',[1,.94,.8]);mats[light].emissiveFactor=[1,.94,.8];
const printed=mat('Isetan lift | directions',[1,1,1]);
const c=construction(mats,{flatNormals:true}),prefix='isetan-lift-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],X=s.origin.x,Z=s.origin.z,[B3,B2,B1,G,U]=s.levels,hole=s.opening.coordinates[0].slice(0,-1);
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=stone,role='wall')=>{assert(top>bottom&&x1>x0&&z1>z0,id);slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);};
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
// Continuous core; openings exist only at the five occupied floors.
box('shaft-west',X-1.5,X-1.35,Z-1.75,Z+1.75,U+3.3,B3-.5);
for(const [a,b,id]of[[Z-1.75,Z-1.6,'south'],[Z+1.6,Z+1.75,'north']])box('shaft-'+id,X-1.35,X+1.6,a,b,U+3.3,B3-.5);
for(const [a,b,id]of[[Z-1.75,Z-.7,'south'],[Z+.7,Z+1.75,'north']])box('shaft-front-'+id,X+1.4,X+1.6,a,b,U+3.3,B3-.5);
let bottom=B3-.5;for(const [i,y]of s.levels.entries()){if(y>bottom)box('front-infill-'+i,X+1.4,X+1.6,Z-.7,Z+.7,y-.12,bottom);bottom=y+2.2;}box('front-head',X+1.4,X+1.6,Z-.7,Z+.7,U+3.3,bottom);
box('pit',X-1.35,X+1.6,Z-1.6,Z+1.6,B3-.35,B3-.5,dark);box('core-roof',X-1.5,X+1.6,Z-1.75,Z+1.75,U+3.45,U+3.3,stone,'roof');
for(const [i,y]of s.levels.entries()){
 box('sill-'+i,X+1.185,X+1.6,Z-1.6,Z+1.6,y,y-.12,steel,'lift-sill');
 for(const z of[Z-.74,Z+.74])box('jamb-'+i+'-'+z,X+1.38,X+1.64,z-.035,z+.035,y+2.25,y,steel,'lift-frame');
 box('door-head-'+i,X+1.38,X+1.64,Z-.775,Z+.775,y+2.28,y+2.18,steel,'lift-frame');
 box('call-plate-'+i,X+1.60,X+1.63,Z+1,Z+1.18,y+1.27,y+.95,steel,'call-button');box('call-button-'+i,X+1.63,X+1.65,Z+1.045,Z+1.135,y+1.17,y+1.06,button,'call-button');
 box('indicator-'+i,X+1.6,X+1.64,Z-.22,Z+.22,y+2.63,y+2.37,button,'indicator');
}
// The B3 lobby wraps south of the existing stair enclosure. Its east portal
// enters the garage's clear north aisle, keeping the old stair door intact.
const lobby=[[-92.7,1],[-77,1],[-77,8],[-83.5,8],[-83.5,14.6],[-92.7,14.6]];
slab('parking-lobby-floor',lobby,B3,.25,floor,'floor',[hole]);
slab('parking-lobby-ceiling',lobby,B3+3.15,.2,ceiling,'ceiling',[hole]);
box('parking-west',-92.9,-92.7,1,14.8,B2-.22,B3,concrete);
box('parking-south',-92.7,-77,.8,1,B2-.22,B3,concrete);
box('parking-north',-92.7,-83.5,14.6,14.8,B2-.22,B3,concrete);
box('stair-wall-return',-83.5,-83.3,14.4,14.8,B2-.22,B3,concrete);
for(const[id,z0,z1]of[['south',-23,1],['middle',6,8.35]])box('garage-west-'+id,-77.2,-77,z0,z1,B3+2.95,B3,concrete);
box('garage-portal-header',-77.2,-77,1,6,B3+2.95,B3+2.6,concrete);
// Floor edges meet at X=-77; an extra coplanar threshold would flicker.
const lights=[];
for(const [i,y]of s.levels.entries()){
 const h=i===0?2.85:i===1?3.2:i===2?3.2:i===3?4.3:3.3;
 box('light-'+i,X+2.2,X+3.4,Z-.16,Z+.16,y+h+.03,y+h,light,'fixture');c.panels.at(-1).collision=false;
 lights.push({id:prefix+'lamp-'+i,position:{x:X+2.8,y:y+h-.06,z:Z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:10,spotAngle:120,innerSpotAngle:80});
}
box('garage-light',-83.6,-82.4,3.35,3.65,B3+2.88,B3+2.85,light,'fixture');c.panels.at(-1).collision=false;
lights.push({id:prefix+'lamp-entrance',position:{x:-83,y:B3+2.8,z:3.5},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:10,spotAngle:120,innerSpotAngle:80});
const faces=[],names=[['b3','B3 · Parking'],['b2','B2 · Isetan food hall'],['b1','B1 · Isetan food hall'],['1','1F · Isetan entrance'],['2','2F · Isetan / public passage']];
for(const [i,y]of s.levels.entries()){
 const text=[['B3 東駐車場','East Parking'],['B2 伊勢丹','Isetan Food Hall'],['B1 伊勢丹','Isetan Food Hall'],['1F 伊勢丹','Isetan Entrance'],['2F 伊勢丹','Isetan / Public Passage']][i];
 box('floor-label-'+i,X+1.65,X+1.67,Z-1.35,Z+1.35,y+2.91,y+2.66,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+'floor-label-'+i,x:X+1.66,z:Z,bottom:y+2.66,width:2.7,height:.25,text});
}
box('entrance-label',-76.98,-76.96,1.5,5.5,B3+2.94,B3+2.64,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+'entrance-label',x:-76.97,z:3.5,bottom:B3+2.64,width:4,height:.3,text:['伊勢丹 北エレベーター','Isetan North Elevator']});
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14));for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Central lift to Isetan parking lift',[point(-35.7,B3,-3),point(-35.7,B3,3.5),point(-87.7,B3,3.5),point(-87.7,B3,Z)]);
pair('South parking aisle to Isetan lift',[point(-60,B3,-14.5),point(-74,B3,-14.5),point(-74,B3,3.5),point(-87.7,B3,3.5),point(-87.7,B3,Z)]);
for(const [name,y]of [['B2',B2],['B1',B1]])pair(name+' food hall to north lift',[point(-47,y,18),point(-87.7,y,18),point(-87.7,y,Z)]);
pair('Ground entrance to north lift',[point(-69,0,-7),point(-75,G,-7),point(-78.5,G,-7),point(-78.5,G,7),point(-75,G,7),point(-75,G,15),point(-87.7,G,15),point(-87.7,G,Z)]);
pair('Second entrance to north lift',[point(-63,U,-20),point(-72,U,-20),point(-72,U,12.7),point(-75,U,12.7),point(-75,U,15),point(-87.7,U,15),point(-87.7,U,Z)]);
pair('Ground western aisle to north lift',[point(-95,G,11),point(-95,G,8),point(-87.7,G,8),point(-87.7,G,Z)]);
const prior=await read('.local/v2/current/components/isetan-parking/report.json');for(const label of ['Parking to B2 stair','Parking to B2 stair return','Ground to second stair','Ground to second stair return']){const r=prior.geometry.routes.find(r=>r.label===label);assert(r);routes.push(r);}
for(const p of c.panels){if(typeof p.collision!=='boolean')p.collision=true;if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===steel?'steel':'stone';}
const report=await c.save(out,'isetan-lift.glb',{componentPrefix:prefix,sourceCollection:'Isetan north lift and parking lobby',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect B3 parking, B2, B1, ground and 2F with one north-bank lift and usable receiving routes, preserving the adjacent stair.',geometry:{routes,chromeRoutes:routes.filter(r=>!r.label.endsWith(' return')).map(r=>r.label),blocked:[],spawn:point(-87.7,B3,Z),retiredIds:s.retiredIds,modifiedPanelIds:s.modifiedPanelIds,modifiedFlightIds:[],retiredLights:[],levels:s.levels,origin:s.origin,yaw:s.yaw,opening:s.opening},references:['https://www.kyoto-station-building.co.jp/parking/','https://www.mistore.jp/store/kyoto/shops/floor2.html','https://kyoto-rys.com/facility/elevator/'],limits:['The north bank extends to 11F in reality; this increment serves the five constructed floors. More cars and upper store floors remain unfinished.','Position, lobby shape and dimensions are fitted to existing station geometry, not a surveyed plan.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1792"><rect width="2048" height="1792" fill="#f0eee4"/>';
for(const[i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256}) scale(${8/(f.width/f.height)},1)" fill="#163047" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="115" font-size="90">${f.text[0]}</text><text y="212" font-size="62">${f.text[1]}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-lift-signs.png',png);
const {json:j,bin}=readGLB(await readFile(out+'/isetan-lift.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.x),u=flat?.5+side*(v.z-f.z)/f.width:.5,t=((flat?row:6)+1-(v.y-f.bottom)/f.height)/7;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan north elevator directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/isetan-lift.glb',glb);report.outputs.glbSha256=sha(glb);report.texture={file:'isetan-lift-signs.png',sha256:sha(png),material:mats[printed].name};
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/lift-spec.json',JSON.stringify(multiStopLift({id:'isetan-north-lift',origin:s.origin,yaw:s.yaw,stops:names.map(([id,label],i)=>({id,label,height:s.levels[i]-B3}))}))+'\n');
await writeFile(out+'/views.json',JSON.stringify([['parking-lobby',[-84.5,B3+1.7,11.5],[-91,B3+1.4,Z]],['garage-portal',[-72,B3+1.7,4],[-87,B3+1.6,3.5]],['b2-lift',[-86,B2+1.7,14.5],[-91,B2+1.4,Z]],['ground-lift',[-87,G+1.7,9],[-91,G+1.5,Z]],['second-lift',[-87,U+1.7,14.7],[-91,U+1.5,Z]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
