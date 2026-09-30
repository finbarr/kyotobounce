// Open the northern seventh-floor stair entrance and extend its existing lift.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {multiStopLift} from './multi-stop-lift-spec.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(out+'/spec.json');assert.equal(s.parentLayoutSha256,m.layoutSha256);
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}})),index=id=>{const i=s.materials.findIndex(m=>m.id===id);assert(i>=0);return i;};
function mat(name,rgb,r=.6,metal=0){mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});return mats.length-1;}
const wall=mat('Isetan seventh | warm wall',[.65,.61,.53]),steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),button=mat('Subway lift | button',[.1,.22,.45]),light=mat('Isetan seventh north | diffuser',[1,.94,.8]),printed=mat('Isetan seventh north | directions',[1,1,1]);mats[light].emissiveFactor=[1,.94,.8];
const c=construction(mats,{flatNormals:true}),prefix=s.componentPrefix,P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],X=s.origin.x,Z=s.origin.z,F=s.floor,G=s.lowerFloor,C=s.ceiling,T=F+3.1;
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=wall,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=wall,role='wall')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1));slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,index(p.appearance),p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
const floorMaterial=index(s.slabs[0].appearance),ceilingMaterial=index(s.slabs[1].appearance),infill=s.infill.coordinates.map(r=>r.slice(0,-1));slab('entrance-floor',infill[0],F,.322,floorMaterial,'floor',infill.slice(1));
const [a,b]=s.portal;slab('entrance-ceiling',[a,b,[b[0],21],[a[0],21]],C,.2,ceilingMaterial,'ceiling');
for(const [id,p]of [['west',a],['east',b]])beam('entrance-side-'+id,[p[0],(F+C)/2,p[1]],[p[0],(F+C)/2,21],.16,C-F);
// Replace the former solid hall edge with a full-height doorway and lintel.
box('hall-return-west',-112,a[0],20.92,21.08,C,F);box('hall-return-east',b[0],-92,20.92,21.08,C,F);box('hall-door-head',a[0],b[0],20.92,21.08,C,F+2.8);
beam('entry-lintel',[a[0],(F+2.8+C)/2,a[1]],[b[0],(F+2.8+C)/2,b[1]],.16,C-F-2.8);
for(const [id,p]of [['west',a],['east',b]])beam('entry-jamb-'+id,[p[0],F,p[1]],[p[0],F+2.83,p[1]],.055,.055,steel,'door-frame');
beam('entry-frame-head',[a[0],F+2.8,a[1]],[b[0],F+2.8,b[1]],.06,.06,steel,'door-frame');
// Continue the five enclosing shaft faces from the former cap datum.
box('shaft-back',X-1.75,X+1.75,Z+1.35,Z+1.5,T,s.oldTop);
for(const [a,b,id]of [[X-1.75,X-1.6,'west'],[X+1.6,X+1.75,'east']])box('shaft-'+id,a,b,Z-1.6,Z+1.35,T,s.oldTop);
for(const [a,b,id]of [[X-1.75,X-.7,'west'],[X+.7,X+1.75,'east']])box('shaft-front-'+id,a,b,Z-1.6,Z-1.4,T,s.oldTop);
box('front-infill',X-.7,X+.7,Z-1.6,Z-1.4,F-.12,G+2.2);box('front-head',X-.7,X+.7,Z-1.6,Z-1.4,T,F+2.2);box('core-roof',X-1.75,X+1.75,Z-1.6,Z+1.5,T+.15,T,wall,'roof');
box('sill',X-1.6,X+1.6,Z-1.6,Z-1.185,F,F-.12,steel,'lift-sill');
for(const x of[X-.74,X+.74])box('jamb-'+x,x-.035,x+.035,Z-1.64,Z-1.38,F+2.25,F,steel,'lift-frame');
box('lift-head',X-.775,X+.775,Z-1.64,Z-1.38,F+2.28,F+2.18,steel,'lift-frame');
box('call-plate',X+1,X+1.18,Z-1.63,Z-1.6,F+1.27,F+.95,steel,'call-button');box('call-button',X+1.045,X+1.135,Z-1.65,Z-1.63,F+1.17,F+1.06,button,'call-button');box('indicator',X-.22,X+.22,Z-1.64,Z-1.6,F+2.63,F+2.37,button,'indicator');
const faces=[],lights=[];
function sign(id,x,z,y,w,text){box(id,x-w/2,x+w/2,z-.01,z+.01,y+.25,y,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,x,z,y,w,text});}
sign('floor-label',X,Z-1.66,F+2.66,2.7,['7F 北エレベーター','North lift · B3–7F']);sign('entrance-direction',-107.75,21.10,F+2.9,2.4,['大階段・北側階段','Grand Stairway / North stairs']);
for(const [id,x,z,h]of [['entry',-107.75,17,C-.25],['lift',X,26.5,C-.25]]){box('fixture-'+id,x-.5,x+.5,z-.1,z+.1,h+.04,h,light,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+id,position:{x,y:h-.06,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:9,spotAngle:120,innerSpotAngle:80});}
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14));for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('Seventh northern entrance',[point(-107.75,F,12.8),point(-107.75,F,17),point(-107.75,F,23),point(X,F,27.2)]);
pair('Seventh hall to north lift',[point(-110,F,-23),point(-121.8,F,-23),point(-121.8,F,15.75),point(-115,F,15.75),point(-115,F,26.5),point(X,F,26.5),point(X,F,27.2)]);
pair('Seventh north hall bypass',[point(-115,F,33),point(-99,F,33),point(-99,F,26.5),point(-93,F,26.5),point(-93,F,33)]);
pair('Sixth retained lift landing',[point(-105,G,26.5),point(X,G,26.5),point(X,G,27.2)]);
const parent=await read(m.layout),flights=['north-side-flight-05','north-side-flight-06'].map(id=>parent.flights.find(f=>f.id===id)),points=flights.flatMap(f=>f.contours.map((row,i)=>{const p=row.points[(row.points.length-1)/2];return point(p.x,f.baseElevation+i*f.rise,p.y);}));
const [first,second]=points,d=Math.hypot(second.x-first.x,second.z-first.z);points.unshift(point(first.x-(second.x-first.x)/d*.7,first.y,first.z-(second.z-first.z)/d*.7));const last=points.at(-1),before=points.at(-2),length=Math.hypot(last.x-before.x,last.z-before.z);points.push(point(last.x+(last.x-before.x)/length*.7,F,last.z+(last.z-before.z)/length*.7),point(-107.75,F,12.8),point(-107.75,F,17),point(-107.75,F,23));pair('Sixth to seventh northern stairs',points);
const chromeRoutes=['Seventh northern entrance','Seventh hall to north lift','Seventh north hall bypass','Sixth retained lift landing','Sixth to seventh northern stairs','Sixth to seventh northern stairs return'];
const report=await c.save(out,'isetan-seventh-north.glb',{componentPrefix:prefix,sourceCollection:'Isetan seventh northern entrance and lift',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the northern seventh-floor stair landing to the store hall and extend the existing north lift from B3–6F to B3–7F.',geometry:{routes,chromeRoutes,headroomStairs:[],headroomRoutes:routes.slice(0,8).map(r=>r.label),generatedStairs:flights.map(f=>f.id),blocked:[],spawn:point(X,F,26.5),retiredIds:s.retiredIds,retiredLights:[],retiredLiftIds:s.retiredLiftIds,modifiedPanelIds:Object.keys(s.cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],floor:F,lowerFloor:G},references:['https://www.kyoto-station-building.co.jp/floorguide/7f/?tenant=isetan','https://www.mistore.jp/store/kyoto/shops/floor7.html'],limits:['The official plan establishes the northern public entrance and lift banks; the fitted passage and individual car coordinates are approximate.','This car serves B3–7F. Further cars, floors 8F–11F and tenant interiors remain unfinished.']});
const native=await read(out+'/native-panels.json');for(const p of native.panels)if(!p.id.includes('-rebuilt-'))p.material=p.browserMaterial===steel?'steel':'stone';native.authoredLights=lights;
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="768"><rect width="2048" height="768" fill="#f0eee4"/>';
for(const [i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256}) scale(${8/(f.w/.25)},1)" fill="#163047" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="115" font-size="88">${f.text[0]}</text><text y="212" font-size="58">${f.text[1]}</text></g>`;svg+='</svg>';const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/signs.png',png);
const {json:j,bin}=readGLB(await readFile(out+'/isetan-seventh-north.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
// Keep the world-aligned tile coordinates on both rebuilt and new floor faces.
for(const [i,material]of s.materials.entries())if(material.albedo){
 const coords=[];for(const p of native.panels.filter(p=>p.browserMaterial===i))p.uv=p.vertices.map(v=>{const q={x:Math.fround(v.x/2.4),y:1-Math.fround(1-v.z/2.4)};coords.push(q.x,1-q.y);return q;});
 const prim=j.meshes[i].primitives[0];assert.equal(coords.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(coords).buffer)),componentType:5126,count:coords.length/2,type:'VEC2'});
}
const uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z),u=flat?.5-side*(v.x-f.x)/f.w:.5,t=((flat?row:2)+1-(v.y-f.y)/.25)/3;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original seventh-floor north directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
const glb=writeGLB(j,Buffer.concat(parts)),raw=JSON.stringify(native)+'\n';await writeFile(out+'/isetan-seventh-north.glb',glb);await writeFile(out+'/native-panels.json',raw);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/lift-spec.json',JSON.stringify(multiStopLift({id:s.oldLift.id,origin:s.origin,yaw:s.oldLift.yaw,stops:[...s.oldLift.stops,{id:'7',label:'7F · Isetan / North stairs',height:F-s.origin.y}]}))+'\n');
await writeFile(out+'/views.json',JSON.stringify([['north-entrance',[-107.75,F+1.65,12.8],[-107.75,F+1.65,22]],['seventh-lift',[-99,F+1.7,25],[X,F+1.6,Z]],['hall-return',[-107.75,F+1.65,23],[-107.75,F+1.65,12.8]],['sixth-retained',[-99,G+1.7,25],[X,G+1.6,Z]]],null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
