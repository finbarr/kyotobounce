// Close and finish the exposed back of the western rooftop passage wall.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),raw=await readFile(parent.layout);assert.equal(sha(raw),parent.layoutSha256);
const layout=JSON.parse(raw),prefix='garden-west-junction-',F=Math.max(...layout.panels.find(p=>p.id==='garden-promenade-public-floor').vertices.map(v=>v.y));
const W=-243.88,E=-202.3,S=-1.42,R=-2.495,H=F+4.75;
const retiredIds=['garden-west-passage-south-flashing','garden-west-passage-south-east-return'];
assert(retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
const cuts={'municipal-station-wing-west-Untitled.203':[[[W-.07,E+.20],[F-.031,H+.06],[-2.62,-1.505]]]};
const spec={componentPrefix:prefix,parentLayoutSha256:parent.layoutSha256,floor:F,west:W,east:E,rear:R,front:S,head:H,retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],cuts};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');
const mat=(name,color,roughness=.75,metallic=0)=>({name:'Garden west passage | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const c=construction([mat('warm concrete',[.42,.41,.38]),mat('cool concrete',[.395,.40,.395]),mat('pale coated steel',[.69,.71,.70],.6,.15),mat('rib edges',[.59,.62,.61],.6,.15),mat('dark joints',[.08,.09,.09]),mat('aluminium',[.39,.43,.44],.28,.75)],{flatNormals:true});
const P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:F,z});
function box(id,x0,x1,z0,z1,y0,y1,mi,role='wall',collision=true){assert(x1>x0&&z1>z0&&y1>y0,id);c.slab(prefix+id,[P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],[],y1-y0,mi,role);const p=c.panels.at(-1);p.material=[2,3,5].includes(mi)?'steel':'stone';p.collision=collision;}
function combineSince(start,id){const rows=c.panels.splice(start),first=rows[0],joined={...first,id:prefix+id,vertices:[],triangles:[]};for(const p of rows){assert(p.browserMaterial===first.browserMaterial&&!p.collision);const offset=joined.vertices.length;joined.vertices.push(...p.vertices);joined.triangles.push(...p.triangles.map(i=>i+offset));}c.panels.push(joined);}
// Match the retained public face's concrete base and vertical metal ribs. The
// new rear closes the depth already established by the old coping and return.
box('rear-backing',W,E,R+.04,R+.24,F-.03,H,4);
for(let i=0;i<19;i++){const a=W+(E-W)*i/19+.007,b=W+(E-W)*(i+1)/19-.007;box('rear-concrete-'+i,a,b,R,R+.055,F+.008,F+1.55,i%3===0?1:0);}
box('rear-plinth',W,E,R-.012,R+.065,F-.015,F+.11,4);
box('rear-metal',W,E,R+.01,R+.075,F+1.55,H,2);
let start=c.panels.length;for(let x=W+.045;x<E-.025;x+=.12)box('rear-rib-'+x,x,x+.026,R-.02,R+.015,F+1.56,H-.04,3,'cladding',false);combineSince(start,'rear-ribs');
box('rear-base-flashing',W,E,R-.025,R+.02,F+1.54,F+1.58,5,'flashing',false);
// Fitted end closes the garden-facing junction. The opposite end meets the
// existing store portal; neither end intrudes into the public passage.
box('east-backing',E-.05,E+.09,R,S,F-.03,H,4);
for(let i=0;i<2;i++){const a=R+(S-R)*i/2+.007,b=R+(S-R)*(i+1)/2-.007;box('east-concrete-'+i,E+.085,E+.14,a,b,F+.008,F+1.55,i);}
box('east-plinth',E+.08,E+.15,R,S,F-.015,F+.11,4);
box('east-metal',E+.09,E+.14,R,S,F+1.55,H,2);
start=c.panels.length;for(let z=R+.04;z<S-.025;z+=.12)box('east-rib-'+z,E+.14,E+.161,z,z+.026,F+1.56,H-.04,3,'cladding',false);combineSince(start,'east-ribs');
box('east-base-flashing',E+.135,E+.165,R,S,F+1.54,F+1.58,5,'flashing',false);
box('west-return',W-.06,W+.04,R,S,F-.03,H,2);
box('coping',W-.07,E+.20,R-.06,S+.08,H,H+.055,2,'roof');
const paths=[
 ['Garden to Isetan passage',[[-195,3],[-201,3],[-207,2],[-240,2],[-247,2]]],
 ['Western garden edge',[[-200,-32],[-200,-23.8],[-200,-12],[-200,-3],[-200,2]]],
 ['Passage southern edge',[[-200,-.65],[-207,-.65],[-224,-.65],[-240,-.65]]]
];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
const blocked=[{label:'Garden-facing wall end',start:pt(-201,-1.95),yaw:-90,axis:'x',limit:-201.94,sign:1},{label:'Retained southern passage wall',start:pt(-218,-.4),yaw:180,axis:'z',limit:-1.2,sign:1},{label:'Retained western garden guard',start:pt(-201.3,-12),yaw:-90,axis:'x',limit:-202.06,sign:1}];
const report=await c.save(out,'garden-west-junction.glb',{componentPrefix:prefix,sourceCollection:'Western garden passage rear and end finish',builder:'web/station/realism/build-garden-west-junction.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:parent.layoutSha256,scope:'Close the exposed passage wall back beneath its roof cap and fit its garden-facing end while preserving the open western outlook.',geometry:{spawn:parent.spawn,floor:F,routes,chromeRoutes:routes.map(r=>r.label),blocked,retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[]},references:['https://www.kyoto-station-building.co.jp/service/square/','https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/','https://kyoto-rys.com/facility/skygarden/'],limits:['Rear and end finishes extrapolate the photographed public passage treatment to the existing wall volume.','The open garden edge, wider roof equipment and distant city remain unchanged; exact rear cladding joints are not documented.']});
await writeFile(out+'/views.json',JSON.stringify([
 ['garden-west-view',[-187,F+1.65,-12],[-208,F+2.3,-3]],['passage-mouth',[-197,F+1.65,1.8],[-208,F+2.1,1.8]],['end-junction',[-200,F+1.65,-3.8],[-202.2,F+2,-1.9]],['rear-corner',[-200,F+1.65,-7],[-212,F+2.3,-2.5]],['passage-return',[-208,F+1.65,2],[-194,F+2,-1]],['southern-outlook-return',[-200,F+1.65,-30],[-201,F+2,-5]]
],null,2)+'\n');console.log({retired:retiredIds.length,panels:report.geometry.panels,triangles:report.geometry.triangles});
