// Check complete room footprints against actual native floor triangles.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw),report=await read(component+'/report.json');
assert.equal(sha(raw),m.layoutSha256);
const floor=report.geometry.floor??-6.2,triangles=[];
for(const p of layout.panels.filter(p=>p.collision!==false&&p.role?.includes('floor'))){
 if(!p.vertices.some(v=>Math.abs(v.y-floor)<1e-5))continue;
 for(let i=0;i<p.triangles.length;i+=3){
  const vs=p.triangles.slice(i,i+3).map(j=>p.vertices[j]);
  const area=(vs[1].x-vs[0].x)*(vs[2].z-vs[0].z)-(vs[1].z-vs[0].z)*(vs[2].x-vs[0].x);
  if(Math.abs(area)>1e-8&&vs.every(v=>Math.abs(v.y-floor)<1e-5))triangles.push(vs.map(v=>[v.x,v.z]));
 }
}
assert(triangles.length>0);
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function contains(t,p){const sides=t.map((v,i)=>cross(v,t[(i+1)%t.length],p));return sides.every(v=>v>=-1e-6)||sides.every(v=>v<=1e-6);}
const rooms=[];
for(const room of report.geometry.rooms){
 const q=room.polygon;assert.equal(q.length,4);
 const nu=Math.ceil(Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1])/.5),nv=Math.ceil(Math.hypot(q[3][0]-q[0][0],q[3][1]-q[0][1])/.5);
 let samples=0;
 for(let u=0;u<=nu;u++)for(let v=0;v<=nv;v++){
  const p=q[0].map((x,k)=>x+(q[1][k]-x)*u/nu+(q[3][k]-x)*v/nv);
  assert(triangles.some(t=>contains(t,p)),room.id+' has no floor at '+JSON.stringify(p));samples++;
 }
 rooms.push({id:room.id,samples,pass:true});
}
assert(rooms.length>0);assert.equal(rooms.length,report.geometry.rooms.length);
await writeFile(out,JSON.stringify({pass:true,layoutSha256:m.layoutSha256,nativePanelsSha256:report.outputs.nativePanelsSha256,floor,rooms,samples:rooms.reduce((n,r)=>n+r.samples,0)},null,2)+'\n');
console.log('PASS complete floor coverage',rooms.length,'rooms',rooms.reduce((n,r)=>n+r.samples,0),'samples');
