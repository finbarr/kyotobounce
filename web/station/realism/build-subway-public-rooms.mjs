// Public rooms around the retained North and Central 1 subway gate cores.
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
const [north,central]=spec.cores,F=-6.2,C=-2.8,prefix='subway-public-rooms-';
assert.equal(spec.floor,F);assert.equal(spec.ceiling,C);
for(const core of [north,central])assert(l.panels.some(p=>p.id==='subway-refit-'+core.id+'-paid-end-'+core.paidBounds[2]));
const oldPrefixes=['north-head-shop','north-island-shop','central-west-shop','central-east-shop'].map(p=>'subway-refit-'+p);
const retiredIds=l.panels.filter(p=>oldPrefixes.some(s=>p.id.startsWith(s))).map(p=>p.id);
const retiredLights=l.authoredLights.filter(p=>oldPrefixes.some(s=>p.id.startsWith(s))).map(p=>p.id);
assert.equal(retiredIds.length,38);assert.equal(retiredLights.length,6);
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Subway public rooms | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('pale stone',[.64,.61,.54]),mat('dark frames',[.055,.055,.052],.35,.4),
 {...mat('glazing',[.58,.64,.61]),pbrMetallicRoughness:{baseColorFactor:[.58,.64,.61,.16],roughnessFactor:.2,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},
 mat('timber',[.26,.15,.075]),mat('cafe border',[.13,.085,.19]),
 {...mat('diffuser',[1,.95,.83]),emissiveFactor:[1,.95,.83]},mat('letters',[.93,.94,.88])];
