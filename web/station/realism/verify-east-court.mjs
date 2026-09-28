// Independent source containment, boundary preservation and route-level checks.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [directory,registrationPath,out]=process.argv.slice(2);assert(directory&&registrationPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const [rb,nb,fb]=await Promise.all([readFile(directory+'/report.json'),readFile(directory+'/native-panels.json'),readFile(registrationPath)]),r=JSON.parse(rb),n=JSON.parse(nb),f=JSON.parse(fb),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(nb),r.outputs.nativePanelsSha256);assert.equal(sha(fb),r.registrationSha256);
const vs=f.geometry.vertices,source=f.geometry.triangles.map(t=>t.indices.map(i=>vs[i]));
function inside(p){return source.some(([a,b,c])=>{const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[2]-c[2]))/det,v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[2]-c[2]))/det;return u>=-1e-7&&v>=-1e-7&&1-u-v>=-1e-7;});}
const base=n.panels.find(p=>p.id==='east-court-source-floor'),sourceKeys=new Set(vs.map(p=>[p[0],p[2]].join(',')));assert(base);assert.equal(base.vertices.length,vs.length*2);assert(base.vertices.every(p=>sourceKeys.has([p.x,-p.z].join(','))));
let count=0;const outside=[];
for(const p of n.panels.filter(p=>p.id!=='east-court-source-floor'))for(let i=0;i<p.triangles.length;i+=3){const tri=p.triangles.slice(i,i+3).map(k=>p.vertices[k]).map(v=>[v.x,v.y,-v.z]);for(let a=0;a<=4;a++)for(let b=0;b<=4-a;b++){const w=[a/4,b/4,1-(a+b)/4],point=[0,1,2].map(k=>tri.reduce((s,v,j)=>s+v[k]*w[j],0));count++;if(!inside(point))outside.push({panel:p.id,point});}}
// A grid over the source stairwell must remain absent from the new low floor.
const lows=[];for(let i=0;i<base.triangles.length;i+=3){const tri=base.triangles.slice(i,i+3).map(k=>base.vertices[k]);if(tri.every(v=>v.y>29.97))lows.push(tri.map(v=>[v.x,v.y,-v.z]));}
const hole=f.geometry.loops.find(l=>l.kind==='hole').pointsRenderer,center=[0,1,2].map(k=>hole.reduce((s,p)=>s+p[k],0)/hole.length);assert(!inside(center));
function contains(tri,p){const [a,b,c]=tri,cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]),q=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return Math.min(...q)>=-1e-8||Math.max(...q)<=1e-8;}
let holeChecks=0;for(const corner of hole)for(const t of [.1,.3,.5,.7,.9]){const p=center.map((v,k)=>v+(corner[k]-v)*t);if(inside(p))continue;assert(!lows.some(tri=>contains(tri,p)));holeChecks++;}
assert.equal(r.geometry.steps.length,14);for(const side of ['north','west']){const steps=r.geometry.steps.filter(s=>s.side===side);assert.equal(steps.length,7);for(let i=0;i<steps.length;i++){assert(Math.abs(steps[i].heightM-(i+1)*.16)<1e-8);if(i)assert(Math.abs(steps[i].lo-steps[i-1].hi)<1e-8);}}
const result={nativePanelsSha256:sha(nb),registrationSha256:sha(fb),sourceBoundaryVertices:vs.length,preservedHoleSamples:holeChecks,projectedContainmentSamples:count,outside,stepCount:14,gardenRiseM:r.geometry.gardenRiseM,rampGrade:r.geometry.ramp.grade,pass:outside.length===0,limits:['Containment in a coarse source floor is not photographic registration or evidence of public access.','Native walking and final appearance require separate verification.']};await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,outside:outside.slice(0,8)},null,2));assert.equal(outside.length,0,'Constructed court geometry crosses a source boundary or opening');
