// Missing southern shop rooms, station office and Central 1 serving kiosks.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {construction} from './component-mesh.mjs';

const [manifest,specPath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw),spec=await read(specPath);
assert.equal(sha(raw),m.layoutSha256);
const central=spec.cores[1],world={id:'world',center:[0,0],right:[1,0],downhill:[0,1]},F=-6.2,C=-2.8,prefix='subway-south-rooms-';
assert.equal(spec.floor,F);assert.equal(spec.ceiling,C);
const retiredIds=['6-4','6-5','6-7','6-8'].map(id=>'subway-refit-perimeter-'+id),retiredLights=[];
for(const id of retiredIds)assert(l.panels.some(p=>p.id===id));
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Subway public rooms | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('pale stone',[.64,.61,.54]),mat('dark frames',[.055,.055,.052],.35,.4),
 {...mat('glazing',[.58,.64,.61]),pbrMetallicRoughness:{baseColorFactor:[.58,.64,.61,.16],roughnessFactor:.2,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},
 mat('timber',[.26,.15,.075]),mat('green shop frames',[.045,.19,.12]),
 {...mat('diffuser',[1,.95,.83]),emissiveFactor:[1,.95,.83]},mat('letters',[.93,.94,.88])];
// Continue the actual retained floor and ceiling finishes across the joins.
for(const id of ['subway-refit-concourse-floor-0','subway-refit-concourse-ceiling-0']){
 const panel=l.panels.find(p=>p.id===id),source=l.authoredMaterials.find(m=>m.id===panel?.appearance);assert(source);
 materials.push({name:source.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>source.linearColor[k]),roughnessFactor:source.roughness,metallicFactor:source.metallic}});
}
const c=construction(materials,{flatNormals:true}),font=new FontLoader().parse(await read('research/kyoto-station/fonts/helvetiker_regular.typeface.json'));
const lights=[],routes=[],rooms=[],walls=[],views=[],blocked=[];
const at=(f,w,t)=>[f.center[0]+w*f.right[0]+t*f.downhill[0],f.center[1]+w*f.right[1]+t*f.downhill[1]];
const P=(f,w,y,t)=>{const[x,z]=at(f,w,t);return[x,y,-z];};
const pt=(f,w,t,y=F)=>{const[x,z]=at(f,w,t);return{x,y,z};};
function box(id,f,a,b,d,e,top,bottom,mi=0,role='wall'){
 assert(a<b&&d<e&&bottom<top,id);
 c.slab(prefix+id,[[a,d],[b,d],[b,e],[a,e]].map(([w,t])=>P(f,w,top,t)),[],top-bottom,mi,role);
}
const decor=()=>{c.panels.at(-1).collision=false;};
function edge(id,f,a,b,bottom=F,top=C,mi=0,width=.14){
 assert(a[0]===b[0]||a[1]===b[1]);
 // Merge touching, collinear walls once, including partial shared room backs.
 const axis=a[0]===b[0]?1:0,k=1-axis;
 walls.push({id,f,axis,fixed:a[k],a:Math.min(a[axis],b[axis]),b:Math.max(a[axis],b[axis]),bottom,top,mi,width});
}
function route(label,points,pair=false){
 const split=[points[0]];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/14));
  for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));
 }
 routes.push({label,points:split});if(pair)routes.push({label:label+' return',points:split.toReversed()});
}
function fixture(id,f,w,t){
 box(id,f,w-.7,w+.7,t-.1,t+.1,C-.035,C-.075,5,'fixture');decor();
 lights.push({id:prefix+id+'-light',position:pt(f,w,t,C-.12),direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.95,b:.83},intensity:10,range:8,spotAngle:120,innerSpotAngle:80});
}
function frontage(id,f,a,b,inward,{width=2.6,glass=true,border=1,label=null,insideDepth=1.8}={}){
 const len=Math.hypot(b[0]-a[0],b[1]-a[1]),middle=a.map((v,i)=>(v+b[i])/2),half=Math.min(width,len*.65)/2;
 const tangent=a.map((v,i)=>(b[i]-v)/len),lo=middle.map((v,i)=>v-tangent[i]*half),hi=middle.map((v,i)=>v+tangent[i]*half);
 for(const [p,q,suffix]of[[a,lo,'a'],[hi,b,'b']]){
  if(glass){edge(id+'-plinth-'+suffix,f,p,q,F,F+.22,3,.12);edge(id+'-glass-'+suffix,f,p,q,F+.22,F+2.6,2,.035);}
  else edge(id+'-side-'+suffix,f,p,q,F,F+2.6,0,.14);
 }
 edge(id+'-header',f,a,b,F+2.6,C,border,.2);
 for(const[i,p]of[a,lo,hi,b].entries())box(id+'-post-'+i,f,p[0]-.035,p[0]+.035,p[1]-.035,p[1]+.035,F+2.6,F,border,'door-frame');
 const outside=middle.map((v,i)=>v-inward[i]*1.35),inside=middle.map((v,i)=>v+inward[i]*insideDepth);
 route(id+' doorway',[pt(f,...outside),pt(f,...inside),pt(f,...outside)]);
 if(label){
  // An original, generic wayfinding label. No operator artwork is copied.
  const g=new TextGeometry(label,{font,size:.20,depth:.012,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();
  const center=(g.boundingBox.max.x+g.boundingBox.min.x)/2;
  const exterior=at(f,-inward[0],-inward[1]).map((v,i)=>v-f.center[i]);
  // Text faces outward; its horizontal basis must not depend on edge order.
  const right=[-exterior[1],exterior[0]];
  const pos=g.attributes.position,vs=[];
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i)-center,y=pos.getY(i),z=pos.getZ(i)+.12;
   const p=pt(f,...middle,F+2.79+y);vs.push([p.x+right[0]*x+exterior[0]*z,p.y,-(p.z+right[1]*x+exterior[1]*z)]);
  }
  // Correct winding when the local frontage frame points toward the viewer.
  const indices=g.index?Array.from(g.index.array):Array.from({length:pos.count},(_,i)=>i);
  const determinant=right[1]*exterior[0]-right[0]*exterior[1];
  if(determinant<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  c.add(prefix+id+'-letters',vs,indices,6,'sign-letters');decor();g.dispose();
 }
 return middle;
}
function room(id,f,a,b,d,e,face,options={}){
 const corners=[[a,d],[b,d],[b,e],[a,e]],edges=[[0,1],[1,2],[2,3],[3,0]],faces=['north','east','south','west'];
 for(let i=0;i<4;i++){
  const[p,q]=edges[i].map(k=>corners[k]);
  if(faces[i]===face){
   const reverse=faces[i]==='north'||faces[i]==='east',aa=reverse?q:p,bb=reverse?p:q;
   frontage(id,f,aa,bb,{north:[0,1],east:[-1,0],south:[0,-1],west:[1,0]}[face],options);
  }else if(!options.omit?.includes(faces[i]))edge(id+'-'+faces[i],f,p,q);
 }
 rooms.push({id,frame:f.id,polygon:corners.map(([w,t])=>at(f,w,t)),face,limits:options.limits??'Fitted room envelope; tenant fittings remain unfinished.'});
 fixture(id+'-fixture',f,(a+b)/2,(d+e)/2);
}

// Add only the missing floor/ceiling strips, meeting the existing slab edges.
for(const [id,a,b,d,e]of[['office-extension',98,104,-53,-35],['cafe-extension',93,104,-101,-92]]){
 box(id+'-floor',world,a,b,d,e,F,F-.28,7,'public-floor');
 box(id+'-ceiling',world,a,b,d,e,C+.18,C,8,'ceiling');
}
// Reconstruct the retained boundary outside the room extensions.
edge('passage-west-remainder',world,[104,-188],[104,-101]);
edge('cafe-west-extension',world,[93,-101],[93,-92]);
edge('office-west-extension',world,[98,-53],[98,-35]);
edge('south-core-north-remainder',world,[93,-53],[98,-53]);

// The existing paid-core walls close the backs of the attached shops.
room('shop-10',world,103,109,-7,-2,'east',{omit:['west'],width:3.2,border:0});
room('shop-11',world,103,109,-33,-17,'east',{omit:['west'],width:3.4,border:4});
room('shop-12',world,98,109,-55,-48,'east',{omit:['north'],width:3});
// Retained South core wall closes X98..105 along Z-55.
edge('shop-12-north-remainder',world,[105,-55],[109,-55]);
room('shop-13',world,105,109,-71,-57,'east',{omit:['west'],width:4.5,border:4,insideDepth:1.15});
room('shop-14',world,93,109,-101,-89,'east',{omit:['south','west'],width:4.4});
edge('shop-14-south-remainder',world,[105,-89],[109,-89]);
// The counter has a recessed customer bay; the working area is enclosed.
box('shop-13-counter',world,106.6,107.3,-70.4,-57.6,F+.95,F,3,'counter');
box('shop-13-display',world,106.65,107.25,-70.3,-57.7,F+1.3,F+.95,2,'display-case');
blocked.push({label:'Shop 13 counter retains its working area',start:pt(world,109,-64),yaw:-90,axis:'x',limit:107.4,sign:1});

// The mapped station office has a closed staff door and public-facing window.
for(const[a,b,id]of[[[98,-46],[109,-46],'south'],[[98,-36],[109,-36],'north'],[[98,-46],[98,-36],'west'],[[109,-46],[109,-36],'east']])edge('office-'+id,world,a,b);
box('office-door',world,109.08,109.13,-42.1,-40.9,F+2.25,F+.02,1,'staff-door');
box('office-handle',world,109.13,109.2,-41.95,-41.88,F+1.15,F+.98,0,'door-handle');decor();
box('office-window-frame',world,109.08,109.14,-39.9,-37.2,F+2.25,F+1.05,1,'window-frame');decor();
box('office-window',world,109.14,109.15,-39.8,-37.3,F+2.15,F+1.15,2,'staff-window');decor();
// Label above a closed wall, with no route falsely advertised through it.
const before=routes.length;
frontage('office-label',world,[109,-42.6],[109,-40.4],[-1,0],{width:1.2,glass:false,label:'STATION OFFICE'});
routes.splice(before);
fixture('office-fixture',world,103.5,-41);
rooms.push({id:'station-office',frame:'world',polygon:[[98,-46],[109,-46],[109,-36],[98,-36]],face:'east',limits:'Closed staff office envelope; interior fittings and exact internal divisions are unfinished.'});
blocked.push({label:'Station office remains staff-only',start:pt(world,111,-41.5),yaw:-90,axis:'x',limit:109.2,sign:1});

// The operator map locates small serving kiosks on both sides of Central 1.
room('kiosk-15',central,6,8.5,-4,2.5,'east',{omit:['west'],width:2.4,insideDepth:.95});
room('kiosk-16',central,-8.5,-6,2,6,'west',{omit:['east'],width:2.2,insideDepth:.95});
for(const[id,a,b,d,e]of[['15',6.4,7.1,-3.6,2.1],['16',-7.1,-6.4,2.4,5.6]]){
 box('kiosk-'+id+'-counter',central,a,b,d,e,F+.9,F,3,'counter');
 box('kiosk-'+id+'-display',central,a+.05,b-.05,d+.1,e-.1,F+1.25,F+.9,2,'display-case');
}

// Finish the collected collinear walls without duplicate shared surfaces.
const groups=new Map();
for(const w of walls){const key=JSON.stringify([w.f.id,w.axis,w.fixed,w.bottom,w.top,w.mi,w.width]);const rows=groups.get(key)||[];rows.push(w);groups.set(key,rows);}
for(const rows of groups.values()){
 rows.sort((a,b)=>a.a-b.a);const merged=[];
 for(const w of rows){const last=merged.at(-1);if(last&&w.a<=last.b+1e-7)last.b=Math.max(last.b,w.b);else merged.push({...w});}
 for(const w of merged){const a=[],b=[];a[w.axis]=w.a;b[w.axis]=w.b;a[1-w.axis]=b[1-w.axis]=w.fixed;
  const A=P(w.f,a[0],(w.top+w.bottom)/2,a[1]),B=P(w.f,b[0],(w.top+w.bottom)/2,b[1]);c.beam(prefix+w.id,A,B,w.width,w.top-w.bottom,w.mi,'wall');
 }
}

route('Eastern public aisle past both southern cores',[pt(world,112,1),pt(world,112,-105)],true);
route('Central 1 eastern kiosk aisle',[pt(central,9.7,-5.5),pt(central,9.7,8)],true);
route('Central 1 western kiosk aisle',[pt(central,-9.7,0),pt(central,-9.7,9)],true);
route('Central 2 retained gate approach',[pt(world,112,-10.5),pt(world,97,-10.5)],true);
route('South retained gate approach',[pt(world,112,-77.5),pt(world,99,-77.5)],true);
route('South platform lift approach',[pt(world,99,-77.5),pt(world,99,-87),pt(world,96.1,-87)],true);
route('Shop 12 across the new floor join',[pt(world,112,-51.5),pt(world,99.5,-51.5)],true);
route('Shop 14 across the new floor join',[pt(world,112,-95),pt(world,94.5,-95)],true);
route('Retained JR public gate connection',[pt(world,112,-23.5),pt(world,151,-23.5),pt(world,151,-36.45),pt(world,147.7,-36.45)],true);
const addView=(id,f,w,t,tw,tt,y=F+1.65)=>views.push([id,Object.values(pt(f,w,t,y)),Object.values(pt(f,tw,tt,y))]);
addView('central-two-north',world,114,0,105,-6);
addView('central-two-shop',world,114,-21,105,-25);
addView('central-two-gate',world,112,-10.5,97,-10.5);
addView('station-office',world,114,-41,104,-41);
addView('south-north-room',world,114,-48,101,-52);
addView('south-counter',world,114,-62,105,-64);
addView('south-gate',world,113,-77.5,99,-77.5);
addView('south-lift-approach',world,99,-88,96.1,-84);
addView('south-cafe-entry',world,114,-92,100,-95);
addView('south-cafe-inside',world,96,-96,114,-94);
addView('south-public-aisle',world,112,-101,112,-40);
addView('kiosk-east',central,10.8,-2,6.5,-.75);
addView('kiosk-west',central,-11,5,-6.5,4);
for(const p of c.panels)p.material=p.browserMaterial===2?'glass':'stone';
const report=await c.save(out,'subway-south-rooms.glb',{componentPrefix:prefix,sourceCollection:'Southern subway public rooms and service frontages',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Add missing shops 10–14, the station office and serving kiosks 15–16, with joined floor and ceiling extensions and intact gate/lift/public passage routes.',
 geometry:{floor:F,retiredIds,retiredLights,routes,rooms,blocked,spawn:pt(world,112,-10.5)},
 references:['https://kotochika.kyoto/kyoto/','https://kotochika.kyoto/kyoto/shop.html','research/kyoto-station/maps/kotochika-kyoto-2026.pdf','research/kyoto-station/maps/subway-kyoto-plan.pdf'],
 limits:['Operator diagrams establish relationships; room dimensions and door positions are fitted to the retained station.','The staff office is closed; exact partitions and tenant fittings remain unfinished.','The current operator page supplies no photograph of the southern cafe; its room envelope has provisional finishes.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/views.json',JSON.stringify(views,null,2)+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights},null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,rooms:rooms.length,routes:routes.length,blocked:blocked.length});
