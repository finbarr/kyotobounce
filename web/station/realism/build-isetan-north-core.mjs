// Correct the north lift position and connect every constructed store floor.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {multiStopLift} from './multi-stop-lift-spec.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(out+'/spec.json');assert.equal(s.parentLayoutSha256,m.layoutSha256);
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const index=id=>{const i=s.materials.findIndex(m=>m.id===id);assert(i>=0);return i;};
function mat(name,rgb,roughness=.6,metallic=0){mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});return mats.length-1;}
const stone=mat('Isetan north core | warm wall',[.64,.61,.53]),floor=mat('Isetan north core | terrazzo',[.54,.52,.46],.45),ceiling=mat('Isetan north core | ceiling',[.75,.74,.68]),steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),dark=mat('Subway lift | dark floor',[.11,.12,.12]),button=mat('Subway lift | button',[.1,.22,.45]),light=mat('Isetan north core | diffuser',[1,.94,.8]),printed=mat('Isetan north core | floor directions',[1,1,1]);mats[light].emissiveFactor=[1,.94,.8];
const c=construction(mats,{flatNormals:true}),prefix=s.componentPrefix,P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],X=s.origin.x,Z=s.origin.z,L=s.levels,H=s.ceilings,U=L.at(-1),coreTop=U+3.1,hole=s.opening.coordinates[0].slice(0,-1);
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=stone,role='wall')=>{assert(x1>x0&&z1>z0&&top>bottom,id);slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);};
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1));slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,index(p.appearance),p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
for(const f of s.fills)for(const [i,q]of f.shapes.entries()){const rings=q.coordinates.map(r=>r.slice(0,-1));slab(f.kind+'-extension-'+f.floor+'-'+i,rings[0],f.y,f.depth,f.kind==='floor'?floor:ceiling,f.kind,rings.slice(1));}
// Enclose only the extension beyond each former room boundary. The cuts in
// those old walls provide full-width connections back into the existing halls.
for(let i=0;i<6;i++){
 const start=i===0?14.6:i<3?25:16;
 box('hall-west-'+i,-100.16,-100,start,34.16,H[i],L[i]);box('hall-east-'+i,-86,-85.84,start,34.16,H[i],L[i]);box('hall-north-'+i,-100,-86,34,34.16,H[i],L[i]);
 if(i===0)box('parking-south-return',-100,-92.7,14.24,14.4,H[i],L[i]);
}
// One continuous, enclosed shaft, with only the eight passenger doorways open.
box('shaft-back',X-1.75,X+1.75,Z+1.35,Z+1.5,coreTop,L[0]-.5);
for(const [a,b,id]of [[X-1.75,X-1.6,'west'],[X+1.6,X+1.75,'east']])box('shaft-'+id,a,b,Z-1.6,Z+1.35,coreTop,L[0]-.5);
for(const [a,b,id]of [[X-1.75,X-.7,'west'],[X+.7,X+1.75,'east']])box('shaft-front-'+id,a,b,Z-1.6,Z-1.4,coreTop,L[0]-.5);
let bottom=L[0]-.5;for(const [i,y]of L.entries()){box('front-infill-'+i,X-.7,X+.7,Z-1.6,Z-1.4,y-.12,bottom);bottom=y+2.2;}box('front-head',X-.7,X+.7,Z-1.6,Z-1.4,coreTop,bottom);
box('pit',X-1.6,X+1.6,Z-1.6,Z+1.35,L[0]-.35,L[0]-.5,dark);box('core-roof',X-1.75,X+1.75,Z-1.6,Z+1.5,coreTop+.15,coreTop,stone,'roof');
const names=[['b3','B3 · Parking'],['b2','B2 · Isetan food hall'],['b1','B1 · Isetan food hall'],['1','1F · Isetan entrance'],['2','2F · Isetan / public passage'],['3','3F · Isetan'],['4','4F · Isetan / Muromachi Square'],['5','5F · Isetan / Grand Stairway']],faces=[],lights=[];
for(const [i,y]of L.entries()){
 box('sill-'+i,X-1.6,X+1.6,Z-1.6,Z-1.185,y,y-.12,steel,'lift-sill');
 for(const x of[X-.74,X+.74])box('jamb-'+i+'-'+x,x-.035,x+.035,Z-1.64,Z-1.38,y+2.25,y,steel,'lift-frame');
 box('door-head-'+i,X-.775,X+.775,Z-1.64,Z-1.38,y+2.28,y+2.18,steel,'lift-frame');
 box('call-plate-'+i,X+1,X+1.18,Z-1.63,Z-1.6,y+1.27,y+.95,steel,'call-button');box('call-button-'+i,X+1.045,X+1.135,Z-1.65,Z-1.63,y+1.17,y+1.06,button,'call-button');box('indicator-'+i,X-.22,X+.22,Z-1.64,Z-1.6,y+2.63,y+2.37,button,'indicator');
 const label=names[i][0].startsWith('b')?names[i][0].toUpperCase():names[i][0]+'F';
 box('floor-label-'+i,X-1.35,X+1.35,Z-1.67,Z-1.65,y+2.91,y+2.66,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+'floor-label-'+i,x:X,z:Z-1.66,bottom:y+2.66,width:2.7,height:.25,text:[label+' 北エレベーター',names[i][1]]});
 for(const z of (i<6?[21,26.5]:[26.5])){
  const h=H[i]-.27;box('fixture-'+i+'-'+z,X-.65,X+.65,z-.12,z+.12,h+.04,h,light,'fixture');c.panels.at(-1).collision=false;
  lights.push({id:prefix+'lamp-'+i+'-'+z,position:{x:X,y:h-.06,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:10,spotAngle:120,innerSpotAngle:80});
 }
}
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14));for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
for(let i=0;i<8;i++){
 const y=L[i],start=i===0?[point(-87.7,y,12),point(-88.5,y,18),point(X,y,23)]:i<3?[point(-87.7,y,18),point(X,y,18),point(X,y,23)]:i===7?[point(-105,y,-10.5),point(-105,y,28),point(-100,y,28),point(-100,y,26.5),point(X,y,26.5)]:i===6?[point(X,y,-10.5),point(X,y,26.5)]:[point(-95,y,11),point(X,y,18),point(X,y,23)];
 pair(names[i][0].toUpperCase()+' north lift approach',[...start,point(X,y,Z-2.8)]);
}
// Walk the old car footprint after its floor openings have been restored.
for(let i=0;i<5;i++)pair(names[i][0].toUpperCase()+' former shaft floor',[point(-87.7,L[i],12),point(i===0?-92.2:-95,L[i],12)]);
const report=await c.save(out,'isetan-north-core.glb',{componentPrefix:prefix,sourceCollection:'Isetan north lift correction',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Move the north lift clear of the Grand Stairway, connect B3 through 5F and close its former shaft openings.',geometry:{routes,chromeRoutes:routes.filter(r=>!r.label.endsWith(' return')&&r.label.endsWith('approach')).map(r=>r.label),headroomStairs:[],headroomRoutes:routes.map(r=>r.label),generatedStairs:[],blocked:[],spawn:point(X,L[0],Z-2.8),retiredIds:s.retiredIds,retiredLights:s.retiredLights,retiredLiftIds:s.retiredLiftIds,modifiedPanelIds:Object.keys(s.cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],levels:L,origin:s.origin,yaw:s.yaw},references:['https://www.kyoto-station-building.co.jp/floorguide/5f/?tenant=isetan','https://www.mistore.jp/store/kyoto/shops/floor5.html','https://kyoto-rys.com/facility/elevator/'],limits:['The operator plans establish the northern bank and connected aisles; coordinates, hall extensions, floor datums and finishes remain fitted approximations.','This car serves the eight constructed levels. Further cars and floors 6F–11F remain unfinished.']});
const native=await read(out+'/native-panels.json');for(const p of native.panels)if(!p.id.includes('-rebuilt-'))p.material=[steel].includes(p.browserMaterial)?'steel':'stone';native.authoredLights=lights;
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2304"><rect width="2048" height="2304" fill="#f0eee4"/>';
for(const [i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256}) scale(${8/(f.width/f.height)},1)" fill="#163047" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="115" font-size="88">${f.text[0]}</text><text y="212" font-size="58">${f.text[1]}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-north-core-signs.png',png);const {json:j,bin}=readGLB(await readFile(out+'/isetan-north-core.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z),u=flat?.5-side*(v.x-f.x)/f.width:.5,t=((flat?row:8)+1-(v.y-f.bottom)/f.height)/9;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan north lift floor directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
const glb=writeGLB(j,Buffer.concat(parts)),raw=JSON.stringify(native)+'\n';await writeFile(out+'/isetan-north-core.glb',glb);await writeFile(out+'/native-panels.json',raw);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'isetan-north-core-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/lift-spec.json',JSON.stringify(multiStopLift({id:'isetan-north-lift',origin:s.origin,yaw:s.yaw,stops:names.map(([id,label],i)=>({id,label,height:L[i]-L[0]}))}))+'\n');
await writeFile(out+'/views.json',JSON.stringify([['parking-hall',[-89,L[0]+1.7,18],[X,L[0]+1.7,28]],['food-hall',[-96,L[2]+1.7,20],[X,L[2]+1.6,30]],['second-north',[-96,L[4]+1.7,17],[X,L[4]+1.6,30]],['third-landing',[-96,L[5]+1.6,26],[X,L[5]+1.3,30]],['fourth-landing',[-101,L[6]+1.6,27],[X,L[6]+1.3,30]],['fifth-landing',[-100,L[7]+1.6,26.5],[X,L[7]+1.3,30]]],null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
