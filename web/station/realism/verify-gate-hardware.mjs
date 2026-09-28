// Independent spatial checks of the uninstalled local hardware sample.
import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import * as T from 'three';
const[directory]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex');
const nb=await readFile(directory+'/native-panels.json'),ps=JSON.parse(nb).panels,r=JSON.parse(await readFile(directory+'/report.json'));
assert.equal(sha(nb),r.outputs.nativePanelsSha256);const root=new T.Group(),all=new T.Group();
for(const p of ps){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.vertices.flatMap(v=>[v.x,v.y,-v.z]),3));const ix=[];for(let i=0;i<p.triangles.length;i+=3)ix.push(p.triangles[i+2],p.triangles[i+1],p.triangles[i]);g.setIndex(ix);let m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.name=p.id;all.add(m);if(p.collision)root.add(m.clone());assert(['steel','rubber'].includes(p.material));}all.updateMatrixWorld(true);root.updateMatrixWorld(true);
const ray=new T.Raycaster(),rows=[];
function check(id,origin,direction,group,expected){ray.set(new T.Vector3(...origin),new T.Vector3(...direction));ray.far=4;const h=ray.intersectObject(group,true)[0];assert(expected?h?.object.name.includes(expected):!h,id);rows.push({id,origin,hit:h?{id:h.object.name,point:h.point.toArray()}:null});}
for(const x of [.2,.30,.47,.57])check('closed-standard-'+x,[x,.625,-2],[0,0,1],root,'paddle');
for(let i=0;i<9;i++)check('wide-clear-'+i,[.91+i*.10,.625,-2],[0,0,1],root,null);
for(const [n,x]of[0,.775,1.85].entries()){
 check('body-solid-'+n,[x,.5,-2],[0,0,1],root,'shell');
 check('reader-exposed-'+n,[x-.012,1.4,-.48],[0,-1,0],all,'reader-screen');
 const h=rows.at(-1).hit;assert(Math.abs(h.point[1]-.9245)<1e-6);
}
const stats={pass:true,meaning:'Static triangle checks only; not native runtime, station registration, performance or final appearance acceptance',nativeSha256:sha(nb),collidingPanels:ps.filter(p=>p.collision).length,rows,toolSha256:sha(await readFile(new URL(import.meta.url)))};await writeFile(directory+'/spatial-proof.json',JSON.stringify(stats,null,2)+'\n');console.log(JSON.stringify({pass:true,checks:rows.length}));
