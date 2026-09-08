import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';
const dir=process.argv[2]||'.local/station-detail/layer',r=JSON.parse(await readFile(`${dir}/colliders.json`));
assert.deepEqual(r.doorway.threshold,{x:-54,y:7.35,z:-18});assert.equal(r.doorway.clearWidth,1.8);
let samples=0;
// Human-sized central route and original ball-receiving volume, checked against
// each actual solid box (not a fixture count assertion).
for(let v=-.2;v<=3.1;v+=.05)for(let u=-.60;u<=.60;u+=.1)for(let y=.03;y<=1.85;y+=.1){
 const p={x:-54+v,y:7.35+y,z:-18-u};
 for(const b of r.boxes){if(b.id==='konbini-floor')continue;const x=p.x-b.center.x,z=p.z-b.center.z,theta=-b.yaw*Math.PI/180;const local=[x*Math.cos(theta)+z*Math.sin(theta),p.y-b.center.y,-x*Math.sin(theta)+z*Math.cos(theta)];assert(!local.every((n,i)=>Math.abs(n)<[b.size.x,b.size.y,b.size.z][i]/2),`${b.id} blocks route at ${JSON.stringify(p)}`);}
 samples++;
}
for(const b of r.boxes){if(b.id==='konbini-floor')continue;const dx=Math.max(0,Math.abs(b.center.x+52)-b.size.z/2),dz=Math.max(0,Math.abs(b.center.z+18)-b.size.x/2);if(b.center.y-b.size.y/2<7.35+.0464)assert(Math.hypot(dx,dz)>.9,`${b.id} intrudes on receiving disk`);}
await writeFile(`${dir}/clearance.json`,JSON.stringify({status:'pass',samples,clearHumanRouteWidth:1.2,preservedReceivingRadius:.9},null,2));console.log('PASS',samples,'route samples, receiving disk unchanged');
