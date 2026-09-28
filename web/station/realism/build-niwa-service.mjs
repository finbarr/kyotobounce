// Original service-counter fittings guided by the saved NAKED interior photograph.
// Dimensions and hidden cabinet depths are inferred; all coordinates share the current shell.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [layoutPath,out]=process.argv.slice(2);assert(layoutPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await readFile(layoutPath),layout=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
const counter=layout.panels.find(p=>p.id==='niwa-counter-top');assert(counter);
const toThree=p=>new T.Vector3(p.x,p.y,-p.z),[a,b,c]=counter.vertices.slice(0,3).map(toThree);
const D=c.clone().sub(b).normalize(),A=b.clone().sub(a).normalize(),O=a.clone().addScaledVector(D,-49.43).addScaledVector(A,-15.9);O.y=0;
assert(Math.abs(a.distanceTo(b)-3.35)<.001&&Math.abs(b.distanceTo(c)-.83)<.001&&Math.abs(D.dot(A))<.0001,'Current counter registration');
const P=(u,y,v)=>O.clone().addScaledVector(D,u).addScaledVector(A,v).setY(y).toArray();
const mat=(name,color,roughness,metallic=0)=>({name:'Registered courtyard | '+name+' | Browser',pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:metallic,roughnessFactor:roughness}});
const materials=[mat('niwa-service-charcoal',[.012,.016,.019],.4),mat('niwa-service-red',[.31,.012,.025],.3),mat('niwa-service-steel',[.58,.61,.62],.25,1),mat('niwa-service-cabinet',[.52,.50,.43],.7),mat('niwa-service-plaster',[.43,.425,.39],.9),mat('niwa-timber',[1,1,1],1),{...mat('niwa-service-warm-lens',[.8,.5,.22],.4),emissiveFactor:[1,.45,.13]},mat('niwa-service-coffee',[.019,.009,.004],.85),{...mat('niwa-glass',[.62,.75,.78],.14),alphaMode:'BLEND'}];
materials[8].pbrMetallicRoughness.baseColorFactor[3]=.24;
materials[4].extras={niwaServicePlaster:{coveY:34.165}};
const m=construction(materials,{flatNormals:true});
function box(id,u0,u1,v0,v1,y0,y1,material,collide=true){m.slab('niwa-service-'+id,[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>P(u,y1,v)),[],y1-y0,material,'counter-fixture');m.panels.at(-1).collision=collide;}
function rod(id,u0,y0,v0,u1,y1,v1,r,material,collide=false){const from=new T.Vector3(...P(u0,y0,v0)),to=new T.Vector3(...P(u1,y1,v1)),g=new T.CylinderGeometry(r,r,from.distanceTo(to),12,1,false);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize()));g.translate(...from.add(to).multiplyScalar(.5).toArray());const p=g.attributes.position;m.add('niwa-service-'+id,Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),Array.from(g.index.array),material,'counter-hardware');m.panels.at(-1).collision=collide;g.dispose();}
// Individually jointed fronts follow the existing counter body; 6 mm proud faces.
for(let i=0;i<5;i++){
 const v=15.97+i*.644;
 box('cabinet-'+i,49.538,49.550,v,v+.626,31.69,32.445,3);
 box('cabinet-pull-'+i,49.514,49.538,v+.19,v+.44,32.385,32.4,2,false);
}
box('toe-recess',49.536,49.554,15.96,19.19,31.605,31.68,0,false);
// Finish the visible rear backing and continue its low cabinetry under a timber shelf.
box('plaster-backing',51.534,51.55,15.92,20.11,32.43,34.23,4);
for(let i=0;i<6;i++){const v=15.94+i*.69;box('rear-cabinet-'+i,51.19,51.53,v,v+.672,31.63,32.40,3);box('rear-pull-'+i,51.173,51.19,v+.23,v+.45,32.30,32.314,2,false);}
box('rear-shelf',51.13,51.535,15.91,20.12,32.40,32.445,5);
// The existing coffee appliance rests on this continuation of the worktop.
box('machine-counter-return',50.26,50.82,16.93,17.9,32.48,32.55,5);
box('machine-foot',50.30,50.63,17.25,17.59,32.55,32.58,0);
// Two dispensing towers and shallow gridded trays, beside the existing machine.
for(const [i,v]of [16.25,18.40].entries()){
 box('dispenser-'+i,50.00,50.24,v,v+.24,32.55,33.07,0);
 box('dispenser-tray-'+i,49.72,50.02,v-.055,v+.295,32.55,32.566,0);
 for(let j=0;j<10;j++)box('tray-grille-'+i+'-'+j,49.75,49.99,v-.035+j*.032,v-.023+j*.032,32.566,32.574,2,false);
 rod('nozzle-'+i,50.00,32.92,v+.12,49.85,32.92,v+.12,.015,2);
 rod('nozzle-tip-'+i,49.85,32.92,v+.12,49.85,32.885,v+.12,.015,2);
 box('button-'+i,49.991,50.00,v+.07,v+.17,32.975,33.015,2,false);
}
// Three tall red tap handles and their bent stainless spouts are visible in the reference.
for(let i=0;i<3;i++){const v=16.70+i*.19;
 rod('tap-base-'+i,50.16,32.55,v,50.16,32.73,v,.025,2,true);
 rod('tap-spout-'+i,50.16,32.70,v,50.01,32.70,v,.012,2);
 rod('tap-drop-'+i,50.01,32.70,v,50.01,32.67,v,.012,2);
 rod('tap-handle-'+i,50.16,32.73,v,50.16,33.25,v,.021,1,true);
}
// Transparent bean hopper, bean fill and front controls detail the retained appliance.
box('hopper',50.29,50.63,17.23,17.61,33.15,33.32,8);
box('hopper-fill',50.31,50.61,17.25,17.59,33.155,33.24,7,false);
box('hopper-lid',50.28,50.64,17.22,17.62,33.32,33.335,0,false);
for(let i=0;i<3;i++)rod('coffee-button-'+i,50.236,32.99,17.30+i*.10,50.246,32.99,17.30+i*.10,.018,2);
rod('steam-arm',50.265,32.83,17.65,50.12,32.76,17.70,.009,2);
// Recessed warm strip and its dark cover sit within the existing soffit/backing junction.
box('cove-cover',51.40,51.535,15.94,20.09,34.17,34.20,0,false);
box('cove-lens',51.48,51.534,15.96,20.07,34.159,34.171,6,false);
// The inherited serving screen occupies u49.66–49.68 above the worktop.
// The generic construction helper assumes material zero is glazing; this
// palette starts with charcoal. Only the hopper uses the glass response.
for(const panel of m.panels)panel.material=panel.browserMaterial===8?'glass':'roof';
for(const panel of m.panels)for(const vertex of panel.vertices){
 const p=toThree(vertex),u=p.clone().sub(O).dot(D);
 assert(vertex.y<=32.575||u>=49.70,'Fixture crosses the existing serving screen: '+panel.id);
}
const report=await m.save(out,'niwa-service.glb',{builder:'web/station/realism/build-niwa-service.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:sha(bytes),registration:{origin:O.toArray(),forward:D.toArray(),south:A.toArray()},source:'research/kyoto-station/photos/niwa-naked-interior.jpg',scope:'Service counter fronts, rear cabinets, two dispensers, three red taps, existing coffee appliance details and warm cove fitting; hidden dimensions inferred.'});
// Reuse the existing timber image: UVs follow the grain convention of the retained counter.
const {json:j,bin}=readGLB(await readFile(out+'/niwa-service.glb')),primitive=j.meshes[5].primitives[0],accessor=j.accessors[primitive.attributes.POSITION],view=j.bufferViews[accessor.bufferView],uv=new Float32Array(accessor.count*2);
for(let i=0;i<accessor.count;i++){const p=new T.Vector3(...[0,1,2].map(k=>bin.readFloatLE((view.byteOffset||0)+i*12+k*4))),relative=p.clone().sub(O);uv[i*2]=relative.dot(A)/1.6;uv[i*2+1]=(relative.dot(D)+p.y)/.24;}
const offset=j.buffers[0].byteLength,padding=Buffer.alloc((4-offset%4)%4),uvBytes=Buffer.from(uv.buffer);primitive.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:j.bufferViews.length,componentType:5126,type:'VEC2',count:accessor.count});j.bufferViews.push({buffer:0,byteOffset:offset+padding.length,byteLength:uvBytes.length,target:34962});j.buffers[0].byteLength=offset+padding.length+uvBytes.length;
const glb=writeGLB(j,Buffer.concat([bin.subarray(0,offset),padding,uvBytes]));await writeFile(out+'/niwa-service.glb',glb);report.outputs.glbSha256=sha(glb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({panels:m.panels.length,colliding:m.panels.filter(p=>p.collision).length,triangles:report.geometry.triangles,bytes:glb.length}));
