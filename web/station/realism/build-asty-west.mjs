// Western ASTY street and its public stair beside the Kintetsu entrance.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);
const retiredIds=['hachijo-entrance-foyer-side-base-28','hachijo-entrance-foyer-side-glass-28',
 ...[-184,-181.5,-179,-176.5,-174].map(z=>'hachijo-entrance-side-mullion-28-'+z),
 'hachijo-entrance-ground-south-west','southern-gates-kintetsu-north-wall','southern-gates-kintetsu-north-base'];
assert(retiredIds.every(id=>l.panels.some(p=>p.id===id)));
const mat=(name,rgb,roughness=.6,metallic=0)=>({name:'ASTY West | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('pale tile',[.65,.62,.54],.45),mat('warm wall',[.72,.69,.62]),mat('ceiling',[.78,.78,.73]),
 mat('aluminium',[.42,.45,.46],.28,.8),mat('dark plinth',[.21,.22,.20]),mat('tactile',[.70,.48,.05]),
 {...mat('diffuser',[.96,.94,.84]),emissiveFactor:[.96,.94,.84]},
 {...mat('glazing',[.45,.53,.52]),pbrMetallicRoughness:{baseColorFactor:[.45,.53,.52,.19],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true}];
const c=construction(materials,{flatNormals:true}),prefix='asty-west-',C=3.225,H=3.675,lights=[],routes=[],bays=[];
const P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],point=(x,z,y=0)=>({x,y,z});
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='rail')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
const decoration=()=>{c.panels.at(-1).collision=false;};
function route(label,points,pair=false){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/15));for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));}routes.push({label,points:split});if(pair)routes.push({label:label+' return',points:split.toReversed()});}
// Fill only missing ground. Existing station and forecourt floors supply the
// east shop backs, southern islands and external stair approaches.
box('street-floor',-90,28,-181,-174,0,-.35,0,'public-floor');
box('north-room-floor',-73,-45,-174,-163,0,-.35,0,'shop-floor');
box('stair-corridor-floor',-81,-73,-174,-126,0,-.35,0,'public-floor');
box('stair-floor-east',-73,-69,-130,-126,0,-.35,0,'stair-floor');
// Ceiling top meets the retained upper public floor at Y3.295 without overlap.
box('street-roof',-81,28,-187,-174,3.295,C,2,'ceiling');
box('room-roof-west',-73,-45,-174,-163,3.295,C,2,'ceiling');
// The retained Shinkansen slab already supplies the eastern rooms' ceiling.
box('corridor-roof',-81,-73,-174,-130.15,3.295,C,2,'ceiling');
// Main foyer join and western street entrance.
for(const[x,id,front,back]of[[28,'foyer',-182,-176],[-81,'west',-181,-175]]){
 for(const[a,b]of[[x===28?-184:-182,front],[back,-174]])if(b>a)box(id+'-return-'+a,x-.075,x+.075,a,b,C,0);
 box(id+'-header',x-.075,x+.075,front,back,C,2.65,3,'portal-header');
 for(const z of[front,back])box(id+'-jamb-'+z,x-.09,x+.09,z-.06,z+.06,2.65,0,3,'portal-jamb');
}
box('retained-foyer-back',28,39,-174.15,-174,C,0);
// Equal-depth rooms share one side wall. Openings remain wide enough to enter
// and turn; these are architectural bays, not claimed tenant fitouts.
const walls=new Set();
function wall(id,a,b,d,e,top=C,bottom=0,mi=1,role='wall'){
 const key=JSON.stringify([a,b,d,e,top,bottom,mi]);if(walls.has(key))return;walls.add(key);box(id,a,b,d,e,top,bottom,mi,role);
}
function bay(id,a,b,front,back,label){
 const mid=(a+b)/2,door=Math.min(2.6,(b-a)*.45),side=Math.sign(back-front),lo=Math.min(front,back),hi=Math.max(front,back);
 wall(id+'-left',a-.06,a+.06,lo,hi);wall(id+'-right',b-.06,b+.06,lo,hi);wall(id+'-back',a,b,back-.06,back+.06);
 for(const[u,v,suffix]of[[a,mid-door/2,'left'],[mid+door/2,b,'right']]){
  wall(id+'-base-'+suffix,u,v,front-.06,front+.06,.4,0,4,'shop-plinth');
  wall(id+'-glass-'+suffix,u,v,front-.02,front+.02,2.4,.4,7,'shop-glazing');
 }
 wall(id+'-fascia',a,b,front-.09,front+.09,C,2.4,1,'shop-fascia');
 for(const x of[a,mid-door/2,mid+door/2,b])wall(id+'-post-'+x,x-.045,x+.045,front-.075,front+.075,2.4,0,3,'shop-frame');
 route(label+' doorway',[point(mid,front-side*1.6),point(mid,front+side*2),point(mid,front-side*1.6)]);
 bays.push({id,label,x:[a,b],front,back,doorWidth:door});
}
for(const[id,a,b,label]of[['01',-73,-45,'North shop 1'],['02',-45,-25,'North shop 2'],['03',-25,-18,'North service bay'],['information',-18,-7,'Information room'],['47',-7,5,'North shop 47'],['48',5,16,'North shop 48'],['tickets',16,28,'Ticket-office room']])bay('north-'+id,a,b,-174,-163,label);
for(const[id,a,b]of[[26,-81,-69],[25,-69,-59],[24,-59,-49],[23,-45,-32],[22,-32,-20],[21,-15,-5],[20,-5,13],[19,13,25]])bay('south-'+id,a,b,-182,-187,'South shop '+id);
// Ground approach to the public stair fits between the Kintetsu head concourse
// and the north-south passage. Its southern end opens directly into ASTY ROAD.
box('corridor-west',-81.15,-81,-174,-126,3.295,0);
box('corridor-east',-73.06,-72.94,-163,-130.15,C,0);
box('stair-north',-81,-69,-126.15,-126,7.175,0);
box('stair-south',-78.5,-69,-130.15,-130,7.175,0);
box('lower-door-header',-81,-78.5,-130.15,-130,7.175,2.6);
box('stair-roof',-81,-69,-130.15,-126,7.325,7.175,2,'ceiling');
// Replace only the affected upper hall wall and its base with an open portal.
for(const[a,b,id]of[[-138,-130,'south'],[-126,-119.04,'north']]){
 box('upper-wall-'+id,-69.15,-69,a,b,7.175,H);
 box('upper-base-'+id,-69,-68.965,a,b,H+.17,H,4,'base');
}
box('upper-portal-header',-69.15,-69,-130,-126,7.175,H+2.6);
const start=-69,midA=start-3.52,midB=midA-1.8,end=midB-3.52;
for(let f=0;f<2;f++){
 const a=f?midB:start,top=f?H/2:H;
 for(let i=0;i<11;i++)box('step-'+f+'-'+i,a-(i+1)*.32,a-i*.32,-130,-126,top-(i+1)*H/22,top-(i+1)*H/22-.29,0,'stair-tread');
}
box('middle-landing',midB,midA,-130,-126,H/2,H/2-.3,0,'stair-landing');
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1,a[2]],[b[0],b[1]+1,b[2]],.05,.05);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.7);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1,p[2]],.04,.04);}}
for(const z of[-129.8,-126.2]){rail('upper-'+z,[start,H,z],[midA,H/2,z]);rail('middle-'+z,[midA,H/2,z],[midB,H/2,z]);rail('lower-'+z,[midB,H/2,z],[end,0,z]);}
// Restrained original joints and fixtures use shared batches and no extra
// realtime lights beyond the existing pool.
for(let x=-80;x<28;x+=2){box('floor-joint-'+x,x-.009,x+.009,-180.97,-174.03,.002,0,4,'floor-joint');decoration();box('ceiling-joint-'+x,x-.012,x+.012,-186.95,-174.05,C,C-.012,3,'ceiling-joint');decoration();}
for(const z of[-180,-178,-176]){box('floor-joint-z-'+z,-80.95,27.95,z-.009,z+.009,.002,0,4,'floor-joint');decoration();}
box('street-tactile',-85,27.9,-178.2,-177.8,.007,0,5,'tactile');decoration();
box('corridor-tactile',-79.7,-79.3,-177.8,-132,.007,0,5,'tactile');decoration();
for(const[x,y]of[[-68.5,H],[end-.5,0]]){box('stair-warning-'+x,x-.21,x+.21,-129.5,-126.5,y+.007,y,5,'tactile');decoration();}
function light(id,x,z,y=C){box('fixture-'+id,x-.45,x+.45,z-.3,z+.3,y-.025,y-.06,6,'fixture');decoration();lights.push({id:prefix+'light-'+id,position:{x,y:y-.14,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.96,b:.86},intensity:11,range:9,spotAngle:120,innerSpotAngle:80});}
for(let x=-75;x<28;x+=10)light('street-'+x,x,-178);
for(const z of[-168,-157,-146,-135])light('corridor-'+z,-77,z);
light('stair',-72,-128,7.15);
for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===7?'glass':'stone';
route('Western street to Hachijo foyer',[point(-85,-178),point(-75,-178),point(-45,-178),point(-15,-178),point(15,-178),point(25,-178),point(35,-179)],true);
route('Upper public passage through ASTY stair',[point(-63,-128,H),point(start,-128,H),point(midA,-128,H/2),point(midB,-128,H/2),point(end,-128),point(-79.5,-128),point(-79.5,-133),point(-77,-140),point(-77,-160),point(-77,-178),point(-70,-178)],true);
route('Western forecourt entrance',[point(-85,-178),point(-86,-185),point(-86,-195)],true);
route('Western island exit around terrace stair',[point(-47,-179),point(-47,-188),point(-39,-188),point(-39,-195)],true);
route('Middle island exit',[point(-17.5,-179),point(-17.5,-193)],true);
route('Eastern island exit',[point(26.5,-179),point(26.5,-193)],true);
// Both external staircases still link the forecourt and upper public hall.
for(const[side,x0]of[[-1,-75],[1,-51]]){
 const a=x0+side*3.52,b=a+side*1.8,e=b+side*3.52;
 route('Retained terrace stair '+(side<0?'west':'east'),[point(e+side*1,-190.5),point(e,-190.5),point(b,-190.5,H/2),point(a,-190.5,H/2),point(x0,-190.5,H),point(-63,-190.5,H),point(-63,-182,H)],true);
}
const report=await c.save(out,'asty-west.glb',{componentPrefix:prefix,sourceCollection:'Western ASTY street and public stair',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Open the western Hachijo foyer into ASTY ROAD, connect the western entrance to the upper public passage beside Kintetsu, and retain the forecourt stairs.',
 geometry:{routes,bays,retiredIds,retiredLights:[],spawn:point(20,-178),stair:{start,midA,midB,end,top:H,width:4}},
 references:['https://www.asty-kyoto.co.jp/asty_kyoto/floor_guide/','https://kyoto-station.info/archives/115'],
 limits:['Operator diagrams establish route topology, not surveyed dimensions.','Stair and ground corridor are fitted between the retained upper passage and Kintetsu head concourse.','Room shells omit tenant fitouts and working escalators. Research photos are not game textures.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([
 ['foyer-join',[35,1.65,-179],[5,1.65,-178]],['street-west',[17,1.65,-178],[-50,1.65,-178]],['street-east',[-70,1.65,-178],[25,1.65,-178]],
 ['west-entry',[-86,1.65,-178],[-62,1.65,-178]],['stair-corridor',[-77,1.65,-166],[-79,1.65,-130]],
 ['stair-bottom',[-79.5,1.65,-128],[-67,5.325,-128]],['stair-top',[-64,5.325,-128],[-80,1.65,-128]],
 ['stair-landing',[-73.5,3.4875,-128],[-80,1.65,-128]],['lower-turn',[-79.5,1.65,-128],[-77,1.65,-145]],['upper-hall',[-63,5.325,-135],[-69,5.325,-128]],
 ['south-islands',[-17.5,1.65,-194],[-17.5,1.65,-176]],['north-room',[-35,1.65,-177],[-35,1.65,-165]],
 ['terrace-stairs',[-39,1.65,-195],[-61,4.5,-189]]
 ],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,rooms:bays.length,routes:routes.length,lights:lights.length});
