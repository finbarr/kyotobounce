// Eastern JR underground passage, six platform descents and Shinkansen transfer stair.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,parentPath,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),parent=await read(parentPath),old=await read(parent.layout),s=await read(component+'/spec.json');assert.equal(s.parentLayoutSha256,parent.layoutSha256);
const mat=(name,rgb,r=.65,metal=0)=>({name:'East transfer | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale floor',[.52,.51,.46],.48),mat('warm wall',[.67,.65,.58]),mat('ceiling',[.76,.75,.69]),mat('stainless',[.36,.39,.40],.3,.8),mat('dark trim',[.035,.043,.048]),mat('tactile',[.70,.48,.04]),mat('signs',[1,1,1]),{...mat('diffuser',[1,.96,.85]),emissiveFactor:[1,.96,.85]},mat('gate blue',[.035,.19,.45]),mat('gate green',[.07,.36,.18])];
const materialMap=new Map();function oldMaterial(id){if(materialMap.has(id))return materialMap.get(id);const r=old.authoredMaterials.find(m=>m.id===id),index=mats.length;assert(r);mats.push({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic},...(r.emissionColor?{emissiveFactor:['r','g','b'].map(k=>r.emissionColor[k])}:{}),...(r.alpha<1?{alphaMode:'BLEND',doubleSided:true}:{})});materialMap.set(id,index);return index;}
for(const f of s.floors)oldMaterial(f.appearance);for(const row of s.movePorta)oldMaterial(old.panels.find(p=>p.id===row.id).appearance);
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],low=s.low,high=s.high,C=low+3.4;
const slab=(id,poly,y,depth,mi=0,role='floor',holes=[])=>c.slab('east-transfer-'+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('east-transfer-'+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.05,.05);beam(id+'-mid',[a[0],a[1]+.52,a[2]],[b[0],b[1]+.52,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+1.05,q[2]],.04,.04);}}
for(const f of s.floors)for(const[i,g]of f.polygons.entries()){const rings=g.coordinates.map(r=>r.slice(0,-1));slab('rebuilt-'+f.id+'-'+i,rings[0],f.top,f.depth,oldMaterial(f.appearance),f.role,rings.slice(1));c.panels.at(-1).material=f.material;}
// Retain the junction's original materials and UVs while moving it clear of the paid tunnel.
const copiedUV=new Map();for(const row of s.movePorta){const p=old.panels.find(p=>p.id===row.id),indices=p.triangles.flatMap((_,i)=>i%3?[]:p.triangles.slice(i,i+3).reverse()),id='east-transfer-relocated-'+p.id;
 c.add(id,p.vertices.map(v=>P(v.x,v.y,row.clipNorth?Math.min(-14,v.z+14):v.z+14)),indices,oldMaterial(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});if(p.uv)copiedUV.set(id,indices.map(i=>p.uv[i]));
}
const lights=old.authoredLights.filter(r=>s.retiredLights.includes(r.id)&&!r.id.endsWith('--21')).map(r=>({...r,id:'east-transfer-relocated-'+r.id,position:{...r.position,z:r.position.z+14}}));
// Shared public passage wall: openings for the paid JR gate and the relocated Porta link.
for(const[a,b]of[[-120,-40],[-31,-29],[-15,24]]){
 box('public-wall-'+a,146.925,147.075,a,b,C,low);box('public-base-'+a,147.075,147.125,a,b,low+.28,low,4);box('public-band-'+a,147.082,147.118,a,b,low+2.55,low+2.3,8);
}
// The paid tunnel lies beside the existing public passage, below the railway.
slab('underpass-floor',rect(140,147,-135,-30),low,.30);slab('underpass-ceiling',rect(140,147,-135,-30),C+.18,.18,2,'ceiling');
slab('south-turn-floor',rect(133,140,-135,-131),low,.30);slab('south-turn-ceiling',rect(133,140,-135,-131),C+.18,.18,2,'ceiling');
box('south-turn-north',133,140,-131.06,-130.94,C,low);box('south-turn-west',132.94,133.06,-135,-131,C,low);
box('underpass-south',139,147,-135.06,-134.94,C,low);box('underpass-north',140,147,-30.06,-29.94,C,low);
const openings=s.stairs.map(p=>[p.z+.018*140-p.half,p.z+.018*140+p.half]).sort((a,b)=>a[0]-b[0]);let previous=-131;
for(const[a,b]of[...openings,[-30,-30]]){if(a>previous)box('underpass-west-'+previous,139.94,140.06,previous,a,C,low);previous=b;}
for(const st of s.stairs){const z=x=>st.z+.018*x,id='platform-'+st.label;
 for(let f=0;f<2;f++){const a=f?st.midB:st.start,top=f?low/2:0;for(let i=0;i<18;i++)slab(id+'-step-'+f+'-'+i,[[a+i*.32,z(a+i*.32)-st.half],[a+(i+1)*.32,z(a+(i+1)*.32)-st.half],[a+(i+1)*.32,z(a+(i+1)*.32)+st.half],[a+i*.32,z(a+i*.32)+st.half]],top+i*low/36,.28,0,'stair-tread');for(const side of[-1,1])rail(id+'-flight-'+f+'-'+side,[a,top,z(a)+side*(st.half-.15)],[a+5.76,top+low/2,z(a+5.76)+side*(st.half-.15)]);}
 slab(id+'-middle',[[st.midA,z(st.midA)-st.half],[st.midB,z(st.midB)-st.half],[st.midB,z(st.midB)+st.half],[st.midA,z(st.midA)+st.half]],low/2,.28,0,'stair-landing');
 box(id+'-bottom-riser',139.98,140.035,z(140)-st.half,z(140)+st.half,low-low/36,low-.3,0,'stair-riser');
 for(const side of[-1,1]){
  slab(id+'-retaining-'+side,[[st.start,z(st.start)+side*st.half-.06],[140,z(140)+side*st.half-.06],[140,z(140)+side*st.half+.06],[st.start,z(st.start)+side*st.half+.06]],0,6.5,1,'retaining-wall');
  rail(id+'-opening-'+side,[st.start,0,z(st.start)+side*st.half],[140,0,z(140)+side*st.half]);
  rail(id+'-middle-'+side,[st.midA,low/2,z(st.midA)+side*(st.half-.15)],[st.midB,low/2,z(st.midB)+side*(st.half-.15)]);
 }
 rail(id+'-opening-end',[140,0,z(140)-st.half],[140,0,z(140)+st.half]);
 // A high hood follows the stair and joins the tunnel ceiling; no slab crosses its headroom.
 c.slab('east-transfer-'+id+'-hood',[P(st.start,3.6,z(st.start)-st.half),P(140,C+.18,z(140)-st.half),P(140,C+.18,z(140)+st.half),P(st.start,3.6,z(st.start)+st.half)],[],.18,2,'ceiling');
}
// Replace canopy posts inside the cut openings with portal supports on intact platform floor.
for(const col of s.columns){const st=s.stairs.find(s=>s.label===col.stair),a=125.4,b=141.2,z=x=>st.z+.018*x+col.offset;
 for(const x of[a,b]){if(st.label==='8-9'&&x>140)continue;box('canopy-post-'+col.stair+'-'+x,x-.12,x+.12,z(x)-.12,z(x)+.12,col.top,0,3,'column');}
 // Platform 8/9 ends at X140: its eastern support uses the intact outer strip.
 if(st.label==='8-9')box('canopy-post-8-9-end',139.4,139.64,st.z+.018*139.52+3.0,st.z+.018*139.52+3.24,col.top,0,3,'column');
 beam('canopy-header-'+col.stair,[a,col.top-.13,z(a)],[st.label==='8-9'?139.52:b,col.top-.13,st.label==='8-9'?st.z+.018*139.52+3.12:z(b)],.16,.26);
}
// Two flights climb from B2 through a real floor opening to the eastern transfer gate.
const start=-135,midA=start-29*.32,midB=midA-1.8,end=midB-29*.32,rise=(high-low)/58;
assert(Math.abs(end+155.36)<1e-8);
for(let f=0;f<2;f++){const a=f?midB:start,y=f?(low+high)/2:low;for(let i=0;i<29;i++)box('transfer-step-'+f+'-'+i,133,139,a-(i+1)*.32,a-i*.32,y+(i+1)*rise,y+(i+1)*rise-.3,0,'stair-tread');for(const x of[133.2,138.8])rail('transfer-flight-'+f+'-'+x,[x,y,a],[x,y+29*rise,a-29*.32]);}
slab('transfer-middle',rect(133,139,midB,midA),(low+high)/2,.3,0,'stair-landing');
for(const x of[133.2,138.8])rail('transfer-middle-'+x,[x,(low+high)/2,midA],[x,(low+high)/2,midB]);
for(const x of[133,139])box('transfer-shaft-side-'+x,x-.06,x+.06,end,-134.5,7.25,low-.30);
box('transfer-shaft-north',133,139,-134.56,-134.44,7.25,C+.18);
c.slab('east-transfer-transfer-ceiling',[P(133,low+3.6,start),P(139,low+3.6,start),P(139,high+3.6,end),P(133,high+3.6,end)],[],.18,2,'ceiling');
for(const[a,b]of[[116,133],[139,142]])box('paid-lobby-north-'+a,a,b,-150,-149.85,3.225,0);
// Retracted gate lanes keep the boundaries legible and walkable for exploration.
function gate(id,axis,pos,values,y,open,accent){for(const[i,q]of values.entries()){
 const bounds=axis==='x'?[pos-1,pos+1,q-.24,q+.24]:[q-.24,q+.24,pos-1,pos+1];box(id+'-cabinet-'+i,...bounds,y+1.02,y+.04,3,'ticket-gate');box(id+'-hood-'+i,...bounds,y+1.10,y+1.02,accent,'gate-hood');
 const top=axis==='x'?[pos-.75,pos-.4,q-.16,q+.16]:[q-.16,q+.16,pos+.4,pos+.75];box(id+'-reader-'+i,...top,y+1.12,y+1.10,4,'reader');
 if(i<values.length-1){const n=values[i+1];if(i===open){for(const v of[q+.29,n-.29])box(id+'-open-'+i+'-'+v,...(axis==='x'?[pos-.75,pos+.75,v-.03,v+.03]:[v-.03,v+.03,pos-.75,pos+.75]),y+.92,y+.10,accent,'open-gate');}else box(id+'-flap-'+i,...(axis==='x'?[pos-.05,pos+.05,q+.24,n-.24]:[q+.24,n-.24,pos-.05,pos+.05]),y+.92,y+.10,accent,'closed-gate');}
 }return(values[open]+values[open+1])/2;}
