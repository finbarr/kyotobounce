import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {Walker} from '../public/physics/walker.js';
import {STEP} from '../public/physics/ball.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
const pack=decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')),world=new StaticWorld(pack),routes=[];
for(const shape of pack.shapes.filter(s=>s.id.endsWith(' walking surface')&&s.material!=='escalator')){
 // This tiered seating is blocked by its coping, guard and low overhead floor;
 // it is not a through stair. Keep those real solids, rather than making the
 // controller climb or tunnel through them to satisfy a generated route.
 if(shape.id==='concourse-cafe-seating-steps walking surface')continue;
 const rows=new Map();
 for(let i=0;i<shape.vertices.length;i+=3){const [x,y,z]=shape.vertices.slice(i,i+3);if(!rows.has(y))rows.set(y,[]);rows.get(y).push({x,y,z});}
 const points=[...rows].sort((a,b)=>a[0]-b[0]).map(([y,pts])=>{
  // The broad sculpted stairs have a central handrail: use the southern lane.
  if(pts.length>5)return pts.sort((a,b)=>a.z-b.z)[Math.floor((pts.length-1)*.25)];
  return {x:pts.reduce((a,p)=>a+p.x,0)/pts.length,y,z:pts.reduce((a,p)=>a+p.z,0)/pts.length};
 });
 routes.push({id:shape.id,kind:'stairs',points});
}
assert.equal(routes.length,33,'Current public stair-flight inventory');
assert.equal(world.motion.lanes.length,48,'Current moving-escalator inventory');
assert.equal(routes.filter(r=>r.id.startsWith('daikaidan-flight-')).length,14,'Complete Grand Stair');
for(const lane of world.motion.lanes)routes.push({id:lane.spec.id,kind:'escalator',points:lane.points.slice(0,lane.spec.publicPointCount).map(p=>p.clone().applyQuaternion(lane.rotation).add(lane.position))});
routes.push({id:'grand-stair-to-garden',kind:'connected',points:[...routes.filter(r=>r.id.startsWith('daikaidan-flight-')).flatMap(r=>r.points),{x:-147.3,y:49.1937,z:-23.8}]});
routes.push({id:'east-atrium-to-third-floor',kind:'connected',points:routes.filter(r=>/^east-(1f-2f|2f-3f) walking/.test(r.id)).flatMap(r=>r.points)});
const extend=(a,b,d)=>{const n=Math.hypot(a.x-b.x,a.z-b.z);return {x:a.x+(a.x-b.x)/n*d,y:a.y,z:a.z+(a.z-b.z)/n*d};};
const results=[];
try{
 for(const route of routes)for(const reverse of [false,true]){
  const points=route.points.map(p=>({...p}));if(reverse)points.reverse();points.unshift(extend(points[0],points[1],.45));points.push(extend(points.at(-1),points.at(-2),.5));
  const walker=new Walker(world,{...points[0],y:points[0].y+.03});for(let i=0;i<30;i++)walker.move({x:0,z:0},0,false,STEP);
  let steps=0;
  for(const target of points.slice(1)){
   let stagnant=0,previous=Infinity,reached=false;
   for(let i=0;i<180*20;i++){
    const dx=target.x-walker.feet.x,dz=target.z-walker.feet.z,distance=Math.hypot(dx,dz);
    if(distance<.04){reached=true;break;}
    if(distance>previous-.0001)stagnant++;else stagnant=0;previous=distance;
    assert.ok(stagnant<60,`${route.id} ${reverse?'down':'up'} stuck: ${JSON.stringify({feet:walker.feet,target})}`);
    walker.move({x:dx/distance,z:dz/distance},0,false,STEP);steps++;
   }
   assert.ok(reached,`${route.id}: target not reached`);
   // The capsule may straddle a rounded slope transition or step onto nearby
   // trim: .22 m step height + capsule slope clearance is below .4 m. It must
   // never pass a horizontal target on a different station floor.
   assert.ok(Math.abs(walker.feet.y-target.y)<.4,`${route.id}: reached target horizontally on the wrong floor ${JSON.stringify({feet:walker.feet,target,reverse})}`);
  }
  for(let i=0;i<30;i++)walker.move({x:0,z:0},0,false,STEP);
  assert.ok(walker.grounded,`${route.id}: grounded exit`);
  const end=points.at(-1),heightError=walker.feet.y-end.y-.025;
  // Adjoining sculpted landings are not all horizontal at the flight's nominal
  // elevation. Stay within one step and require actual grounded support.
  assert.ok(Math.abs(heightError)<.18,`${route.id}: exit elevation ${heightError}`);
  results.push({id:route.id,kind:route.kind,reverse,steps,feet:walker.feet,heightError});
 }
 // The sitting tiers still block a full-height body at their actual coping.
 const seated=new Walker(world,{x:-36.75,y:7.38,z:-9.35});
 for(let i=0;i<180;i++)seated.move({x:0,z:-1},0,false,STEP);
 assert.equal(world.capsuleSweep(seated.feet,{x:0,y:0,z:-.02},.24,1.8,.025)?.surface.id,'first-landing-east-tier-0-coping');
 assert.ok(seated.feet.z>-9.7,'Solid seating cannot become a through route');
 await writeFile('.local/browser-physics/walking-proof.json',JSON.stringify({layout:world.layoutSha256,physics:BROWSER_PHYSICS,routes,results},null,2)+'\n');
 console.log(`PASS ${results.length} station walks: 33 public stair flights, all 48 escalators, continuous east atrium stairs and the full Grand Stair to the garden, each in both directions`);
}finally{world.free();}
