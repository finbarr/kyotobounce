// The public gallery corridor connects East Square to the eastern facilities.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),raw=await readFile(m.layout);assert.equal(sha(raw),m.layoutSha256);const l=JSON.parse(raw);
const id='niwa-back-stone-pier',wall=l.panels.find(p=>p.id===id);assert(wall?.collision);
const landing=l.panels.find(p=>p.id==='niwa-pergola-landing'),F=Math.max(...landing.vertices.map(v=>v.y)),Z=18.1,N=19.5,S=16.7,E=170,offsetZ=6.55;
assert(Math.abs(F-31.6)<.00001);
const edge=z=>128.47877502441406+(z-offsetZ-4.027920246124268)*(128.3153076171875-128.47877502441406)/(13.926570892333984-4.027920246124268);
const spec={componentPrefix:'east-gallery-',parentLayoutSha256:m.layoutSha256,floor:F,cuts:{},retiredIds:[id],retiredBoxIds:[],retiredSourceOnlyIds:[],retiredRouteIds:[],retiredLabelIds:[],retiredLights:[],modifiedFlightIds:[],preservedOverlapArea:{}};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');
const mat=(name,color,rough=.65,metal=0)=>({name:'East gallery '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:rough,metallicFactor:metal}});
const materials=[mat('dark stone',[.22,.23,.225]),mat('concrete',[.58,.56,.51],.85),mat('charcoal metal',[.075,.08,.085],.36,.6),mat('pale frame',[.55,.57,.55],.35,.7),mat('joints',[.12,.125,.12],.8),{...mat('glass',[.64,.73,.77],.15),alphaMode:'BLEND'},{...mat('warm diffuser',[.9,.76,.51],.35),emissiveFactor:[.8,.58,.3]},mat('ceramic',[.83,.83,.78],.23),mat('blue booth',[.04,.20,.37]),mat('red booth',[.42,.07,.095]),mat('yellow booth',[.64,.43,.065])];materials[5].pbrMetallicRoughness.baseColorFactor[3]=.18;
const pierMaterial=l.authoredMaterials.find(a=>a.id===wall.appearance);
materials.push({...mat('pier',[.35,.36,.35]),name:pierMaterial.label+' | Browser'});
const c=construction(materials,{flatNormals:true}),prefix=spec.componentPrefix,P=(x,y,z)=>[x,y,-(z-offsetZ)],pt=(x,z)=>({x,y:F,z:z-offsetZ});
function poly(name,points,y,depth,mi=0,role='floor'){c.slab(prefix+name,points.map(([x,z])=>P(x,y,z)),[],depth,mi,role);c.panels.at(-1).material=mi===5?'glass':[2,3].includes(mi)?'steel':'stone';}
const box=(name,x0,x1,z0,z1,y0,y1,mi=1,role='wall')=>poly(name,[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],y1,y1-y0,mi,role);
const detail=(...args)=>{box(...args);c.panels.at(-1).collision=false;};
const front=z=>127.78804016113281+(z-9.51726245880127)*(127.71538543701172-127.78804016113281)/(13.91666316986084-9.51726245880127);
function pier(name,a,b,low,high){poly(name,[[front(a),a+offsetZ],[front(a)+.14,a+offsetZ],[front(b)+.14,b+offsetZ],[front(b),b+offsetZ]],high,high-low,11,'door-surround');}
pier('pier-south',9.51726245880127,S-offsetZ,F,34.380001068115234);
pier('pier-north',N-offsetZ,13.91666316986084,F,34.380001068115234);
pier('pier-head',S-offsetZ,N-offsetZ,F+2.54,34.380001068115234);
// Follow the retained upper landing edge; do not overlap its finished top.
poly('corridor-floor',[[edge(S),S],[E,S],[E,N],[edge(N),N]],F,.28);
box('lobby-floor',E,177,12.5,21.4,F-.28,F,0,'floor');
box('accessible-floor',169.5,173.2,8.5,12.5,F-.28,F,0,'floor');
box('washroom-floor',173.2,177,8.5,12.5,F-.28,F,0,'floor');
box('north-wall',127.92,E,N,N+.16,F,F+2.65);
box('south-wall',127.92,E,S-.16,S,F,F+2.65);
box('ceiling',127.75,E,S,N,F+2.65,F+2.78,2,'ceiling');
box('lobby-ceiling',E,177,12.5,21.4,F+2.65,F+2.78,2,'ceiling');
box('facilities-ceiling',169.5,177,8.5,12.5,F+2.65,F+2.78,2,'ceiling');
for(let i=0;i<15;i++)detail('ceiling-rib-'+i,127.92,E,S+.08+i*.182,S+.112+i*.182,F+2.59,F+2.65,3,'ceiling-rib');
// An open pair of glazed leaves folds back against the passage sides.
for(const [name,z]of [['south',S],['north',N]]){
 box('door-jamb-'+name,127.70,127.98,z-.04,z+.04,F,F+2.78,3,'door-frame');
 box('door-leaf-'+name,127.98,129.21,z+(name==='south'?.09:-.12),z+(name==='south'?.12:-.09),F+.06,F+2.48,5,'open-door');
 box('door-leaf-top-'+name,127.95,129.24,z-.01,z+.14,F+2.48,F+2.53,3,'door-frame');
 box('door-leaf-bottom-'+name,127.95,129.24,z-.01,z+.14,F+.02,F+.08,3,'door-frame');
 box('door-leaf-end-'+name,129.19,129.24,z-.01,z+.14,F+.08,F+2.48,3,'door-frame');
}
box('door-header',127.70,127.98,S,N,F+2.54,F+2.62,3,'door-frame');
box('door-transom',127.76,127.80,S+.04,N-.04,F+2.62,F+2.78,5,'window');
// Dark stone paving, concrete divisions, low wall lights and a ribbed soffit
// follow the passage photograph. Booth artwork is left for original assets.
for(let i=0;i<69;i++)detail('floor-joint-'+i,128+i*.6,128.005+i*.6,S,N,F+.0005,F+.0015,4,'paving-joint');
for(const z of [17.3,17.9,18.5,19.1])detail('floor-long-joint-'+z,127.15,E,z,z+.005,F+.0005,F+.0015,4,'paving-joint');
for(let i=0;i<15;i++){
 const x=129.5+i*2.7;
 for(const [name,z]of [['north',N-.025],['south',S+.025]]){
  detail('wall-joint-'+name+'-'+i,x,x+.009,z-.01,z+.01,F+.02,F+2.60,4,'wall-joint');
  box('skirting-'+name+'-'+i,x-1.34,x+1.34,z-.016,z+.016,F,F+.075,2,'skirting');
  detail('low-light-frame-'+name+'-'+i,x-.13,x+.13,z-.03,z+.03,F+.25,F+.54,3,'fixture');
  detail('low-light-'+name+'-'+i,x-.09,x+.09,z-.034,z+.034,F+.29,F+.50,6,'fixture');
 }
 detail('ceiling-light-'+i,x-.22,x+.22,Z-.27,Z+.27,F+2.565,F+2.59,6,'fixture');
}
for(const [i,x]of [136,149,162].entries()){
 const mi=8+i;
 box('booth-backing-'+i,x-1.55,x+1.55,S+.01,S+.10,F+.8,F+2.55,mi,'gallery-booth');
 for(const dx of [-.79,.79]){
  box('display-frame-'+i+'-'+dx,x+dx-.62,x+dx+.62,S+.1,S+.15,F+1.02,F+2.3,3,'display-frame');
  detail('display-'+i+'-'+dx,x+dx-.56,x+dx+.56,S+.15,S+.154,F+1.08,F+2.24,2,'display');
 }
}
// A shared lobby and two open facilities rooms make the onward route usable.
// The northern wall reserves space for the still-unbuilt eastern lift bank.
box('lobby-east-wall',177,177.16,8.5,21.4,F,F+2.65);
box('lobby-north-wall',E,177,21.4,21.56,F,F+2.65);
box('lobby-west-north',E-.16,E,N,21.4,F,F+2.65);
box('lobby-west-south',E-.16,E,12.5,S,F,F+2.65);
box('facilities-west-wall',169.34,169.5,8.5,12.5,F,F+2.65);
box('facilities-south-wall',169.5,177,8.34,8.5,F,F+2.65);
box('facilities-divider',173.12,173.28,8.5,12.5,F,F+2.65);
for(const [i,a,b]of [[0,169.5,170.35],[1,171.65,174.05],[2,175.35,177]])box('facility-entrance-wall-'+i,a,b,12.42,12.58,F,F+2.65);
for(const [i,x]of [171,174.7].entries())box('facility-door-head-'+i,x-.65,x+.65,12.42,12.58,F+2.5,F+2.65,1,'door-frame');
for(const [i,x]of [171.2,175].entries()){
 box('cistern-'+i,x-.34,x+.34,8.7,8.9,F+.44,F+.88,7,'fixture');
 box('toilet-base-'+i,x-.19,x+.19,8.93,9.45,F,F+.37,7,'fixture');
 const ring=(rx,rz)=>Array.from({length:20},(_,j)=>[x+rx*Math.cos(j*Math.PI/10),F+.44,-(9.28-offsetZ+rz*Math.sin(j*Math.PI/10))]);
 c.slab(prefix+'toilet-seat-'+i,ring(.32,.42),[ring(.21,.29)],.07,7,'fixture');c.panels.at(-1).material='stone';
 const basinWall=i===0?169.5:173.28;
 box('basin-counter-'+i,basinWall,basinWall+.5,10,11,F+.77,F+.85,7,'fixture');
 box('basin-recess-'+i,basinWall+.1,basinWall+.42,10.24,10.76,F+.85,F+.854,4,'fixture');
 box('tap-'+i,basinWall+.08,basinWall+.13,10.475,10.525,F+.85,F+1.05,3,'fixture');
 box('mirror-'+i,basinWall+.005,basinWall+.035,10.04,10.96,F+1.15,F+2.0,3,'fixture');
 detail('room-light-'+i,x-.6,x+.6,10.05,10.35,F+2.60,F+2.63,6,'fixture');
}
// Grab rails within the larger western room, clear of its turning area.
box('accessible-side-rail',170.64,170.68,8.9,9.8,F+.70,F+.75,3,'fixture');
box('accessible-back-rail',170.7,171.7,8.84,8.88,F+.70,F+.75,3,'fixture');
const approach=(await read('research/kyoto-station/notes/courtyard-life/routes.json')).additionalRoutes.find(r=>r.id==='niwa-entrance-0').points.map(([x,y,z])=>({x,y,z:-z}));
const outward=[...approach,pt(126.5,Z),pt(129.7,Z),pt(145,Z),pt(162,Z),pt(174,Z)];
const routes=[{label:'East Square to gallery lobby',points:outward},{label:'Gallery lobby to East Square',points:outward.toReversed()},...[[171,'Western facilities room'],[174.7,'Eastern facilities room']].flatMap(([x,label])=>{const points=[pt(174,18.1),pt(174,14),pt(x,14),pt(x,12),pt(x,10.4)];return[{label,points},{label:label+' return',points:points.toReversed()}];})];
const report=await c.save(out,'east-gallery.glb',{componentPrefix:prefix,sourceCollection:'East Square public gallery corridor',builder:'web/station/realism/build-east-gallery.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the public eastward gallery passage from East Square and connect its facilities lobby and rooms.',geometry:{routes,chromeRoutes:routes.map(r=>r.label),blocked:[],retiredIds:[id],retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],floor:F,corridorWidth:N-S,doorHeight:2.54},references:['https://www.kyoto-station-building.co.jp/floorguide/7f/','https://ameblo.jp/96kakeru/entry-12922118870.html','https://ideableworks.com/kyotostationgallery'],limits:['The operator map establishes the connection and facilities; corridor dimensions and room arrangements fit the existing municipal shell and are not surveyed.','Door position follows the northern side of NIWA and source shell. Finishes follow the August 2025 passage photographs.','The eastern lift bank and its lower-floor connections remain unbuilt. Display screens await original artwork; reference artwork is not copied.']});
// Reuse the station's original granite texture for the fitted door surround.
const native=await read(out+'/native-panels.json'),uv=[];
for(const p of native.panels.filter(p=>p.browserMaterial===11)){p.uv=p.vertices.map(v=>({x:v.z,y:1-v.y}));for(const q of p.uv)uv.push(q.x,1-q.y);}
const {json:j,bin}=readGLB(await readFile(out+'/east-gallery.glb')),bytes=Buffer.from(new Float32Array(uv).buffer),primitive=j.meshes[11].primitives[0];
primitive.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:j.bufferViews.length,componentType:5126,type:'VEC2',count:uv.length/2});j.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:bytes.length,target:34962});j.buffers[0].byteLength+=bytes.length;
const glb=writeGLB(j,Buffer.concat([bin,bytes])),nativeRaw=JSON.stringify(native)+'\n';await writeFile(out+'/east-gallery.glb',glb);await writeFile(out+'/native-panels.json',nativeRaw);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nativeRaw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['gallery-entry',[126,F+1.65,Z],[140,F+1.65,Z]],['gallery-passage',[131,F+1.65,Z],[162,F+1.65,Z]],['gallery-return',[166,F+1.65,Z],[125,F+1.65,Z]],['facilities-lobby',[174,F+1.65,20],[174,F+1.65,10]],['facilities-room',[172.3,F+1.65,11.8],[171,F+.5,9.3]]].map(([id,p,t])=>[id,[p[0],p[1],p[2]-offsetZ],[t[0],t[1],t[2]-offsetZ]]),null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,width:N-S});
