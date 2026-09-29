// Complete the western Porta loop and repair its sealed forecourt stair.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,component]=process.argv.slice(2),out=component,read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw),spec=await read(component+'/spec.json');assert.equal(sha(raw),m.layoutSha256);assert(spec.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)&&!layout.boxes.some(p=>p.id===id)));
const mat=(name,rgb,r=.6,metal=0)=>({name:'Porta connection | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.60,.57,.49],.4),mat('stainless',[.48,.51,.52],.32,.8),{...mat('glass',[.65,.79,.83],.15,.05),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.035,.04,.043]),mat('warm wall',[.64,.61,.52]),mat('ceiling',[.75,.73,.66]),mat('tactile',[.70,.48,.04]),{...mat('diffuser',[1,.94,.80]),emissiveFactor:[1,.94,.80]},mat('shop fitout',[.36,.23,.13]),{...mat('plaza signs',[1,1,1]),name:'Porta west | printed signs'}, {...mat('stone bands',[.26,.22,.18],.45),name:'Porta plaza | stone bands'}];

const prefix='porta-west-',c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],Y=spec.floor,C=spec.ceiling,st=spec.stair;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const a=st.start+st.firstSteps*st.going,b=a+st.landing,end=b+(st.steps-st.firstSteps)*st.going,rise=(st.top-st.bottom)/st.steps,mid=st.top-st.firstSteps*rise;
const well=rect(-37.1,-30.9,25.2,end+.05),outer=rect(-46,12,25.2,61);
slab('deck',outer,Y,.25);slab('ceiling',[[-46,25.2],[-37.1,25.2],[-37.1,end+.05],[-30.9,end+.05],[-30.9,25.2],[12,25.2],[12,61],[-46,61]],C+.18,.18,5,'ceiling');
box('west-wall',-46.08,-45.92,25.2,61,C,Y);box('north-wall',-46,12,60.92,61.08,C,Y);
for(const[x0,x1]of[[-46,-37.1],[-30.9,12]])box('south-wall-'+x0,x0,x1,25.12,25.28,C,Y);
// Preserve the ground opening; descend to the actual mall datum, in two flights.
for(let i=0;i<st.steps;i++){
 const z=st.start+i*st.going+(i>=st.firstSteps?st.landing:0),y=st.top-(i+1)*rise;
 box('stair-step-'+i,-36.9,-31.1,z,z+st.going,y,Y-.25,0,'stair-tread');
 box('stair-nosing-'+i,-36.78,-31.22,z+.008,z+.043,y+.003,y+.0005,10,'stair-nosing');c.panels.at(-1).collision=false;
}
box('stair-mid-landing',-36.9,-31.1,a,b,mid,Y-.25,0,'stair-landing');
for(const x of[-37.025,-30.975])box('well-side-'+x,x-.075,x+.075,20,end,1,Y-.25,4,'stair-wall');
function rail(id,z0,z1,y0,y1){for(const x of[-36.6,-31.4]){beam(id+'-handrail-'+x,[x,y0+1,z0],[x,y1+1,z1],.05,.05);const n=Math.ceil((z1-z0)/1.4);for(let i=0;i<=n;i++){const t=i/n,z=z0+(z1-z0)*t,y=y0+(y1-y0)*t;beam(id+'-bracket-'+x+'-'+i,[x,y+.84,z],[x+(x<-34?-.32:.32),y+.84,z],.035,.035);}}}
rail('upper-flight',20,a,0,mid);rail('middle-landing',a,b,mid,mid);rail('lower-flight',b,end,mid,Y);
function shop(id,a,b,d,e,face){
 const z=face>0?e:d,back=face>0?d:e,mid=(a+b)/2;
 box(id+'-back',a,b,back-.06,back+.06,C,Y);
 for(const x of[a,b].filter(x=>!(x===12&&d===55)))box(id+'-side-'+x,x-.06,x+.06,d,e,C,Y);
 for(const[x0,x1,side]of[[a,mid-1.1,'left'],[mid+1.1,b,'right']]){
  box(id+'-glass-'+side,x0,x1,z-.018,z+.018,Y+2.7,Y+.12,2,'shop-glazing');
  box(id+'-sill-'+side,x0,x1,z-.075,z+.075,Y+.12,Y,1,'shop-sill');
 }
 box(id+'-fascia',a,b,z-.12,z+.12,C,Y+2.7,4,'shop-fascia');
 for(const x of[a,mid-1.1,mid+1.1,b])box(id+'-post-'+x,x-.045,x+.045,z-.075,z+.075,Y+2.7,Y,1,'shop-portal');
 for(const x of[a+1.8,b-1.8]){box(id+'-display-'+x,x-.65,x+.65,(d+e)/2-.45,(d+e)/2+.45,Y+.75,Y,8,'display');box(id+'-display-top-'+x,x-.68,x+.68,(d+e)/2-.48,(d+e)/2+.48,Y+.8,Y+.75,0,'display-top');}
 beam(id+'-front-light',[a+.4,C-.12,z+face*.17],[b-.4,C-.12,z+face*.17],.09,.06,7,'shop-light');
}

for(const[a,b]of[[-36,-24],[-24,-12],[-12,0],[0,12]])shop('north-shop-'+a,a,b,55,60.92,-1);
for(const[a,b]of[[-28,-14],[-14,0],[0,12]])shop('south-shop-'+a,a,b,25.28,31,1);
for(const[a,b]of[[-34,-22],[-22,-10],[-10,2],[2,12]]){shop('island-south-'+a,a,b,39,44,-1);shop('island-north-'+a,a,b,44,49,1);}
function inlay(id,a,b,d,e,mi=10){box(id,a,b,d,e,Y+(mi===6?.007:.003),Y+.0005,mi,'floor-inlay');c.panels.at(-1).collision=false;}
for(const[z0,z1]of[[33.8,38.7],[49.3,54.7]]){
 for(let x=-44;x<12;x+=4)inlay('band-'+z0+'-'+x,x,x+.5,z0,z1);
 for(let x=-44;x<12;x+=2)inlay('joint-'+z0+'-'+x,x-.006,x+.006,z0,z1,3);
 for(let z=z0+1.7;z<z1;z+=2)inlay('joint-z-'+z,-45.8,11.9,z-.006,z+.006,3);
}
inlay('south-guide',-40,18,34.8,35.2,6);inlay('west-guide',-40.2,-39.8,35,52.2,6);inlay('north-guide',-40,12,51.8,52.2,6);
inlay('stair-warning',-36.6,-31.4,end+.22,end+.62,6);
for(const z of[35.8,52])for(let x=-43;x<10;x+=8){box('ceiling-recess-'+x+'-'+z,x,x+5,z-.9,z+.9,C-.005,C-.035,3,'ceiling-recess');for(let a=x+.3;a<x+5;a+=.5)box('grille-'+a+'-'+z,a-.012,a+.012,z-.9,z+.9,C-.035,C-.06,1,'ceiling-grille');box('ceiling-rib-'+x+'-'+z,x+5.5,x+5.65,z-2.5,z+2.5,C,C-.15,5,'ceiling-rib');}
const lights=[];for(const z of[35.8,52])for(const x of[-40,-25,-10,5]){box('fixture-'+x+'-'+z,x-1.4,x+1.4,z-.06,z+.06,C-.08,C-.11,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+x+'-'+z,position:{x,y:C-.19,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:12,spotAngle:120,innerSpotAngle:78});}
const faces=[];function sign(id,axis,pos,center,w,h,y,side,row,back=5){if(axis==='z')box(id,center-w/2,center+w/2,pos-.025,pos+.025,y+h,y,9,'sign');else box(id,pos-.025,pos+.025,center-w/2,center+w/2,y+h,y,9,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,axis,pos,center,w,h,y,side,row,back});}

