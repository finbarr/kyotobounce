// Connected subway halls, island platform and retained station interfaces.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';

const [manifestPath,specPath,out,integrationPath]=process.argv.slice(2);
assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=await read(manifestPath),spec=await read(specPath),raw=await readFile(manifest.layout),layout=JSON.parse(raw);
assert.equal(sha(raw),manifest.layoutSha256);assert.equal(spec.parentLayoutSha256,manifest.layoutSha256);
const integration=integrationPath?await read(integrationPath):null;
if(integration){assert.equal(integration.parentLayoutSha256,manifest.layoutSha256);assert.equal(integration.specSha256,sha(await readFile(specPath)));}
const F=spec.floor,C=spec.ceiling,B=spec.lower,prefix='subway-refit-';
const material=(name,rgb,roughness=.65,metallic=0)=>({name:'Subway refit | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[material('terrazzo',[.49,.47,.42],.45),material('stair stone',[.38,.38,.35]),
 material('steel',[.45,.48,.49],.3,.8),material('warm walls',[.63,.60,.53]),material('ceiling',[.74,.72,.66]),
 material('dark metal',[.035,.04,.043],.4,.3),material('tactile',[.75,.48,.08],.7),
 {...material('diffuser',[1,.93,.8]),emissiveFactor:[1,.93,.8]},
 {...material('glass',[.65,.76,.79]),pbrMetallicRoughness:{baseColorFactor:[.65,.76,.79,.18],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true}];
// Register only materials actually used by copied mechanical panels.
const hardware=layout.panels.filter(p=>p.id.startsWith('subway-escalators-north-')&&!p.id.includes('-divider-')&&!p.id.endsWith('-warning'));
assert(hardware.length>150);
const copiedMaterial=new Map();
for(const p of hardware){if(copiedMaterial.has(p.appearance))continue;const m=layout.authoredMaterials.find(m=>m.id===p.appearance);assert(m);copiedMaterial.set(p.appearance,materials.length);materials.push({name:m.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>m.linearColor[k]),roughnessFactor:m.roughness,metallicFactor:m.metallic},...(m.alpha<1?{alphaMode:'BLEND',doubleSided:true}:{})});}
for(const m of integration?.materials||[]){
 if(copiedMaterial.has(m.id))continue;
 let index=materials.findIndex(row=>row.name===m.label);
 if(index<0){index=materials.length;materials.push({name:m.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>m.linearColor[k]),roughnessFactor:m.roughness,metallicFactor:m.metallic},...(m.alpha<1?{alphaMode:'BLEND',doubleSided:true}:{}),...(m.emissionColor?{emissiveFactor:['r','g','b'].map(k=>m.emissionColor[k])}:{})});}
 copiedMaterial.set(m.id,index);
}
const c=construction(materials,{flatNormals:true}),lights=[],routes=[],lifts=[],escalators=[],combSupports=[];
const P=(x,y,z)=>[x,y,-z],at=(f,w,t)=>[f.center[0]+w*f.right[0]+t*f.downhill[0],f.center[1]+w*f.right[1]+t*f.downhill[1]];
const ring=(f,a,b,d,e,y)=>[[a,d],[b,d],[b,e],[a,e]].map(([w,t])=>{const[x,z]=at(f,w,t);return P(x,y,z);});
const slab=(id,f,a,b,d,e,top,bottom,mi=0,role='floor')=>{assert(b>a&&e>d&&top>bottom,id);c.slab(prefix+id,ring(f,a,b,d,e,top),[],top-bottom,mi,role);};
const world={center:[0,0],right:[1,0],downhill:[0,1]};
function shapeSlab(id,shape,top,depth,mi,role){const polygons=shape.type==='Polygon'?[shape.coordinates]:shape.coordinates;for(const[i,poly]of polygons.entries()){const rings=poly.map(r=>r.slice(0,-1).map(([x,z])=>P(x,top,z)));c.slab(prefix+id+'-'+i,rings[0],rings.slice(1),depth,mi,role);}}
function beam(id,a,b,width,height,mi=2,role='rail'){c.beam(prefix+id,P(...a),P(...b),width,height,mi,role);}
const wallKeys=new Set();
function segment(id,a,b,bottom,top,thickness=.16,mi=3,role='wall'){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);assert(length>1e-6);
 const key=JSON.stringify([[a,b].map(p=>p.map(v=>v.toFixed(5)).join(',')).sort(),bottom,top,thickness,mi]);
 if(wallKeys.has(key))return;wallKeys.add(key);
 const frame={center:a,right:[-dz/length,dx/length],downhill:[dx/length,dz/length]};slab(id,frame,-thickness/2,thickness/2,0,length,top,bottom,mi,role);
}
const decorative=()=>{c.panels.at(-1).collision=false;};
function rail(id,f,w,t0,t1,y0,y1=y0){
 const a=at(f,w,t0),b=at(f,w,t1);beam(id+'-handrail',[a[0],y0+1.03,a[1]],[b[0],y1+1.03,b[1]],.055,.055);
 const count=Math.max(1,Math.ceil(Math.abs(t1-t0)/1.4));for(let i=0;i<=count;i++){const u=i/count,[x,z]=at(f,w,t0+(t1-t0)*u),y=y0+(y1-y0)*u;beam(id+'-post-'+i,[x,y,z],[x,y+1.03,z],.045,.045);}
}
function fixture(id,f,w,t,y=C){slab(id,f,w-.75,w+.75,t-.10,t+.10,y-.025,y-.07,7,'fixture');decorative();const[x,z]=at(f,w,t);lights.push({id:prefix+id+'-light',position:{x,y:y-.12,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.93,b:.8},intensity:9,range:9,spotAngle:120,innerSpotAngle:80});}
function point(f,w,t,y=F){const[x,z]=at(f,w,t);return{x,y,z};}
function route(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/20));for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}

