// Four documented upward lanes, fitted beside the retained subway stairways.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';

const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p));
const sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath);
const layout=await read(m.layout);assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)),'Build against the prepared base after exact retirement');
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const index=id=>{const i=s.materials.findIndex(r=>r.id===id);assert(i>=0);return i;};
const glass=mats.length;mats.push({name:'Subway escalators | glass',pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true});
const rubber=mats.length;mats.push({name:'Subway escalators | rubber',pbrMetallicRoughness:{baseColorFactor:[.035,.04,.043,1],roughnessFactor:.65,metallicFactor:0}});
const prefix='subway-escalators-',c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z];
const id=old=>prefix+old;
function copied(p,transform){c.add(id(p.id),p.vertices.map(v=>P(...transform(v))),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),index(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
for(const p of s.reshaped)copied(p,v=>[v.x,v.y,v.z]);
for(const p of [...s.slabs,...s.joints]){
 const rings=p.shape.coordinates.map(r=>r.slice(0,-1).map(([x,z])=>P(x,p.top,z)));
 c.slab(id(p.id),rings[0],rings.slice(1),p.top-p.bottom,index(p.appearance),p.role);
 Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});
}
const blend=.35,turn=.4;
function level(z,r,h){const slope=h/r;if(z< -blend)return 0;if(z<blend)return slope*(z+blend)**2/(4*blend);if(z<r-blend)return slope*z;if(z<r+blend)return h-slope*(r+blend-z)**2/(4*blend);return h;}
function pathFor(run,height,flat){
 const points=[],n=Math.ceil((run+2*flat)/.04);
 for(let i=0;i<=n;i++){const z=-flat+(run+2*flat)*i/n;points.push({x:0,y:level(z,run,height),z});}
 const path=points.map(p=>({...p}));
 for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:height-turn+turn*Math.cos(t),z:run+flat+turn*Math.sin(t)});}
 for(const p of points.slice(0,-1).reverse())path.push({...p,y:p.y-2*turn});
 for(let i=1;i<=64;i++){const t=Math.PI*i/64;path.push({x:0,y:-turn-turn*Math.cos(t),z:-flat-turn*Math.sin(t)});}
 return{path,publicPointCount:points.length,chainLengthM:path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.y-path[i].y,p.z-path[i].z),0)};
}
const escalators=[],combSupports=[],routes=[],point=(x,y,z)=>({x,y,z});
function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
for(const bank of s.banks){
 const old=s.template,{run,height,flatLength:flat,uphill:u,lowerCenter:O}=bank,r={x:-u.z,z:u.x},name=prefix+bank.name;
 const world=(z,w,y)=>[O.x+u.x*z+r.x*w,O.y+y,O.z+u.z*z+r.z*w];
 function along(z){if(z< -old.flatLength)return z+old.flatLength-flat;if(z<0)return z*flat/old.flatLength;if(z<=old.run)return z*run/old.run;if(z<=old.run+old.flatLength)return run+(z-old.run)*flat/old.flatLength;return run+flat+z-old.run-old.flatLength;}
 for(const p of s.chassis){
  copied({...p,id:p.id.replace(old.id,bank.name)},v=>{
   const dx=v.x-old.lowerCenter.x,dz=v.z-old.lowerCenter.z,z=dx*old.uphill.x+dz*old.uphill.z,w=-dx*old.uphill.z+dz*old.uphill.x,nz=along(z);
   return world(nz,w,level(nz,run,height)+v.y-old.lowerCenter.y-level(z,old.run,old.height));
  });
 }
 const path=pathFor(run,height,flat),stepCount=Math.ceil(path.chainLengthM/.4),e={...old,id:name,uphill:u,lowerCenter:O,run,height,...path,stepCount,pitchM:path.chainLengthM/stepCount,speed:.5,phase:0,status:'Upward direction from official K11 diagram; dimensions fitted beside existing stairs.'};escalators.push(e);
 for(const end of ['lower','upper']){const p=c.panels.find(p=>p.id===name+'-'+end+'-comb-transfer'),zs=p.vertices.map(v=>(v.x-O.x)*u.x+(v.z-O.z)*u.z);combSupports.push({support:p.id,along:(Math.min(...zs)+Math.max(...zs))/2,length:Math.max(...zs)-Math.min(...zs)});}
 for(const side of[-1,1]){
  const w=side*(e.width/2+.10),n=Math.ceil((run+2*flat)/.25);
  for(let i=0;i<n;i++){
   const a=-flat+(run+2*flat)*i/n,b=-flat+(run+2*flat)*(i+1)/n;
   for(const [suffix,offset,width,h,mi,physical]of[['glass',.50,.022,.86,glass,'glass'],['handrail',.98,.075,.065,rubber,'rubber']]){
    c.beam(name+'-'+suffix+'-'+side+'-'+i,P(...world(a,w,level(a,run,height)+offset)),P(...world(b,w,level(b,run,height)+offset)),width,h,mi,'escalator-'+suffix);c.panels.at(-1).material=physical;
   }
  }
 }
 // A narrow solid divider closes the gap left by the reduced staircase.
 // Its top follows the stair treads; the relocated handrail protects that side.
 const stairMaterial=s.reshaped.find(p=>p.id===bank.prefix+'midlanding');
 for(const p of s.reshaped.filter(p=>p.id.startsWith(bank.prefix+'step-')||p.id===bank.prefix+'midlanding')){
  const zs=p.vertices.map(v=>v.z),top=Math.max(...p.vertices.map(v=>v.y)),z0=Math.min(...zs),z1=Math.max(...zs);
  c.slab(name+'-divider-'+p.id,[[175.60,z0],[176,z0],[176,z1],[175.60,z1]].map(([x,z])=>P(x,top,z)),[],top+11.5,index(stairMaterial.appearance),'stair-divider');c.panels.at(-1).material='stone';
 }
 const tactile=s.reshaped.find(p=>p.id===bank.prefix+'upper-tactile');
 for(const [end,z,y]of[['upper',bank.start-bank.direction*.98,-6.2],['lower',bank.end+bank.direction*.98,-11.2]]){
  c.slab(name+'-'+end+'-warning',[[174.4,z-.17],[175.3,z-.17],[175.3,z+.17],[174.4,z+.17]].map(([x,z])=>P(x,y+.007,z)),[],.007,index(tactile.appearance),'tactile');Object.assign(c.panels.at(-1),{collision:false,material:'stone'});
 }
 const d=bank.direction;
 pair(bank.name+' retained stairs',[point(177,-6.2,bank.start-d*1.3),point(177,-6.2,bank.start),point(177,-8.7,bank.midA),point(177,-8.7,bank.midB),point(177,-11.2,bank.end),point(177,-11.2,bank.end+d*2)]);
 for(const x of[172.3,181.7])pair(bank.name+' platform aisle '+x,[point(x,-11.2,Math.min(bank.start,bank.end)-2),point(x,-11.2,Math.max(bank.start,bank.end)+2)]);
}
const report=await c.save(out,'subway-escalators.glb',{
 componentPrefix:prefix,sourceCollection:'Subway platform escalators',motionArchitecture:'subwayEscalatorsV2',
 builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Four operating upward platform escalators beside usable subway stairs, with fitted combs, pits, balustrades and floor openings.',
 geometry:{floor:-6.2,platform:-11.2,banks:s.banks,routes,spawn:point(172.3,-11.2,-1.8),retiredIds:s.retiredIds},
 references:['https://www2.city.kyoto.lg.jp/kotsu/tikadia/menu0221.htm','research/kyoto-station/maps/subway-kyoto-plan.pdf'],limits:s.assumptions
});
await writeFile(out+'/motion.json',JSON.stringify({escalators,combSupports})+'\n');
const native=await read(out+'/native-panels.json');native.authoredLights=[];
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lanes:escalators.length,routes:routes.length});
