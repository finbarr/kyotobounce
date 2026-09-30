// Connect both Hachijo entrance halls through the missing ASTY public street.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifestPath,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifestPath),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);
const retiredIds=['hachijo-entrance-foyer-side-base-66','hachijo-entrance-foyer-side-glass-66',
 ...[-184,-181.5,-179,-176.5,-174].map(z=>'hachijo-entrance-side-mullion-66-'+z),
 'hachijo-east-front-side-138','hachijo-east-ground-south','hachijo-east-paid-west'];
const byId=new Map(layout.panels.map(p=>[p.id,p]));assert(retiredIds.every(id=>byId.has(id)));
const bounds=p=>['x','y','z'].map(k=>[Math.min(...p.vertices.map(v=>v[k])),Math.max(...p.vertices.map(v=>v[k]))]);
assert.deepEqual(bounds(byId.get('hachijo-east-ground-south')).map(a=>a.map(v=>Math.round(v))),[[55,142],[0,3],[-174,-174]]);
const mat=(name,rgb,roughness=.65,metallic=0)=>({name:'Hachijo ASTY | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('warm tile',[.58,.54,.46],.5),mat('lime plaster',[.72,.66,.54]),mat('dark timber',[.15,.075,.036],.55),
 mat('ceiling panel',[.79,.76,.67]),mat('stone plinth',[.30,.28,.25]),mat('stainless',[.38,.41,.42],.3,.8),
 mat('tactile paving',[.70,.48,.07]),{...mat('warm diffuser',[1,.93,.78]),emissiveFactor:[1,.93,.78]},
 {...mat('shop glazing',[.44,.52,.51]),pbrMetallicRoughness:{baseColorFactor:[.44,.52,.51,.22],roughnessFactor:.17,metallicFactor:0},alphaMode:'BLEND',doubleSided:true}];
const c=construction(materials,{flatNormals:true}),prefix='hachijo-asty-',C=3.225,lights=[],routes=[];
const P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],point=(x,z,y=0)=>({x,y,z});
const slab=(id,poly,y,depth,material=0,role='floor')=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),[],depth,material,role);
const box=(id,a,b,d,e,top,bottom,material=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,material,role);
const beam=(id,a,b,w,h,material=2,role='beam')=>c.beam(prefix+id,P(...a),P(...b),w,h,material,role);
const decorative=()=>{c.panels.at(-1).collision=false;};
const wallKeys=new Set();
const sharedWallRuns=new Map();
function wall(id,a,b,bottom=0,top=C,thickness=.12,mi=1,role='wall'){
 const key=JSON.stringify([[a,b].map(p=>p.map(n=>n.toFixed(5)).join(',')).sort(),bottom,top,thickness,mi]);
 if(wallKeys.has(key))return;wallKeys.add(key);
 let segments=[[a,b]];
 const fixed=a[0]===b[0]?0:a[1]===b[1]?1:null;
 if(fixed!==null){
  const along=1-fixed,k=JSON.stringify([fixed,a[fixed],bottom,top,thickness,mi]);
  const covered=sharedWallRuns.get(k)||[],range=[Math.min(a[along],b[along]),Math.max(a[along],b[along])];let remaining=[range];
  for(const [lo,hi]of covered)remaining=remaining.flatMap(([u,v])=>v<=lo||u>=hi?[[u,v]]:[[u,Math.min(v,lo)],[Math.max(u,hi),v]].filter(([p,q])=>q-p>1e-6));
  sharedWallRuns.set(k,[...covered,range]);segments=remaining.map(([u,v])=>{const p=[...a],q=[...a];p[along]=u;q[along]=v;return[p,q];});
 }
 for(const [i,[p,q]]of segments.entries()){
  const dx=q[0]-p[0],dz=q[1]-p[1],L=Math.hypot(dx,dz),n=[-dz/L*thickness/2,dx/L*thickness/2];assert(L>1e-6);
  slab(id+'-'+i,[[p[0]+n[0],p[1]+n[1]],[q[0]+n[0],q[1]+n[1]],[q[0]-n[0],q[1]-n[1]],[p[0]-n[0],p[1]-n[1]]],top,top-bottom,mi,role);
 }
}
function route(label,points,pair=false){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/18));for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));}routes.push({label,points:split});if(pair)routes.push({label:label+' return',points:split.toReversed()});}
// This strip previously had no ground floor. The retained pavement and railway
// ground slab supply the adjoining areas, without duplicate collision surfaces.
box('missing-ground-floor',66,138,-181,-174,0,-.35,0,'public-floor');
box('public-roof',66,138,-190,-174,C+.2,C,3,'ceiling');
// Open the obsolete ends of both foyers, retaining small returns and lintels.
for(const [x,id]of[[66,'main'],[138,'east']]){
 for(const [a,b]of[[-184,-182],[-176,-174]])box(id+'-portal-return-'+a,x-.075,x+.075,a,b,C,0,1);
 box(id+'-portal-header',x-.075,x+.075,-182,-176,C,2.65,2,'door-header');
 for(const z of[-182,-176])box(id+'-portal-jamb-'+z,x-.095,x+.095,z-.06,z+.06,2.65,0,2,'door-jamb');
}
// Preserve the paid-lobby boundaries outside the public shop replacement.
box('retained-main-back',55,66,-174.15,-174,C,0,1);
box('retained-east-back',133,142,-174.15,-174,C,0,1);
box('retained-paid-west',116,116.15,-165.5,-150,C,0,1);
// Build actual enclosed bays with clear doorways. The north row and bent east
// end follow the operator diagram; dimensions are fitted to retained gates.
const bays=[];
function bay(id,a,b,back,side,label){
 const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),t=[dx/L,dz/L],normal=[-t[1]*side,t[0]*side],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],halfDoor=Math.min(1.35,L*.24);
 const left=[mid[0]-t[0]*halfDoor,mid[1]-t[1]*halfDoor],right=[mid[0]+t[0]*halfDoor,mid[1]+t[1]*halfDoor];
 const ba=[a[0],back],bb=[b[0],back];
 wall(id+'-back',ba,bb);wall(id+'-west',a,ba);wall(id+'-east',b,bb);
 for(const [p,q,suffix]of[[a,left,'left'],[right,b,'right']]){
  wall(id+'-plinth-'+suffix,p,q,0,.55,.13,4,'shop-plinth');
  wall(id+'-glazing-'+suffix,p,q,.55,2.35,.035,8,'shop-glazing');
  wall(id+'-upper-'+suffix,p,q,2.35,C,.14,2,'shop-fascia');
 }
 wall(id+'-lintel',left,right,2.35,C,.14,2,'door-header');
 for(const [p,suffix]of[[a,'edge-left'],[left,'jamb-left'],[right,'jamb-right'],[b,'edge-right']])wall(id+'-'+suffix,[p[0]-t[0]*.04,p[1]-t[1]*.04],[p[0]+t[0]*.04,p[1]+t[1]*.04],0,2.5,.16,2,'shop-post');
 // A shallow timber eave makes the row legible as the referenced machiya-style
 // interior without importing artwork or adding high-cost separate fixtures.
 const outside=-.22;beam(id+'-eave',[a[0]+normal[0]*outside,2.65,a[1]+normal[1]*outside],[b[0]+normal[0]*outside,2.65,b[1]+normal[1]*outside],.5,.14,2,'eave');
 const outsidePoint=point(mid[0]-normal[0]*1.6,mid[1]-normal[1]*1.6),insidePoint=point(mid[0]+normal[0]*2,mid[1]+normal[1]*2);
 route(label+' doorway and room',[outsidePoint,insidePoint,outsidePoint]);
 bays.push({id,label,front:[a,b],back,entry:mid,limits:'Enclosed receiving room only; tenant fitout is not reconstructed.'});
}
bay('west-receiving-room',[66,-174],[75,-174],-165.5,1,'Western receiving room');
bay('services',[75,-174],[85,-174],-165.5,1,'Service receiving room');
for(const [i,a,b]of[[6,85,93],[7,93,101],[8,101,109],[9,109,117]])bay('north-'+i,[a,-174],[b,-174],-165.5,1,'North shop '+i);
bay('north-10',[117,-174],[125,-177],-165.5,1,'North shop 10');
bay('east-11',[125,-177],[133,-180],-168.8,1,'East shop 11');
// South islands leave the mapped public exits between them and the open east
// approach. Their floors use the existing level forecourt surfaces.
bay('south-18',[66.2,-182],[83,-182],-189,-1,'West souvenir bay');
bay('south-17',[88,-182],[98.5,-182],-189,-1,'South shop 17');
bay('south-16',[98.5,-182],[103,-182],-186,-1,'South shop 16');
bay('south-15',[107,-182],[111,-182],-189,-1,'South shop 15');
bay('south-14',[112,-182],[122,-188],-189,-1,'South shop 14');
// Close the one-metre strip between the two southern frontages; the public exit
// is the explicit 103..107 opening, not a gap into their back-of-house space.
wall('south-island-join',[111,-182],[112,-182]);wall('south-island-back-join',[111,-189],[112,-189]);
// The narrower north street widens and turns south before the eastern gate.
route('Main Hachijo hall through ASTY to east hall',[point(62,-179),point(70,-178),point(89,-178),point(109,-178),point(121,-180),point(133,-181),point(145,-181),point(150,-179)],true);
route('Central mall exit to retained forecourt',[point(105,-179),point(105,-185),point(105,-193)],true);
route('Western mall exit to retained forecourt',[point(85.5,-179),point(85.5,-186),point(85.5,-193)],true);
// Start clear of the floor boundary at Z-181 so the placement disk fits one
// panel, then walk across that boundary into the retained forecourt.
route('East mall approach to retained forecourt',[point(132,-180.5),point(132,-187),point(132,-193)],true);
// Verify the retained paid route past the reshaped shop backs into its stairs.
// Leave enough clear floor before the first tread for the return start disk.
route('Retained eastern gate to stair bottom',[point(147,-164.9),point(140,-164.9),point(127,-164.9),point(127,-163.6)],true);
// Original lightweight tile joints, overhead panels and a continuous warning
// strip use shared batches and do not add player collision ledges.
for(let x=68;x<138;x+=2){box('ceiling-joint-x-'+x,x-.012,x+.012,-189.95,-174.05,C,C-.012,4,'ceiling-joint');decorative();}
for(const z of[-176.5,-179,-181.5,-184,-186.5,-189]){box('ceiling-joint-z-'+z,66.05,137.95,z-.012,z+.012,C,C-.012,4,'ceiling-joint');decorative();}
for(let x=67;x<138;x+=1){box('floor-joint-'+x,x-.008,x+.008,-180.98,-174.02,.002,0,4,'floor-joint');decorative();}
for(const z of[-180,-179,-178,-177,-176,-175]){box('floor-joint-z-'+z,66.02,137.98,z-.008,z+.008,.002,0,4,'floor-joint');decorative();}
const tactile=[[66,-178],[109,-178],[121,-180],[137.9,-181]];
for(let i=1;i<tactile.length;i++)beam('tactile-'+i,[tactile[i-1][0],.004,tactile[i-1][1]],[tactile[i][0],.004,tactile[i][1]],.32,.008,6,'tactile'),decorative();
function light(id,x,z){box('fixture-'+id,x-.7,x+.7,z-.11,z+.11,C-.03,C-.07,7,'fixture');decorative();lights.push({id:prefix+'emitter-'+id,position:{x,y:C-.15,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.93,b:.80},intensity:10,range:10,spotAngle:120,innerSpotAngle:80});}
for(const[x,z]of[[70,-178],[80,-178],[90,-178],[100,-178],[110,-178],[120,-180],[130,-181],[85.5,-186],[105,-186]])light(x+'-'+z,x,z);
for(const p of c.panels)p.material=p.browserMaterial===5?'steel':p.browserMaterial===8?'glass':'stone';
// Ensure every declared material has a mesh batch, using a recessed metal
// threshold across each opening rather than dummy geometry.
for(const x of[66,138])box('portal-threshold-'+x,x-.1,x+.1,-181.95,-176.05,.004,0,5,'threshold');
for(const p of c.panels.filter(p=>p.role==='threshold'))p.material='steel';
const report=await c.save(out,'hachijo-asty.glb',{componentPrefix:prefix,sourceCollection:'Hachijo ASTY public shopping street',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Connect main and east Hachijo foyers through an enclosed ASTY street, bent restaurant passage and three forecourt exits, retaining both rail entrances.',
 geometry:{routes,bays,retiredIds,retiredLights:[],spawn:point(70,-178)},
 references:['https://www.asty-kyoto.co.jp/asty_kyoto/floor_guide/','https://jr-central.co.jp/news/release/_pdf/000027332.pdf'],
 limits:['The operator map establishes the connected street, north and south frontages, eastern bend and public exit gaps; it is not a scale drawing.','X66..138 and all elevations, room dimensions and equipment are fitted to the retained Hachijo reconstruction.','Rooms are architectural shells, not reproduced tenant interiors; the 2015 concept render guides only general materials and frontage structure.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([
 ['main-join',[62,1.65,-179],[90,1.65,-178]],['street-east',[76,1.65,-178],[110,1.65,-178]],
 ['street-west',[112,1.65,-178],[80,1.65,-178]],['eastern-bend',[117,1.65,-179.8],[143,1.65,-181]],
 ['east-join',[146,1.65,-181],[125,1.65,-181]],['central-exit',[105,1.65,-185],[105,1.65,-177]],
 ['forecourt',[105,1.65,-193],[107,1.7,-177]],['north-room',[97,1.65,-177],[97,1.65,-168]],
 ['southern-room',[93,1.65,-179],[93,1.65,-186]],['retained-paid-route',[133,1.65,-165.5],[126,1.65,-160]]
],null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,rooms:bays.length,lights:lights.length});
