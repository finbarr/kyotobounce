// Four terrace lanes from the municipal plan; all coordinates are native XYZ.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(out.startsWith('.local/'));
const prefix='hachijo-escalators-',H=3.675,run=H/Math.tan(Math.PI/6),old=layout.escalators.find(e=>e.id==='porta-connection-west-escalator-1'),flat=old.flatLength;
const chassis=layout.panels.filter(p=>p.id.startsWith(old.id+'-')&&!/-glass-|-handrail-/.test(p.id));assert.equal(chassis.length,16);
const pavementIds=['miyakomichi-connected-ground','hachijo-terrace-west-pavement','hachijo-terrace-south-pavement-east'];
const retiredIds=layout.panels.filter(p=>pavementIds.includes(p.id)||['hachijo-terrace-west-escalator-reserve-','hachijo-terrace-east-end-'].some(s=>p.id.startsWith(s))).map(p=>p.id);
assert.equal(retiredIds.length,17);
const sourceMaterials=[...new Set([...chassis,...layout.panels.filter(p=>pavementIds.includes(p.id))].map(p=>p.appearance))].map(id=>layout.authoredMaterials.find(m=>m.id===id));
const materials=sourceMaterials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const mat=(name,color,roughness=.5,metallic=0)=>({name:'Hachijo escalators | '+name,pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:roughness,metallicFactor:metallic}});
const glass=materials.length;materials.push({...mat('glass',[.52,.7,.75,.19],.16),alphaMode:'BLEND',doubleSided:true});
const rubber=materials.length;materials.push(mat('rubber',[.025,.03,.032,1],.65));
const tactile=materials.length;materials.push(mat('warning paving',[.78,.56,.08,1]));
const metal=sourceMaterials.findIndex(r=>r.id===chassis[0].appearance),c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],point=(x,y,z)=>({x,y,z});
const slab=(id,ring,y,depth,mi,role='public-floor',holes=[])=>c.slab(prefix+id,ring.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
// Recover boundary rings from the existing top triangles, keeping the complete
// irregular Miyako Michi outline and its original elevation/material.
function topRings(p){
 const top=Math.max(...p.vertices.map(v=>v.y)),key=v=>v.x+','+v.z,edges=new Map(),points=new Map();
 for(let i=0;i<p.triangles.length;i+=3){const vs=p.triangles.slice(i,i+3).map(j=>p.vertices[j]);if(!vs.every(v=>Math.abs(v.y-top)<1e-6))continue;
  for(let k=0;k<3;k++){const a=key(vs[k]),b=key(vs[(k+1)%3]),id=[a,b].sort().join('|');points.set(a,[vs[k].x,vs[k].z]);if(edges.has(id))edges.delete(id);else edges.set(id,[a,b]);}
 }
 const rings=[];while(edges.size){const first=edges.values().next().value,start=first[0],ring=[points.get(start)];let here=start;
  do{const found=[...edges].find(([,ab])=>ab.includes(here));assert(found);edges.delete(found[0]);here=found[1].find(v=>v!==here);if(here!==start)ring.push(points.get(here));}while(here!==start);rings.push(ring);
 }
 const area=r=>Math.abs(r.reduce((n,p,i)=>n+p[0]*r[(i+1)%r.length][1]-p[1]*r[(i+1)%r.length][0],0));return rings.sort((a,b)=>area(b)-area(a));
}
const blend=.35,turn=.4;
function level(z,r,h){const slope=h/r;if(z< -blend)return 0;if(z<blend)return slope*(z+blend)**2/(4*blend);if(z<r-blend)return slope*z;if(z<r+blend)return h-slope*(r+blend-z)**2/(4*blend);return h;}
function pathFor(){const points=[],n=Math.ceil((run+2*flat)/.04);for(let i=0;i<=n;i++){const z=-flat+(run+2*flat)*i/n;points.push({x:0,y:level(z,run,H),z});}const path=points.map(p=>({...p}));for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:H-turn+turn*Math.cos(t),z:run+flat+turn*Math.sin(t)});}for(const p of points.slice(0,-1).reverse())path.push({...p,y:p.y-2*turn});for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:-turn-turn*Math.cos(t),z:-flat-turn*Math.sin(t)});}return{path,publicPointCount:points.length,chainLengthM:path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.y-path[i].y,p.z-path[i].z),0)};}
const upperEnd=Math.max(...chassis.find(p=>p.id.endsWith('upper-pit-cover')).vertices.map(v=>(v.x-old.lowerCenter.x)*old.uphill.x+(v.z-old.lowerCenter.z)*old.uphill.z))-old.run-old.flatLength;
// In the plan: west northern lane up, southern lane down; east northern lane
// down, southern lane up. Elevation, pitch and registration remain fitted.
const banks=[{name:'west-up',edge:-85.5,z:-201.05,d:1,speed:.5},{name:'west-down',edge:-85.5,z:-202.65,d:1,speed:-.5},{name:'east-down',edge:-40.5,z:-205.35,d:-1,speed:-.5},{name:'east-up',edge:-40.5,z:-206.95,d:-1,speed:.5}];
const escalators=[],combSupports=[],pits=[];
for(const bank of banks){
 const name=prefix+bank.name,O=point(bank.edge-bank.d*(run+flat+upperEnd),0,bank.z),u=point(bank.d,0,0),world=(z,w,y)=>[O.x+u.x*z,y,O.z+u.x*w];
 const along=z=>z< -old.flatLength?z+old.flatLength-flat:z<0?z*flat/old.flatLength:z<=old.run?z*run/old.run:z<=old.run+old.flatLength?run+(z-old.run)*flat/old.flatLength:run+flat+z-old.run-old.flatLength;
 for(const p of chassis){const vs=p.vertices.map(v=>{const dx=v.x-old.lowerCenter.x,dz=v.z-old.lowerCenter.z,z=dx*old.uphill.x+dz*old.uphill.z,w=-dx*old.uphill.z+dz*old.uphill.x,nz=along(z);return P(...world(nz,w,level(nz,run,H)+v.y-old.lowerCenter.y-level(z,old.run,old.height)));});
  c.add(p.id.replace(old.id,name),vs,p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),sourceMaterials.findIndex(r=>r.id===p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});
 }
 const path=pathFor(),stepCount=Math.ceil(path.chainLengthM/.4),e={...old,id:name,lowerCenter:O,uphill:u,run,height:H,...path,stepCount,pitchM:path.chainLengthM/stepCount,speed:bank.speed,phase:0,status:'Direction and bank placement from Kyoto municipal terrace plan; dimensions fitted.'};escalators.push(e);
 for(const end of ['lower','upper']){const p=c.panels.find(p=>p.id===name+'-'+end+'-comb-transfer'),zs=p.vertices.map(v=>(v.x-O.x)*u.x);combSupports.push({support:p.id,along:(Math.min(...zs)+Math.max(...zs))/2,length:Math.max(...zs)-Math.min(...zs)});}
 for(const side of [-1,1]){const w=side*(e.width/2+.10),n=Math.ceil((run+2*flat)/.25);for(let i=0;i<n;i++){const a=-flat+(run+2*flat)*i/n,b=-flat+(run+2*flat)*(i+1)/n;for(const [suffix,offset,width,h,mi,physical]of[['glass',.50,.022,.86,glass,'glass'],['handrail',.98,.075,.065,rubber,'rubber']]){c.beam(name+'-'+suffix+'-'+side+'-'+i,P(...world(a,w,level(a,run,H)+offset)),P(...world(b,w,level(b,run,H)+offset)),width,h,mi,'escalator-'+suffix);c.panels.at(-1).material=physical;}}}
 const xs=[world(-1.84,0,0)[0],world(2.3,0,0)[0]],hole=rect(Math.min(...xs),Math.max(...xs),bank.z-.55,bank.z+.55);pits.push({lane:name,ring:hole});
 // Pit floors close the new pavement openings beneath the circulating chain.
 slab(bank.name+'-ground-pit',hole,-1.32,.12,metal,'pit-floor');
 const lower=world(-flat-1.05,0,0),upper=world(run+flat+upperEnd+.65,0,H);
 for(const [end,p]of[['lower',lower],['upper',upper]]){slab(bank.name+'-'+end+'-warning',rect(p[0]-.17,p[0]+.17,p[2]-.55,p[2]+.55),p[1]+.006,.006,tactile,'tactile');c.panels.at(-1).collision=false;}
}
for(const id of pavementIds){const p=layout.panels.find(p=>p.id===id),rings=topRings(p),mi=sourceMaterials.findIndex(r=>r.id===p.appearance),depth=-Math.min(...p.vertices.map(v=>v.y));
 if(id==='hachijo-terrace-south-pavement-east'){
  assert.equal(rings.length,2);slab('south-pavement-lift',rect(-65,-40.5,-216,-203),0,depth,mi,'public-floor',[rings[1]]);
  slab('south-pavement-north',rect(-40.5,-20,-206.15,-203),0,depth,mi,'public-floor',[pits[2].ring]);
  slab('south-pavement-south',rect(-40.5,-20,-216,-206.15),0,depth,mi,'public-floor',[pits[3].ring]);
 }else{assert.equal(rings.length,1);slab(id,rings[0],0,depth,mi,'public-floor',[pits[id==='miyakomichi-connected-ground'?0:1].ring]);}
}
function guard(id,a,b){c.beam(prefix+id+'-cap',P(a[0],H+1.1,a[1]),P(b[0],H+1.1,b[1]),.06,.06,metal,'guard');c.beam(prefix+id+'-glass',P(a[0],H+.56,a[1]),P(b[0],H+.56,b[1]),.025,.88,glass,'guard');for(const [i,p]of[a,b].entries())c.beam(prefix+id+'-post-'+i,P(p[0],H,p[1]),P(p[0],H+1.1,p[1]),.06,.06,metal,'guard');}
for(const [side,edge,d,z0,z1,centers]of[['west',-85.5,1,-203.95,-199.75,[-202.65,-201.05]],['east',-40.5,-1,-208.5,-203.8,[-206.95,-205.35]]]){
 const end=edge-d*upperEnd;
 slab(side+'-upper-apron',rect(Math.min(edge,end),Math.max(edge,end),z0,z1),H,.035,metal);
 const boundaries=[z0,...centers.flatMap(z=>[z-.6,z+.6]),z1];
 for(let i=0;i<boundaries.length;i+=2)guard(side+'-end-'+i,[end,boundaries[i]],[end,boundaries[i+1]]);
 for(const z of [z0,z1])guard(side+'-apron-side-'+z,[edge,z],[end,z]);
 // Close the exposed return casing sides to the deck; leave the tread mouths open.
 for(const z of centers)for(const sign of[-1,1])guard(side+'-mouth-'+z+'-'+sign,[end,z+sign*.6],[edge,z+sign*.6]);
}
for(const p of c.panels)if(!p.id.includes('-escalator-'))p.material=p.browserMaterial===glass?'glass':p.browserMaterial===rubber?'rubber':p.browserMaterial===metal?'steel':'stone';
const previous=await read('.local/v2/current/components/hachijo-terrace/report.json');
const routes=previous.geometry.routes.filter(r=>['terrace-west','Terrace to west lift','Terrace to south lift','South lift street approach','Miyako Michi to ASTY forecourt'].some(s=>r.label===s||r.label===s+' return'));
// The old ground route crossed the newly occupied east-bank footprint. Reach
// ASTY beneath the main deck, north of that bank and clear of its low underside.
const southApproach=[point(-46.4,0,-209.4),point(-46.4,0,-202),point(-37,0,-202),point(-37,0,-193)];
for(const r of routes)if(r.label.startsWith('South lift street approach'))r.points=r.label.endsWith('return')?southApproach.toReversed():southApproach;
// Public landing walks join both lower mouths to the surrounding pavement.
for(const [side,indices]of[['west',[0,1]],['east',[2,3]]]){const es=indices.map(i=>escalators[i]),points=es.map(e=>point(e.lowerCenter.x-e.uphill.x*(flat+1.15),0,e.lowerCenter.z));routes.push({label:side+' ground landing',points},{label:side+' ground landing return',points:points.toReversed()});}
const report=await c.save(out,'hachijo-escalators.glb',{componentPrefix:prefix,sourceCollection:'Hachijo terrace escalators',motionArchitecture:'hachijoEscalatorsV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Four operating terrace escalators, paired up and down at west and east deck ends, with fitted combs, pavement pits and guarded receiving aprons.',geometry:{H,banks,pits,routes,spawn:m.spawn,retiredIds,retiredLights:[]},references:['https://www.city.kyoto.lg.jp/gyozai/page/0000294495.html','research/kyoto-station/plans/hachijo-terrace-advertising-plan-2026.pdf','research/kyoto-station/plans/hachijo-municipal-brochure.pdf'],limits:['The municipal plan establishes four lanes and directions. Registration, 3.675 m rise, 30 degree incline and machinery dimensions are fitted to the current model.','The two original station-side escalators remain a separate incomplete connection.']});
const native=await read(out+'/native-panels.json');native.authoredLights=[];const nr=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nr);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/motion.json',JSON.stringify({escalators,combSupports})+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');console.log({panels:c.panels.length,triangles:report.geometry.triangles,retired:retiredIds.length,lanes:escalators.length,routes:routes.length});