const c=construction(materials,{flatNormals:true}),font=new FontLoader().parse(await read('research/kyoto-station/fonts/helvetiker_regular.typeface.json'));
const lights=[],routes=[],rooms=[],walls=[],views=[];
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
function frontage(id,f,a,b,inward,{width=2.6,glass=true,border=1,label=null}={}){
 const len=Math.hypot(b[0]-a[0],b[1]-a[1]),middle=a.map((v,i)=>(v+b[i])/2),half=Math.min(width,len*.65)/2;
 const tangent=a.map((v,i)=>(b[i]-v)/len),lo=middle.map((v,i)=>v-tangent[i]*half),hi=middle.map((v,i)=>v+tangent[i]*half);
 for(const [p,q,suffix]of[[a,lo,'a'],[hi,b,'b']]){
  if(glass){edge(id+'-plinth-'+suffix,f,p,q,F,F+.22,3,.12);edge(id+'-glass-'+suffix,f,p,q,F+.22,F+2.6,2,.035);}
  else edge(id+'-side-'+suffix,f,p,q,F,F+2.6,0,.14);
 }
 edge(id+'-header',f,a,b,F+2.6,C,border,.2);
 for(const[i,p]of[a,lo,hi,b].entries())box(id+'-post-'+i,f,p[0]-.035,p[0]+.035,p[1]-.035,p[1]+.035,F+2.6,F,border,'door-frame');
 const outside=middle.map((v,i)=>v-inward[i]*1.35),inside=middle.map((v,i)=>v+inward[i]*1.8);
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

// The paid core end walls already close the back of these attached shops.
// Set the northern shop back enough to leave a real cross-aisle at its head.
room('north-01',north,-6,6,-28.5,-21,'north',{omit:['south'],width:4});
room('north-02',north,-6,0,10,17.5,'west',{omit:['north']});
room('north-03',north,-6,0,17.5,25,'west');
room('north-04',north,-6,0,25,32.5,'west');
room('north-06',north,0,6,10,22.5,'east',{omit:['north'],width:3.4});
room('north-05',north,0,6,22.5,32.5,'east',{width:3});

// OGAWA's mapped position is the head of Central 1, facing the cross-plaza.
room('central-09',central,-6,6,-31.5,-24,'north',{omit:['south'],width:3,border:4});
room('central-07',central,12,24,-22,-6,'west',{width:5});
room('central-08',central,12,24,-6,2,'west',{width:3.2});

// A public side approach leads around the bakery into the toilet lobby.
// The operator locates the facilities; these internal dimensions are fitted.
room('women',central,24,30,-15,-3,'south',{glass:false,width:1.8,label:'WOMEN'});
room('men',central,30,36,-15,-3,'south',{glass:false,width:1.8,label:'MEN'});
room('accessible',central,36,40,-3,5,'west',{glass:false,width:1.8,label:'ACCESSIBLE'});
edge('lobby-west',central,[24,-3],[24,5]);
frontage('toilet-lobby',central,[36,5],[24,5],[0,-1],{width:3.4,glass:false,label:'TOILETS'});
fixture('toilet-lobby-fixture',central,30,1);
rooms.push({id:'toilet-lobby',frame:central.id,polygon:[[24,-3],[36,-3],[36,5],[24,5]].map(([w,t])=>at(central,w,t)),face:'south',limits:'Public lobby and fitted room partitions; final sanitary fittings and exact stall layout remain unfinished.'});

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

route('North head cross-aisle',[pt(north,-10,-30.3),pt(north,0,-30.3),pt(north,10,-30.3)],true);
route('North shopping island west and east loop',[pt(north,-10,8),pt(north,-10,35),pt(north,10,35),pt(north,10,8)],true);
route('Central 1 eastern shops and toilet lobby',[pt(central,9,-23),pt(central,9,6.7),pt(central,30,6.7),pt(central,30,1)],true);
for(const [name,w]of[['Women',27],['Men',33]])route(name+' room from public lobby',[pt(central,30,1),pt(central,w,0),pt(central,w,-9)],true);
route('Accessible room from public lobby',[pt(central,30,1),pt(central,38,1)],true);
route('Central 1 plaza and cafe approach',[pt(central,-10,-29),pt(central,-10,-33.2),pt(central,0,-33.2),pt(central,0,-29.5)],true);
route('Retained Porta approach and western gate aisle',[{x:55.5,y:F,z:52.5},{x:73,y:F,z:52.5},pt(central,-9,-25),pt(central,-9,3)],true);
for(const f of [north,central])route(f.id+' retained gate banks',[pt(f,-10,-12.5),pt(f,0,-12.5),pt(f,10,-12.5)],true);
// Start the return on the main floor, clear of the lift threshold's 4 mm seam.
route('Central 1 public lift approach',[pt(central,-9,-12.5),pt(central,0,-12.5),{x:92.93,y:F,z:43.1}],true);
route('Exit 5 public lift approach',[pt(central,9,-24),{x:107.5068,y:F,z:52.2}],true);

const addView=(id,f,w,t,tw,tt,y=F+1.65)=>views.push([id,Object.values(pt(f,w,t,y)),Object.values(pt(f,tw,tt,y))]);
addView('north-head',north,-8,-30.5,0,-26);
addView('north-west-fronts',north,-10,12,-6,30);
addView('north-east-fronts',north,10,11,6,31);
addView('north-island-end',north,0,37,0,27);
addView('central-cafe',central,0,-35,0,-27);
addView('central-grocery',central,8,-10,20,-14);
addView('central-bakery',central,8,-5,20,-2);
addView('toilet-approach',central,17,7,31,3);
addView('toilet-lobby',central,30,2,30,-5);
addView('accessible-entry',central,32,1,39,1);
addView('central-west-route',central,-10,-22,-10,5);
for(const p of c.panels)p.material=p.browserMaterial===2?'glass':'stone';
const report=await c.save(out,'subway-public-rooms.glb',{componentPrefix:prefix,sourceCollection:'Subway public shops and washroom approaches',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Correct North and Central 1 public room groupings, add the missing washroom approach, and preserve the retained gate, lift and Porta routes.',
 geometry:{retiredIds,retiredLights,routes,rooms,spawn:pt(central,9,-18)},
 references:['https://kotochika.kyoto/kyoto/','research/kyoto-station/maps/kotochika-kyoto-2026.pdf','research/kyoto-station/maps/subway-kyoto-plan.pdf'],
 limits:['Operator diagrams establish relationships; room dimensions and internal washroom partitions remain fitted.','Tenant fitouts, exact sanitary fixtures, final signage and the remaining southern shops are unfinished.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/views.json',JSON.stringify(views,null,2)+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights},null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,rooms:rooms.length,routes:routes.length});
