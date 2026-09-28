// Source-aligned western circulation. Mechanical settings are explicit game assumptions.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [layoutPath,specPath,out]=process.argv.slice(2);
assert(layoutPath&&specPath&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const layoutBytes=await readFile(layoutPath),specBytes=await readFile(specPath);
const layout=JSON.parse(layoutBytes),spec=JSON.parse(specBytes);
assert.equal(sha(await readFile(spec.source)),spec.sourceSha256);

const templates=layout.escalators.filter(e=>e.id.startsWith('west-concourse-lower-escalator-'));
assert.equal(templates.length,2);
assert(templates.every(e=>e.uphill.x===-1&&e.uphill.z===0));
const materials=[
 {name:'Registered western circulation | glass',pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.12,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},
 {name:'Registered western circulation | stainless steel',pbrMetallicRoughness:{baseColorFactor:[.48,.51,.52,1],roughnessFactor:.36,metallicFactor:.8}},
 {name:'Registered western circulation | black handrail',pbrMetallicRoughness:{baseColorFactor:[.035,.04,.043,1],roughnessFactor:.66,metallicFactor:0}},
 {name:'Registered western circulation | floor stone',pbrMetallicRoughness:{baseColorFactor:[.32,.30,.27,1],roughnessFactor:.78,metallicFactor:0}}
];
const c=construction(materials),escalators=[],blend=.35,turn=.4;
function level(z,r,h){const slope=h/r;if(z< -blend)return 0;if(z<blend)return slope*(z+blend)**2/(4*blend);if(z<r-blend)return slope*z;if(z<r+blend)return h-slope*(r+blend-z)**2/(4*blend);return h;}
function pathFor(run,height,flat){
 const points=[],n=Math.ceil((run+2*flat)/.04);
 for(let i=0;i<=n;i++){const z=-flat+(run+2*flat)*i/n;points.push({x:0,y:level(z,run,height),z});}
 const path=points.map(p=>({...p}));
 for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:height-turn+turn*Math.cos(t),z:run+flat+turn*Math.sin(t)});}
 for(const p of points.slice(0,-1).reverse())path.push({...p,y:p.y-2*turn});
 for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:-turn-turn*Math.cos(t),z:-flat-turn*Math.sin(t)});}
 return {path,publicPointCount:points.length,chainLengthM:path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.y-path[i].y,p.z-path[i].z),0)};
}
for(const bank of spec.banks){
 for(const [index,sourceLane]of bank.lanes.entries()){
  const old=templates[index],id=`west-v2-${bank.name}-escalator-${index+1}`,O=new T.Vector3(...sourceLane.lowerRenderer),U=new T.Vector3(...bank.uphillRenderer),R=new T.Vector3(-U.z,0,U.x),run=bank.runM,height=bank.heightM,flat=bank.flatLengthM;
  const world=(z,w,y)=>O.clone().addScaledVector(U,z).addScaledVector(R,w).add(new T.Vector3(0,y,0)).toArray();
  function along(z){
   if(z< -old.flatLength)return z+old.flatLength-flat;
   if(z<0)return z*flat/old.flatLength;
   if(z<=old.run)return z*run/old.run;
   if(z<=old.run+old.flatLength)return run+(z-old.run)*flat/old.flatLength;
   return run+flat+z-old.run-old.flatLength;
  }
  function transform(v){const z=old.lowerCenter.x-v.x,nz=along(z),w=(v.z-old.lowerCenter.z)*sourceLane.widthM/old.width;return world(nz,w,level(nz,run,height)+v.y-old.lowerCenter.y-level(z,old.run,old.height));}
  for(const p of layout.panels.filter(p=>p.id.startsWith(old.id+'-')&&!p.id.includes('-public-'))){
   const material=p.material==='glass'?0:p.material==='rubber'?2:1;
   const indices=p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]);
   c.add(p.id.replace(old.id,id),p.vertices.map(transform),indices,material,p.role);
   Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});
  }
  let seq=0;
  for(const p of layout.beams.filter(p=>p.id.startsWith(old.id+'-'))){assert.equal(p.profile,'square');c.beam(p.id.replace(old.id,id)+'-'+seq++,transform(p.a),transform(p.b),p.radius*2,p.radius*2,1,'escalator-body');}
  const track=pathFor(run,height,flat),stepCount=Math.ceil(track.chainLengthM/.4);
  const lane={...old,id,lowerCenter:{x:O.x,y:O.y,z:-O.z},uphill:{x:U.x,y:0,z:-U.z},run,height,width:sourceLane.widthM,flatLength:flat,...track,stepCount,pitchM:track.chainLengthM/stepCount,status:'Source-measured lane position, width and incline; speed, direction, casing and path easing are game construction settings.'};
  escalators.push(lane);
  // Match MovingEscalator.BuildDeck; these visible bodies have no duplicate collider.
  const publicPath=track.path.slice(0,track.publicPointCount);
  for(let part=0;part<3;part++){
   const half=lane.width/2,x0=part===0?-half-.05:part===1?-half-.05:half+.004,x1=part===0?half+.05:part===1?-half-.004:half+.05,top=part===0?-.30:.04,bottom=-1.08,vertices=[],triangles=[];
   const at=(p,x,y)=>world(p.z,x,p.y+y);
   function face(a,b,d,e){const k=vertices.length;vertices.push(a,b,d,e);triangles.push(k,k+2,k+1,k,k+3,k+2);}
   for(let i=0;i<publicPath.length-1;i++){
    const a=publicPath[i],b=publicPath[i+1];
    face(at(a,x0,top),at(b,x0,top),at(b,x1,top),at(a,x1,top));
    face(at(a,x1,bottom),at(b,x1,bottom),at(b,x0,bottom),at(a,x0,bottom));
    face(at(a,x0,bottom),at(b,x0,bottom),at(b,x0,top),at(a,x0,top));
    face(at(a,x1,top),at(b,x1,top),at(b,x1,bottom),at(a,x1,bottom));
   }
   const first=publicPath[0],last=publicPath.at(-1);
   face(at(first,x0,bottom),at(first,x0,top),at(first,x1,top),at(first,x1,bottom));
   face(at(last,x1,bottom),at(last,x1,top),at(last,x0,top),at(last,x0,bottom));
   c.add(id+'-public-'+['undertray','left-casing','right-casing'][part]+'-visible',vertices,triangles,1,'escalator-body');c.panels.at(-1).collision=false;
  }
 }
}

