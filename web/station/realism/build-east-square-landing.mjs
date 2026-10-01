// Complete the exposed return around the existing ramp's upper landing.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);
assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(manifest),raw=await readFile(base.layout);assert.equal(sha(raw),base.layoutSha256);const layout=JSON.parse(raw);
const landing=layout.panels.find(p=>p.id==='east-court-ramp-upper-landing');assert(landing);
const O=new T.Vector3(77.83226013183594,0,-24.59440040588379),D=new T.Vector3(.9998636516882471,0,-.016512965592029322),A=new T.Vector3(-D.z,0,D.x);
const y=Math.max(...landing.vertices.map(p=>p.y)),point=(u,v,h=0)=>O.clone().addScaledVector(D,u).addScaledVector(A,v).setY(y+h).toArray();
const native=(u,v,h=0)=>{const [x,y,z]=point(u,v,h);return{x,y,z:-z};};
const uv=landing.vertices.map(p=>{const q=new T.Vector3(p.x,p.y,-p.z).sub(O);return[q.dot(D),q.dot(A)];});
const bounds=[0,1].map(k=>[Math.min(...uv.map(p=>p[k])),Math.max(...uv.map(p=>p[k]))]);
for(const [a,b]of bounds.flat().map((v,i)=>[v,[23.5,26,11.5,13.5][i]]))assert(Math.abs(a-b)<.00002);
const steel=layout.panels.find(p=>p.id==='east-court-ramp-rail-11.5-1.05'),material=layout.authoredMaterials.find(m=>m.id===steel.appearance);
const glb=readGLB(await readFile(base.geometry)),browser=glb.json.materials.find(m=>m.name===material.label+' | Browser');assert(browser);
const c=construction([structuredClone(browser)],{flatNormals:true}),prefix='east-square-landing-';
const beam=(id,a,b,w=.045,h=.045)=>{c.beam(prefix+id,a,b,w,h,0,'landing-guard');c.panels.at(-1).material='steel';};
// Join the retained north rail, wrap around the drop, and leave the south side
// fully open for the turn onto the raised square. Heights match the existing rail.
for(const h of [.55,1.05]){
 beam('north-rail-'+h,point(23.5,11.5,h),point(26,11.5,h));
 beam('end-rail-'+h,point(26,11.5,h),point(26,13.5,h));
}
for(const [i,[u,v]]of [[24.75,11.5],[26,11.5],[26,12.5],[26,13.5]].entries()){
 beam('post-'+i,point(u,v),point(u,v,1.05));
 c.slab(prefix+'base-'+i,[[u-.065,v-.065],[u+.065,v-.065],[u+.065,v+.065],[u-.065,v+.065]].map(([u,v])=>point(u,v,.009)),[],.009,0,'landing-guard-base');c.panels.at(-1).material='steel';
}
const ramp=(await read('research/kyoto-station/notes/courtyard-life/routes.json')).routes.find(r=>r.id==='ramp');assert(ramp);
const routes=[false,true].map(reverse=>({label:'Ramp to East Square'+(reverse?' return':''),points:(reverse?ramp.points.slice().reverse():ramp.points).map(([x,y,z])=>({x,y,z:-z}))}));
// Walk across the full opening and around the added end post on the upper floor.
for(const [name,points]of [['Landing turn',[native(24.6,12.5),native(24.6,14.4),native(27,14.4)]],['Landing turn return',[native(27,14.4),native(24.6,14.4),native(24.6,12.5)]]])routes.push({label:name,points});
const blocked=[
 {label:'Ramp landing east edge',start:native(24.75,12.5),yaw:Math.atan2(D.x,-D.z)*180/Math.PI,axis:'x',limit:native(26,12.5).x-.1,sign:-1},
 {label:'Ramp landing north edge',start:native(24.75,12.5),yaw:Math.atan2(-A.x,A.z)*180/Math.PI,axis:'z',limit:native(24.75,11.5).z-.1,sign:-1},
];
await c.save(out,'east-square-landing.glb',{builder:'web/station/realism/build-east-square-landing.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:base.layoutSha256,componentPrefix:prefix,sourceCollection:'East Square ramp landing guard',scope:'Complete the exposed guard return around the existing ramp landing, preserving the open turn onto East Square.',geometry:{retiredIds:[],retiredLights:[],routes,blocked,chromeRoutes:routes.map(r=>r.label),landingY:y,railHeightM:1.05},references:['https://www.kyoto-station-building.co.jp/floorguide/7f/'],limits:['The operator diagram establishes the ramp and turn. The landing shape and guard dimensions fit the existing reconstruction; they are not surveyed measurements.']});
await writeFile(out+'/parent-assets.json',JSON.stringify(base,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['ramp',[84,31.63,12],[103,31.8,12.4]],['landing-turn',[100,32.45,12.5],[105,31.5,11.5]],['landing-return',[105,32.45,9],[102,31.5,13]],['north-edge',[103,31.63,16.5],[103,31.8,12.5]],['square',[109,33,8],[100,31.5,12]]],null,2)+'\n');
console.log(JSON.stringify({panels:c.panels.length,landingY:y,openingWidthM:2.5,guardLengthM:4.5}));
