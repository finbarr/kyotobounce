// Reconnect the retained 4F terrace to the current municipal East Square opening.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),base=JSON.parse(await readFile(manifest)),raw=await readFile(base.layout),layout=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),base.layoutSha256);assert(!layout.flights.some(f=>f.id==='east-4f-7f'));
const floor=layout.panels.find(p=>p.id==='east-court-source-floor');assert(floor);
// This upper landing meets the eastern edge of the existing six-vertex stair opening.
// Dimensions fit the retained model; the operator diagram establishes the connection.
const low=20.5,high=29.97321,x0=78.9,going=.30,count=52,mid=1.4,width=2.4,zc=-4.7;
const rise=(high-low)/count,xEnd=x0+count*going+mid;
const materials=[
 {name:'East court access | pale stone',pbrMetallicRoughness:{baseColorFactor:[.48,.49,.46,1],roughnessFactor:.82,metallicFactor:0}},
 {name:'East court access | dark edges',pbrMetallicRoughness:{baseColorFactor:[.105,.115,.115,1],roughnessFactor:.7,metallicFactor:0}},
 {name:'East court access | stainless rails',pbrMetallicRoughness:{baseColorFactor:[.38,.40,.41,1],roughnessFactor:.32,metallicFactor:.8}}
];
const c=construction(materials,{flatNormals:true}),at=(x,y,z)=>[x,y,-z],rect=(a,b,z0,z1,y)=>[[a,z0],[b,z0],[b,z1],[a,z1]].map(([x,z])=>at(x,y,z));
const deck=(id,a,b,z0,z1,y,depth=.3,m=0)=>c.slab('east-access-'+id,rect(a,b,z0,z1,y),[],depth,m,'circulation-floor');
deck('lower-landing',72.5394,x0,zc-width/2,zc+width/2,low);
const profile=[{x:72.5394,y:low},{x:x0,y:low}];
for(let i=0;i<count;i++){
 const a=x0+i*going+(i>=26?mid:0),b=a+going,y=low+(i+1)*rise;
 if(i===count-1){
  const edgeX=z=>95.8854751586914+(z+6.466633319854736)*(95.8243637084961-95.8854751586914)/(-2.1851155757904053+6.466633319854736);
  c.slab('east-access-step-'+(i+1),[[a,zc-width/2],[edgeX(zc-width/2),zc-width/2],[edgeX(zc+width/2),zc+width/2],[a,zc+width/2]].map(([x,z])=>at(x,y,z)),[],.32,0,'circulation-floor');
 }else deck('step-'+(i+1),a,b,zc-width/2,zc+width/2,y,.32);
 // The flush dark nosing is visual only; it shares the same collision top.
 deck('nosing-'+(i+1),a,a+.045,zc-width/2+.03,zc+width/2-.03,y+.001,.002,1);c.panels.at(-1).collision=false;
 if(i===25){deck('intermediate-landing',b,b+mid,zc-width/2,zc+width/2,y);profile.push({x:b,y},{x:b+mid,y});}
}
profile.push({x:xEnd,y:high},{x:96.7,y:high});
// End at the old floor boundary with a short supported arrival apron.
// The retained court floor itself supplies the upper landing, avoiding a coplanar duplicate.
for(const side of [-1,1]){
 const z=zc+side*(width/2-.07);
 for(let i=0;i<profile.length-1;i++){
  const a=profile[i],b=profile[i+1];
  // The entry and courtyard ends remain open for circulation.
  c.beam(`east-access-rail-${side}-${i}`,at(a.x,a.y+.98,z),at(b.x,b.y+.98,z),.045,.045,2,'handrail');
  const n=Math.ceil((b.x-a.x)/1.5);
  for(let j=0;j<n;j++){const t=j/n,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;c.beam(`east-access-post-${side}-${i}-${j}`,at(x,y,z),at(x,y+.98,z),.035,.035,2,'rail-post');}
 }
}
// Guard the retained courtyard opening, leaving the new stair entrance clear.
const opening=[[82.45433807373047,1.6970773935317993],[82.59173583984375,-6.678403377532959],[95.8854751586914,-6.466633319854736],[95.8243637084961,-2.1851155757904053],[97.6838607788086,-2.1571884155273438],[97.6270980834961,1.936821699142456]];
for(const [x,z] of opening)assert(floor.vertices.some(v=>Math.abs(v.x-x)<.0001&&Math.abs(v.z-z)<.0001&&v.y>29.97));
const edges=[];
for(let i=0;i<opening.length;i++){
 const a=opening[i],b=opening[(i+1)%opening.length];
 if(i===2){const point=z=>[a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]),z];edges.push([a,point(zc-width/2)],[point(zc+width/2),b]);}
 else edges.push([a,b]);
}
for(const [i,[a,b]]of edges.entries()){
 for(const h of [.5,.98])c.beam(`east-access-opening-rail-${i}-${h}`,at(a[0],high+h,a[1]),at(b[0],high+h,b[1]),.045,.045,2,'guardrail');
 const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.5);
 for(let j=0;j<=n;j++){const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;c.beam(`east-access-opening-post-${i}-${j}`,at(x,high-.08,z),at(x,high+.98,z),.045,.045,2,'guard-post');}
}
for(const p of c.panels)if(/rail|post/.test(p.role))p.material='steel';
const route=[{x:66.6,y:low,z:-12.3},{x:67.4,y:low,z:-8},{x:67.4,y:low,z:zc},{x:x0-.6,y:low,z:zc},...profile.slice(1,-1).map(p=>({...p,z:zc})),{x:98.6,y:high,z:zc},{x:98.6,y:high,z:0},{x:98.6,y:high,z:5}];
const report=await c.save(out,'east-court-access.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,scope:'Replace the obsolete east 4F–7F staircase with a connected two-flight stair through the current courtyard opening.',geometry:{lowerY:low,upperY:high,riseM:rise,goingM:going,steps:count,widthM:width,profile,route},references:['research/kyoto-station/maps/official-7f-station-map.svg','research/kyoto-station/notes/EAST-COURT-REGISTRATION.md'],limits:['Operator diagram establishes a 4F–7F connection; widths, riser count and landings are fitted model dimensions, not surveyed as-built measurements.','Adjacent escalators and the wider lower-floor architecture remain unfinished.']});
console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,rise,xEnd}));
