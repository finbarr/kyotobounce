// Shared fitted store escalator machinery and upper-well guards.
export function addStoreEscalators(c,s,prefix,{glass,rubber,metal,index}){
 const P=(x,y,z)=>[x,y,-z],upperFloor=s.banks[0].lowerCenter.y+s.banks[0].height;
 function copied(p,transform){c.add(prefix+p.id,p.vertices.map(v=>P(...transform(v))),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),index(p.appearance),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
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
 for(const [suffix,y,w,h,mi,material]of [['glass',.55,.025,1.0,glass,'glass'],['top',1.08,.065,.065,metal,'steel']]){c.beam(id+'-'+suffix,P(a[0],upperFloor+y,a[1]),P(b[0],upperFloor+y,b[1]),w,h,mi,'guard');c.panels.at(-1).material=material;}
 const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.5);for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;c.beam(id+'-post-'+i,P(x,upperFloor,z),P(x,upperFloor+1.1,z),.045,.045,metal,'guard');c.panels.at(-1).material='steel';}
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
return {escalators,combSupports};
}