shapeSlab('concourse-floor',spec.floorShape,F,.28,0,'public-floor');
shapeSlab('concourse-ceiling',spec.ceilingShape,C+.18,.18,4,'ceiling');
for(const[i,line]of spec.perimeterWalls.entries())for(let j=1;j<line.length;j++)segment('perimeter-'+i+'-'+j,line[j-1],line[j],F,C);

// The retained Porta B2 aisle is lower than the new concourse. A real stair
// replaces the intersecting slab/ramp, while the two B1 shopping streets stay
// open at the same level. The old ceiling receives the matching cut at integration.
const ps=spec.portaStair;
for(let i=0;i<ps.steps;i++){
 const y=F-i*(F-ps.lower)/ps.steps;
 slab('porta-level-step-'+i,ps,-ps.width/2,ps.width/2,i*ps.going,(i+1)*ps.going,y,y-.25,1,'stair-tread');
}
slab('porta-level-lower-threshold',ps,-ps.width/2,ps.width/2,ps.run,ps.run+1,ps.lower+.004,ps.lower-.22,1,'stair-landing');
for(const side of[-1,1]){
 rail('porta-level-stair-'+side,ps,side*(ps.width/2-.18),0,ps.run,F,ps.lower);
 segment('porta-level-cheek-'+side,at(ps,side*ps.width/2,0),at(ps,side*ps.width/2,ps.run),ps.lower-.3,F,.12);
}
for(const[a,b]of[[-14,ps.center[1]-ps.width/2],[ps.center[1]+ps.width/2,61]])segment('porta-basement-boundary-'+a,[55,a],[55,b],ps.lower-.3,F,.16);
route('Porta B2 stair connection',[point(ps,0,-2,F),point(ps,0,0,F),point(ps,0,ps.run,ps.lower),point(ps,0,ps.run+.7,ps.lower)]);

