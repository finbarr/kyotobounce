// Independent clearance and receiving-floor checks against the complete layout.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw),r=await read(component+'/report.json');assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const lifts=l.lifts.filter(x=>r.geometry.liftIds.includes(x.id));assert.equal(lifts.length,3);
function local(l,p){const a=(l.yaw||0)*Math.PI/180,x=p.x-l.origin.x,z=p.z-l.origin.z;return[Math.cos(a)*x-Math.sin(a)*z,p.y-l.origin.y,Math.sin(a)*x+Math.cos(a)*z];}
function areaClipped(poly,bounds){for(let k=0;k<3;k++)for(const[b,s]of[[bounds[k][0],1],[bounds[k][1],-1]]){const next=[];for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],da=s*(a[k]-b),dc=s*(c[k]-b);if(da>=0)next.push(a);if((da>=0)!==(dc>=0)){const u=da/(da-dc);next.push(a.map((v,k)=>v+(c[k]-v)*u));}}poly=next;}let area=0;for(let i=1;i<poly.length-1;i++){const a=poly[i].map((v,k)=>v-poly[0][k]),b=poly[i+1].map((v,k)=>v-poly[0][k]);area+=Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2;}return area;}
const liftChecks=[];
for(const lift of lifts){
 const bounds=[[-1.1,1.1],[-.16,lift.height+2.55],[-1.07,1.07]];let tested=0;
 for(const p of l.panels){if(p.collision===false)continue;const vs=p.vertices.map(p=>local(lift,p));if(bounds.some(([a,b],k)=>Math.max(...vs.map(v=>v[k]))<a||Math.min(...vs.map(v=>v[k]))>b))continue;for(let i=0;i<p.triangles.length;i+=3){assert(areaClipped(p.triangles.slice(i,i+3).map(k=>vs[k]),bounds)<1e-8,lift.id+' obstructed by '+p.id);tested++;}}
 // Older simple native boxes must also stay outside the car travel volume.
 for(const b of l.boxes){if(b.collision===false)continue;const vs=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])vs.push(local(lift,{x:b.center.x+x*b.size.x/2,y:b.center.y+y*b.size.y/2,z:b.center.z+z*b.size.z/2}));assert(bounds.some(([a,b],k)=>Math.max(...vs.map(v=>v[k]))<=a||Math.min(...vs.map(v=>v[k]))>=b),lift.id+' box obstruction '+b.id);}
 liftChecks.push({id:lift.id,pass:true,testedNearbyTriangles:tested});
}
const cross=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
function contains(t,p){const signs=t.map((v,i)=>cross(v,t[(i+1)%3],p));return signs.every(v=>v>=-1e-4)||signs.every(v=>v<=1e-4);}
const triangles=[];for(const p of l.panels){if(p.collision===false||!p.vertices.some(v=>v.x>=-105&&v.x<=-20&&v.z>=-217&&v.z<=-175))continue;for(let i=0;i<p.triangles.length;i+=3){const t=p.triangles.slice(i,i+3).map(k=>p.vertices[k]);if(Math.abs(cross(t[0],t[1],t[2]))>1e-8&&t.every(v=>Math.abs(v.y-t[0].y)<1e-5))triangles.push(t);}}
let samples=0;for(const route of r.geometry.routes)for(let i=1;i<route.points.length;i++){
 const a=route.points[i-1],b=route.points[i];if(a.y!==b.y)continue;const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);
 for(let j=0;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,y:a.y,z:a.z+(b.z-a.z)*j/n};assert(triangles.some(t=>Math.abs(t[0].y-p.y)<.025&&contains(t,p)),route.label+' unsupported at '+JSON.stringify(p));samples++;}
}
const proof={pass:true,layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,lifts:liftChecks,routeFloorSamples:samples,stairs:r.geometry.stairs.length,deckPlanWidthM:45,columnGridWidthM:39};await writeFile(out,JSON.stringify(proof,null,2)+'\n');console.log(proof);
