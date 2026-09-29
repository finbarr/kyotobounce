// Open the station's sealed basement ends into connected Isetan food halls.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),spec=await read(out+'/spec.json'),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(spec.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,rgb,r=.6,metal=0)=>({name:'Isetan basement | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('terrazzo',[.53,.51,.46],.45),mat('stainless',[.48,.51,.52],.32,.8),{...mat('display glazing',[.65,.79,.83],.15,.05),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.18],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.035,.04,.043]),mat('warm wall',[.64,.61,.52]),mat('ceiling',[.75,.73,.66]),mat('tactile',[.7,.48,.04]),{...mat('diffuser',[1,.94,.8]),emissiveFactor:[1,.94,.8]},mat('counter timber',[.25,.16,.09]),mat('printed signs',[1,1,1]),mat('stone bands',[.27,.25,.21],.45)];
const prefix='isetan-basement-',c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],B1=spec.b1,B2=spec.b2;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const well=rect(-83.3,-77.8,8.2,14.2),lights=[],faces=[];
function sign(id,x,z,y,w,row,back){box(id,x-.025,x+.025,z-w/2,z+w/2,y+.5,y,9,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,axis:'x',pos:x,center:z,w,h:.5,y,side:1,row,back});}
function counter(id,a,b,d,e,Y){box(id+'-plinth',a-.02,b+.02,d-.02,e+.02,Y+.12,Y,3,'counter-plinth');box(id+'-base',a,b,d,e,Y+.82,Y,8,'counter');box(id+'-top',a-.04,b+.04,d-.04,e+.04,Y+.88,Y+.82,0,'counter-top');for(const z of[d,e]){box(id+'-glass-'+z,a,b,z-.014,z+.014,Y+1.22,Y+.88,2,'display-glazing');beam(id+'-trim-'+z,[a,Y+1.24,z],[b,Y+1.24,z],.035,.035);}}
for(const [level,Y,C]of[['b1',B1,-1.55],['b2',B2,B1-.4]]){
 slab(level+'-floor',rect(-123,-43,-14,25),Y,.22,0,'floor',level==='b1'?[well]:[]);
 slab(level+'-ceiling',rect(-123,-43,-14,25),C+.18,.18,5,'ceiling',level==='b2'?[well]:[]);
 box(level+'-west',-123.18,-123,-14,25,C,Y);
 for(const z of[-14,25])box(level+'-end-'+z,-123,-43,z-.09,z+.09,C,Y);
 const gaps=level==='b1'?[[1,6]]:[[-.5,4.5],[15.5,20.5]];let last=-14;
 for(const [i,[a,b]]of gaps.entries()){
  box(level+'-east-'+i,-43.2,-43,last,a,C,Y);box(level+'-header-'+i,-43.2,-43,a,b,C,Y+2.8);
  for(const z of[a,b])box(level+'-jamb-'+i+'-'+z,-43.26,-42.97,z-.04,z+.04,Y+2.8,Y,1,'portal');
  sign(level+'-entry-'+i,-43,(a+b)/2,Y+2.85,b-a,level==='b1'?0:2,level==='b1'?1:3);
  // Flush dark stone thresholds preserve the step-free entrances.
  box(level+'-threshold-'+i,-44.1,-42.7,a,b,Y+.003,Y+.001,10,'floor-inlay');c.panels.at(-1).collision=false;last=b;
 }
 box(level+'-east-last',-43.2,-43,last,25,C,Y);
 // Low counter islands keep the main, northern and end cross-aisles open.
 for(const [i,[a,b]]of[[-116,-106],[-102,-92],[-88,-78],[-74,-64],[-60,-50]].entries())counter(level+'-south-island-'+i,a,b,-10.5,-5,Y);
 for(const [i,[a,b]]of[[-116,-105],[-101,-91],[-73,-63],[-59,-49]].entries())counter(level+'-north-island-'+i,a,b,7,12,Y);
 for(const [i,[a,b]]of[[-116,-104],[-100,-88],[-84,-72],[-68,-56],[-53,-46]].entries())counter(level+'-north-wall-counter-'+i,a,b,22,24.7,Y);
 for(const x of[-118,-104,-90,-75,-61,-47])for(const z of[0,18]){
  box(level+'-fixture-'+x+'-'+z,x-1.3,x+1.3,z-.065,z+.065,C-.05,C-.095,7,'fixture');c.panels.at(-1).collision=false;
  lights.push({id:prefix+level+'-light-'+x+'-'+z,position:{x,y:C-.16,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:10,range:13,spotAngle:120,innerSpotAngle:80});
 }
 for(let x=-120;x<-44;x+=4){for(const z of[-2,3,16,20]){box(level+'-joint-'+x+'-'+z,x-.008,x+.008,z,z+1.8,Y+.003,Y+.001,10,'floor-inlay');c.panels.at(-1).collision=false;}box(level+'-ceiling-joint-'+x,x-.012,x+.012,-13.8,24.8,C,C-.025,1,'ceiling-joint');c.panels.at(-1).collision=false;}
 sign(level+'-west-direction',-116,0,Y+2.55,4,level==='b1'?4:5,level==='b1'?0:2);
}
// Extend B2's receiving hall northwards so both Porta aisles reach the store.
slab('b2-foyer-floor',rect(-43,-24,6.5,25),B2,.22);slab('b2-foyer-ceiling',rect(-43,-24,6.5,25),B1-.22,.18,5,'ceiling');
box('b2-foyer-north',-43,-24,24.9,25.1,B1-.4,B2);
for(const[a,b,id]of[[4,15.5,'south'],[20.5,25,'north']])box('b2-porta-retained-wall-'+id,-24.1,-23.9,a,b,B1-.4,B2);
box('b2-porta-north-header',-24.1,-23.9,15.5,20.5,B1-.4,B2+2.8);
for(const x of[-37,-29]){box('foyer-fixture-'+x,x-.7,x+.7,17.94,18.06,B1-.45,B1-.5,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'foyer-light-'+x,position:{x,y:B1-.58,z:18},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:10,range:12,spotAngle:120,innerSpotAngle:80});}
// One internal stair core is connected at both floors; no speculative upper flights.
const rise=(B1-B2)/22,mid=(B1+B2)/2;
for(let i=0;i<11;i++){
 box('lower-step-'+i,-78-(i+1)*.3,-78-i*.3,8.35,11.05,B2+(i+1)*rise,B2-.22,0,'stair-tread');
 box('upper-step-'+i,-81.3+i*.3,-81.3+(i+1)*.3,11.35,14.05,mid+(i+1)*rise,B2-.22,0,'stair-tread');
}
box('stair-landing',-83.15,-81.3,8.35,14.05,mid,B2-.22,0,'stair-landing');box('stair-upper-threshold',-78,-77.8,11.35,14.05,B1,B1-.22,0,'stair-landing');
box('stair-west-wall',-83.3,-83.15,8.2,14.2,B1+1.1,B2,4,'well-guard');
for(const z of[8.275,14.125])box('stair-side-'+z,-83.15,-77.8,z-.075,z+.075,B1+1.1,B2,4,'well-guard');
box('stair-divider',-81.3,-77.8,11.05,11.35,B1+1.1,B2,4,'well-guard');
box('stair-lower-opening-guard',-77.95,-77.8,8.2,11.35,B1+1.1,B1-.22,4,'well-guard');
beam('lower-handrail',[-78,B2+1,8.55],[-81.3,mid+1,8.55],.05,.05);beam('upper-handrail',[-81.3,mid+1,13.85],[-78,B1+1,13.85],.05,.05);
for(const [label,Y,z,row]of[['lower',B2,9.7,6],['upper',B1,12.7,7]]){sign('stair-'+label+'-sign',-77.1,z,Y+2.25,2.2,row,row);box('stair-'+label+'-warning',-77.55,-77.15,z-1,z+1,Y+.006,Y+.001,6,'tactile');c.panels.at(-1).collision=false;}
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];
function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/24);for(let j=1;j<=n;j++)split.push(point(...['x','y','z'].map(k=>a[k]+(b[k]-a[k])*j/n)));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
pair('B1 station hall to Isetan loop',[point(-9,B1,0),point(-30,B1,0),point(-35,B1,3.5),point(-47,B1,3.5),point(-118,B1,0),point(-118,B1,18),point(-47,B1,18),point(-47,B1,3.5)]);
pair('B2 Porta to both Isetan entrances',[point(-17,B2,0),point(-35,B2,1.5),point(-47,B2,1.5),point(-118,B2,0),point(-118,B2,18),point(-47,B2,18),point(-17,B2,18)]);
pair('Isetan internal stair',[point(-75,B2,9.7),point(-78,B2,9.7),point(-81.3,mid,9.7),point(-82.2,mid,9.7),point(-82.2,mid,12.7),point(-81.3,mid,12.7),point(-78,B1,12.7),point(-75,B1,12.7),point(-75,B1,18)]);
pair('B2 central lift to Isetan',[point(-35.7,B2,-3),point(-35.7,B2,1.5),point(-47,B2,1.5)]);
pair('B1 central lift to Isetan',[point(-35.7,B1,-3),point(-35.7,B1,3.5),point(-47,B1,3.5)]);
const blocked=[{label:'B1 lower-flight opening guard',start:point(-76.8,B1,9.7),yaw:-90,axis:'x',limit:-77.6,sign:1}];
const report=await c.save(out,'isetan-basement.glb',{componentPrefix:prefix,sourceCollection:'Isetan basement connections and food halls',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open B1 and both B2 eastern food-hall entries, connect the food-hall aisle loops and a usable B1-B2 stair, and preserve the central lift approaches.',geometry:{B1,B2,well,stair:{steps:22,rise,going:.3,mid},routes,blocked,spawn:point(-9,B1,0),retiredIds:spec.retiredIds,retiredLights:[]},references:['https://www.mistore.jp/store/kyoto/shops/floorB1.html','https://www.mistore.jp/store/kyoto/shops/floorB2.html','research/kyoto-station/maps/floor-b1.svg','research/kyoto-station/maps/floor-b2.svg'],limits:['The operator plans establish entrances, aisle loops, counters and internal stair cores. Coordinates, counter dimensions, finishes and the selected stair are fitted approximations.','Full brand fitouts, the remaining Isetan lifts/escalators and connections to other floors remain unfinished.']});
const labels=[['ジェイアール京都伊勢丹 B1F','Sweets / Bread / Wine'],['京都駅・中央エレベーター','Station / Central Elevator'],['ジェイアール京都伊勢丹 B2F','Food Hall / Deli / Fresh Market'],['ポルタ・地下鉄','Porta / Subway'],['和洋菓子・パン・酒','Sweets / Bread / Wine'],['惣菜・弁当・生鮮食品','Deli / Bento / Fresh Market'],['B1F 和洋菓子','B1F Sweets'],['B2F 食料品','B2F Food Hall'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2304"><rect width="2048" height="2304" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i)||faces.find(f=>f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="44">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/isetan-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/isetan-basement.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===9)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.pos),row=flat?(side===f.side?f.row:f.back):8,u=row===8?.5:.5+side*(v.z-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/9;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[9].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Isetan directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[9].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/isetan-basement.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'isetan-signs.png',sha256:sha(png),material:mats[9].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
