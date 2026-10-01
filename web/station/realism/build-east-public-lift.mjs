// Three public eastern stops and their receiving routes, fitted to the operator maps.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {multiStopLift} from './multi-stop-lift-spec.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(out.startsWith('.local/'));await mkdir(out,{recursive:true});
const m=await read(manifest),raw=await readFile(m.layout);assert.equal(sha(raw),m.layoutSha256);const l=JSON.parse(raw),prefix='east-public-lift-',X=174,Z=16.45,levels=[0,7.35,31.600000381469727];
const retiredIds=['east-gallery-lobby-north-wall'],modifiedPanelIds=['municipal-station-wing-east-Untitled.202'];
const spec={componentPrefix:prefix,parentLayoutSha256:m.layoutSha256,retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:[],retiredLights:[],modifiedFlightIds:[],modifiedPanelIds,cuts:{[modifiedPanelIds[0]]:[[[169.8,172.5],[-.03,2.75],[22.3,24.2]]]},origin:{x:X,y:0,z:Z},levels};
await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');
const mat=(name,color,rough=.6,metal=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:rough,metallicFactor:metal}});
const mats=[mat('East public lift | pale stone',[.48,.47,.43]),mat('East gallery dark stone',[.22,.23,.225]),mat('Subway lift | steel',[.46,.49,.5],.3,.8),mat('Subway lift | dark floor',[.11,.12,.12]),mat('Subway lift | ceiling',[.74,.74,.7]),mat('Subway lift | button',[.1,.22,.45]),mat('East public lift | bronze',[.42,.29,.12],.3,.7),mat('East public lift | diffuser',[.88,.8,.59]),mat('East public lift | black trim',[.08,.075,.065])];mats[7].emissiveFactor=[.9,.75,.5];
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],pt=(x,y,z)=>({x,y,z}),rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,points,y,depth,mi=1,role='floor')=>{c.slab(prefix+id,points.map(([x,z])=>P(x,y,z)),[],depth,mi,role);c.panels.at(-1).material=[2,6,8].includes(mi)?'steel':'stone';};
const box=(id,x0,x1,z0,z1,y0,y1,mi=0,role='wall')=>{assert(x1>x0&&z1>z0&&y1>y0,id);slab(id,rect(x0,x1,z0,z1),y1,y1-y0,mi,role);};
const detail=(...args)=>{box(...args);c.panels.at(-1).collision=false;};
// A continuous shaft with doors only at the three public stops.
box('shaft-west',X-1.5,X-1.35,Z-1.6,Z+1.75,-.5,levels[2]+3.25);
box('shaft-east',X+1.35,X+1.5,Z-1.6,Z+1.75,-.5,levels[2]+3.25);
box('shaft-back',X-1.35,X+1.35,Z+1.6,Z+1.75,-.5,levels[2]+3.25);
for(const[a,b,id]of[[X-1.5,X-.7,'west'],[X+.7,X+1.5,'east']])box('shaft-front-'+id,a,b,Z-1.6,Z-1.4,-.5,levels[2]+3.25);
let bottom=-.5;for(const[i,y]of levels.entries()){if(y>bottom)box('shaft-front-between-'+i,X-.7,X+.7,Z-1.6,Z-1.4,bottom,y);bottom=y+2.2;}
box('shaft-front-top',X-.7,X+.7,Z-1.6,Z-1.4,bottom,levels[2]+3.25);
box('shaft-pit',X-1.35,X+1.35,Z-1.6,Z+1.6,-.5,-.35,3,'pit-floor');
box('shaft-roof',X-1.5,X+1.5,Z-1.6,Z+1.75,levels[2]+3.25,levels[2]+3.4,0,'roof');
for(const[i,y]of levels.entries()){
 box('sill-'+i,X-1.35,X+1.35,Z-1.6,Z-1.185,y-.12,y,2,'lift-sill');
 for(const dx of[-.74,.74])box('jamb-'+i+'-'+dx,X+dx-.035,X+dx+.035,Z-1.64,Z-1.38,y,y+2.25,6,'lift-frame');
 box('head-'+i,X-.775,X+.775,Z-1.64,Z-1.38,y+2.18,y+2.28,6,'lift-frame');
 box('call-plate-'+i,X+.98,X+1.16,Z-1.63,Z-1.60,y+.95,y+1.3,2,'call-button');
 detail('call-button-'+i,X+1.025,X+1.115,Z-1.65,Z-1.63,y+1.06,y+1.17,5,'call-button');
 detail('indicator-'+i,X-.3,X+.3,Z-1.64,Z-1.6,y+2.36,y+2.56,5,'indicator');
}
// Retained gallery floor and ceiling stop at the shaft's front face.
for(const[a,b,id]of[[170,X-1.5,'west'],[X+1.5,177,'east']])box('gallery-north-return-'+id,a,b,14.85,15.01,levels[2],levels[2]+2.65);
// New ground lobby turns around the west side of the shaft to the forecourt.
box('ground-lobby-floor',169.8,177,10,14.85,-.28,0,1,'floor');
const plaza=l.panels.find(p=>p.id==='municipal-plaza-642152272');assert(plaza);
const pavingEdge=x=>x<171.301025390625?23.65485954284668+(x-161.30142211914062)*(23.819042205810547-23.65485954284668)/(171.301025390625-161.30142211914062):23.819042205810547+(x-171.301025390625)*(24.12041664123535-23.819042205810547)/(189.65615844726562-171.301025390625);
slab('ground-entrance-floor',[[169.8,14.85],[172.5,14.85],[172.5,pavingEdge(172.5)],[171.301025390625,pavingEdge(171.301025390625)],[169.8,pavingEdge(169.8)]],0,.28);
box('ground-south',169.65,177.15,9.85,10,0,3.05);
box('ground-west',169.65,169.8,10,22.3,0,3.05);
box('ground-east',177,177.15,10,14.85,0,3.05);
box('ground-north-return',175.5,177,14.85,15,0,3.05);
box('ground-passage-east',172.5,172.65,18.2,22.3,0,3.05);
box('ground-lobby-ceiling',169.8,177,10,14.85,3.05,3.2,4,'ceiling');
box('ground-passage-ceiling',169.8,172.5,14.85,23.86,3.05,3.2,4,'ceiling');
for(const[a,b,id]of[[169.65,169.8,'west'],[172.5,172.65,'east']])box('ground-portal-reveal-'+id,a,b,22.3,23.86,0,2.75,6,'door-surround');
box('ground-portal-header',169.65,172.65,22.3,23.86,2.75,2.88,6,'door-surround');
// 2F connects west to the existing theatre foyer, clear of its dining room.
const U=levels[1];
box('second-lobby-floor',170,177,10,14.85,U-.28,U,1,'floor');
box('second-passage-floor',170,174,-3.85,10,U-.28,U,1,'floor');
box('second-west-floor',74.3,170,-3.85,-.85,U-.28,U,1,'floor');
box('second-lobby-east',177,177.15,10,14.85,U,U+3.05);
box('second-lobby-south-return',174,177,9.85,10,U,U+3.05);
box('second-passage-east',174,174.15,-4,10,U,U+3.05);
box('second-passage-west',169.85,170,-.85,14.85,U,U+3.05);
for(const[a,b,id]of[[170,172.5,'west'],[175.5,177,'east']])box('second-lobby-north-'+id,a,b,14.85,15,U,U+3.05);
box('second-west-south',74.3,174,-4,-3.85,U,U+3.05);
box('second-west-north',74.3,170,-.85,-.7,U,U+3.05);
for(const[a,b,d,e,id]of[[170,177,10,14.85,'lobby'],[170,174,-3.85,10,'passage'],[74.3,170,-3.85,-.85,'west']])box('second-'+id+'-ceiling',a,b,d,e,U+3.05,U+3.2,4,'ceiling');
// Small diffusers share the existing bounded lighting pool.
const lamps=[['ground-lobby',174,0,12.2],['ground-entry',171.15,0,20.2],['second-lobby',174,U,12.2],['second-turn',172,U,2.5]];
for(let x=79;x<170;x+=8)lamps.push(['second-west-'+x,x,U,-2.35]);
const lights=[];for(const[id,x,y,z]of lamps){detail('lamp-'+id,x-.35,x+.35,z-.25,z+.25,y+3.01,y+3.05,7,'fixture');lights.push({id:prefix+'light-'+id,position:pt(x,y+2.97,z),direction:pt(0,-1,0),linearColor:{r:1,g:.93,b:.8},intensity:8,range:9,spotAngle:110,innerSpotAngle:85});}
for(let x=80;x<170;x+=2.4)detail('second-joint-'+x,x,x+.008,-3.85,-.85,U+.0005,U+.0015,8,'paving-joint');
function groundHeight(x,z){for(let i=0;i<plaza.triangles.length;i+=3){const[a,b,c]=plaza.triangles.slice(i,i+3).map(i=>plaza.vertices[i]),det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-10)continue;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/det,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/det;if(Math.min(u,v,1-u-v)>=0)return u*a.y+v*b.y+(1-u-v)*c.y;}throw Error('Missing paving support');}
const routes=[],pair=(label,points)=>routes.push({label,points},{label:label+' return',points:points.toReversed()});
// The retained sloped paving rejects flat authored starts; walk out onto it
// from the threshold, then back through the entrance to test both crossings.
pair('Forecourt entrance and eastern lift',[pt(171.15,0,23),pt(171.15,groundHeight(171.15,24.6),24.6),pt(171.15,0,23.5),pt(171.15,0,20),pt(171.15,0,12.6),pt(174,0,13.65)]);
const theatre=[pt(70,U,-2.35),...Array.from({length:8},(_,i)=>pt(76+i*13,U,-2.35)),pt(172,U,-2.35),pt(172,U,8.5),pt(174,U,12),pt(174,U,13.65)];pair('Theatre foyer to eastern lift',theatre);
pair('Gallery to eastern lift',[pt(162,levels[2],11.55),pt(174,levels[2],11.55),pt(174,levels[2],13.65)]);
const lift=multiStopLift({id:'station-east-public-lift',origin:spec.origin,stops:[{id:'1',label:'1F · Forecourt',height:0},{id:'2',label:'2F · Kyoto Theatre',height:U},{id:'7',label:'7F · East Square',height:levels[2]}]});
const report=await c.save(out,'east-public-lift.glb',{componentPrefix:prefix,sourceCollection:'Eastern public lift and receiving routes',builder:'web/station/realism/build-east-public-lift.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the public eastern lift between the forecourt, theatre foyer and East Square gallery.',geometry:{routes,chromeRoutes:routes.filter(r=>!r.label.endsWith(' return')).map(r=>r.label),blocked:[],retiredIds,retiredLights:[],modifiedPanelIds,modifiedFlightIds:[],retiredBoxIds:[],origin:spec.origin,levels},references:['https://www.kyoto-station-building.co.jp/floorguide/1f/','https://www.kyoto-station-building.co.jp/floorguide/2f/','https://www.kyoto-station-building.co.jp/floorguide/7f/','https://kyoto-rys.com/facility/elevator/'],limits:['The three public destinations are documented; shaft dimensions and receiving corridors fit the current model, not a survey.','The theatre and restaurant fitouts remain provisional. This increment connects their existing foyer.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const nr=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nr);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/lift-spec.json',JSON.stringify(lift)+'\n');await writeFile(out+'/motion.json',JSON.stringify({lifts:[lift],escalators:[]})+'\n');
await writeFile(out+'/views.json',JSON.stringify([['ground-entry',[171.15,1.7,26],[171.15,1.5,18]],['ground-lobby',[171,1.7,11],[174,1.4,16.45]],['second-foyer',[72,U+1.7,-2.35],[92,U+1.7,-2.35]],['second-turn',[165,U+1.7,-2.35],[172,U+1.6,4]],['second-lobby',[171,U+1.7,10.5],[174,U+1.4,16.45]],['gallery-lift',[174,levels[2]+1.7,9],[174,levels[2]+1.4,16.45]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lamps:lights.length});