for(const core of spec.cores){
 const id=core.id,[w0,w1,t0,t1]=core.paidBounds;
 // Public aisles remain outside both gate banks. The core has one shared deck.
 for(const t of[t0,t1])segment(id+'-paid-end-'+t,at(core,w0,t),at(core,w1,t),F,C);
 for(const w of[w0,w1]){
  if(!core.gateSides.includes(Math.sign(w))){
   segment(id+'-paid-closed-side-'+w,at(core,w,t0),at(core,w,t1),F,C);
   continue;
  }
  for(const[a,b]of[[t0,-16],[-7,t1]])segment(id+'-paid-side-'+w+'-'+a,at(core,w,a),at(core,w,b),F,C);
  slab(id+'-gate-head-'+w,core,w-.10,w+.10,-16,-7,C,F+2.45,5,'gate-header');
  for(const t of[-15.5,-13.5,-11.5,-9.5,-7.5]){
   slab(id+'-gate-'+w+'-'+t,core,w-.8,w+.8,t-.24,t+.24,F+1.02,F+.02,2,'ticket-gate');
   slab(id+'-reader-'+w+'-'+t,core,w-.65,w-.3,t-.15,t+.15,F+1.06,F+1.02,5,'reader');
  }
  slab(id+'-staff-window-'+w,core,w-.012,w+.012,t0+.5,t0+3.5,F+2.3,F+1.05,8,'staff-window');
 }
 // Two proper flights with a level middle landing and lower receiving slab.
 const top=core.stairStart,half=core.stepsPerFlight*core.going,mid0=top+half,mid1=mid0+core.landing,end=core.stairEnd;
 assert(Math.abs(mid1+half-end)<1e-8);
 for(let flight=0;flight<2;flight++){
  const start=flight?mid1:top,base=flight?(F+B)/2:F;
  for(let i=0;i<core.stepsPerFlight;i++)slab(id+'-step-'+flight+'-'+i,core,-1,3,start+i*core.going,start+(i+1)*core.going,base-i*(F-B)/30,base-i*(F-B)/30-.28,1,'stair-tread');
  for(const w of[-.8,2.8])rail(id+'-flight-'+flight+'-'+w,core,w,start,start+half,base,base-(F-B)/2);
 }
 slab(id+'-middle',core,-1,3,mid0,mid1,(F+B)/2,(F+B)/2-.28,1,'stair-landing');
 shapeSlab(id+'-lower-landing',core.lowerLandingShape,B,.3,1,'stair-landing');
 for(const w of[-.8,2.8])rail(id+'-middle-'+w,core,w,mid0,mid1,(F+B)/2);
 for(const w of[-4.3,4.3]){
  segment(id+'-well-side-'+w,at(core,w,top-.05),at(core,w,6.3),B-.3,F,.12);
  rail(id+'-well-guard-'+w,core,w,top-.05,6.3,F);
 }
 segment(id+'-well-header',at(core,-4.3,6.3),at(core,4.3,6.3),B+3.1,F,.14);
 const a=at(core,-4.3,6.3),b=at(core,4.3,6.3);beam(id+'-well-end-guard',[a[0],F+1.03,a[1]],[b[0],F+1.03,b[1]],.055,.055);
 // The old North escalator has the same rise and stair geometry. Rotate/translate
 // its chassis and movement definition rigidly, preserving its actual step path.
 const transform=v=>{const[x,z]=at(core,v.x-177,22-v.z);return{x,y:v.y,z};};
 for(const p of hardware){const suffix=p.id.slice('subway-escalators-north-'.length),id2=prefix+id+'-escalator-'+suffix;
  c.add(id2,p.vertices.map(v=>{const q=transform(v);return P(q.x,q.y,q.z);}),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),copiedMaterial.get(p.appearance),p.role);
  Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});
 }
 const old=layout.escalators.find(e=>e.id==='subway-escalators-north');
 const e={...structuredClone(old),id:prefix+id+'-escalator',lowerCenter:transform(old.lowerCenter),uphill:{x:-core.downhill[0],y:0,z:-core.downhill[1]},status:'Retained verified mechanics rigidly placed beside the registered replacement stairs.'};escalators.push(e);
 for(const end of['lower','upper']){
  const support=c.panels.find(p=>p.id===e.id+'-'+end+'-comb-transfer');assert(support);
  const along=support.vertices.map(v=>(v.x-e.lowerCenter.x)*e.uphill.x+(v.z-e.lowerCenter.z)*e.uphill.z);
  combSupports.push({support:support.id,along:(Math.min(...along)+Math.max(...along))/2,length:Math.max(...along)-Math.min(...along)});
 }
 for(const t of[top-.75,end+.75]){slab(id+'-warning-'+t,core,-1,3,t-.2,t+.2,(t<top?F:B)+.006,t<top?F:B,6,'tactile');decorative();}
 for(const side of core.gateSides)for(let t=-20;t<=(core.fitted?5:35);t+=10)fixture(id+'-public-light-'+side+'-'+t,core,side*10,t);
 for(const t of[-19,-9])fixture(id+'-paid-light-'+t,core,1,t);
 route(id+' gate and platform stairs',[point(core,core.gateSides[0]*10,-12.5),point(core,0,-12.5),point(core,1,top),point(core,1,mid0,(F+B)/2),point(core,1,mid1,(F+B)/2),point(core,1,end,B),point(core,1,10,B)]);
 if(core.gateSides.length===2)route(id+' both gate banks',[point(core,-10,-12.5),point(core,0,-12.5),point(core,10,-12.5)]);
 // The eastern aisle must stay west of the Exit 5 lift shaft at the head of
 // Central 1. Its street landing occupies the outer part of the cross-plaza.
 if(!core.fitted)route(id+' public loop',[point(core,-10,-25),point(core,-10,37),point(core,9,37),point(core,9,-25)]);
}