for(const floor of spec.floors){
 const polygons=floor.geometry.type==='Polygon'?[floor.geometry.coordinates]:floor.geometry.coordinates;
 for(const [i,polygon]of polygons.entries()){
  const rings=polygon.map(r=>r.slice(0,-1).map(([x,z])=>[x,floor.y,z]));
  const flat=construction([materials[3]],{flatNormals:true});flat.slab('west-v2-'+floor.id+'-'+i,rings[0],rings.slice(1),floor.depth,0,'west-floor');const p=flat.panels[0];
  c.add(p.id,p.vertices.map(v=>[v.x,v.y,-v.z]),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),3,'west-floor');c.panels.at(-1).material='stone';
 }
}
// Source cap footprints define the straight, diagonal and curved landing guards.
for(const guard of spec.guards)for(const [part,geometry,top,depth,material]of [
 ['cap',guard.cap,guard.topY,.035,1],['glass',guard.glass,guard.topY-.035,.95,0],['shoe',guard.cap,guard.baseY+.125,.125,1]
]){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 for(const [i,polygon]of polygons.entries()){
  const flat=construction([materials[material]],{flatNormals:true}),rings=polygon.map(r=>r.slice(0,-1).map(([x,z])=>[x,top,z]));
  flat.slab('west-v2-guard-'+guard.sourceObject+'-'+part+'-'+i,rings[0],rings.slice(1),depth,0,'landing-guard');const p=flat.panels[0];
  c.add(p.id,p.vertices.map(v=>[v.x,v.y,-v.z]),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),material,'landing-guard');c.panels.at(-1).material=material===0?'glass':'steel';
 }
}
const combSupports=escalators.flatMap(e=>['lower','upper'].map(end=>{
 const support=e.id+'-'+end+'-comb-transfer',p=c.panels.find(p=>p.id===support);assert(p);
 const zs=p.vertices.map(v=>(v.x-e.lowerCenter.x)*e.uphill.x+(v.z-e.lowerCenter.z)*e.uphill.z);
 return {support,along:(Math.min(...zs)+Math.max(...zs))/2,length:Math.max(...zs)-Math.min(...zs)};
}));
const report=await c.save(out,'west-circulation.glb',{builder:'web/station/realism/build-west-circulation-v2.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:sha(layoutBytes),specSha256:sha(specBytes),sourceSha256:spec.sourceSha256,scope:'Four moving lanes, source-shaped intermediate and upper landings, and the adjacent lower stair. Slab thickness and mechanical details are inferred.',assumptions:spec.assumptions});
const nativeBytes=Buffer.from(JSON.stringify({schemaVersion:1,panels:c.panels,escalators,combSupports})+'\n');await writeFile(out+'/native-panels.json',nativeBytes);report.outputs.nativePanelsSha256=sha(nativeBytes);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({panels:c.panels.length,escalators:escalators.length,triangles:report.geometry.triangles}));
