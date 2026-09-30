// The north bank shown in the hotel plan, serving the two constructed stops.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath);
assert.equal(s.parentLayoutSha256,m.layoutSha256);
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
function mat(name,color,roughness=.6,metallic=0){const i=mats.length;mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});return i;}
const stone=mat('Granvia parking | warm stone',[.56,.49,.37]),floor=mat('Granvia parking | terrazzo',[.39,.37,.32],.42),ceiling=mat('Granvia parking | ceiling',[.65,.62,.55]),bronze=mat('Granvia parking | bronze',[.34,.25,.13],.32,.8),dark=mat('Granvia parking | recess',[.055,.057,.05]),button=mat('Granvia parking | call button',[.08,.19,.26]),light=mat('Granvia parking | diffuser',[1,.92,.73]),printed=mat('Granvia parking | directions',[1,1,1]);mats[light].emissiveFactor=[1,.92,.73];
const c=construction(mats,{flatNormals:true}),prefix='granvia-parking-',P=(x,y,z)=>[x,y,-z],point=(x,y,z)=>({x,y,z}),rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],B=s.lower,U=s.upper,lights=[],faces=[];
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=stone,role='wall')=>{assert(top>bottom&&x1>x0&&z1>z0,id);slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);};
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
const lifts=s.origins.map((origin,i)=>({...subwayLift({id:prefix+['west','east'][i]+'-lift',origin,height:U-B}),yaw:s.yaws[i]}));
for(const [i,l]of lifts.entries()){
 const X=l.origin.x,Z=l.origin.z,side=i===0?1:-1;
 // u points from the car toward the central vestibule for either car.
 const local=(id,a,b,d,e,top,bottom,mi=stone,role='wall')=>{const xs=[X+side*a,X+side*b].sort((a,b)=>a-b);box(['west','east'][i]+'-'+id,xs[0],xs[1],Z+d,Z+e,top,bottom,mi,role);};
 local('back',-1.5,-1.35,-1.75,1.75,8.55,B-.5);
 for(const [a,b,name]of [[-1.75,-1.6,'south'],[1.6,1.75,'north']])local(name,-1.35,1.6,a,b,8.55,B-.5);
 for(const [a,b,name]of [[-1.6,-.7,'south'],[.7,1.6,'north']])local('front-'+name,1.4,1.6,a,b,8.55,B-.5);
 local('front-lower',1.4,1.6,-.7,.7,B-.12,B-.5);
 local('front-middle',1.4,1.6,-.7,.7,U-.12,B+2.2);
 local('front-head',1.4,1.6,-.7,.7,8.55,U+2.2);
 local('pit',-1.35,1.6,-1.6,1.6,B-.35,B-.5,dark,'pit-floor');
 local('roof',-1.5,1.6,-1.75,1.75,8.6,8.55,ceiling,'roof');
 for(const [label,y]of [['parking',B],['lobby',U]]){
  local(label+'-sill',1.185,1.6,-1.6,1.6,y,y-.12,bronze,'lift-sill');
  for(const z of[-.74,.74])local(label+'-jamb-'+z,1.38,1.64,z-.035,z+.035,y+2.25,y,bronze,'lift-frame');
  local(label+'-head',1.38,1.64,-.775,.775,y+2.28,y+2.18,bronze,'lift-frame');
  local(label+'-call',1.60,1.63,.95,1.16,y+1.3,y+.94,bronze,'call-button');
  local(label+'-button',1.63,1.65,1.01,1.1,y+1.17,y+1.06,button,'call-button');
  local(label+'-indicator',1.6,1.64,-.22,.22,y+2.61,y+2.37,button,'indicator');
 }
}
// Two entrances: garage from the north, hotel lobby from the south.
for(const [name,y]of [['parking',B],['lobby',U]]){
 box(name+'-vestibule-floor',37.8,40.6,-5.85,-2.35,y,y-.25,floor,'floor');
 box(name+'-vestibule-ceiling',37.8,40.6,-5.85,-2.35,y+3.05,y+2.95,ceiling,'ceiling');
 box(name+'-light',38.65,39.75,-4.26,-3.94,y+2.95,y+2.91,light,'fixture');c.panels.at(-1).collision=false;
 lights.push({id:prefix+name+'-lamp',position:point(39.2,y+2.85,-4.1),direction:point(0,-1,0),linearColor:{r:1,g:.92,b:.73},intensity:15,range:10,spotAngle:120,innerSpotAngle:80});
}
box('middle-north',37.8,40.6,-2.5,-2.35,8.55,B+2.65);
box('middle-south',37.8,40.6,-5.85,-5.7,U-.25,B);
box('upper-south-head',37.8,40.6,-5.85,-5.7,8.55,U+2.65);
// The garage's retained east wall closes against the core at X=40.
// A narrow side extension supports the part of the car beyond that old wall.
box('east-garage-foundation',40,43.7,-5.85,-2.35,B-.5,B-.75,dark,'foundation');
box('parking-portal-header',37.8,40.6,-2.35,-2.15,B+2.95,B+2.63,stone,'header');
for(const x of[37.8,40.48])box('parking-portal-jamb-'+x,x,x+.12,-2.35,-2.15,B+2.63,B,stone,'door-frame');
// Original lettering, guided by the photographed green and burgundy fascia.
for(const [name,x0,x1,z,y,text]of [
 ['parking-sign',37.9,40.5,-2.12,B+2.66,['ホテル入口','HOTEL GRANVIA KYOTO']],
 ['lobby-sign',37.9,40.5,-5.88,U+2.66,['北エレベーター','B3  EAST PARKING']]
]){box(name,x0,x1,z-.01,z+.01,y+.24,y,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+name,x:(x0+x1)/2,z,bottom:y,width:x1-x0,height:.24,text});}
const routes=[];
function pair(label,ps){const points=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14));for(let k=1;k<=n;k++)points.push(point(...['x','y','z'].map(v=>a[v]+(b[v]-a[v])*k/n)));}routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Garage north aisle to hotel lifts',[point(-35.7,B,3.5),point(39.2,B,3.5),point(39.2,B,-4.1)]);
pair('Garage south aisle to hotel lifts',[point(25,B,-14.5),point(33.2,B,-14.5),point(33.2,B,3.5),point(39.2,B,3.5),point(39.2,B,-4.1)]);
pair('Hotel central entrance to parking lifts',[point(31.4,U,3.35),point(33,U,2),point(33,U,-1),point(33.9,U,-1),point(33.9,U,-7),point(39.2,U,-7),point(39.2,U,-4.1)]);
pair('Hotel main lobby to parking lifts',[point(49.5,U,-3.5),point(46,U,-3.5),point(46,U,-7),point(39.2,U,-7),point(39.2,U,-4.1)]);
pair('Hotel east west lobby bypass',[point(49.5,U,-3.5),point(46,U,-3.5),point(46,U,-7),point(33.9,U,-7),point(33.9,U,-1),point(33,U,-1)]);
pair('Porta north aisle past hotel core',[point(28,-8.713582992553711,-1),point(48,-8.713582992553711,-1)]);
for(const p of c.panels){if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===bronze?'steel':'stone';}
const report=await c.save(out,'granvia-parking.glb',{componentPrefix:prefix,sourceCollection:'Granvia north parking lift bank',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect East Parking B3 to the hotel 2F lobby through two opposing north-bank cars and protected vestibules.',geometry:{routes,chromeRoutes:routes.filter(r=>!r.label.endsWith(' return')).map(r=>r.label),blocked:[],spawn:point(35,B,3.5),retiredIds:s.retiredIds,modifiedPanelIds:s.modifiedPanelIds,modifiedFlightIds:[],retiredLights:[]},references:['https://www.mlit.go.jp/common/001264618.pdf','https://jrwest-hotels.jp/granvia-kyoto/floor/','https://kyoto-rys.com/hotel/granvia/parking/'],limits:['The real north bank also serves guest floors; only B3 and 2F are constructed here.','Shaft dimensions and position are fitted to the current station, not surveyed dimensions.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="768"><rect width="2048" height="768" fill="#173b32"/>';
for(const [i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256}) scale(${8/(f.width/f.height)},1)" fill="#efe4c9" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="114" font-size="90">${f.text[0]}</text><text y="210" font-size="58">${f.text[1]}</text></g>`;
svg+='</svg>';const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/granvia-parking-signs.png',png);
const {json:j,bin}=readGLB(await readFile(out+'/granvia-parking.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z),u=flat?.5-side*(v.x-f.x)/f.width:.5,t=((flat?row:2)+1-(v.y-f.bottom)/f.height)/3;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original hotel parking directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/granvia-parking.glb',glb);report.outputs.glbSha256=sha(glb);report.texture={file:'granvia-parking-signs.png',sha256:sha(png),material:mats[printed].name};
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/motion.json',JSON.stringify({lifts,escalators:[]})+'\n');
await writeFile(out+'/views.json',JSON.stringify([['garage-entrance',[36.8,B+1.7,2],[39.2,B+1.4,-4.1]],['lower-west',[40.15,B+1.7,-2.85],[36.4,B+1.4,-4.1]],['hotel-bank',[39.4,U+1.7,-9],[39.2,U+1.4,-4.1]],['hotel-bypass',[47.2,U+1.7,-8],[35,U+1.4,-5.4]],['porta-core',[30,-7,-1],[46,-7,-1]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