// One lower floor and continuous track beds replace the disconnected landings.
const platform=spec.platform;
shapeSlab('island-floor',platform.floorShape,B,.35,0,'platform-floor');
shapeSlab('island-ceiling',platform.ceilingShape,platform.ceiling+.22,.22,4,'ceiling');
shapeSlab('track-base',platform.baseShape,B-1.25,.3,5,'track-bed');
for(const[side,line]of platform.edgeLines.entries())for(let i=1;i<line.length;i++){
 const a=line[i-1],b=line[i];beam('platform-warning-'+side+'-'+i,[a[0],B+.004,a[1]],[b[0],B+.004,b[1]],.38,.008,6,'platform-warning');decorative();
}
for(const track of platform.tracks){
 for(const[j,line]of track.rails.entries())for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i];beam('track-rail-'+track.side+'-'+j+'-'+i,[a[0],B-.97,a[1]],[b[0],B-.97,b[1]],.072,.14,2,'rail');
 }
 for(let i=1;i<track.center.length;i++){
  const a=track.center[i-1],b=track.center[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),r=[-dz/length,dx/length];
  const f={center:a,right:r,downhill:[dx/length,dz/length]};
  for(let t=.4;t<length;t+=.65)slab('sleeper-'+track.side+'-'+i+'-'+t.toFixed(2),f,-1.25,1.25,t-.12,t+.12,B-1.04,B-1.23,1,'sleeper');
  const edge=track.side>0?1:-1;
  segment('tunnel-side-'+track.side+'-'+i,[a[0]+r[0]*edge*3.2,a[1]+r[1]*edge*3.2],[b[0]+r[0]*edge*3.2,b[1]+r[1]*edge*3.2],B-1.55,platform.ceiling,.18,3,'tunnel-wall');
 }
}
for(const core of spec.cores){
 // Both side aisles pass the complete stair enclosure; its lower landing opens
 // across the island into these aisles rather than stopping in a little room.
 route(core.id+' lower landing to east platform aisle',[point(core,1,10,B),point(core,5.7,10,B)]);
}
for(const side of[-1,1]){
 const points=platform.axis.map(([x,z],i)=>({x:x+side*5.65,y:B,z:i===0?z-2:i===platform.axis.length-1?z+2:z}));
 route((side<0?'west':'east')+' continuous platform aisle',points);
}
for(const [id,i,other]of[['north',0,1],['south',platform.axis.length-1,platform.axis.length-2]]){
 const a=platform.axis[i],b=platform.axis[other],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),r=[-dz/length,dx/length];
 segment('platform-end-'+id,[a[0]-r[0]*13.2,a[1]-r[1]*13.2],[a[0]+r[0]*13.2,a[1]+r[1]*13.2],B-1.55,platform.ceiling,.18,3,'tunnel-wall');
}
// Fitted maintenance access also prevents the track floor becoming a trap for
// free exploration. Both sides have a continuous base and a way back up.
for(const side of[-1,1]){
 const centerX=99+side*8.3,f={center:[centerX,-86.5],right:[1,0],downhill:[0,-1]};
 for(let i=0;i<8;i++)slab('track-service-step-'+side+'-'+i,f,-.8,.8,i*.32,(i+1)*.32,B-i*1.25/8,B-i*1.25/8-.2,2,'service-stair');
 slab('track-service-landing-'+side,world,Math.min(99+side*5.5,99+side*9.2),Math.max(99+side*5.5,99+side*9.2),-86.5,-85.5,B+.004,B-.22,2,'service-landing');
 rail('track-service-rail-'+side,f,side*.74,0,2.56,B,B-1.25);
 route('track '+side+' service stair',[{x:99+side*5,y:B,z:-86},{x:centerX,y:B,z:-86},point(f,0,0,B),point(f,0,2.56,B-1.25),point(f,0,3.25,B-1.25)]);
}
const liftPoint=id=>{const l=spec.lifts.find(l=>l.id===id);return{x:l.origin[0],y:B,z:l.origin[1]-1.95};};
for(const [id,label]of[['central-one','Central 1'],['south','South']]){
 const target=liftPoint(id),axis=platform.axis;let i=1;
 while(i<axis.length-1&&target.z<axis[i][1])i++;
 const a=axis[i-1],b=axis[i],u=(target.z-a[1])/(b[1]-a[1]);
 // Follow the bent island; a fixed X can put the test entry over the tracks.
 // Five metres also clears the seam of the southern service-stair landing.
 route(label+' platform lift approach',[{x:a[0]+u*(b[0]-a[0])+5,y:B,z:target.z},target]);
}
for(let z=-88;z<=112;z+=9){
 const axis=platform.axis;let i=1;while(i<axis.length-1&&z<axis[i][1])i++;
 const a=axis[i-1],b=axis[i],u=(z-a[1])/(b[1]-a[1]),x=a[0]+u*(b[0]-a[0]);
 for(const side of[-1,1])fixture('platform-fixture-'+z+'-'+side,world,x+side*5.3,z,platform.ceiling);
}

