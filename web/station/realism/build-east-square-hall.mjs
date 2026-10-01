// Public hotel hall adjoining East Square, fitted to the retained source profile.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),raw=await readFile(m.layout);assert.equal(sha(raw),m.layoutSha256);const l=JSON.parse(raw);
const prefix='east-square-hall-',F=29.97345733642578,H=F+3.4,N=-18.1,S=-21.7,E=165.3;
const profile=(await read('research/kyoto-station/notes/court-folded-frontage/spec.json')).profile.map(([x,,z])=>[x,-z]);
const [a,b]=profile,edge=z=>a[0]+(z-a[1])*(b[0]-a[0])/(b[1]-a[1]);
const door={south:-17.55,north:-15.55,head:F+2.55};
const shell='municipal-station-wing-east-Untitled.203';
const cuts={
 'court-fold-return-back':[[[107.25,107.55],[F-.02,door.head],[door.south,door.north]]],
 'court-fold-return-plinth':[[[107.25,107.55],[F-.02,door.head],[door.south,door.north]]],
 'court-fold-return-lower-0':[[[107.25,107.55],[F-.02,door.head],[door.south,door.north]]],
 'municipal-station-court-east-Untitled.203':[[[107.25,125],[F-.02,H],[-21.85,-11.22]]],
 [shell]:[[[125,126.2],[F-.02,H],[N,-11.22]],[[125,165.5],[F-.02,H],[-21.85,N]],[[162.6,165.5],[F-.02,H],[N,-16.8]]],
 'east-court-source-floor':[[[119.6,126.2],[F-.32,F+.02],[N,-11.3]]],
};
for(const id of Object.keys(cuts))assert(l.panels.some(p=>p.id===id),id);
const spec={componentPrefix:prefix,parentLayoutSha256:m.layoutSha256,cuts,retiredIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],retiredLights:[],modifiedFlightIds:[],floor:F,door,shell};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');
const mat=(name,color,rough=.65,metal=0)=>({name:'East Square hall | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:rough,metallicFactor:metal}});
const mats=[mat('carpet',[.17,.145,.10],.95),mat('pale stone',[.54,.49,.39],.84),mat('ceiling',[.76,.76,.7],.85),mat('bronze frame',[.31,.27,.19],.34,.7),mat('dark trim',[.055,.055,.047],.5),mat('glass',[.38,.44,.43],.2),mat('diffuser',[.9,.82,.63],.4),mat('carpet variation',[.205,.17,.115],.95),mat('rail',[.52,.53,.51],.27,.75)];
mats[5].pbrMetallicRoughness.roughnessFactor=.65;mats[6].emissiveFactor=[.82,.7,.5];
mats.push({...mat('terrace glass',[.55,.65,.67],.16),alphaMode:'BLEND'});mats[9].pbrMetallicRoughness.baseColorFactor[3]=.18;
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],pt=(x,y,z)=>({x,y,z}),rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
function slab(id,points,y,depth,mi=0,role='floor'){c.slab(prefix+id,points.map(([x,z])=>P(x,typeof y==='function'?y(x,z):y,z)),[],depth,mi,role);c.panels.at(-1).material=mi===5?'glass':[3,4,8].includes(mi)?'steel':'stone';}
function box(id,x0,x1,z0,z1,y0,y1,mi=1,role='wall'){assert(x1>x0&&z1>z0&&y1>y0,id);slab(id,rect(x0,x1,z0,z1),y1,y1-y0,mi,role);}
function detail(...args){box(...args);c.panels.at(-1).collision=false;}
function beam(id,a,b,w,h,mi=8,role='guard'){c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);c.panels.at(-1).material='steel';}
const lobby=[...profile,[126.2,profile.at(-1)[1]],[126.2,N],[a[0],N]];
slab('lobby-floor',lobby,F,.28);slab('lobby-ceiling',lobby,H+.15,.15,2,'ceiling');
// Threshold follows the retained oblique court-floor edge exactly.
slab('west-threshold',[[edge(door.south),door.south],[107.7,door.south],[107.7,door.north],[edge(door.north),door.north]],F+.004,.2,3,'door-sill');
// Door jambs and head close the cut faces; the full opening remains walkable.
for(const z of [door.south,door.north])box('west-jamb-'+z,107.29,107.57,z-.035,z+.035,F,door.head+.055,3,'door-frame');
box('west-head',107.29,107.57,door.south-.035,door.north+.035,door.head,door.head+.055,3,'door-frame');
// The photo establishes a sloped corridor; rise and run are fitted estimates.
const height=x=>x<=126.2?F:x<132.6?F+(x-126.2)*.05:x<=157.1?F+.32:x<163.5?F+.32-(x-157.1)*.05:F;
for(const [i,x0,x1]of [[0,a[0],126.2],[1,126.2,132.6],[2,132.6,157.1],[3,157.1,163.5],[4,163.5,E]])slab('passage-floor-'+i,rect(x0,x1,S,N),height,.28);
box('passage-ceiling',a[0],E,S,N,H,H+.15,2,'ceiling');
box('west-return',a[0]-.15,a[0],S,profile[0][1],F,H);
box('east-end',E,E+.15,S,N,F,H);
box('lobby-east',126.2,126.35,N,-11.12,F,H);
box('lobby-north',119.56,126.2,-11.27,-11.12,F,H);
// Clinic front doors are complete closed frontages; interiors follow later.
const clinics=[{x:114,y:F},{x:140,y:F+.32},{x:152.5,y:F+.32}];
let left=a[0];
for(const [i,{x,y}]of clinics.entries()){
 box('clinic-wall-'+i,left,x-.85,S-.16,S,F,H);left=x+.85;
 box('clinic-head-'+i,x-.85,x+.85,S-.16,S,y+2.3,H);
 for(const dx of [-.88,.88])box('clinic-jamb-'+i+'-'+dx,x+dx-.035,x+dx+.035,S-.18,S+.035,y,y+2.35,3,'door-frame');
 box('clinic-door-'+i,x-.84,x+.84,S-.09,S-.055,y+.08,y+2.29,5,'closed-door');
 for(const dx of[-.06,.06])box('clinic-handle-'+i+'-'+dx,x+dx-.012,x+dx+.012,S-.02,S+.015,y+.83,y+1.22,8,'door-handle');
 box('clinic-kick-'+i,x-.84,x+.84,S-.095,S-.05,y,y+.18,3,'door-frame');
 detail('clinic-plaque-'+i,x+1.1,x+1.55,S-.01,S+.02,y+1.15,y+1.58,3,'sign');
}
box('clinic-wall-end',left,E,S-.16,S,F,H);
// Hall north wall and the far eastern return to the retained terrace.
box('passage-north',126.35,162.6,N,N+.15,F,H);
box('east-portal-head',162.6,E,N,N+.18,F+2.55,H);
for(const x of[162.6,E])box('east-jamb-'+x,x-.035,x+.035,N-.07,N,F,F+2.55,3,'door-frame');
const terrace=l.panels.find(p=>p.id==='east-court-source-floor');
// The retained southern edge is a single straight source edge here.
const edgeVertices=terrace.vertices.filter(v=>v.x>120&&v.z<-16.7&&v.y>29.96);
const east=edgeVertices.reduce((a,b)=>b.x>a.x?b:a),west=edgeVertices.filter(v=>v.x<130).reduce((a,b)=>b.z<a.z?b:a);
assert(east.x>165&&west.x>120);const terraceEdge=x=>west.z+(x-west.x)*(east.z-west.z)/(east.x-west.x);
slab('east-threshold',[[162.6,N],[E,N],[E,terraceEdge(E)],[162.6,terraceEdge(162.6)]],F+.004,.2,3,'door-sill');
for(const x of[162.6,E])box('east-reveal-'+x,x-.035,x+.035,N,terraceEdge(x),F,F+2.55,1,'door-reveal');
box('east-porch-head',162.6,E,N+.18,Math.max(terraceEdge(162.6),terraceEdge(E)),F+2.55,H,1,'door-head');
// Guard the newly reachable terrace perimeter, leaving its doorway clear.
function terraceGuard(id,from,to){
 const length=Math.hypot(to[0]-from[0],to[1]-from[1]),count=Math.ceil(length/1.8);
 const at=t=>[from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t];
 beam(id+'-top',[from[0],F+1.12,from[1]],[to[0],F+1.12,to[1]],.05,.05);
 for(let i=0;i<=count;i++){const[x,z]=at(i/count);beam(id+'-post-'+i,[x,F,z],[x,F+1.12,z],.045,.045);}
 for(let i=0;i<count;i++){const a=at((i+.025)/count),b=at((i+.975)/count);c.beam(prefix+id+'-glass-'+i,P(a[0],F+.6,a[1]),P(b[0],F+.6,b[1]),.018,.94,9,'guard-glass');c.panels.at(-1).material='glass';}
}
terraceGuard('terrace-south-west',[126.35,terraceEdge(126.35)],[162.6,terraceEdge(162.6)]);
terraceGuard('terrace-south-east',[E,terraceEdge(E)],[east.x,east.z]);
const eastNorth=terrace.vertices.filter(v=>v.x>160&&v.y>29.96).reduce((a,b)=>b.z>a.z?b:a);
terraceGuard('terrace-east',[east.x,east.z],[eastNorth.x,eastNorth.z]);
// Continuous rail beside the sloped floor, with returns at both ends.
for(const [r,x0,x1]of [[0,126.2,132.6],[1,157.1,163.5]]){
 for(const x of[x0,x0+(x1-x0)/3,x0+2*(x1-x0)/3,x1])beam('ramp-post-'+r+'-'+x,[x,height(x),N-.18],[x,height(x)+.9,N-.18],.035,.035);
 beam('ramp-rail-'+r,[x0-.2,height(x0)+.9,N-.18],[x1+.2,height(x1)+.9,N-.18],.045,.045);
}
// Carpet tile variation uses a few thin noncolliding strips, no new textures.
for(let x=110;x<162;x+=2.6)slab('carpet-inlay-'+x,rect(x,x+.18,S+.12,N-.12),(x)=>height(x)+.001,.001,7,'carpet-inlay'),c.panels.at(-1).collision=false;
box('lobby-seating-base',116,119,-17.45,-16.75,F,F+.42,4,'bench');
box('lobby-seating-cushion',115.96,119.04,-17.49,-16.71,F+.42,F+.49,0,'bench');
box('lobby-seating-back',116,119,-16.82,-16.7,F+.49,F+.9,4,'bench');
const lights=[];
for(const [i,x,z]of [[0,109.8,-16.7],[1,115,-12.7],[2,123,-15.5],...Array.from({length:11},(_,i)=>[i+3,110+i*5,-19.9])]){
 detail('light-'+i,x-.2,x+.2,z-.16,z+.16,H-.035,H,6,'fixture');
 lights.push({id:prefix+'light-source-'+i,position:pt(x,H-.07,z),direction:pt(0,-1,0),linearColor:{r:1,g:.92,b:.75},intensity:8,range:8,spotAngle:112,innerSpotAngle:86});
}
const entry=[pt(105.8,F,-16.55),pt(108.5,F,-16.55),pt(109.8,F,-19.9),pt(124.9,F,-19.9),pt(133.2,F+.32,-19.9),pt(145,F+.32,-19.9),pt(156.5,F+.32,-19.9),pt(164,F,-19.9),pt(164,F,-17),pt(164,F,-16.5)];
const lobbyRoute=[pt(108.5,F,-16.55),pt(109.8,F,-12.5),pt(112,F,-12.5),pt(121.5,F,-13),pt(123,F,-16),pt(123,F,-19.9)];
const routes=[{label:'East Square through hotel hall',points:entry},{label:'Hotel hall return to East Square',points:entry.toReversed()},{label:'Southern hotel lobby',points:lobbyRoute},{label:'Southern hotel lobby return',points:lobbyRoute.toReversed()}];
const report=await c.save(out,'east-square-hall.glb',{componentPrefix:prefix,sourceCollection:'East Square southern hotel entrance and public hall',builder:'web/station/realism/build-east-square-hall.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the southern East Square entrance into its hotel lobby and public clinic hall, connecting the eastern terrace.',geometry:{spawn:m.spawn,routes,chromeRoutes:[routes[0].label,routes[1].label,routes[2].label],blocked:[{label:'Southern terrace guard',start:pt(160,F,-15.6),yaw:180,axis:'z',limit:-17.05,sign:1},{label:'Eastern terrace guard',start:pt(164,F,-12),yaw:90,axis:'x',limit:165.68,sign:-1}],retiredIds:[],retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[],floor:F},references:['https://jrwest-hotels.jp/granvia-kyoto/files/pdf/floormap.pdf?01=','https://kyoto-clinics.jp/floorguide/','https://www.kyoto-skin-cl.com/clinic/'],limits:['Public hall topology follows the current operator maps; dimensions and the two 0.32 m ramps fit retained geometry and are not surveyed.','The hotel lift bank, 6F escalators and clinic interiors remain unbuilt. The lobby floor remains supported until those connections are installed.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const nr=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nr);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['west-entry',[104.9,F+1.65,-16.55],[110,F+1.65,-16.55]],['lobby',[110,F+1.65,-18],[121,F+1.65,-12.5]],['hall-ramp',[122,F+1.65,-19.9],[141,F+1.85,-19.9]],['clinic-hall',[145,F+1.97,-18.8],[151,F+1.6,-21.8]],['east-return',[161.5,F+1.65,-15.5],[164,F+1.3,-18.7]],['terrace-guard',[153,F+1.65,-13.5],[164.5,F+.9,-16.9]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,terraceEdge:[west,east]});
