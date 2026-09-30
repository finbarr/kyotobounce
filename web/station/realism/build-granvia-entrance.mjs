// Complete the hotel main entrance, fitted to the official 1F/2F circulation maps.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw),spec=await read(out+'/spec.json');assert.equal(sha(raw),m.layoutSha256);assert.equal(spec.parentLayoutSha256,m.layoutSha256);
const prefix='granvia-entrance-',H=5.5,old=layout.escalators.find(e=>e.id==='east-concourse-lower-escalator-1');assert.equal(old.height,H);
const template=layout.panels.filter(p=>p.id.startsWith(old.id+'-'));assert.equal(template.length,30);
const sourceMaterials=[...new Set(template.map(p=>p.appearance))].map(id=>layout.authoredMaterials.find(m=>m.id===id));
assert(sourceMaterials.every(m=>!m.albedo),'Keep textured source materials in the original station');
const materials=sourceMaterials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic},...(r.linearColor.a<1?{alphaMode:'BLEND',doubleSided:true}:{})}));
function mat(name,color,roughness=.6,metallic=0){const i=materials.length;materials.push({name:'Granvia entrance | '+name,pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:roughness,metallicFactor:metallic},...(color[3]<1?{alphaMode:'BLEND',doubleSided:true}:{})});return i;}
const stone=mat('pale stone',[.52,.47,.39,1],.35),wall=mat('warm walls',[.47,.33,.21,1]),ceiling=mat('ceiling',[.65,.61,.53,1]),metal=mat('bronze trim',[.17,.13,.085,1],.3,.8),glass=mat('glazing',[.55,.7,.73,.15],.18),tactile=mat('warning paving',[.78,.57,.08,1]);
const diffuser=mat('diffuser',[1,.87,.64,1]);materials[diffuser].emissiveFactor=[1,.87,.64];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],point=(x,y,z)=>({x,y,z}),rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],lights=[],routes=[],pits=[];
const slab=(id,ring,y,depth,mi=stone,role='floor',holes=[])=>{c.slab(prefix+id,ring.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);};
const box=(id,a,b,d,e,top,bottom,mi=wall,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=metal,role='guard')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
function light(id,x,z,y){box('fixture-'+id,x-.35,x+.35,z-.15,z+.15,y-.02,y-.06,diffuser,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+id,position:point(x,y-.12,z),direction:point(0,-1,0),linearColor:{r:1,g:.87,b:.65},intensity:12,range:10,spotAngle:120,innerSpotAngle:80});}
function pair(label,ps){const points=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14);for(let k=1;k<=n;k++)points.push(point(...['x','y','z'].map(v=>a[v]+(b[v]-a[v])*k/n)));}routes.push({label,points},{label:label+' return',points:points.toReversed()});}
// Retain the original north canopy and sign; open the vestibule below it.
for(const [id,a,b]of[['west',54.8,56.5],['east',60.2,63.35]])box('entry-glazing-'+id,a,b,8.64,8.68,2.6,0,glass,'glazing');
for(const x of[54.8,56.5,60.2,63.35])beam('entry-mullion-'+x,[x,0,8.66],[x,2.6,8.66],.055,.055);
box('foyer-east',66.85,67,1.18,8.64,4.2,0);box('foyer-north-return',63.35,67,8.64,8.8,4.2,0);
box('foyer-north-head',54.8,63.35,8.64,8.8,4.2,3.4);
box('foyer-ceiling',54.8,67,1.18,8.8,4.32,4.2,ceiling,'ceiling');
box('foyer-east-passage-connection',66.85,67,-2.16,1.18,4.2,0);
// The east–west public passage stays open across the new entrance route.
for(const [id,z0,z1]of[['north',.89,1.19],['south',-2.17,-1.87]]){
 for(const x of[56.5,60.2])box('passage-'+id+'-jamb-'+x,x-.015,x+.015,z0,z1,2.7,0,metal,'door-frame');
 box('passage-'+id+'-head',56.5,60.2,z0,z1,2.715,2.7,metal,'door-frame');
}
box('south-room-west',50.95,51,-17.4,-2.16,4.9,0);
box('south-room-east',66.85,67,-17.4,-2.16,6.99,0);
box('south-room-back-west',51,59.7,-17.55,-17.4,8.7,0);
box('south-room-back-east',59.7,67,-17.55,-17.4,6.99,0);
box('south-ceiling-east-edge',59.7,67,-17.55,-17,7.11,6.99,ceiling,'ceiling');
// The retained theatre floor and sloped M3F stair supply the other soffits.
for(const [id,a,b,d,e]of[['west',51,51.3,-17.4,-7.8],['east',54,59.7,-17.4,-7.8],['south',51.3,54,-17.4,-13.65]])box('south-ceiling-'+id,a,b,d,e,8.82,8.7,ceiling,'ceiling');
box('south-low-ceiling',54,59.7,-7.8,-2.16,4.12,4,ceiling,'ceiling');
// Broad stair up to the hotel, south of the paired moving lanes.
const stair={bottomX:61.9,topX:52.3,z0:-15.1,z1:-12.1,count:32,rise:H/32,going:.3};
for(let i=0;i<stair.count;i++)box('step-'+i,stair.bottomX-(i+1)*.3,stair.bottomX-i*.3,stair.z0,stair.z1,(i+1)*stair.rise,i*stair.rise-.2,stone,'stair-tread');
box('upper-landing',51,52.3,-15.1,-9.08,H,H-.25,stone,'stair-landing');
for(const z of[-15.1,-9.08]){box('upper-landing-guard-'+z,51,52.3,z-.035,z+.035,H+1.08,H,glass,'guard');beam('upper-landing-cap-'+z,[51,H+1.1,z],[52.3,H+1.1,z],.06,.06);}
for(const z of[stair.z0,stair.z1]){beam('stair-rail-'+z,[61.9,1,z],[52.3,H+1,z],.065,.065);for(let i=0;i<=8;i++){const x=61.9-9.6*i/8,y=H*i/8;beam('stair-post-'+z+'-'+i,[x,y,z],[x,y+1,z],.055,.055);}}
for(const [id,a,b]of[['south',-21.25,-15.1],['north',-9.08,-5.8]])box('lobby-east-wall-'+id,50.8,51,a,b,8.7,H,ceiling);
box('lobby-east-header',50.8,51,-15.1,-9.08,8.7,8.35,ceiling,'door-header');
// Rigid copies preserve the proven 5.5 m chain geometry, pitch and casing.
const upperEnd=Math.max(...template.find(p=>p.id.endsWith('upper-pit-cover')).vertices.map(v=>v.x))-old.lowerCenter.x,escalators=[],combSupports=[],mouths=[];
for(const [name,z,speed]of[['up',-11.4,.5],['down',-9.8,-.5]]){
 const id=prefix+'escalator-'+name,O=point(52.3+upperEnd,0,z),world=v=>point(O.x-(v.x-old.lowerCenter.x),v.y,z-(v.z-old.lowerCenter.z));
 for(const p of template){c.add(p.id.replace(old.id,id),p.vertices.map(v=>{const q=world(v);return P(q.x,q.y,q.z);}),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),sourceMaterials.findIndex(m=>m.id===p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
 const e={...old,id,lowerCenter:O,uphill:point(-1,0,0),speed,phase:name==='down'?.37:0,status:'Paired ground-to-lobby escalators from the official Granvia floor maps; fitted dimensions and operating directions.'};escalators.push(e);
 for(const end of['lower','upper']){const p=c.panels.find(p=>p.id===id+'-'+end+'-comb-transfer'),along=p.vertices.map(v=>O.x-v.x);combSupports.push({support:p.id,along:(Math.min(...along)+Math.max(...along))/2,length:Math.max(...along)-Math.min(...along)});}
 const cover=c.panels.find(p=>p.id===id+'-lower-pit-cover');const bounds={minX:O.x-2.3,maxX:Math.max(...cover.vertices.map(v=>v.x)),minZ:z-.56,maxZ:z+.56};pits.push(bounds);slab('pit-'+name,rect(bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ),-1.32,.12,metal,'pit-floor');
 const lower=point(O.x+e.flatLength+1.15,0,z),upper=point(51.6,H,z);mouths.push({name,lower,upper});
 const combEnd=O.x-e.run-e.flatLength;box('escalator-'+name+'-upper-apron',52.3,combEnd,z-.60,z+.60,H,H-.035,metal);
 for(const zz of[z-.60,z+.60])beam('escalator-'+name+'-mouth-'+zz,[52.3,H+1.05,zz],[combEnd,H+1.05,zz],.065,.065);
 for(const [end,p]of[['lower',lower],['upper',upper]]){box(name+'-'+end+'-warning',p.x-.15,p.x+.15,z-.5,z+.5,p.y+.004,p.y+.001,tactile,'tactile');c.panels.at(-1).collision=false;}
}
// Replace the northern fixed lift doors with a full two-stop car and shaft.
const lift=subwayLift({id:prefix+'lift',origin:point(53.2,0,5.5),height:H});lift.yaw=180;
const local=(id,a,b,d,e,top,bottom,mi=wall,role='shaft')=>box('lift-shaft-'+id,lift.origin.x-b,lift.origin.x-a,lift.origin.z-e,lift.origin.z-d,top,bottom,mi,role);
local('back',-1.6,1.6,1.35,1.5,8.45,-1.3);for(const x of[-1.6,1.45])local('side-'+x,x,x+.15,-1.6,1.35,8.45,-1.3);
local('pit',-1.6,1.6,-1.6,1.5,-1.3,-1.45,metal,'pit-floor');local('roof',-1.6,1.6,-1.6,1.5,8.6,8.45,ceiling,'ceiling');
for(const [id,y]of[['ground',0],['lobby',H]]){
 local(id+'-sill',-1.6,1.6,-1.6,-1.185,y,y-.12,metal,'lift-sill');
 for(const [n,a,b]of[['left',-1.6,-.74],['right',.74,1.6]])local(id+'-'+n,a,b,-1.6,-1.38,y+2.3,y,wall);
 local(id+'-head',-1.6,1.6,-1.6,-1.38,y+2.5,y+2.2,metal,'lift-frame');
}
local('front-middle',-1.6,1.6,-1.6,-1.38,H,2.5);local('front-top',-1.6,1.6,-1.6,-1.38,8.45,H+2.5);
pits.push({minX:51.6,maxX:54.8,minZ:4.15,maxZ:6.9});
box('lift-upper-landing',51.6,56.8,7.1,8.9,H,H-.3);
box('lift-upper-walk',54.8,56.8,-1.35,7.1,H,H-.3);
box('lift-upper-ceiling',51.6,56.8,-1.35,8.9,8.75,8.6,ceiling,'ceiling');
box('lift-upper-north',51.6,56.8,8.9,9.05,8.6,H);
box('lift-upper-east',56.8,56.95,-1.35,9.05,8.6,H);
box('lift-upper-west-south',54.65,54.8,-1.35,4.0,8.6,H);
box('lift-upper-west-north',51.45,51.6,7.1,9.05,8.6,H);
// The door to the retained M3F lower landing is at the south end of the new hall.
box('retained-landing-north-left',51.5,54,-1.5,-1.35,8.09,H);
box('retained-landing-north-header',54,55.65,-1.5,-1.35,8.09,H+2.35);
for(const [id,x,z,y]of[['foyer',58.5,5.5,4.2],['lift-ground',53.2,8,4.2],['lower-hall',63.5,-5,6.99],['stair-foot',64,-14,6.99],['stair-top',54.9,-14,8.7],['lift-upper',53.2,8,8.6],['upper-corridor',55.8,2,8.6]])light(id,x,z,y);
const stairRoute=[point(59.4,0,14),point(58.4,0,8),point(58.4,0,3),point(58.4,0,-3),point(65.7,0,-3),point(65.7,0,-13.6),point(62.5,0,-13.6),point(61.9,0,-13.6),point(52.3,H,-13.6),point(49,H,-13.6),point(47,H,-5),point(40,H,-3.5)];pair('Main entrance stair',stairRoute);
for(const mouth of mouths){pair(mouth.name+' lower approach',[point(58.4,0,3),point(58.4,0,-3),point(65.7,0,-3),point(65.7,0,mouth.lower.z),mouth.lower]);pair(mouth.name+' upper approach',[point(47,H,-5),point(47,H,mouth.upper.z),mouth.upper]);}
pair('Lift ground approach',[point(59.4,0,14),point(59.4,0,8),point(53.2,0,8)]);
pair('Lift lobby approach',[point(53.2,H,8),point(55.8,H,8),point(55.8,H,0),point(55.05,H,0),point(55.05,H,-2.6),point(52.65,H,-2.75),point(49.5,H,-3.5),point(47,H,-3.5)]);
pair('Retained ground passage',[point(46,0,-.5),point(58.4,0,-.5),point(65.7,0,-.5)]);
const prior=await read('.local/v2/current/components/gate-east-access/report.json');pair('Retained M3F stair',prior.geometry.route.filter(p=>p.x>=46));
pair('Retained theatre approach',[point(49.5,H,-3.5),point(52.65,H,-2.75),point(54.8,H,-3.5),point(54.8,H,-6),point(56,H,-6),point(59.7,7.35,-6),point(63,7.35,-6)]);
for(const p of c.panels)if(!p.id.startsWith(prefix+'escalator-'))p.material=p.browserMaterial===metal?'steel':p.browserMaterial===glass?'glass':'stone';
const blocked=[{label:'Upper landing south edge',start:point(51.65,H,-14.35),yaw:180,axis:'z',limit:-14.9,sign:1},{label:'Upper landing north edge',start:point(51.65,H,-9.9),yaw:0,axis:'z',limit:-9.3,sign:-1}];
const geometry={H,stair,blocked,pits,mouths,liftIds:[lift.id],routes,spawn:point(59.4,0,14),retiredIds:spec.retiredIds,retiredBoxIds:spec.retiredBoxIds,retiredLights:[],modifiedPanelIds:['concourse',...Object.keys(spec.wallCuts)]};
const report=await c.save(out,'granvia-entrance.glb',{componentPrefix:prefix,sourceCollection:'Granvia main entrance and lobby connections',motionArchitecture:'granviaEntranceV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the ground hotel entrance and connect it to the existing 2F lobby with a broad stair, paired escalators and lift, retaining the ground passage, M3F route and theatre approach.',geometry,references:['https://jrwest-hotels.jp/granvia-kyoto/floor/','research/kyoto-station/maps/granvia-1f-map.jpg','research/kyoto-station/maps/granvia-2f-map.jpg','https://jrwest-hotels.jp/granvia-kyoto/access/'],limits:['Floor maps establish topology. Room dimensions, registration, finishes and escalator directions are fitted game settings.','The complete hotel, vehicle approach and parking ramps remain unfinished.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const nr=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nr);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/motion.json',JSON.stringify({escalators,combSupports,lifts:[lift]},null,2)+'\n');
for(const [i,shaftBounds]of pits.entries())await writeFile(out+'/pit-'+i+'.json',JSON.stringify({shaftBounds})+'\n');
await writeFile(out+'/views.json',JSON.stringify([['entrance',[59.4,1.7,14],[58.4,1.7,3]],['cross-passage',[58.4,1.7,4],[58.4,1.7,-8]],['stair',[65,1.7,-13.6],[51,6.5,-13.6]],['escalators',[65.5,1.7,-10.6],[52,6.5,-10.6]],['upper-arrival',[48,7.2,-12],[58,4,-12]],['lift-ground',[53.2,1.7,9],[53.2,1.7,5]],['lift-upper',[55.8,7.2,8],[53.2,7.2,5.5]],['upper-corridor',[55.8,7.2,6],[55,7.2,-3]],['m3f-preserved',[52.65,10.8,-12.1],[52.65,7.1,-3.8]]],null,2)+'\n');
console.log({panels:c.panels.length,triangles:report.geometry.triangles,routes:routes.length,escalators:escalators.length,lifts:1});