const jrLane=gate('jr-east-gate','x',146.4,[-39.3,-37.4,-35.5,-33.6,-31.7],low,1,9),transferLane=gate('transfer-gate','z',-157.2,[133.75,135.45,137.15,138.25],high,1,8);
box('jr-gate-end-south',146.35,146.45,-40,-39.54,low+1.1,low,3);box('jr-gate-end-north',146.35,146.45,-31.46,-31,low+1.1,low,3);
box('jr-gate-header',146.25,146.55,-40,-31,C,low+2.5,2,'fascia');
for(const[a,b]of[[133,133.51],[138.49,139]])box('transfer-gate-end-'+a,a,b,-157.25,-157.15,high+1.1,high,3);
for(const x of[133,139])box('transfer-gate-side-'+x,x-.06,x+.06,-157.25,end,high+1.1,high,3,'gate-boundary');
const faces=[];function sign(id,axis,pos,center,w,row,y,back=row){const h=.50;if(axis==='x')box('sign-'+id,pos-.02,pos+.02,center-w/2,center+w/2,y+h,y,6,'sign');else box('sign-'+id,center-w/2,center+w/2,pos-.02,pos+.02,y+h,y,6,'sign');c.panels.at(-1).collision=false;faces.push({id:'east-transfer-sign-'+id,axis,pos,center,w,h,row,back,y});}
const labels=[['JR線 東地下通路','JR Lines / East Underground Passage'],['新幹線 東のりかえ口','Shinkansen / East Transfer'],['出口・地下東口','Exit / Underground East Gate'],['在来線のりかえ','Transfer to JR Lines']];
for(const st of s.stairs){const row=labels.length;labels.push([st.label.replace('-','・')+' 番のりば','Tracks '+st.label.replace('-',' / ')]);sign('platform-'+st.label,'x',139.8,st.z+.018*140,Math.min(3.4,st.half*2-.2),row,low+2.45);sign('descent-'+st.label,'x',st.start-.35,st.z+.018*st.start,Math.min(3.4,st.half*2-.2),0,2.35);}
sign('jr-public','x',147.45,-35.5,8,0,low+2.55,2);sign('jr-paid','x',146.20,-35.5,8,0,low+2.55,2);sign('transfer-north','z',-157.1,136,5.5,1,high+2.25,3);
for(const z of[-60,-92,-129])sign('directions-'+z,'z',z,143.5,5.5,1,low+2.55,2);
// Signs attach to the surrounding canopy, stair hood or concourse ceiling.
for(const f of faces){
 if(f.id.includes('jr-public')||f.id.includes('jr-paid'))continue;
 let roof=C;
 if(f.id.includes('descent-')){const label=f.id.split('descent-')[1];roof=({'0':5.5,'2-3':5.43,'4-5':4.93,'6-7':5.18,'8-9':5.23,'10':4.98})[label];}
 else if(f.id.includes('platform-'))roof=3.42+(f.pos-126.68)/(140-126.68)*(C-3.42);
 else if(f.id.includes('transfer-north'))roof=7.5;
 assert(roof>f.y+f.h);
 for(const side of[-1,1]){const q=f.center+side*(f.w/2-.18),a=f.axis==='x'?[f.pos,f.y+f.h,q]:[q,f.y+f.h,f.pos],b=[a[0],roof,a[2]];beam('sign-hanger-'+f.id+'-'+side,a,b,.03,.03,3,'sign-support');c.panels.at(-1).collision=false;}
}
function light(id,x,z,y=C-.05){box('fixture-'+id,x-.45,x+.45,z-.30,z+.30,y+.03,y,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:'east-transfer-emitter-'+id,position:{x,y:y-.05,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.96,b:.86},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted underground and transfer fixtures',note:'Existing two-light pool.'});}
for(let z=-131;z< -30;z+=7){light('passage-'+z,143.5,z);box('ceiling-joint-'+z,140.1,146.9,z-.012,z+.012,C,C-.012,4,'ceiling-joint');c.panels.at(-1).collision=false;}
for(const st of s.stairs)light('platform-'+st.label,st.midA+.9,st.z+.018*(st.midA+.9),low/2+2.4);
light('transfer-middle',136,(midA+midB)/2,(low+high)/2+2.4);light('transfer-gate',136,-157.2,7.4);
for(const st of s.stairs){box('tactile-'+st.label,st.start-.7,st.start-.25,st.z+.018*st.start-st.half+.2,st.z+.018*st.start+st.half-.2,.008,.001,5,'tactile');c.panels.at(-1).collision=false;}
box('gate-tactile',143.5,145.1,jrLane-.18,jrLane+.18,low+.008,low+.001,5,'tactile');c.panels.at(-1).collision=false;
for(const p of c.panels)if(!p.id.startsWith('east-transfer-rebuilt-')&&!p.id.startsWith('east-transfer-relocated-')){p.material=p.browserMaterial===3?'steel':'stone';if(['sign','fixture','ceiling-joint','tactile'].includes(p.role))p.collision=false;}
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
for(const st of s.stairs){const z=x=>st.z+.018*x;pair('Platform '+st.label+' to east underpass',[point(125.6,0,z(125.6)),point(st.start,0,z(st.start)),point(st.midA,low/2,z(st.midA)),point(st.midB,low/2,z(st.midB)),point(140,low,z(140)),point(143.5,low,z(140))]);const offset=st.label==='10'?1.75:st.label==='0'?2.7:-st.half-.8;pair('Platform '+st.label+' well bypass',st.label==='10'?[point(123.5,0,z(123.5)),point(123.5,0,z(123.5)+1.65),point(143.5,0,z(143.5)+1.65),point(143.5,0,z(143.5))]:[point(125.6,0,z(125.6)+offset),point(138.5,0,z(138.5)+offset)]);}
pair('Eastern paid underpass',[...[-35,-53,-71,-89,-107,-124,-133].map(z=>point(143.5,low,z))]);
pair('B2 to Shinkansen east transfer',[point(143.5,low,-133),point(136,low,-133),point(136,low,start),point(136,(low+high)/2,midA),point(136,(low+high)/2,midB),point(136,high,end),point(transferLane,high,-156),point(transferLane,high,-159.2)]);
pair('JR east gate',[point(143.5,low,jrLane),point(150.5,low,jrLane)]);
pair('Relocated Porta stairs',[point(132,-8.713582801818848,-10),point(132,-8.713582801818848,-18),point(140.5,-8.713582801818848,-18),point(145,low,-18),point(151,low,-18)]);
const rampStart=86.72834396362303;pair('Relocated Porta ramp',[point(84,-8.713582801818848,-10),point(84,-8.713582801818848,-27),point(rampStart,-8.713582801818848,-27),point(105,-8.713582801818848+(105-rampStart)/20,-27),point(123,-8.713582801818848+(123-rampStart)/20,-27),point(137,low,-27),point(151,low,-27)]);
pair('Upper Shinkansen stair bypass',[point(131.5,high,-166),point(131.5,high,-148),point(131.5,high,-131.5),point(143,high,-131.5),point(143,high,-148)]);
pair('Hachijo East ground lobby',[point(147.1,0,-164.9),point(127,0,-164.9),point(120,0,-164.9)]);
const report=await c.save(component,'east-transfer.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Eastern paid underground railway crossing, six platform stairs, JR East gate and Shinkansen transfer, with the Porta link moved clear.',geometry:{low,high,start,midA,midB,end,rise,jrLane,transferLane,stairs:s.stairs,routes,retiredIds:s.retiredIds,retiredLights:s.retiredLights,portaShift:14},references:['https://eki.jr-odekake.net/premises?id=0610116','https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html'],limits:['Route topology follows operator plans. Elevations, coordinates, widths, finishes and gate equipment are fitted approximations.','Moving escalators and lifts remain unfinished; the corresponding stair routes are walkable.']});
// One original sign atlas; relocated Porta labels retain their existing atlas and UVs.
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="'+labels.length*256+'"><rect width="2048" height="100%" fill="#eeeedc"/>';
for(const[i,[jp,en]]of labels.entries())svg+=`<g transform="translate(0,${i*256})" fill="#16202c" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text x="1024" y="110" font-size="74">${jp}</text><text x="1024" y="191" font-size="45">${en}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(component+'/east-transfer-signs.png',png);await writeFile(component+'/east-transfer-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(component+'/east-transfer.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(component+'/native-panels.json');for(const p of native.panels)if(copiedUV.has(p.id))p.uv=copiedUV.get(p.id);else if(p.browserMaterial===6){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-6),side=Math.sign(v[f.axis]-f.pos),row=side>0?f.row:f.back,u=flat?.5+(f.axis==='x'?side:-side)*(v[f.axis==='x'?'z':'x']-f.center)/f.w:.5,t=(row+1-(v.y-f.y)/f.h)/labels.length;return{x:u,y:1-t};});}
for(const [mi,mesh]of j.meshes.entries()){const rows=native.panels.filter(p=>p.browserMaterial===mi);if(!rows.some(p=>p.uv))continue;const uv=rows.flatMap(p=>p.vertices.flatMap((_,i)=>[p.uv?.[i]?.x??0,1-(p.uv?.[i]?.y??0)])),prim=mesh.primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});}
j.images=[{name:'Original east transfer labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[6].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const nb=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(component+'/native-panels.json',nb);await writeFile(component+'/east-transfer.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nb);report.texture={file:'east-transfer-signs.png',sha256:sha(png),material:mats[6].name};await writeFile(component+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