sign('north-street-sign','x',-8,52,5,.5,Y+2.55,1,0,1);
sign('south-street-sign','x',-8,35.8,5,.5,Y+2.55,-1,2,4);
sign('forecourt-sign','z',end+.25,-34,5.5,.5,Y+2.55,1,3,4);
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Forecourt stair to South Street',[point(-34,0,18),point(-34,0,20),point(-34,mid,a),point(-34,mid,b),point(-34,Y,end),point(-34,Y,35.8),point(-8,Y,35.8),point(18,Y,35.8)]);
pair('North Street western extension',[point(18,Y,52),point(-8,Y,52),point(-40,Y,52)]);
pair('Western street loop',[point(-40,Y,52),point(-40,Y,35.8),point(-8,Y,35.8),point(18,Y,35.8)]);
pair('Western north shop entrance',[point(-30,Y,52),point(-30,Y,58)]);
pair('Western island shop entrance',[point(-28,Y,35.8),point(-28,Y,42)]);
pair('Retained west lift approach',[point(22,Y,42),point(18,Y,42),point(18,Y,35.8),point(-8,Y,35.8)]);
pair('Retained B2 stair approach',[point(18,Y,35.8),point(18,Y,30),point(18,-8.713582992553711,25.2),point(18,-8.713582992553711,22)]);
for(const r of routes)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],distance=Math.hypot(b.x-a.x,b.z-a.z);if(distance>29){const n=Math.ceil(distance/26);r.points.splice(i,0,...Array.from({length:n-1},(_,k)=>point(a.x+(b.x-a.x)*(k+1)/n,a.y+(b.y-a.y)*(k+1)/n,a.z+(b.z-a.z)*(k+1)/n)));i+=n-1;}}
const blocked=[{label:'Forecourt west stair guard',start:point(-38.5,0,24),yaw:90,axis:'x',limit:-37.2,sign:-1},{label:'Forecourt east stair guard',start:point(-29.5,0,24),yaw:-90,axis:'x',limit:-30.8,sign:1}];
const report=await c.save(out,'porta-west.glb',{componentPrefix:prefix,sourceCollection:'Porta western loop and forecourt stair',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Replace the sealed western forecourt stair room with a complete descent and connect both Porta shopping streets through the missing western wing.',geometry:{floor:Y,ceiling:C,stair:{...st,mid,firstEnd:a,secondStart:b,end,rise},outer,ceilingOpening:well,routes,blocked,spawn:point(-34,0,18),retiredIds:spec.retiredIds,retiredBoxIds:spec.retiredBoxIds,retiredRouteIds:spec.retiredRouteIds,retiredLabelIds:spec.retiredLabelIds,retiredLights:[]},references:['research/kyoto-station/maps/porta-shopguide-2026.pdf','research/kyoto-station/maps/floor-b1.svg','https://www.porta.co.jp/navigation'],limits:['Plan connectivity guides the western loop; dimensions, shop partitions and finishes are fitted approximations.','The retained forecourt entry is registered to the existing model, without claiming an exact numbered street exit. Its 35 risers and intermediate landing are fitted to the current mall datum.','Further street exits and the Isetan interior connections remain unfinished.']});
const labels=[['北通り・ダイニング','North Street / Dining'],['ポルタ 西エリア','Porta / West Area'],['南通り・地下鉄 →','South Street / Subway →'],['京都駅前広場','Station Forecourt'],['ポルタ 西エリア','Porta / West Area'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1536"><rect width="2048" height="1536" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans, sans-serif"><g transform="translate(1024,0) scale(${sx},1)" fill="#fffbea"><text y="115" text-anchor="middle" font-size="72">${jp}</text><text y="190" text-anchor="middle" font-size="46">${en}</text></g></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/porta-west-signs.png',png);await writeFile(out+'/porta-west-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/porta-west.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===9)){const f=faces.find(f=>f.id===p.id);assert(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-7),side=Math.sign(v[f.axis]-f.pos),row=flat?(side===f.side?f.row:f.back):5;const u=row===5?.5:.5+(f.axis==='z'?-side:side)*(v[f.axis==='z'?'x':'z']-f.center)/f.w,t=(row*256+256*(1-(v.y-f.y)/f.h))/1536;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[9].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Porta west-route labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[9].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/porta-west.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'porta-west-signs.png',sha256:sha(png),material:mats[9].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
