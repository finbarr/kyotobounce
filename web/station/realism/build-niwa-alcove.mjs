// Close the service room against the retained pier and backing. Hidden depth is inferred.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [layoutPath,out]=process.argv.slice(2);
assert(layoutPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
const counter=layout.panels.find(p=>p.id==='niwa-counter-top');assert(counter);
const toThree=p=>new T.Vector3(p.x,p.y,-p.z),[a,b,c]=counter.vertices.slice(0,3).map(toThree);
const D=c.clone().sub(b).normalize(),A=b.clone().sub(a).normalize(),O=a.clone().addScaledVector(D,-49.43).addScaledVector(A,-15.9);O.y=0;
assert(Math.abs(a.distanceTo(b)-3.35)<.001&&Math.abs(b.distanceTo(c)-.83)<.001&&Math.abs(D.dot(A))<.0001,'Current counter registration');
const P=(u,y,v)=>O.clone().addScaledVector(D,u).addScaledVector(A,v).setY(y).toArray();
const materials=[
 {name:'Registered courtyard | niwa-service-plaster | Browser',pbrMetallicRoughness:{baseColorFactor:[.43,.425,.39,1],metallicFactor:0,roughnessFactor:.9},extras:{niwaServicePlaster:{coveY:34.165}}},
 {name:'Registered courtyard | niwa-service-charcoal | Browser',pbrMetallicRoughness:{baseColorFactor:[.012,.016,.019,1],metallicFactor:0,roughnessFactor:.4}}
];
const m=construction(materials,{flatNormals:true});
function box(id,u0,u1,v0,v1,y0,y1,material,physical='roof'){
 m.slab('niwa-alcove-'+id,[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>P(u,y1,v)),[],y1-y0,material,'room-closure');
 m.panels.at(-1).material=physical;
}
// The short return overlaps the retained stone pier and rear backing by 10 mm.
// Its room-facing surface meets the service floor at v15.9; the next cabinet starts at15.94.
box('end-wall',49.83,51.68,15.77,15.91,31.575,34.30,0);
box('end-plinth',49.84,51.54,15.91,15.925,31.606,31.70,1);
// Close the narrow seam where the original finish stopped short of the backing.
box('floor-edge',51.535,51.56,15.9,20.13,31.575,31.606,1,'floor');
for(const panel of m.panels)for(const vertex of panel.vertices){
 const relative=toThree(vertex).sub(O);
 assert(relative.dot(D)>=49.82&&relative.dot(A)<=20.131,'Closure intrudes into public frontage or entrance return');
}
const report=await m.save(out,'niwa-alcove.glb',{builder:'web/station/realism/build-niwa-alcove.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:sha(bytes),registration:{origin:O.toArray(),forward:D.toArray(),south:A.toArray()},source:'research/kyoto-station/photos/niwa-naked-interior.jpg',scope:'Service room end wall, plinth and rear floor seam; hidden depth inferred from the retained pier, canopy and backing.'});
console.log(JSON.stringify({panels:m.panels.length,triangles:report.geometry.triangles}));
