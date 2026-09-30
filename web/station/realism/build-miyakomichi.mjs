// Ground-level Miyako Michi circulation fitted from the operator's floor guide.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);
const mat=(name,rgb,roughness=.6,metallic=0)=>({name:'Miyako Michi | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('charcoal tile',[.23,.225,.21],.42),mat('cream stone',[.65,.61,.51]),mat('dark timber',[.19,.105,.055]),mat('warm ceiling',[.57,.43,.27]),mat('bronze',[.43,.29,.10],.32,.72),mat('black frames',[.06,.065,.06],.36,.5),{...mat('glazing',[.45,.5,.47]),pbrMetallicRoughness:{baseColorFactor:[.45,.5,.47,.18],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},{...mat('diffuser',[.95,.90,.75]),emissiveFactor:[.95,.9,.75]},mat('water',[.055,.085,.075],.15),mat('pavement',[.45,.44,.40],.8)];
const retiredIds=['kintetsu-head-south-wall'];assert(retiredIds.every(id=>l.panels.some(p=>p.id===id)));
// Keep the upper railway enclosure. The lower eastern remainder still closes
// the old head-concourse volume beside the ASTY access corridor.
const old=l.panels.find(p=>p.id===retiredIds[0]),originalMaterial=l.authoredMaterials.find(a=>a.id===old.appearance);assert(originalMaterial&&!originalMaterial.albedo);
const retainedMi=materials.length;materials.push({name:originalMaterial.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>originalMaterial.linearColor[k]),roughnessFactor:originalMaterial.roughness,metallicFactor:originalMaterial.metallic}});
const c=construction(materials,{flatNormals:true}),prefix='miyakomichi-',C=3.15,lights=[],routes=[],bays=[];
// X uses the roughly 200 m street extent; Z is fitted between the retained
// railway building and the Hachijo frontage. These are not survey coordinates.
const X=u=>-90+(u-1343)/6,Z=v=>-187+(327-v)*.115,P=(u,y,v)=>[X(u),y,-Z(v)],point=(u,v,y=0)=>({x:X(u),y,z:Z(v)}),rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab(prefix+id,poly.map(([u,v])=>P(u,y,v)),[],depth,mi,role);
const box=(id,a,b,d,e,top=C,bottom=0,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=5,role='frame')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decor=()=>{c.panels.at(-1).collision=false;};
function route(label,points,pair=false){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/14));for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));}routes.push({label,points:split});if(pair)routes.push({label:label+' return',points:split.toReversed()});}
function nativeBox(id,a,b,d,e,top,bottom,mi){c.slab(prefix+id,[[a,top,-d],[b,top,-d],[b,top,-e],[a,top,-e]],[],top-bottom,mi,'wall');}
nativeBox('retained-upper-wall',-106,-81,-170.15,-170,7.175,3.295,retainedMi);
nativeBox('retained-lower-wall',-90,-81,-170.15,-170,3.295,0,retainedMi);
const headEdge=327-17/.115;
// The existing Kintetsu ground floor fills the rectangular northeast notch.
slab('connected-ground',[[52,212],[300,212],[300,175],[368,175],[395,42],[635,99],[1247,99],[1247,headEdge],[1343,headEdge],[1343,455],[52,455]],0,.35,9,'public-floor');
const outline=[[52,212],[300,212],[300,175],[368,175],[395,42],[635,99],[1343,99],[1343,327],[199,327],[199,308],[52,308]];
slab('building-roof',outline,C+.15,.15,3,'ceiling');
// A dark street surface, shaped around the operator map's two changes of line.
slab('street-inlay',[[363,211],[394,211],[394,175],[427,175],[427,222],[648,222],[648,245],[816,245],[816,202],[1343,190],[1343,258],[1027,245],[969,245],[969,327],[941,327],[941,245],[837,245],[837,267],[648,267],[648,327],[618,327],[618,245],[396,245],[396,327],[363,327]],.003,.003,0,'public-floor');decor();
// Thin pale threshold bands meet every room; broad dark tile remains visible.
function edge(id,a,b,bottom=0,top=C,mi=1,width=.12){beam(id,[a[0],(top+bottom)/2,a[1]],[b[0],(top+bottom)/2,b[1]],width,top-bottom,mi,'wall');}
const walls=new Set();
function solid(id,a,b){const k=JSON.stringify([a,b].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));if(walls.has(k))return;walls.add(k);edge(id,a,b);}
function bay(id,poly,front,label,options={}){
 const[a,b]=front,dx=X(b[0])-X(a[0]),dz=Z(b[1])-Z(a[1]),length=Math.hypot(dx,dz),mid=a.map((v,i)=>v+(b[i]-v)*(options.doorFraction??.5)),door=Math.min(options.doorWidth??2.5,length*.55),t=door/(2*length),lo=a.map((v,i)=>mid[i]-(b[i]-v)*t),hi=a.map((v,i)=>mid[i]+(b[i]-v)*t);
 assert((options.doorFraction??.5)>t&&(options.doorFraction??.5)<1-t,'Doorway must fit inside its frontage');
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];if(JSON.stringify([p,q])===JSON.stringify(front)||JSON.stringify([q,p])===JSON.stringify(front))continue;solid(id+'-side-'+i,p,q);}
 for(const[p,q,suffix]of[[a,lo,'a'],[hi,b,'b']]){edge(id+'-plinth-'+suffix,p,q,0,.35,2);edge(id+'-glass-'+suffix,p,q,.35,2.45,6,.04);edge(id+'-sill-'+suffix,p,q,.33,.38,4,.1);}
 edge(id+'-fascia',a,b,2.45,C,2,.18);
 for(const [i,p]of[a,lo,hi,b].entries())box(id+'-post-'+i,p[0]-.27,p[0]+.27,p[1]-.39,p[1]+.39,2.45,0,5,'shop-frame');
 // Derive the interior side from the polygon centroid so every doorway walk
 // starts in the public street or forecourt and actually enters its room.
 const center=poly.reduce((p,v)=>p.map((n,i)=>n+v[i]/poly.length),[0,0]),normal=[-dz,dx],delta=[X(center[0])-X(mid[0]),Z(center[1])-Z(mid[1])],sign=Math.sign(normal[0]*delta[0]+normal[1]*delta[1]),n=normal.map(v=>v*sign/length),p=point(...mid),outside={x:p.x-n[0]*1.3,y:0,z:p.z-n[1]*1.3},inside={x:p.x+n[0]*1.6,y:0,z:p.z+n[1]*1.6};
 route(label+' doorway',[outside,inside,outside]);bays.push({id,label,polygon:poly,front,doorWidth:door});
}
function room(id,a,b,north,south,face='north',label='Room '+id,options={}){const p=rect(a,b,north,south),front=face==='north'?[p[0],p[1]]:face==='south'?[p[3],p[2]]:face==='east'?[p[1],p[2]]:[p[0],p[3]];bay(id,p,front,label,options);}
room('01',1262,1343,99,190,'south');room('02',1216,1262,99,202,'south');room('03',1027,1216,119,202,'south');
room('northeast-market',913,1027,119,222,'south','Northeast market hall');
room('21',837,913,179,222,'south');
// Keep this entry south of the retained Shinkansen viaduct pier.
room('east-washrooms',837,913,119,166,'west','Eastern washroom lobby',{doorFraction:.76,doorWidth:2});
room('25',649,698,124,245,'south');
bay('23',[[698,124],[816,124],[816,245],[752,245],[752,191],[698,191]],[[752,245],[816,245]],'Room 23');
room('24',698,752,191,245,'south');
for(const[id,a,b,ya,yb]of[['32',427,483,75,88],['31',483,530,88,100],['30',530,560,100,105],['29',560,585,105,111],['28',585,618,111,119]])bay(id,[[a,ya],[b,yb],[b,222],[a,222]],[[a,222],[b,222]],'Room '+id);
// Western washroom lobby and fountain plaza lie at the bend of the street.
bay('west-washrooms',[[384,88],[427,99],[427,160],[369,160]],[[369,160],[427,160]],'Western washroom lobby');
bay('37',[[300,175],[394,175],[394,211],[363,211],[363,245],[300,245]],[[363,211],[363,245]],'Room 37');
room('38',300,363,245,327,'east');room('39',232,300,245,327,'south');room('40',199,232,245,327,'south');room('41',52,199,245,308,'south');
for(const[id,a,b]of[['36',396,439],['35',439,482],['34',482,526],['33',526,618],['27',648,715],['26',715,816]])room(id,a,b,id==='27'||id==='26'?267:245,327);
room('22',837,883,245,305);room('east-service',883,941,245,327,'north','Eastern service hall');room('southeast-market',969,1027,245,327,'north','Southeast market hall');room('05',1027,1118,245,327);bay('04',[[1118,245],[1343,258],[1343,327],[1118,327]],[[1118,245],[1343,258]],'Room 04');
// Unknown rear/service areas are enclosed; no artificial public dead-end
// corridor is created behind the shops.
for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];if(a[1]===327||b[1]===327||a[1]===308||b[1]===308||a[0]===1343&&b[0]===1343)continue;solid('outer-'+i,a,b);}
// Wide eastern entrance and three mapped public exits. Doors are held open;
// the map's small southeast stair has no confirmed onward destination yet.
function portal(id,a,b){edge(id+'-header',a,b,2.6,C,4,.24);for(const[i,p]of[a,b].entries())box(id+'-jamb-'+i,p[0]-.4,p[0]+.4,p[1]-.6,p[1]+.6,2.6,0,4,'portal-jamb');}
portal('east-entry',[1343,190],[1343,258]);
for(const[a,b,id]of[[363,396,'west'],[618,648,'middle'],[941,969,'east']])portal('south-exit-'+id,[a,327],[b,327]);
// Bronze central pillar and the built basin at the western fountain location.
box('golden-pillar',802,810,238,248,C,0,4,'column');
box('fountain-basin',418,426,193,218,.13,0,5,'basin');box('fountain-water',418.4,425.6,193.5,217.5,.135,.13,8,'water');decor();
edge('fountain-back',[426,193],[426,218],.13,C,1,.12);
// Original tile joints, wall strips and linear fixtures give the route a
// coherent material rhythm without new textures or extra realtime lights.
for(let u=402;u<1335;u+=24){const v=u<618?232:u<837?254:233;box('tile-joint-'+u,u-.055,u+.055,v-9,v+9,.006,.003,1,'tile-joint');decor();}
for(const[u,v]of[[410,230],[452,233],[500,233],[550,233],[596,233],[674,254],[729,254],[783,254],[830,235],[880,234],[936,234],[992,234],[1055,232],[1120,230],[1190,228],[1270,226]]){
 box('fixture-'+u,u-3.8,u+3.8,v-1.5,v+1.5,C-.02,C-.06,7,'fixture');decor();lights.push({id:prefix+'light-'+u,position:{x:X(u),y:C-.12,z:Z(v)},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.92,b:.78},intensity:12,range:9,spotAngle:120,innerSpotAngle:80});
}
const street=[[1367,249],[1330,233],[1180,227],[1030,232],[835,233],[834,255],[632,255],[632,234],[411,234],[403,175]];
route('ASTY through Miyako Michi to western plaza',street.map(p=>point(...p)),true);
route('Street to eastern washroom lobby',[[831,232],[829,205],[829,154.72],[847,154.72]].map(p=>point(...p)),true);
route('Street to western washroom lobby',[[411,234],[403,183],[398,175],[398,146]].map(p=>point(...p)),true);
for(const[u,id]of[[380,'west'],[633,'middle'],[955,'east']])route('Hachijo public exit '+id,[point(u,u===380?237:u===633?254:233),point(u,322),point(u,351),point(u,414)],true);
route('Western forecourt to retained terrace stair',[point(105,414),point(1388,414),{x:-86,y:0,z:-195}],true);
// Preserve one upper Kintetsu passage directly over the opened lower wall.
route('Retained Kintetsu upper southern hall',[{x:-103,y:3.675,z:-166},{x:-84,y:3.675,z:-166}],true);
for(const p of c.panels)p.material=p.browserMaterial===4||p.browserMaterial===5?'steel':p.browserMaterial===6?'glass':'stone';
const report=await c.save(out,'miyakomichi.glb',{componentPrefix:prefix,sourceCollection:'Miyako Michi ground street and Hachijo frontage',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Connect the western ASTY entrance through Miyako Michi, its public exits and a continuous Hachijo forecourt, retaining the railway above.',geometry:{retiredIds,retiredLights:[],routes,bays,spawn:point(1325,233)},
 references:['https://kyoto-miyakomichi.com/floorguide','https://kyoto-miyakomichi.com/introduction','research/kyoto-station/maps/miyakomichi-official-2026.webp'],
 limits:['Operator map establishes connections and room grouping; dimensions, ceiling height and placement are fitted to the current station.','Dense eastern market and service clusters are grouped accessible room shells; individual stalls, tenant fitouts and the small mapped southeast stair destination remain unfinished.','Fountain basin is static; programmed falling-water art, final signage and detailed finishes are not implemented.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');
const views=[['east-entry',[1365,1.65,235],[1200,1.65,233]],['east-street',[1200,1.65,230],[840,1.65,232]],['golden-pillar',[875,1.65,233],[790,1.65,254]],['middle-bend',[650,1.65,255],[830,1.65,255]],['west-street',[585,1.65,234],[397,1.65,234]],['western-plaza',[403,1.65,233],[403,1.65,158]],['fountain',[403,1.65,205],[426,1.3,205]],['west-entrance',[380,1.65,365],[380,1.65,230]],['middle-entrance',[633,1.65,370],[633,1.65,251]],['east-exit',[955,1.65,360],[955,1.65,234]],['forecourt-west',[215,1.65,412],[825,1.65,330]],['forecourt-east',[1350,1.65,410],[860,1.65,325]],['east-room',[1300,1.65,180],[1300,1.65,125]]];
views.push(['east-washroom-entry',[829,1.65,178],[843,1.65,154.72]],['west-washroom-entry',[398,1.65,180],[398,1.65,140]]);
await writeFile(out+'/views.json',JSON.stringify(views.map(([id,p,t])=>[id,[X(p[0]),p[1],Z(p[2])],[X(t[0]),t[1],Z(t[2])]]),null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,bays:bays.length,routes:routes.length});
