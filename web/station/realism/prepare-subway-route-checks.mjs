// Extend component walks across actual retained floors; no layout copy is made.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import * as T from 'three';
const [manifestPath,component,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
assert(out.startsWith('.local/'));
const m=await read(manifestPath),layout=await read(m.layout),s=await read(component+'/spec.json'),r=await read(component+'/report.json');
const at=(f,w,t,y)=>({x:f.center[0]+f.right[0]*w+f.downhill[0]*t,y,z:f.center[1]+f.right[1]*w+f.downhill[1]*t});
function ground(x,z){
 const ray=new T.Ray(new T.Vector3(x,2,z),new T.Vector3(0,-1,0));let top=-Infinity;
 for(const p of layout.panels){if(!p.id.startsWith('municipal-')||p.collision===false)continue;
  if(p.vertices.every(v=>v.x<x)||p.vertices.every(v=>v.x>x)||p.vertices.every(v=>v.z<z)||p.vertices.every(v=>v.z>z)||p.vertices.every(v=>v.y< -3)||p.vertices.every(v=>v.y>2))continue;
  for(let i=0;i<p.triangles.length;i+=3){const vs=p.triangles.slice(i,i+3).map(k=>new T.Vector3(...['x','y','z'].map(c=>p.vertices[k][c]))),hit=ray.intersectTriangle(...vs,false,new T.Vector3());if(hit&&hit.y>=-3)top=Math.max(top,hit.y);}
 }
 assert(Number.isFinite(top),`No municipal receiving floor at ${x}, ${z}`);return{x,y:top,z};
}
const routes=[];function pair(label,points){const split=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/20));for(let j=1;j<=n;j++)split.push(Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*j/n])));}routes.push({label,points:split},{label:label+' return',points:split.toReversed()});}
for(const street of s.streetStairs){const row=r.geometry.routes.find(row=>row.label==='exit-'+street.id+' stairs'),p=at(street,0,-3,0);pair('Street '+street.id+' pavement and stair',[ground(p.x,p.z),...row.points]);}
const porta=r.geometry.routes.find(row=>row.label==='Porta B2 stair connection');pair('Porta retained B2 aisle and stair',[...porta.points,{x:47,y:s.portaStair.lower,z:4.5}]);
for(const[label,z]of[['north',52.5],['south',35]])pair('Porta retained '+label+' shopping street',[{x:49,y:s.floor,z},{x:58,y:s.floor,z},{x:66,y:s.floor,z}]);
const jr=r.geometry.routes.find(row=>row.label==='JR gate public approach');pair('Public passage through retained JR gate',[...jr.points,{x:143.5,y:s.floor,z:-36.45}]);
pair('Public passage into retained Hachijo lobby',[{x:112,y:s.floor,z:-180},{x:112,y:s.floor,z:-190.5},{x:154.8,y:s.floor,z:-192.8},{x:166,y:s.floor,z:-192.8}]);
for(const label of ['Central 1 to southern public passage','Central 2 to South gate public route'])pair(label,r.geometry.routes.find(row=>row.label===label).points);
const lift=s.lifts.find(l=>l.id==='exit-five'),[x,z]=lift.origin;
pair('Exit 5 street lift receiving pavement',[{x,y:lift.upper+.004,z:z-1.95},ground(x,z-3.2),ground(x,z-5)]);
for(const side of[-1,1]){
 const row=r.geometry.routes.find(row=>row.label==='track '+side+' service stair'),points=structuredClone(row.points);
 points[0].x=99+side*5;pair(row.label,points);
}
await mkdir(out,{recursive:true});
await writeFile(out+'/report.json',JSON.stringify({scope:'Native walks across replacement/retained interfaces; complete station required',sourceLayoutSha256:m.layoutSha256,geometry:{routes}},null,2)+'\n');
const eye=s.floor+1.65,B=s.lower+1.65;
const views=[['platform-south',[104.5,B,-84],[104,B,-38]],['platform-north',[79,B,87],[96,B,35]],
 ['south-gate',[109,eye,-77.5],[99,eye,-77.5]],['porta-b2-stair',[58,eye,4.5],[49,s.portaStair.lower+1.5,4.5]],
 ['porta-north-join',[50,eye,52.5],[72,eye,52.5]],['jr-gate-join',[151,eye,-36.45],[143,eye,-36.45]],
 ['hachijo-join',[149,eye,-192.8],[166,eye,-192.8]],['track-service-stair',[107.3,B-1.25,-89.8],[107.3,B,-86]],
 ...s.streetStairs.map(street=>{const a=at(street,0,-3.5,0),p=ground(a.x,a.z),t=at(street,0,6,s.floor+2);return['street-'+street.id,[p.x,p.y+1.65,p.z],[t.x,t.y,t.z]];})];
await writeFile(out+'/views.json',JSON.stringify(views,null,2)+'\n');console.log({routes:routes.length,views:views.length,layoutSha256:m.layoutSha256});
