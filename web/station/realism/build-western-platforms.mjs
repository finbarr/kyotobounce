// Ground-level western bays reached from platform 0, following the JR plan.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);
const font=new FontLoader().parse(await read('research/kyoto-station/fonts/helvetiker_regular.typeface.json'));
const material=(name,rgb,roughness=.7,metallic=0)=>({name:'Western platforms | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[material('dark stone',[.20,.21,.21],.4),material('concrete',[.46,.44,.39]),material('steel',[.3,.33,.34],.35,.8),material('pale roof',[.60,.61,.57]),material('tactile',[.72,.48,.035]),material('ballast',[.135,.12,.10]),material('sign letters',[.9,.9,.84]),{...material('diffuser',[.95,.95,.86]),emissiveFactor:[.95,.95,.86]}];
const c=construction(materials,{flatNormals:true}),prefix='western-platforms-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],edge=x=>-41+.018*x,lights=[],routes=[];
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role),box=(id,a,b,d,e,top,bottom,mi=0,role='floor')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role),beam=(id,a,b,w,h,mi=2,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role),decoration=()=>{c.panels.at(-1).collision=false;};
const point=(x,z,y=0)=>({x,y,z});
function route(label,points,pair=true){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/14);for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));}routes.push({label,points:split});if(pair)routes.push({label:label+' return',points:split.toReversed()});}
const retiredIds=['platform-zero-west-floor','platform-zero-coping','platform-zero-tactile','platform-zero-canopy-west',...l.panels.filter(p=>/^platform-zero-canopy-(column|beam)-/.test(p.id)&&Math.max(...p.vertices.map(v=>v.x))< -190).map(p=>p.id),...l.panels.filter(p=>p.id.startsWith('platform-zero-platform-sign--200-')).map(p=>p.id)];
assert(retiredIds.every(id=>l.panels.some(p=>p.id===id)));
const modifiedPanelIds=['municipal-station-wing-west-Untitled.199','municipal-station-wing-west-Untitled.201','municipal-station-wing-west-Untitled.203','west-south-west-return-0'];
// Replace the overlong platform-0 strip with its approach and a notch for the
// separate track 30. Reuse the rest of its original floor and supporting canopy.
slab('platform-zero-approach',[[-190,edge(-190)],[-85,edge(-85)],[-85,edge(-85)+9],[-190,edge(-190)+9]],0,1.5,0,'platform-floor');
for(const[offset,width,id,top,depth,mi]of[[0,.35,'coping',.005,.1,1],[.6,.35,'tactile',.011,.011,4]]){slab('platform-zero-'+id,[[-190,edge(-190)+offset],[185,edge(185)+offset],[185,edge(185)+offset+width],[-190,edge(-190)+offset+width]],top,depth,mi,'platform-edge');if(mi===4)decoration();}
slab('platform-zero-canopy',[[-190,edge(-190)-.35],[-27,edge(-27)-.35],[-27,edge(-27)+9.35],[-190,edge(-190)+9.35]],5.7,.2,3,'roof');
slab('head-concourse',[[-190,edge(-190)+9],[-163,edge(-163)+9],[-163,-4.8],[-190,-4.8]],0,1.5,0,'concourse-floor');
// The hall is beneath the original building. Its ceiling closes the municipal
// shell cut at Y6.5; the surviving upper facade and external canopy remain.
box('under-building-ceiling',-289,-169,-39.3,-4.8,6.7,6.5,3,'ceiling');
slab('head-ceiling-join',[[-169,edge(-169)+9.35],[-163,edge(-163)+9.35],[-163,-4.8],[-169,-4.8]],6.7,.2,3,'ceiling');
box('north-hall-wall',-289,-163,-4.8,-4.62,6.5,0,1,'wall');
const platforms=[{id:'30-31',west:-370,east:-190,south:-39,north:-29,faces:['30','31']},{id:'32-33',west:-350,east:-190,south:-22.2,north:-12.2,faces:['32','33']},{id:'34',west:-285,east:-190,south:-8.8,north:-4.8,faces:['34']}];
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.08,a[2]],[b[0],b[1]+1.08,b[2]],.05,.05);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/2);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1.08,p[2]],.045,.045);}}
function sign(id,label,x,y,z,roof){box(id+'-board',x-.045,x+.045,z-1.6,z+1.6,y+.8,y,2,'sign');const g=new TextGeometry(label,{font,size:.48,depth:.018,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();const width=g.boundingBox.max.x;g.rotateY(Math.PI/2);g.translate(x+.055,y+.15,-z+width/2);const a=g.attributes.position;c.add(prefix+id+'-letters',Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:a.count},(_,i)=>i),6,'sign-letters');decoration();g.dispose();for(const side of[-1,1])beam(id+'-hanger-'+side,[x,y+.8,z+side*1.2],[x,roof,z+side*1.2],.035,.035);}
function light(id,x,z,y){box('fixture-'+id,x-.7,x+.7,z-.15,z+.15,y-.02,y-.065,7,'fixture');decoration();lights.push({id:prefix+'light-'+id,position:{x,y:y-.12,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.96,b:.86},intensity:14,range:10,spotAngle:120,innerSpotAngle:80});}
for(const p of platforms){const center=(p.south+p.north)/2;
 box(p.id+'-floor',p.west,p.east,p.south,p.north,0,-1.5,0,'platform-floor');
 for(const [i,z]of [p.south,...(p.faces.length===2?[p.north]:[])].entries()){const inward=i===0?1:-1;box(p.id+'-coping-'+i,p.west,p.east,z+(inward<0?-.35:0),z+(inward>0?.35:0),.005,-.1,1,'platform-edge');box(p.id+'-tactile-'+i,p.west+.4,p.east-.4,z+inward*.62-.17,z+inward*.62+.17,.011,0,4,'tactile');decoration();}
 // The mapped outside 30/31 canopy is already in the municipal scene. Add
 // only the uncovered 32/33 roof west of the building's edge.
 if(p.id==='32-33'){box(p.id+'-west-roof',p.west-.2,-289,p.south-.3,p.north+.3,4.65,4.45,3,'roof');for(let x=p.west+6;x<-290;x+=13){box(p.id+'-west-post-'+x,x-.13,x+.13,center-.13,center+.13,4.45,0,2,'column');beam(p.id+'-west-beam-'+x,[x,4.35,p.south-.2],[x,4.35,p.north+.2],.14,.2);}}
 for(let x=Math.max(p.west+8,-280);x<-195;x+=14){const zs=p.id==='30-31'?[-36,-32]:[center];for(const z of zs)box(p.id+'-building-column-'+x+'-'+z,x-.23,x+.23,z-.23,z+.23,6.5,0,1,'column');beam(p.id+'-building-beam-'+x,[x,6.3,p.south],[x,6.3,p.north],.2,.35);light(p.id+'-'+x,x,center,6.25);}
 rail(p.id+'-west-guard',[p.west+.12,0,p.south+.15],[p.west+.12,0,p.north-.15]);
 sign(p.id+'-head',p.faces.join(' / '),-194,4.1,center,6.5);
 for(const [i,face]of p.faces.entries()){
  const z=i===0?p.south+1.35:p.north-1.35;
  route('Head concourse to platform '+face,[point(-174,-34),point(-174,z),point(-187,z),point(-203,z)]);
  // One complete outward/return aisle pair per physical island, rather than
  // duplicating hundreds of metres for each side of the same floor slab.
 }
 const z=p.south+1.35;route('Full platform '+p.id+' aisle',[point(-203,z),point(p.west+2,z)]);
}
for(const z of[-33,-20,-7]){box('head-column-'+z,-180.22,-179.78,z-.22,z+.22,6.5,0,1,'column');light('head-'+z,-174,z,6.5);}
box('ground-west',-400,-230,-52,-3,-1.4,-1.8,5,'ground-floor');box('ground-north',-230,-160,-35,-3,-1.4,-1.8,5,'ground-floor');
const tracks=[{id:'30',z:-40.7},{id:'31',z:-27.3},{id:'32',z:-23.9},{id:'33-34',z:-10.5}];
for(const t of tracks){const a=-390,b=-193;box(t.id+'-ballast',a,b,t.z-1.45,t.z+1.45,-1.2,-1.6,5,'track-bed');const vs=[],ix=[];
 for(let x=a+.3;x<b;x+=.65){const n=vs.length;vs.push(...[[x-.12,-1.1,-t.z-1.2],[x+.12,-1.1,-t.z-1.2],[x+.12,-1.1,-t.z+1.2],[x-.12,-1.1,-t.z+1.2],[x-.12,-1.23,-t.z-1.2],[x+.12,-1.23,-t.z-1.2],[x+.12,-1.23,-t.z+1.2],[x-.12,-1.23,-t.z+1.2]]);ix.push(...[2,1,0,3,2,0,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7].map(i=>i+n));}c.add(prefix+t.id+'-sleepers',vs,ix,1,'sleepers');
 for(const side of[-1,1]){const z=t.z+side*(1.067/2+.034);for(const[name,w,top,depth]of[['foot',.14,-1.04,.045],['web',.017,-.96,.08],['head',.068,-.91,.05]])box(t.id+'-rail-'+side+'-'+name,a,b,z-w/2,z+w/2,top,top-depth,2,'rail');beam(t.id+'-buffer-leg-'+side,[b-1,-1.1,t.z+side*.56],[b-2,.05,t.z+side*.56],.12,.14);}
 beam(t.id+'-buffer',[b-2,.05,t.z-1],[b-2,.05,t.z+1],.15,.22);beam(t.id+'-wire',[a,5.1,t.z],[b,5.1,t.z],.009,.009);decoration();
 // Protect the head concourse behind each buffer while leaving every island
 // doorway open. A continuous north/south wall would block the fan of routes.
 rail(t.id+'-head-guard',[-190,0,t.z-1.5],[-190,0,t.z+1.5]);
}
// Retained low canopy columns require an aisle away from the coping. The
// ground shell opening replaces the wall that previously ended this route.
route('Platform 0 western approach',[point(-80,-37.4),point(-100,-38),point(-145,-39),point(-174,-39),point(-174,-34)]);
route('Across all western platform entrances',[point(-183,-37.65),point(-183,-6.8)]);
route('Retained platform 0 near new notch',[point(-181,edge(-181)+2.8),point(-165,edge(-165)+2.8)]);
for(const p of c.panels)p.material=p.browserMaterial===2?'steel':'stone';
const report=await c.save(out,'western-platforms.glb',{componentPrefix:prefix,sourceCollection:'Western railway platforms and ground concourse',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Open the western platform-0 approach and complete the connected ground-level bay platforms 30–34 beneath the retained station building.',geometry:{retiredIds,modifiedPanelIds,retiredLights:[],platforms,tracks,routes,spawn:point(-174,-34)},references:['research/kyoto-station/maps/jr-west-plan.pdf','https://eki.jr-odekake.net/premises?id=0610116','https://plus.kyoto.travel/entry/traffic-advice'],limits:['The operator plan establishes circulation and platform grouping; dimensions, endpoints and track paths are fitted to the current model.','No operational trains, track switches or tenant fitouts are implemented.','The existing external canopy over platforms 30/31 is retained; the building ground shell is opened while preserving the upper facade.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['approach',[-144,1.7,-39],[-193,1.7,-36]],['head-concourse',[-174,1.7,-34],[-174,1.7,-6]],['30-31-entry',[-181,1.7,-34],[-240,1.7,-34]],['30-aisle',[-245,1.7,-37.65],[-350,1.7,-37.65]],['31-aisle',[-240,1.7,-30.35],[-185,1.7,-30.35]],['32-33-entry',[-181,1.7,-17.2],[-260,1.7,-17.2]],['34-entry',[-181,1.7,-6.8],[-260,1.7,-6.8]],['track-heads',[-184,1.7,-25.6],[-210,-.3,-25.6]],['western-roofs',[-355,19,-58],[-225,4,-20]],['outer-30-canopy',[-338,1.7,-37.65],[-290,1.7,-37.65]],['outer-32-canopy',[-333,1.7,-20.85],[-292,1.7,-20.85]]],null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length,retired:retiredIds.length});
