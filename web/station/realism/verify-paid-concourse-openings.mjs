// Independent change-scope and reference-ray checks for lateral openings.
import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import*as T from'three';
const [before,after,specPath]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex'),spec=JSON.parse(await readFile(specPath));
async function load(dir){const b=await readFile(dir+'/native-panels.json'),r=JSON.parse(await readFile(dir+'/report.json'));assert.equal(sha(b),r.outputs.nativePanelsSha256);return{panels:JSON.parse(b).panels,hash:sha(b)}}
const a=await load(before),b=await load(after),am=new Map(a.panels.map(p=>[p.id,p])),bm=new Map(b.panels.map(p=>[p.id,p])),changed=[],same=[];
for(const id of new Set([...am.keys(),...bm.keys()])){
 if(JSON.stringify(am.get(id))===JSON.stringify(bm.get(id))){same.push(id);continue;}
 assert(id==='gate-passage-floor'||/^gate-passage-(west|east)-(rear-(dark|pale)|bridge-(under|spandrel|bearing)|joint-)/.test(id),'Unexpected edit '+id);changed.push({id,type:am.has(id)?bm.has(id)?'modified':'removed':'added'});
}
assert(same.includes('gate-passage-bridge-body')&&same.includes('gate-passage-bridge-walking-floor'));
const facade=JSON.parse(await readFile('.local/station-realism/central-gate-facade-01/native-panels.json')).panels;
function meshes(ps){const root=new T.Group();for(const p of [...facade,...ps].filter(p=>p.collision!==false)){const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(p.vertices.flatMap(v=>[v.x,v.y,-v.z]),3)),ix=[];for(let i=0;i<p.triangles.length;i+=3)ix.push(p.triangles[i+2],p.triangles[i+1],p.triangles[i]);g.setIndex(ix);const m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.FrontSide}));m.name=p.id;root.add(m);}root.updateMatrixWorld(true);return root;}
const roots=[meshes(a.panels),meshes(b.panels)],view=JSON.parse(await readFile(after+'/reference-camera.json')),camera=new T.PerspectiveCamera(view.fov,view.viewport.width/view.viewport.height,.05,1800);camera.position.fromArray(view.position);camera.lookAt(new T.Vector3(...view.target));camera.rotateZ(T.MathUtils.degToRad(view.rollDegrees));camera.updateMatrixWorld();const ray=new T.Raycaster(),rows=[];
for(const pixel of [[920,521],[944,522],[966,531]]){
 ray.setFromCamera(new T.Vector2(pixel[0]/view.viewport.width*2-1,1-pixel[1]/view.viewport.height*2),camera);
 const endpoint=ray.ray.intersectPlane(new T.Plane(new T.Vector3(1,0,0),-(spec.portal.eastX+2)),new T.Vector3());assert(endpoint);ray.far=endpoint.distanceTo(ray.ray.origin);
 const hits=roots.map(root=>{const h=ray.intersectObject(root,true)[0];return h?{id:h.object.name,point:h.point.toArray(),distance:h.distance}:null});
 rows.push({pixel,meaning:'Visible paid-concourse/railway region beneath the bridge in July2026 reference. Fixed upper-fit camera; lower metric registration still provisional.',endpoint: endpoint.toArray(),before:hits[0],after:hits[1]});
}
const result={pass:false,scope:{unchanged:same.length,changed},beforeNativeSha256:a.hash,afterNativeSha256:b.hash,sightlines:rows,limits:'These rays verify removal of the specific blocking model walls. They do not prove camera calibration, actual railway placement or complete photographic acceptance.'};
try{for(const row of rows){assert(row.before?.id.startsWith('gate-passage-east-'),'Expected old return obstruction');assert.equal(row.after,null,'New obstruction '+JSON.stringify(row));}result.pass=true;}finally{await writeFile(after+'/opening-proof.json',JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({pass:true,unchanged:same.length,changes:changed.length,sightlines:rows.length}));
