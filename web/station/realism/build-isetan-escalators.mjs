// Fit shared operating machinery to the actual 3F/4F rise and protect its wells.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
const sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const index=id=>{const i=s.materials.findIndex(r=>r.id===id);assert(i>=0);return i;};
const glass=mats.length;mats.push({name:'Isetan escalators | glass',pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true});
const rubber=mats.length;mats.push({name:'Isetan escalators | handrail',pbrMetallicRoughness:{baseColorFactor:[.035,.04,.043,1],roughnessFactor:.65,metallicFactor:0}});
const metal=mats.length;mats.push({name:'Isetan escalators | steel guard',pbrMetallicRoughness:{baseColorFactor:[.49,.53,.56,1],roughnessFactor:.32,metallicFactor:.8}});
const prefix='isetan-escalators-',c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z];
function copied(p,transform){c.add(prefix+p.id,p.vertices.map(v=>P(...transform(v))),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),index(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1).map(([x,z])=>P(x,p.top,z)));c.slab(prefix+p.id,rings[0],rings.slice(1),p.top-p.bottom,index(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
const blend=.35,turn=.4;
function level(z,r,h){const slope=h/r;if(z< -blend)return 0;if(z<blend)return slope*(z+blend)**2/(4*blend);if(z<r-blend)return slope*z;if(z<r+blend)return h-slope*(r+blend-z)**2/(4*blend);return h;}
function pathFor(run,height,flat){
 const points=[],n=Math.ceil((run+2*flat)/.04);for(let i=0;i<=n;i++){const z=-flat+(run+2*flat)*i/n;points.push({x:0,y:level(z,run,height),z});}
 const path=points.map(p=>({...p}));for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:height-turn+turn*Math.cos(t),z:run+flat+turn*Math.sin(t)});}
 for(const p of points.slice(0,-1).reverse())path.push({...p,y:p.y-2*turn});for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:-turn-turn*Math.cos(t),z:-flat-turn*Math.sin(t)});}
 return{path,publicPointCount:points.length,chainLengthM:path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.y-path[i].y,p.z-path[i].z),0)};
}
const escalators=[],combSupports=[];
function guard(id,a,b){
 for(const [suffix,y,w,h,mi,material]of [['glass',.55,.025,1.0,glass,'glass'],['top',1.08,.065,.065,metal,'steel']]){c.beam(id+'-'+suffix,P(a[0],s.floor4+y,a[1]),P(b[0],s.floor4+y,b[1]),w,h,mi,'guard');c.panels.at(-1).material=material;}
 const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.5);for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;c.beam(id+'-post-'+i,P(x,s.floor4,z),P(x,s.floor4+1.1,z),.045,.045,metal,'guard');c.panels.at(-1).material='steel';}
}
for(const bank of s.banks){
 const old=s.template,{run,height,flatLength:flat,uphill:u,lowerCenter:O}=bank,r={x:-u.z,z:u.x},name=prefix+bank.name,world=(z,w,y)=>[O.x+u.x*z+r.x*w,O.y+y,O.z+u.z*z+r.z*w];
 function along(z){if(z< -old.flatLength)return z+old.flatLength-flat;if(z<0)return z*flat/old.flatLength;if(z<=old.run)return z*run/old.run;if(z<=old.run+old.flatLength)return run+(z-old.run)*flat/old.flatLength;return run+flat+z-old.run-old.flatLength;}
 for(const p of s.chassis)copied({...p,id:p.id.replace(old.id,bank.name)},v=>{const dx=v.x-old.lowerCenter.x,dz=v.z-old.lowerCenter.z,z=dx*old.uphill.x+dz*old.uphill.z,w=-dx*old.uphill.z+dz*old.uphill.x,nz=along(z);return world(nz,w,level(nz,run,height)+v.y-old.lowerCenter.y-level(z,old.run,old.height));});
 const path=pathFor(run,height,flat),stepCount=Math.ceil(path.chainLengthM/.4),e={...old,id:name,uphill:u,lowerCenter:O,run,height,...path,stepCount,pitchM:path.chainLengthM/stepCount,speed:bank.speed,phase:0,status:'Central store connection from operator floor plans; dimensions and lane directions fitted.'};escalators.push(e);
 for(const end of ['lower','upper']){const p=c.panels.find(p=>p.id===name+'-'+end+'-comb-transfer'),zs=p.vertices.map(v=>(v.x-O.x)*u.x+(v.z-O.z)*u.z);combSupports.push({support:p.id,along:(Math.min(...zs)+Math.max(...zs))/2,length:Math.max(...zs)-Math.min(...zs)});}
 for(const side of [-1,1]){const w=side*(e.width/2+.10),n=Math.ceil((run+2*flat)/.25);for(let i=0;i<n;i++){const a=-flat+(run+2*flat)*i/n,b=-flat+(run+2*flat)*(i+1)/n;for(const [suffix,offset,width,h,mi,physical]of [['glass',.50,.022,.86,glass,'glass'],['handrail',.98,.075,.065,rubber,'rubber']]){c.beam(name+'-'+suffix+'-'+side+'-'+i,P(...world(a,w,level(a,run,height)+offset)),P(...world(b,w,level(b,run,height)+offset)),width,h,mi,'escalator-'+suffix);c.panels.at(-1).material=physical;}}}
 const x0=O.x+s.pitBack-.13,x1=O.x+run-s.pitBack;
 for(const side of [-1,1])guard(name+'-well-'+side,[x0,O.z+side*.68],[x1,O.z+side*.68]);
 guard(name+'-well-west',[x0,O.z-.68],[x0,O.z+.68]);
}
const routes=[],point=(x,y,z)=>({x,y,z}),G=s.floor3,F=s.floor4;
function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('3F receiving aisle',[point(-80,G,-24),point(-108,G,-24),point(-108,G,-17),point(-106.5,G,-17)]);
pair('3F lower comb approach',[point(-108,G,-24),point(-108,G,-20),point(-106.5,G,-20)]);
pair('4F landing to south door',[point(-93.7,F,-20),point(-91,F,-20),point(-91,F,-10.5),point(-76,F,-10.5)]);
pair('4F upper landing cross aisle',[point(-93.7,F,-20),point(-93.7,F,-17)]);
pair('4F well bypass',[point(-109,F,-23),point(-109,F,-13),point(-92,F,-13),point(-92,F,-20)]);
const blocked=[{label:'4F protected west well',start:point(-108,F,-20),yaw:90,axis:'x',limit:-105.99,sign:-1},{label:'4F protected south well',start:point(-101,F,-23),yaw:0,axis:'z',limit:-20.55,sign:-1}];
const report=await c.save(out,'isetan-escalators.glb',{componentPrefix:prefix,sourceCollection:'Isetan 3F to 4F escalators',motionArchitecture:'isetanEscalatorsV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Operating up/down connection between Isetan 3F and 4F with fitted floor and ceiling openings, protected wells and clear landings.',geometry:{floor3:G,floor4:F,banks:s.banks,routes,chromeRoutes:['3F receiving aisle','3F lower comb approach','4F landing to south door','4F upper landing cross aisle','4F well bypass'],blocked,spawn:point(-80,F,-24),retiredIds:s.retiredIds},references:['https://www.kyoto-station-building.co.jp/floorguide/3f/','https://www.kyoto-station-building.co.jp/floorguide/4f/','research/kyoto-station/maps/floor-3f-isetan.svg','research/kyoto-station/maps/floor-4f-isetan.svg'],limits:s.assumptions});
await writeFile(out+'/motion.json',JSON.stringify({escalators,combSupports})+'\n');const native=await read(out+'/native-panels.json');native.authoredLights=[];const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['3f-boarding',[-109,G+1.65,-21.5],[-99,G+3,-19]],['4f-arrival',[-91,F+1.65,-20],[-103,F-1,-18.5]],['4f-wells',[-108,F+1.65,-24],[-100,F,-17]],['3f-underpass',[-91,G+1.65,-22],[-101,G+1.8,-18]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lanes:escalators.length,routes:routes.length});