// Three distinct street connections. Their ground heights are sampled from the
// retained city paving; the building ceiling is removed over each stair room.
for(const s of spec.streetStairs){
 const id='exit-'+s.id,n=s.steps/2,rise=(s.upper-F)/s.steps,half=n*s.going,mid=half+s.landing;
 for(let flight=0;flight<2;flight++){
  const start=flight?mid:0,base=flight?(s.upper+F)/2:s.upper;
  for(let i=0;i<n;i++)slab(id+'-step-'+flight+'-'+i,s,-s.width/2,s.width/2,start+i*s.going,start+(i+1)*s.going,base-i*rise,base-i*rise-.3,1,'street-stair-tread');
  for(const w of[-s.width/2+.18,s.width/2-.18])rail(id+'-flight-'+flight+'-'+w,s,w,start,start+half,base,base-rise*n);
 }
 slab(id+'-middle',s,-s.width/2,s.width/2,half,mid,(s.upper+F)/2,(s.upper+F)/2-.3,1,'street-stair-landing');
 slab(id+'-street-landing',s,-s.width/2,s.width/2,-1.5,0,s.upper,s.upper-.25,1,'street-landing');
 for(const w of[-s.width/2,s.width/2]){
  segment(id+'-retaining-'+w,at(s,w,0),at(s,w,s.run),F-.3,s.upper,.15);
  rail(id+'-street-guard-'+w,s,w,0,s.run,s.upper);
 }
 slab(id+'-upper-warning',s,-s.width/2,s.width/2,-1.1,-.6,s.upper+.006,s.upper,6,'tactile');decorative();
 route(id+' stairs',[point(s,0,-1,s.upper),point(s,0,0,s.upper),point(s,0,half,(s.upper+F)/2),point(s,0,mid,(s.upper+F)/2),point(s,0,s.run,F),point(s,0,s.run+1.5,F)]);
}

