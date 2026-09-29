// Replace the displaced draft facade inside the source-registered upper-route
// floor footprints. Preserve all exterior fragments and their corner attributes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [path]=process.argv.slice(2);assert(path?.startsWith('.local/'));
const bytes=await readFile(path),l=JSON.parse(bytes);assert(l.architecture.westUpperConnectionIntegration&&!l.architecture.westUpperConnectionIntegration.envelopeCuts);
const floors=l.panels.filter(p=>['west-restaurant-floor','west-skyway-deck','central-skyway-deck'].includes(p.id));assert.equal(floors.length,3);
const regions=[];
for(const floor of floors){
 const top=Math.max(...floor.vertices.map(v=>v.y));
 for(let i=0;i<floor.triangles.length;i+=3){const vs=floor.triangles.slice(i,i+3).map(i=>floor.vertices[i]);if(vs.some(p=>Math.abs(p.y-top)>.002))continue;
  const area=(vs[1].x-vs[0].x)*(vs[2].z-vs[0].z)-(vs[1].z-vs[0].z)*(vs[2].x-vs[0].x);if(Math.abs(area)<1e-8)continue;
  const sign=Math.sign(area),planes=[];for(let k=0;k<3;k++){const a=vs[k],b=vs[(k+1)%3];planes.push(q=>sign*((b.x-a.x)*(q[2]-a.z)-(b.z-a.z)*(q[0]-a.x)));}
  planes.push(q=>q[1]-(top-.24),q=>top+3.45-q[1]);regions.push({floor:floor.id,planes,minX:Math.min(...vs.map(v=>v.x)),maxX:Math.max(...vs.map(v=>v.x)),minZ:Math.min(...vs.map(v=>v.z)),maxZ:Math.max(...vs.map(v=>v.z)),low:top-.24,high:top+3.45});
 }
}
function cut(poly,distance){const inside=[],outside=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=0)inside.push(a);if(da<=0)outside.push(a);if(da*db<0){const t=da/(da-db),p=a.map((v,k)=>v+(b[k]-v)*t);inside.push(p);outside.push(p);}}return[inside,outside];}
function area(vs){let sum=0;for(let i=1;i<vs.length-1;i++){const a=vs[i].map((v,k)=>v-vs[0][k]),b=vs[i+1].map((v,k)=>v-vs[0][k]);sum+=Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2;}return sum;}
const changes=[];
for(const p of l.panels.filter(p=>p.id.startsWith('west-south-'))){
 const bounds=['x','y','z'].map(k=>[Math.min(...p.vertices.map(v=>v[k])),Math.max(...p.vertices.map(v=>v[k]))]);
 const relevant=regions.filter(r=>bounds[0][1]>=r.minX&&bounds[0][0]<=r.maxX&&bounds[2][1]>=r.minZ&&bounds[2][0]<=r.maxZ&&bounds[1][1]>r.low&&bounds[1][0]<r.high);if(!relevant.length)continue;
 assert(!p.finishes?.length,'Keep material groups explicit');const hasNormals=!!p.normals,hasUV=!!p.uv;
 const rows=p.vertices.map((v,i)=>[v.x,v.y,v.z,...(hasNormals?[p.normals[i].x,p.normals[i].y,p.normals[i].z]:[]),...(hasUV?[p.uv[i].x,p.uv[i].y]:[])]);
 let polygons=Array.from({length:p.triangles.length/3},(_,i)=>p.triangles.slice(i*3,i*3+3).map(i=>rows[i]));const before=polygons.reduce((n,p)=>n+area(p),0),oldTriangles=p.triangles.length/3;
 for(const r of relevant){const next=[];for(const poly of polygons){let rest=poly;for(const plane of r.planes){if(rest.length<3)break;const[inside,outside]=cut(rest,plane);if(outside.length>=3&&area(outside)>1e-10)next.push(outside);rest=inside;}}polygons=next;}
 const after=polygons.reduce((n,p)=>n+area(p),0);if(before-after<1e-7)continue;
 const vertices=[],triangles=[],normals=[],uv=[];for(const poly of polygons)for(let i=1;i<poly.length-1;i++){const face=[poly[0],poly[i],poly[i+1]];if(area(face)<1e-10)continue;for(const row of face){triangles.push(vertices.length);vertices.push({x:row[0],y:row[1],z:row[2]});if(hasNormals){const length=Math.hypot(row[3],row[4],row[5]);normals.push({x:row[3]/length,y:row[4]/length,z:row[5]/length});}if(hasUV){const offset=hasNormals?6:3;uv.push({x:row[offset],y:row[offset+1]});}}}
 changes.push({id:p.id,removedAreaM2:before-after,oldTriangles,newTriangles:triangles.length/3});p.vertices=vertices;p.triangles=triangles;if(hasNormals)p.normals=normals;if(hasUV)p.uv=uv;
}
const removed=l.panels.filter(p=>!p.triangles.length).map(p=>p.id);l.panels=l.panels.filter(p=>p.triangles.length);l.architecture.westPlazaRegistration.changed.panels=l.architecture.westPlazaRegistration.changed.panels.filter(id=>!removed.includes(id));l.architecture.westUpperConnectionIntegration.retiredByKind.panels.push(...removed);
l.architecture.westUpperConnectionIntegration.envelopeCuts={inputLayoutSha256:createHash('sha256').update(bytes).digest('hex'),floorIds:floors.map(p=>p.id),verticalRange:'Floor minus 0.24 m through floor plus 3.45 m',changes,removed,scope:'Draft west-south facade fragments inside the replacement floor footprints are retired. The new corridor walls, floor and ceiling define the replacement envelope.'};
await writeFile(path,JSON.stringify(l)+'\n');console.log(JSON.stringify({changed:changes.length,removed:removed.length,removedAreaM2:changes.reduce((n,p)=>n+p.removedAreaM2,0)}));
