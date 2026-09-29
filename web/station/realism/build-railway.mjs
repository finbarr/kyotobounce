// Conventional railway structure fitted to the operator plan and municipal roofs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
const [manifest,out]=process.argv.slice(2),base=JSON.parse(await readFile(manifest)),bytes=await readFile(base.layout),layout=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes),base.layoutSha256);assert(!layout.boxes.some(b=>b.id==='add-west-gate-back'));
const sourcePath='research/kyoto-station/geodata/plateau-2024/registered-footprints.json',sourceBytes=await readFile(sourcePath),source=JSON.parse(sourceBytes);
const font=new FontLoader().parse(JSON.parse(await readFile('research/kyoto-station/fonts/helvetiker_regular.typeface.json')));
const material=(name,color,roughness=.7,metallic=0)=>({name:'Conventional railway | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[material('platform asphalt',[.16,.17,.17]),material('concrete edge',[.46,.44,.39]),material('ballast',[.135,.12,.1]),material('galvanized steel',[.35,.38,.39],.35,.8),material('painted roof',[.34,.37,.35]),material('tactile yellow',[.72,.48,.035]),material('concourse stone',[.39,.36,.31],.48),material('pale ceiling',[.67,.68,.64]),{...material('glazing',[.42,.54,.57],.18),pbrMetallicRoughness:{baseColorFactor:[.42,.54,.57,.2],roughnessFactor:.18,metallicFactor:0},alphaMode:'BLEND',doubleSided:true}];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],slope=.018,zAt=(z,x)=>z+slope*x;
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab('railway-'+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const beam=(id,a,b,w,h,mi=3,role='steelwork')=>c.beam('railway-'+id,P(...a),P(...b),w,h,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi,role)=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
const strip=(id,x0,x1,z,width,top,depth,mi,role)=>slab(id,[[x0,zAt(z-width/2,x0)],[x1,zAt(z-width/2,x1)],[x1,zAt(z+width/2,x1)],[x0,zAt(z+width/2,x0)]],top,depth,mi,role);
function rail(id,a,b){beam(id+'-cap',[a[0],a[1]+1.08,a[2]],[b[0],b[1]+1.08,b[2]],.055,.055);beam(id+'-lower',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/2);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1.08,p[2]],.045,.045);}}
function sign(id,label,x,y,z,roof){box(id+'-board',x-.03,x+.06,z-1.7,z+1.7,y+.83,y,3,'sign');const g=new TextGeometry(label.replace('–',' / '),{font,size:.52,depth:.018,curveSegments:3,bevelEnabled:false});g.computeBoundingBox();const w=g.boundingBox.max.x;g.rotateY(-Math.PI/2);g.translate(x-.04,y+.15,-z-w/2);const p=g.attributes.position;c.add('railway-'+id+'-digits',Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),7,'sign-letters');c.panels.at(-1).collision=false;g.dispose();for(const side of [-1,1])beam(id+'-hanger-'+side,[x,y+.83,z+side*1.2],[x,roof,z+side*1.2],.035,.035);}
const high=7.35,platformY=0,stairStart=-27,steps=42,going=.32,halfRun=21*going,midStart=stairStart+halfRun,midEnd=midStart+1.8,stairEnd=midEnd+halfRun;
// Roof IDs establish alignment/extent. Platform edges and access dimensions are
// fitted reconstruction, not survey measurements extracted from roof edges.
const platforms=[
 {label:'2–3',id:'2-3',z:-52.2,width:9.5,west:-220,east:145,roof:'466064',roofY:5.35},
 {label:'4–5',id:'4-5',z:-78.2,width:10.1,west:-135,east:200,roof:'466178',roofY:4.85},
 {label:'6–7',id:'6-7',z:-94.5,width:8.7,west:-130,east:200,roof:'466179',roofY:5.1},
 {label:'8–9',id:'8-9',z:-111,width:9.4,west:-51,east:140,roof:'466180',roofY:5.15},
 {label:'10',id:'10',z:-124,width:4.2,west:-185,east:172,roof:'466180',roofY:4.9}
];
for(const p of platforms){const r=source.buildings.find(b=>b.sourceBuildingId==='26100-bldg-'+p.roof);assert(r);p.sourceRoof={id:r.sourceBuildingId,bounds:r.boundsXY};}
box('railway-subgrade',-230,220,-134,-41,-1.4,-1.8,2,'ground-floor');
// The paid bridge is beside the public passage and joins its existing gate floor.
box('paid-floor',-51,-27,-128,-45,high,high-.38,6,'concourse-floor');
box('paid-roof',-51.15,-26.8,-128.15,-44.85,12,11.8,7,'roof');
for(const [a,b]of [[-128,-58.5],[-49.5,-45]])box('west-wall-'+a,-51.15,-51,a,b,11.8,high,7,'wall');
for(const z of [-128,-45]){box('end-parapet-'+z,-51,-27,z-.08,z+.08,high+1.1,high,6,'guard');box('end-glass-'+z,-51,-27,z-.035,z+.035,11.8,high+1.1,8,'glazing');}
// Openings in the east edge align with every descending stair; no wall crosses them.
const openings=platforms.map(p=>[zAt(p.z,stairStart)-2.15,zAt(p.z,stairStart)+2.15]).sort((a,b)=>a[0]-b[0]);let previous=-128;
for(const [a,b]of [...openings,[ -45,-45 ]]){if(a>previous){box('east-parapet-'+previous,-27.08,-26.92,previous,a,high+1.1,high,6,'guard');box('east-glass-'+previous,-27.035,-26.965,previous,a,11.8,high+1.1,8,'glazing');}previous=b;}
for(let z=-47,i=0;z>-128;z-=8,i++){beam('bridge-roof-rib-'+i,[-50.9,11.7,z],[-27.1,11.7,z],.16,.24);box('bridge-ceiling-strip-'+i,-48,-30,z-.18,z+.18,11.77,11.72,1,'fixture');c.panels.at(-1).collision=false;}
const routes=[];
for(const p of platforms){
 const id=p.id,cz=x=>zAt(p.z,x),half=p.width/2;
 sign(id+'-stair-sign',p.label,-29,10.05,cz(stairStart),11.8);
 sign(id+'-platform-sign',p.label,22,p.roofY-1.05,cz(22),p.roofY-.15);
 strip(id+'-platform',p.west,p.east,p.z,p.width,platformY,1.5,0,'platform-floor');
 for(const side of [-1,1]){strip(id+'-coping-'+side,p.west,p.east,p.z+side*(half-.18),.36,.005,.10,1,'platform-edge');strip(id+'-tactile-'+side,p.west+.4,p.east-.4,p.z+side*(half-.68),.35,.011,.011,5,'tactile');c.panels.at(-1).collision=false;}
 // Canopies stop clear of stair headroom; a higher pitched hood covers the stair.
 for(const [a,b,part]of [[p.west,-57,'west'],[-9,p.east,'east']])if(b>a){
  const mid=p.z,edge=half+.28;
  for(const side of [-1,1])c.slab('railway-'+id+'-'+part+'-roof-'+side,[P(a,p.roofY+.22,cz(a)),P(b,p.roofY+.22,cz(b)),P(b,p.roofY,cz(b)+side*edge),P(a,p.roofY,cz(a)+side*edge)],[],.14,4,'roof');
  for(let x=a+7,n=0;x<b-3;x+=13,n++){
   // Put posts beside the centre walkway, preserving the tested route.
   const z=cz(x)+Math.min(half-1.2,1.35);box(id+'-'+part+'-column-'+n,x-.12,x+.12,z-.12,z+.12,p.roofY-.14,platformY,3,'column');
   beam(id+'-'+part+'-roof-beam-'+n,[x,p.roofY-.2,cz(x)-edge],[x,p.roofY-.2,cz(x)+edge],.12,.23);
   beam(id+'-'+part+'-roof-brace-'+n,[x,p.roofY-1.05,z],[x,p.roofY-.23,cz(x)-half+.6],.07,.07);
  }
 }
 for(const x of [-48,-31]){const z=cz(x);for(const side of [-1,1]){const q=z+side*(half-.85);box(id+'-bridge-column-'+x+'-'+side,x-.22,x+.22,q-.22,q+.22,high-.38,platformY,3,'column');}}
 for(let flight=0;flight<2;flight++){
  const start=flight?midEnd:stairStart,top=flight?high/2:high;
  for(let i=0;i<21;i++){const a=start+i*going,b=start+(i+1)*going;slab(id+'-stair-'+flight+'-'+i,[[a,cz(a)-2],[b,cz(b)-2],[b,cz(b)+2],[a,cz(a)+2]],top-(i+1)*high/42,.30,1,'stair-tread');}
  for(const side of [-1,1])rail(id+'-flight-'+flight+'-'+side,[start,top,cz(start)+side*1.9],[start+halfRun,top-high/2,cz(start+halfRun)+side*1.9]);
 }
 strip(id+'-middle-landing',midStart,midEnd,p.z,4,high/2,.3,1,'stair-landing');
 for(const side of [-1,1])rail(id+'-middle-'+side,[midStart,high/2,cz(midStart)+side*1.9],[midEnd,high/2,cz(midEnd)+side*1.9]);
 const hood=[P(stairStart,11.8,cz(stairStart)-2.2),P(stairEnd,4.15,cz(stairEnd)-2.2),P(stairEnd,4.15,cz(stairEnd)+2.2),P(stairStart,11.8,cz(stairStart)+2.2)];c.slab('railway-'+id+'-stair-roof',hood,[],.15,7,'roof');
 for(const side of [-1,1]){beam(id+'-hood-edge-'+side,[stairStart,11.6,cz(stairStart)+side*2.15],[stairEnd,4,cz(stairEnd)+side*2.15],.1,.18);box(id+'-hood-foot-'+side,stairEnd-.09,stairEnd+.09,cz(stairEnd)+side*2.15-.09,cz(stairEnd)+side*2.15+.09,4,0,3,'column');}
 // Physical gates stay; the middle flap is open for free exploration.
 const path=[{x:-64,y:high,z:-53.99},{x:-54,y:high,z:-53.99},{x:-43,y:high,z:-53.99}];
 const targetZ=cz(stairStart);let z=-53.99;while(Math.abs(targetZ-z)>18){z+=Math.sign(targetZ-z)*18;path.push({x:-43,y:high,z});}path.push({x:-43,y:high,z:targetZ},{x:stairStart,y:high,z:targetZ},{x:midStart,y:high/2,z:cz(midStart)},{x:midEnd,y:high/2,z:cz(midEnd)},{x:stairEnd,y:0,z:cz(stairEnd)},{x:-7,y:0,z:cz(-7)},{x:10,y:0,z:cz(10)},{x:28,y:0,z:cz(28)});
 const checked=(id==='2-3'||id==='10')?path:path.slice(path.findIndex(v=>v.x===stairStart)-1);
 routes.push({label:'Paid concourse to platform '+p.label,points:checked},{label:'Platform '+p.label+' to paid concourse',points:checked.toReversed()});
}
// Conventional rail corridor. The two polished railheads have a 1.067 m clear
// gauge; sleeper detail shares one collision mesh per track to bound object count.
const tracks=[{label:'0',z:-42.7},{label:'2',z:-45.75},{label:'3',z:-58.75},{label:'through',z:-66},{label:'4',z:-71.5},{label:'5',z:-85},{label:'6',z:-88.5},{label:'7',z:-100.65},{label:'8',z:-104.2},{label:'9',z:-117.35,west:-9},{label:'10',z:-120.25}];
for(const t of tracks){const a=t.west??-230,b=220,id='track-'+t.label;strip(id+'-ballast',a,b,t.z,2.9,-1.2,.45,2,'track-bed');
 const verts=[],indices=[];for(let x=a+.3;x<b;x+=.65){const z=zAt(t.z,x),v=[[x-.12,-1.1,-z-1.2],[x+.12,-1.1,-z-1.2],[x+.12,-1.1,-z+1.2],[x-.12,-1.1,-z+1.2],[x-.12,-1.23,-z-1.2],[x+.12,-1.23,-z-1.2],[x+.12,-1.23,-z+1.2],[x-.12,-1.23,-z+1.2]],n=verts.length;verts.push(...v);indices.push(...[2,1,0,3,2,0,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7].map(i=>i+n));}c.add('railway-'+id+'-sleepers',verts,indices,1,'sleepers');
 for(const side of [-1,1]){const center=t.z+side*(1.067/2+.034);for(const [name,w,top,depth]of [['foot',.14,-1.04,.045],['web',.017,-.96,.08],['head',.068,-.91,.05]])strip(id+'-'+side+'-'+name,a,b,center,w,top,depth,3,'rail');}
 if(t.west!==undefined){for(const z of [t.z-.56,t.z+.56])beam(id+'-buffer-leg-'+z,[a+.4,-1.1,zAt(z,a+.4)],[a+1,.05,zAt(z,a+1)],.12,.14);beam(id+'-buffer-stop',[a+1,.05,zAt(t.z-1,a+1)],[a+1,.05,zAt(t.z+1,a+1)],.15,.2);}
}
// Wire spans are lightweight geometry. Posts stand on platforms, never in rails.
for(const x of [30,90,150]){for(const p of platforms){const z=zAt(p.z,x);if(x>p.east-3)continue;box('wire-mast-'+x+'-'+p.id,x-.1,x+.1,z+.9,z+1.1,8,0,3,'mast');}beam('wire-span-'+x,[x,7.8,zAt(-43,x)],[x,7.8,zAt(-124,x)],.07,.09);}
for(const t of tracks){beam('wire-'+t.label,[t.west??-230,5.1,zAt(t.z,t.west??-230)],[220,5.1,zAt(t.z,220)],.009,.009);c.panels.at(-1).collision=false;}
const groundRoute=[{x:10,y:-1.4,z:zAt(-62.5,10)},{x:20,y:-1.4,z:zAt(-62.5,20)}];
routes.push({label:'Ground between track beds',points:groundRoute},{label:'Ground between track beds return',points:groundRoute.toReversed()});
for(const p of c.panels)p.material=p.browserMaterial===3?'steel':p.browserMaterial===8?'glass':'stone';
const report=await c.save(out,'railway.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,geometry:{high,platformY,platforms,tracks,steps,going,stairStart,midStart,midEnd,stairEnd,routes},references:[sourcePath,'research/kyoto-station/maps/jr-west-plan.pdf','research/kyoto-station/maps/guide-station.pdf','https://www.westjr.co.jp/press/article/2015/12/page_8090.html','https://www.mlit.go.jp/common/000024913.pdf'],sourceRoofSha256:sha(sourceBytes),attribution:'Kyoto City / MLIT Project PLATEAU. Registered municipal roof extents used to fit a Kyoto Bounce reconstruction; not an official survey.',limits:['Platform 0 access, western 30–34 bay platforms, eastern transfer bridge, Shinkansen and Kintetsu remain unfinished.','Lengths, floor elevations, roof profiles, track alignments and stair dimensions are provisional; operator maps establish circulation and municipal roof footprints establish broad plan placement.','No operational trains, signals, switches or accessible lifts are implemented in this structural pass.']});
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length});