// Moving cars and landing doors share the
// existing lift implementation. The street enclosure uses solid tiled sides.
for(const s of spec.lifts){
 const [x,z]=s.origin,id=s.id+'-lift',low=s.lower,up=s.upper;
 slab(id+'-pit',world,x-1.55,x+1.55,z-1.55,z+1.55,low-.48,low-.7,3,'lift-pit');
 for(const side of[-1,1])slab(id+'-side-'+side,world,x+side*1.55-.08,x+side*1.55+.08,z-1.55,z+1.63,up+2.7,low-.48,3,'lift-shaft');
 slab(id+'-back',world,x-1.55,x+1.55,z+1.55,z+1.71,up+2.7,low-.48,3,'lift-shaft');
 slab(id+'-roof',world,x-1.68,x+1.68,z-1.7,z+1.8,up+2.85,up+2.7,4,'lift-roof');
 for(const y of[low,up]){
  for(const side of[-1,1])slab(id+'-jamb-'+y+'-'+side,world,x+(side<0?-1.55:.82),x+(side<0?-.82:1.55),z-1.63,z-1.48,y+2.5,y,3,'lift-jamb');
  slab(id+'-lintel-'+y,world,x-1.55,x+1.55,z-1.63,z-1.48,y+2.6,y+2.24,3,'lift-lintel');
  slab(id+'-threshold-'+y,world,x-1.55,x+1.55,z-2.3,z-1.3,y+.004,y-.2,2,'lift-threshold');
 }
 // The shaft front between floors is solid; landing doors alone cannot enclose it.
 if(up-low>2.6)slab(id+'-front-between',world,x-1.55,x+1.55,z-1.63,z-1.48,up,low+2.6,3,'lift-shaft');
 const lift=subwayLift({id:prefix+id,origin:{x,y:low,z},height:up-low});
 for(const p of lift.parts)p.appearance=p.appearance.endsWith('dark floor')?materials[0].name:p.appearance.endsWith('ceiling')?materials[4].name:p.appearance.endsWith('button')?materials[5].name:materials[2].name;
 lifts.push(lift);
}

