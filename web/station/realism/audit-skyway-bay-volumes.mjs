// Find roof members that intersect the known viewing-bay circulation spaces.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
const [assembly,skyway,out]=process.argv.slice(2);assert(assembly&&skyway&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const nativeBytes=await readFile(assembly+'/native-panels.json'),panels=JSON.parse(nativeBytes).panels,routeBytes=await readFile(skyway+'/report.json'),route=JSON.parse(routeBytes),g=route.geometry,[start,end]=g.floorEndpointsRenderer||g.sourceEndpointsRenderer;
const forward=new T.Vector3().fromArray(end).sub(new T.Vector3().fromArray(start));forward.y=0;forward.normalize();const south=new T.Vector3(-forward.z,0,forward.x),origin=new T.Vector3().fromArray(start);
const local=v=>{const p=new T.Vector3(v.x,v.y,-v.z).sub(origin);return new T.Vector3(p.dot(forward),p.dot(south),p.y);};
const candidates=panels.filter(p=>p.id.startsWith('central-roof-')||p.id.startsWith('west-roof-')||p.id.startsWith('east-roof-')).map(p=>({p,points:p.vertices.map(local)}));
const bays=[];
for(const bay of g.viewingBays){const min=[bay.s0+.2,bay.outerW+.25,.05],max=[bay.s1-.2,-g.outerWidthM/2+.1,2.1],box=new T.Box3(new T.Vector3(...min),new T.Vector3(...max)),members=[];
 for(const {p,points} of candidates){const bounds=new T.Box3().setFromPoints(points);if(!box.intersectsBox(bounds))continue;let intersectingTriangles=0;for(let i=0;i<p.triangles.length;i+=3){const triangle=new T.Triangle(...p.triangles.slice(i,i+3).map(k=>points[k]));if(box.intersectsTriangle(triangle))intersectingTriangles++;}if(intersectingTriangles)members.push({id:p.id,role:p.role,material:p.material,intersectingTriangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});}
 bays.push({id:bay.id,localAxes:'s along corridor; w south; h above turn floor',volume:{min,max},members,byRole:members.reduce((r,m)=>(r[m.role]=(r[m.role]||0)+1,r),{}),exteriorGlazingIntersects:members.some(m=>m.material==='glass')});
}
const report={meaning:'Exact triangle/box intersections in provisional bay circulation volumes; this does not prescribe structural removals.',assemblyNativeSha256:hash(nativeBytes),routeReportSha256:hash(routeBytes),bays};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(bays.map(b=>({id:b.id,members:b.members.length,byRole:b.byRole,exteriorGlazingIntersects:b.exteriorGlazingIntersects})),null,2));
