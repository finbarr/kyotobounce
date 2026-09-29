// Level terminal routes fitted to Kintetsu's platform plan and terminal section.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {construction} from './component-mesh.mjs';
import {retiredKintetsuPanels} from './kintetsu-scope.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout);assert.equal(sha(raw),m.layoutSha256);
const removal=await read(dirname(manifest)+'/removal.json'),oldRaw=await readFile(removal.parent.layout),old=JSON.parse(oldRaw);assert.equal(sha(oldRaw),removal.parent.layoutSha256);
const retiredIds=retiredKintetsuPanels(old);assert.deepEqual(retiredIds,removal.removedIds);
const font=new FontLoader().parse(await read('research/kyoto-station/fonts/helvetiker_regular.typeface.json'));
const mat=(name,color,roughness=.7,metallic=0)=>({name:'Kintetsu | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('pale platform',[.48,.46,.41]),mat('concrete',[.56,.56,.51]),mat('ballast',[.16,.15,.13]),mat('steel',[.30,.34,.35],.3,.8),mat('ceiling',[.65,.65,.59]),mat('tactile',[.72,.48,.035]),mat('sign board',[.025,.05,.055]),mat('white labels',[.88,.88,.81]),{...mat('shaft glazing',[.32,.43,.43]),pbrMetallicRoughness:{baseColorFactor:[.32,.43,.43,.28],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true},{...mat('diffuser',[.89,.89,.80]),emissiveFactor:[.89,.89,.80]},mat('buffer red',[.50,.055,.035]),mat('deck',[.38,.37,.32])];
// Preserve the existing JR10 finishes on its corrected shorter geometry.
const replacements=old.panels.filter(p=>retiredIds.includes(p.id)&&p.id.startsWith('railway-')&&!p.id.startsWith('railway-10-west-'));
const materialMap=new Map();for(const p of replacements)if(!materialMap.has(p.appearance)){const r=old.authoredMaterials.find(m=>m.id===p.appearance);assert(r&&!r.albedo);materialMap.set(p.appearance,materials.length);materials.push({name:'Kintetsu | retained '+r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}});}
const c=construction(materials,{flatNormals:true}),floor=3.675,ceiling=7.175,railHead=2.61,west=-242,join=-106,trackWest=-258;
const P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab('kintetsu-'+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=1,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('kintetsu-'+id,P(...a),P(...b),w,h,mi,role);
// Fitted curve follows the neighbouring municipal hotel roof's broad bend.
const alignment=[[-258,7],[-242,5],[-230,3],[-210,1],[-190,-.2],[-170,-.6],[-150,-.55],[-130,-.25],[-110,.10],[join,.20]];
function shift(x){if(x>=join)return .2;for(let i=0;i<alignment.length-1;i++){const[a,z]=alignment[i],[b,w]=alignment[i+1];if(x<=b)return z+(w-z)*(x-a)/(b-a);}throw Error('Alignment range');}
const zAt=(z,x)=>z+shift(x),knots=alignment.map(p=>p[0]);
const slope=x=>(shift(x+.01)-shift(x-.01))/.02;
const polygon=(a,b,z,width)=>{const xs=[a,...knots.filter(x=>x>a&&x<b),b];return[...xs.map(x=>[x,zAt(z-width/2,x)]),...xs.toReversed().map(x=>[x,zAt(z+width/2,x)])];};
const strip=(id,a,b,z,width,top,depth,mi=0,role='floor')=>slab(id,polygon(a,b,z,width),top,depth,mi,role);
const platforms=[{id:'1',label:'1',z:-152.4,width:7.2,edges:[1]},{id:'1-2',label:'2',z:-141.7,width:7.6,edges:[-1,1]},{id:'exit-2-3',label:'EXIT',z:-131.85,width:5.5,edges:[-1,1]},{id:'3-4',label:'3 / 4',z:-122,width:7.6,edges:[-1,1]}];
const tracks=[{id:'1',z:-147.15,end:-108},{id:'2',z:-136.25,end:-108},{id:'3',z:-127.45,end:-108},{id:'4',z:-116.55,end:-116}];
function rail(id,a,b,height=1.08){beam(id+'-cap',[a[0],a[1]+height,a[2]],[b[0],b[1]+height,b[2]],.05,.05);beam(id+'-middle',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.8);for(let i=0;i<=n;i++){const q=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,q,[q[0],q[1]+height,q[2]],.05,.05);}}
function sign(id,label,x,y,z,width=3.8){box(id+'-board',x-.06,x+.06,z-width/2,z+width/2,y+.72,y,6,'sign');const g=new TextGeometry(label,{font,size:.45,depth:.018,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();const w=g.boundingBox.max.x;g.rotateY(Math.PI/2);g.translate(x+.075,y+.12,-z+w/2);const v=g.attributes.position;c.add('kintetsu-'+id+'-letters',Array.from({length:v.count},(_,i)=>[v.getX(i),v.getY(i),v.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:v.count},(_,i)=>i),7,'sign-letters');c.panels.at(-1).collision=false;g.dispose();for(const side of[-1,1])beam(id+'-hanger-'+side,[x,y+.72,z+side*(width/2-.25)],[x,ceiling,z+side*(width/2-.25)],.03,.03);}
// A broad head concourse connects all four platform strips without crossing tracks.
box('head-floor',join,-81,-170,-113.7,floor,floor-.38,0,'concourse-floor');
box('head-ceiling',join,-81,-170,-113.7,ceiling+.15,ceiling,4,'ceiling');
box('head-east-return',-81.15,-81,-138,-113.7,ceiling,floor);
box('head-south-wall',join,-81,-170.15,-170,ceiling,0);
box('head-west-return',join-.15,join,-170,zAt(-156,join),ceiling,floor);
box('head-north-wall',join,-81,-113.7,-113.55,ceiling,0);
box('north-wall-corner',join-.08,join+.08,-113.96,-113.55,ceiling,0);
box('head-ground-floor',join,-81,-170,-113.7,0,-.3,11,'ground-floor');
// Enclosed railway volume with a lower storey reserved for the later shopping route.
strip('terminal-deck',trackWest,join,-135.6,43.2,2.28,.38,11,'viaduct-floor');
strip('terminal-ceiling',west,join,-135.6,43.2,ceiling+.15,.15,4,'ceiling');
strip('south-wall',west,join,-156.08,.16,ceiling,ceiling,1,'wall');
strip('north-wall-base',west,join,-114.08,.16,floor+1.1,floor+1.1,1,'wall');
strip('north-glass',west,join,-114.03,.05,ceiling,ceiling-floor-1.1,8,'glazing');
for(let x=west+5,n=0;x<join;x+=10,n++)box('north-mullion-'+n,x-.06,x+.06,zAt(-114.08,x)-.1,zAt(-114.08,x)+.1,ceiling,floor+1.1,3,'window-frame');
// Open the retained ticket lane with retracted leaves alongside its cabinets.
for(const z of[-152.30,-153.70])box('open-gate-leaf-'+z,-70.6,-69,z-.035,z+.035,floor+.9,floor+.12,3,'gate-leaf');
for(const p of platforms){
 strip(p.id+'-platform',west,join,p.z,p.width,floor,floor-2.28,0,'platform-floor');
 for(const side of p.edges){strip(p.id+'-coping-'+side,west,join,p.z+side*(p.width/2-.16),.32,floor+.006,.1,1,'coping');strip(p.id+'-tactile-'+side,west+.3,join,p.z+side*(p.width/2-.65),.34,floor+.012,.012,5,'tactile');c.panels.at(-1).collision=false;}
 rail(p.id+'-west-end',[west+3,floor,zAt(p.z-p.width/2+.15,west+3)],[west+3,floor,zAt(p.z+p.width/2-.15,west+3)]);
 sign(p.id+'-entrance',p.label,-104,floor+2.35,zAt(p.z,join));
 sign(p.id+'-mid',p.label,-185,floor+2.35,zAt(p.z,-185));
}
// Track 4 stops farther west; its recessed buffer end has a level approach.
strip('fourth-track-head',-116,join,-116.05,4.3,floor,floor-2.28,0,'concourse-floor');
const groups=new Map();function groupBox(key,x,z,w,d,top,bottom,mi,role){let r=groups.get(key);if(!r){r={v:[],i:[],mi,role};groups.set(key,r);}const g=new T.BoxGeometry(w,top-bottom,d);g.rotateY(Math.atan((shift(x+.01)-shift(x-.01))/.02));g.translate(x,(top+bottom)/2,-z);const a=g.attributes.position,n=r.v.length;for(let k=0;k<a.count;k++)r.v.push([a.getX(k),a.getY(k),a.getZ(k)]);for(const i of g.index.array)r.i.push(n+i);g.dispose();}
for(const t of tracks){
 if(t.id!=='4')strip('track-'+t.id+'-head-floor',t.end,join,t.z,3.3,floor,floor-2.28,0,'concourse-floor');
 strip('track-'+t.id+'-bed',trackWest,t.end,t.z,3.3,2.36,.08,2,'track-bed');
 for(let x=trackWest+.4;x<t.end-.3;x+=.65)groupBox('track-'+t.id+'-sleepers',x,zAt(t.z,x),.24,2.45,2.44,2.34,1,'sleepers');
 for(const side of[-1,1])for(const[name,w,top,depth]of[['foot',.14,2.48,.04],['web',.017,2.56,.08],['head',.068,railHead,.05]]){
  const xs=[trackWest,...knots.filter(x=>x>trackWest&&x<t.end),t.end],offset=side*(1.435/2+.034),poly=[];
  for(const [i,d]of [offset-w/2,offset+w/2].entries())for(const x of i?xs.toReversed():xs){const g=slope(x),norm=Math.sqrt(1+g*g);poly.push([x-g*d/norm,zAt(t.z,x)+d/norm]);}
  slab('track-'+t.id+'-'+side+'-'+name,poly,top,depth,3,'rail');
 }
 const x=t.end-1.1,z=zAt(t.z,x);
 for(const side of[-1,1])beam('buffer-'+t.id+'-leg-'+side,[x-1,2.42,z+side*.75],[x,3.32,z+side*.75],.14,.15);
 beam('buffer-'+t.id+'-beam',[x,3.32,z-1.23],[x,3.32,z+1.23],.2,.26,10,'buffer-stop');
 for(const side of[-1,1])box('buffer-'+t.id+'-pad-'+side,x-.13,x+.13,z+side*.75-.22,z+side*.75+.22,3.46,3.22,6,'buffer-stop');
 rail('track-'+t.id+'-head-guard',[t.end+.15,floor,zAt(t.z-1.55,t.end)],[t.end+.15,floor,zAt(t.z+1.55,t.end)]);
 for(let i=0;i<alignment.length-1;i++){const a=alignment[i][0],b=Math.min(alignment[i+1][0],t.end-1.8);if(b<=a)continue;beam('track-'+t.id+'-wire-'+i,[a,6.5,zAt(t.z,a)],[b,6.5,zAt(t.z,b)],.009,.009);c.panels.at(-1).collision=false;}
}
// Supports stand within platforms; none occupies a rail or the entrance aisle.
for(const x of[-225,-200,-175,-150,-125,-100]){const z=zAt(-131.85,x)+.7;box('deck-bearing-'+x,x-.45,x+.45,z-.45,z+.45,7.675,0,1,'column');}
for(let x=-231,n=0;x<-110;x+=13,n++){
 const z=zAt(-122,x)+1.5;
 box('hotel-bearing-'+n,x-.45,x+.45,z-.45,z+.45,7.45,0,1,'column');
 // Shallow structural beam soffits tie the two sets of bearings into the ceiling.
 beam('ceiling-rib-'+n,[x,7.02,zAt(-155.9,x)],[x,7.02,zAt(-114.1,x)],.24,.30,1,'ceiling-beam');
 for(const q of[-151,-142])box('inner-column-'+n+'-'+q,x-.30,x+.30,zAt(q,x)-.30,zAt(q,x)+.30,7.175,0,1,'column');
}
// Three hotel lift shafts pass through the north island, as shown in the operator section.
box('lift-screen',-163,-153,zAt(-122,-158)-1,zAt(-122,-158)+1,ceiling,floor+.1,8,'enclosed-lift-shafts');
for(let i=0;i<3;i++){const x=-161.5+i*3.1,z=zAt(-122,x);box('lift-core-'+i,x-.55,x+.55,z-.6,z+.6,ceiling,0,1,'lift-core');}
for(const x of[-163,-153])for(const side of[-1,1])box('lift-frame-'+x+'-'+side,x-.035,x+.035,zAt(-122,-158)+side-.035,zAt(-122,-158)+side+.035,ceiling,floor+.1,3,'shaft-frame');
const lights=[];for(const p of platforms)for(let x=-229,n=0;x<-90;x+=16,n++){
 const z=zAt(p.z,x)-1.2,id=p.id+'-'+n;box('light-'+id,x-.9,x+.9,z-.12,z+.12,ceiling-.18,ceiling-.24,9,'fixture');c.panels.at(-1).collision=false;
 lights.push({id:'kintetsu-emitter-'+id,position:{x,y:ceiling-.28,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.96,b:.87},intensity:11,range:9,spotAngle:120,innerSpotAngle:76,source:'Operator terminal photographs; fitted linear platform lights',note:'Uses the existing two-light pool.'});
}
for(const [id,r]of groups)c.add('kintetsu-'+id,r.v,r.i,r.mi,r.role);
// Replace the wrongly extended western JR10 geometry. The current stair stays.
for(const p of replacements){
 const cut=p.id.startsWith('railway-10-')?-57:-55,vertices=[],indices=[];
 if(p.id.endsWith('sleepers')){assert.equal(p.triangles.length%36,0);for(let i=0;i<p.triangles.length;i+=36){const ids=p.triangles.slice(i,i+36);if(ids.some(k=>p.vertices[k].x<cut))continue;for(const k of ids){const v=p.vertices[k];indices.push(vertices.length);vertices.push(P(v.x,v.y,v.z));}}for(let i=0;i<indices.length;i+=3)[indices[i],indices[i+2]]=[indices[i+2],indices[i]];}
 else{for(const v of p.vertices){const x=Math.max(cut,v.x);vertices.push(P(x,v.y,v.z+.018*(x-v.x)));}for(let i=0;i<p.triangles.length;i+=3)indices.push(...p.triangles.slice(i,i+3).reverse());}
 c.add('kintetsu-corrected-'+p.id,vertices,indices,materialMap.get(p.appearance),p.role);c.panels.at(-1).collision=p.collision;
}
rail('jr10-west-end',[-56.7,0,-124+.018*-56.7-1.95],[-56.7,0,-124+.018*-56.7+1.95]);
for(const side of[-1,1])beam('jr10-buffer-leg-'+side,[-54.5,-1.1,-120.25+.018*-54.5+side*.55],[-55.2,.05,-120.25+.018*-55.2+side*.55],.12,.14);
beam('jr10-buffer',[-55.2,.05,-120.25+.018*-55.2-1],[-55.2,.05,-120.25+.018*-55.2+1],.15,.2,10,'buffer-stop');
for(const p of c.panels)p.material=replacements.find(r=>p.id==='kintetsu-corrected-'+r.id)?.material??(p.browserMaterial===3?'steel':p.browserMaterial===8?'glass':'stone');
const point=(x,z,y=floor)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Public hall to Kintetsu head',[point(-63,-153),point(-78,-153),point(-96,-153)]);
for(const p of platforms){const dz=p.id==='1'?-1.2:p.id==='exit-2-3'?-1.1:p.id==='3-4'?-2.0:1.4;pair(p.id+' platform connection',[point(-96,zAt(p.z,join)+dz),point(join,zAt(p.z,join)+dz),point(-124,zAt(p.z,-124)+dz)]);pair(p.id+' curved western platform',[point(-212,zAt(p.z,-212)+dz),point(-232,zAt(p.z,-232)+dz),point(-237,zAt(p.z,-237)+dz)]);}
pair('North south head concourse',[point(-96,-158),point(-96,-140),point(-96,-117)]);
pair('Hotel lift passage',[point(-148,zAt(-122,-148)-2),point(-169,zAt(-122,-169)-2)]);
pair('JR10 corrected end',[point(-54,-124+.018*-54,0),point(-42,-124+.018*-42,0)]);
pair('Retained public hall',[point(-65,-144),point(-65,-167)]);
const report=await c.save(out,'kintetsu.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Level access from the Kintetsu gate to its four-platform, four-track terminal; correct the conflicting JR10 west extension.',geometry:{floor,ceiling,railHead,west,join,alignment,platforms,tracks,retiredIds,routes,jr10West:-57},references:['research/kyoto-station/maps/kintetsu-plan.pdf','research/kyoto-station/plans/kintetsu-terminal-four-tracks-2012.pdf','research/kyoto-station/maps/jr-west-plan.pdf','research/kyoto-station/geodata/plateau-2024/registered-footprints.json'],limits:['Dimensions, alignments, materials, hotel shaft positions and structural spacing remain fitted approximations.','Hotel upper floors, lower shopping streets, detailed shops, accessible routes and train operations remain unfinished.','The 2012 operator photographs are historical references, checked against the 2026 operator plan for platform topology.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lights:lights.length,routes:routes.length});