// Simple room envelopes establish the real circulation islands. Tenant fitouts
// follow after the shared routes, hardware and exterior openings are integrated.
function room(id,f,a,b,d,e,side=-1){
 for(const t of[d,e])segment(id+'-end-'+t,at(f,a,t),at(f,b,t),F,C);
 const door=(d+e)/2,front=side<0?a:b,back=side<0?b:a;
 segment(id+'-back',at(f,back,d),at(f,back,e),F,C);
 for(const[t0,t1]of[[d,door-1.6],[door+1.6,e]])segment(id+'-front-'+t0,at(f,front,t0),at(f,front,t1),F,C,.12);
 segment(id+'-head',at(f,front,door-1.6),at(f,front,door+1.6),F+2.45,C,.14,5,'door-header');
 fixture(id+'-light',f,(a+b)/2,door);
}
room('north-head-shop',spec.cores[0],-6,6,-31,-21);
for(let i=0;i<3;i++)room('north-island-shop-'+i,spec.cores[0],-6,6,10+i*7.5,17.5+i*7.5,i===1?1:-1);
room('central-west-shop',spec.cores[1],-24,-12,-25,-5,1);
room('central-east-shop',spec.cores[1],12,24,-22,9,-1);
for(const[x0,x1]of[[119,128],[138,147]])for(let i=0;i<3;i++)room('porta-east-room-'+x0+'-'+i,world,x0,x1,76+i*10,85+i*10,x0===119?1:-1);
route('North to Central 1 public west aisle',[point(spec.cores[0],-10,30),point(spec.cores[0],-10,39),point(spec.cores[1],-9,-29),point(spec.cores[1],-9,-12.5)]);
route('Cross-plaza to Exit 5 lift',[point(spec.cores[0],0,39),{x:107.5,y:F,z:50.8}]);
route('Central 1 to southern public passage',[point(spec.cores[1],9,10),{x:112,y:F,z:3},{x:112,y:F,z:-10.5},{x:107,y:F,z:-10.5}]);
route('Central 2 to South gate public route',[point(spec.cores[2],10,-12.5),{x:112,y:F,z:-10.5},{x:112,y:F,z:-77.5},point(spec.cores[3],-10,-12.5)]);
route('South gate to Hachijo receiving lobby',[point(spec.cores[3],-10,-12.5),{x:112,y:F,z:-90},{x:112,y:F,z:-190.5},{x:154.8,y:F,z:-192.8}]);
route('JR gate public approach',[{x:112,y:F,z:-23.5},{x:151,y:F,z:-23.5},{x:151,y:F,z:-36.45},{x:147.7,y:F,z:-36.45}]);
route('Porta west receiving aisle',[{x:55.5,y:F,z:52.5},{x:73,y:F,z:52.5},point(spec.cores[1],-9,-25)]);
route('Porta south shopping street arrival',[{x:55.5,y:F,z:35},{x:68,y:F,z:35},{x:68,y:F,z:23},{x:82,y:F,z:23}]);
for(let z=-30;z>=-187;z-=9)fixture('south-passage-fixture-'+z,world,112,z);
for(let x=121;x<154;x+=9){fixture('jr-approach-fixture-'+x,world,x,-23.5);fixture('hachijo-approach-fixture-'+x,world,x,-190.5);}
if(integration){
 for(const p of integration.fragments){
  c.add(p.id,p.vertices.map(v=>P(v.x,v.y,v.z)),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),copiedMaterial.get(p.appearance),p.role);
  Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});
 }
 for(const p of integration.slabs){
  const before=c.panels.length;shapeSlab(p.id.slice(prefix.length),p.shape,p.top,p.depth,copiedMaterial.get(p.appearance),p.role);
  for(const row of c.panels.slice(before)){row.material=p.material;row.collision=p.collision??true;}
 }
 segment('hachijo-lobby-north-closure',[155.6,-186.3],[161.9,-186.3],F,C,.15);
}
for(const p of c.panels){if(!p.material||p.material==='roof')p.material=p.browserMaterial===2?'steel':p.browserMaterial===8?'glass':'stone';}
const report=await c.save(out,'subway-refit.glb',{componentPrefix:prefix,sourceCollection:'Registered subway reconstruction',
 builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),specSha256:sha(await readFile(specPath)),sourceLayoutSha256:manifest.layoutSha256,
 scope:'Connected four-gate subway concourse, island platform and track beds, three street stairs, Porta/JR/Hachijo receiving approaches, three lifts and four escalators; pending whole-station integration.',
 geometry:{floor:F,ceiling:C,lower:B,routes,spawn:point(spec.cores[1],-9,-12.5),interfaces:spec.interfaces,
 ...(integration?Object.fromEntries(['retiredIds','retiredLights','retiredLiftIds','retiredEscalatorIds'].map(k=>[k,integration[k]])):{})},
 references:['research/kyoto-station/notes/SUBWAY-CITY-CONTROL-V2.md'],limits:spec.limits});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',bytes);report.outputs.nativePanelsSha256=sha(bytes);
const motionBytes=JSON.stringify({lifts,escalators,combSupports},null,2)+'\n';
await writeFile(out+'/motion.json',motionBytes);
report.motion={lifts:lifts.length,escalators:escalators.length,sha256:sha(motionBytes)};report.status='component-built-not-integrated';
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log({panels:c.panels.length,triangles:report.geometry.triangles,materials:materials.length,routes:routes.length,lifts:lifts.length,escalators:escalators.length});
