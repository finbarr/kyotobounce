// Refit the roof rooms beside the public garden-to-Isetan passage.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';

const [manifest,out]=process.argv.slice(2);
assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),raw=await readFile(parent.layout);
assert.equal(sha(raw),parent.layoutSha256);
const layout=JSON.parse(raw),prefix='garden-west-passage-';
const F=Math.max(...layout.panels.find(p=>p.id==='garden-promenade-public-floor').vertices.map(v=>v.y));
const W=-243.88,E=-202.3,S=-1.42,N=5.2,H=F+4.75;
const retiredIds=layout.panels.filter(p=>/^garden-promenade-edge-(7|9)-/.test(p.id)).map(p=>p.id);
assert.equal(retiredIds.length,48);
// The earlier passage cut stopped 2.2 m above the floor. Its angled municipal
// room face still protrudes through the new southern wall above that height.
const cuts={'municipal-station-wing-west-Untitled.203':[[[-244,E],[F+2.195,H+.1],[-1.51,5.3]]]};
const spec={componentPrefix:prefix,parentLayoutSha256:parent.layoutSha256,floor:F,west:W,east:E,south:S,north:N,head:H,retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],cuts};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');
await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');

const mat=(name,color,roughness=.75,metallic=0)=>({name:'Garden west passage | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('warm concrete',[.42,.41,.38]),mat('cool concrete',[.395,.40,.395]),mat('pale coated steel',[.69,.71,.70],.6,.15),mat('rib edges',[.59,.62,.61],.6,.15),mat('dark joints',[.08,.09,.09]),mat('aluminium',[.39,.43,.44],.28,.75),mat('obscured door glass',[.16,.205,.215],.42),mat('service cabinet',[.56,.58,.55],.65,.15)];
const c=construction(materials,{flatNormals:true});
const P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:F,z});
function box(id,x0,x1,z0,z1,y0,y1,material,role='wall',collision=true){
 assert(x1>x0&&z1>z0&&y1>y0,id);
 c.slab(prefix+id,[P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],[],y1-y0,material,role);
 const p=c.panels.at(-1);p.material=material===6?'glass':[2,3,5,7].includes(material)?'steel':'stone';p.collision=collision;
}
// Fold repeated trim into a single editable, noncolliding mesh per wall.
// The collidable backing supplies its boundary; all render faces remain exported.
function combineSince(start,id){
 const rows=c.panels.splice(start),first=rows[0],joined={...first,id:prefix+id,vertices:[],triangles:[]};
 for(const p of rows){assert(p.browserMaterial===first.browserMaterial&&!p.collision);const offset=joined.vertices.length;joined.vertices.push(...p.vertices);joined.triangles.push(...p.triangles.map(i=>i+offset));}
 c.panels.push(joined);
}
for(const [side,face,sign] of [['south',S,1],['north',N,-1]]){
 const front=depth=>face+sign*depth;
 const range=(a,b)=>[Math.min(front(a),front(b)),Math.max(front(a),front(b))];
 box(side+'-backing',W,E,...range(-.25,-.045),F-.03,H,4);
 const count=19,width=(E-W)/count;
 for(let i=0;i<count;i++){
  const x0=W+i*width+.007,x1=W+(i+1)*width-.007;
  box(side+'-concrete-'+i,x0,x1,...range(-.06,0),F+.008,F+1.55,i%3===0?1:0);
 }
 box(side+'-plinth',W,E,...range(-.065,.015),F-.015,F+.11,4);
 box(side+'-metal',W,E,...range(-.08,0),F+1.55,H,2);
 const start=c.panels.length;
 for(let x=W+.045;x<E-.025;x+=.12)box(side+'-rib-'+x,x,x+.026,...range(0,.021),F+1.56,H-.04,3,'cladding',false);
 combineSince(start,side+'-ribs');
 box(side+'-flashing',W-.025,E+.025,...range(-1.1,.08),H,H+.055,2,'roof');
 box(side+'-base-flashing',W,E,...range(-.01,.035),F+1.54,F+1.58,5,'flashing',false);
 // Close the visible end next to the garden. The western end meets the
 // existing store portal, with a short return across the former rail end.
 box(side+'-east-return',E-.015,E+.12,...range(-1.1,0),F-.03,H,2);
 box(side+'-west-return',-244.02,W,...range(-.28,0),F-.03,H,2);
}
// The photographed southern service doors are closed, with an opaque privacy
// finish. They do not claim an unverified public route through the roof room.
const doorX=-205.1,doorWidth=2.2,doorTop=F+2.45;
box('service-door-surround',doorX-doorWidth/2-.19,doorX+doorWidth/2+.19,S+.028,S+.11,F,F+2.67,0);
box('service-door-recess',doorX-doorWidth/2,doorX+doorWidth/2,S+.112,S+.13,F+.04,doorTop,4,'closed-door');
for(const side of [-1,1]){
 const x0=doorX+side*.55-.5,x1=x0+1;
 box('service-door-glass-'+side,x0,x1,S+.134,S+.153,F+.32,doorTop-.08,6,'closed-door');
 box('service-door-bottom-'+side,x0,x1,S+.133,S+.155,F+.07,F+.32,5,'door-frame');
 box('service-door-handle-'+side,doorX+side*.12-.014,doorX+side*.12+.014,S+.156,S+.2,F+.89,F+1.3,5,'door-handle');
}
for(const x of [doorX-doorWidth/2,doorX,doorX+doorWidth/2])box('service-door-frame-'+x,x-.03,x+.03,S+.13,S+.18,F+.04,doorTop+.03,5,'door-frame');
box('service-door-head',doorX-doorWidth/2-.03,doorX+doorWidth/2+.03,S+.13,S+.18,doorTop-.01,doorTop+.05,5,'door-frame');
// Closed maintenance cabinets and shallow vents, kept out of the public lane.
for(const [i,x]of [-207.4,-214].entries()){
 box('cabinet-plinth-'+i,x-.77,x+.77,N-.99,N-.02,F,F+.12,4,'cabinet');
 box('cabinet-'+i,x-.72,x+.72,N-.95,N-.05,F+.12,F+1.83,7,'cabinet');
 box('cabinet-top-'+i,x-.76,x+.76,N-.99,N-.025,F+1.83,F+1.88,5,'cabinet');
 box('cabinet-seam-'+i,x-.009,x+.009,N-.959,N-.95,F+.18,F+1.76,4,'joint',false);
 for(const sign of[-1,1])box('cabinet-handle-'+i+'-'+sign,x+sign*.085-.012,x+sign*.085+.012,N-.995,N-.96,F+.87,F+1.07,5,'handle');
}
for(const [i,x]of [-210.5,-224,-237].entries()){
 box('vent-frame-'+i,x-.48,x+.48,N-.055,N+.012,F+.35,F+1.48,5,'service-vent');
 box('vent-dark-'+i,x-.44,x+.44,N-.064,N-.055,F+.4,F+1.43,4,'service-vent');
 for(let j=0;j<12;j++)box('vent-slat-'+i+'-'+j,x-.44,x+.44,N-.08,N-.064,F+.42+j*.082,F+.445+j*.082,7,'vent-slat',false);
}
const main=[pt(-195,3),pt(-201,3),pt(-207,2),pt(-240,2),pt(-247,2)];
const south=[pt(-207,-.65),pt(-224,-.65),pt(-240,-.65)];
const north=[pt(-204,3.45),pt(-222,3.45),pt(-240,3.45)];
const routes=[['Garden to western store entrance',main],['Southern passage edge',south],['Northern passage edge',north]].flatMap(([label,points])=>[{label,points},{label:label+' return',points:points.toReversed()}]);
const blocked=[
 {label:'Southern roof room wall',start:pt(-218,-.4),yaw:180,axis:'z',limit:-1.2,sign:1},
 {label:'Northern roof room wall',start:pt(-218,4.3),yaw:0,axis:'z',limit:4.99,sign:-1},
 {label:'Northern service cabinet',start:pt(-207.4,3.35),yaw:0,axis:'z',limit:4.01,sign:-1},
 {label:'Closed southern service door',start:pt(doorX,-.35),yaw:180,axis:'z',limit:-1.04,sign:1}
];
const report=await c.save(out,'garden-west-passage.glb',{componentPrefix:prefix,sourceCollection:'Western rooftop passage walls and service frontage',builder:'web/station/realism/build-garden-west-passage.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:parent.layoutSha256,scope:'Replace wall-backed railings with fitted concrete and vertically ribbed metal roof-room frontages beside the western public passage.',geometry:{spawn:parent.spawn,floor:F,routes,chromeRoutes:[routes[0].label,routes[1].label,routes[4].label],blocked,retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[]},references:['https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/','https://www.kyoto-station-building.co.jp/service/square/'],limits:['Wall finishes, service doors and cabinets follow the 2019 passage photograph; dimensions and fixture placement are fitted approximations.','The photograph predates the current garden construction closure. The game retains the requested usable garden route.','Passage paving, roof equipment behind the public walls and detailed garden planting remain unfinished.']});
await writeFile(out+'/views.json',JSON.stringify([
 ['garden-west-approach',[-199,F+1.65,1.8],[-214,F+2.15,1.8]],
 ['west-passage',[-208,F+1.65,2],[-243,F+1.9,2]],
 ['return-passage',[-240,F+1.65,2],[-203,F+1.85,2]],
 ['service-doors',[-206,F+1.65,1.7],[doorX,F+1.5,S]],
 ['service-cabinets',[-205,F+1.65,2.7],[-212,F+1.1,4.7]],
 ['store-entrance',[-239,F+1.65,2],[-249,F+1.65,2]]
],null,2)+'\n');
console.log({floor:F,retired:retiredIds.length,panels:report.geometry.panels,triangles:report.geometry.triangles});
