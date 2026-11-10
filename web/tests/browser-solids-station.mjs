import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Vector3,Triangle} from 'three';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
const pack=decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')),solids=pack.shapes.filter(s=>s.convex);
assert.equal(solids.length,457,'Current escalator-casing inventory');
let interiorSamples=0,exteriorCasts=0,maxSurfaceError=0,maxCastError=0;
for(const shape of solids){
 const points=[];for(let i=0;i<shape.vertices.length;i+=3)points.push(new Vector3().fromArray(shape.vertices,i));
 const center=points.reduce((n,p)=>n.add(p),new Vector3()).divideScalar(points.length),triangles=[];
 for(let i=0;i<shape.indices.length;i+=3)triangles.push(new Triangle(...Array.from(shape.indices.slice(i,i+3),i=>points[i])));
 // Isolate each solid so a neighboring floor or skirt cannot hide a missing
 // volume. Reference distances use the original authored triangle surfaces.
 const world=new StaticWorld({shapes:[shape],escalators:[],fallLimitY:-100});
 function checkInside(p,radius){
  const hit=world.overlap(p,radius);assert.equal(hit?.surface.id,shape.id,`${shape.id}: missing solid interior`);
  const point=new Vector3(hit.point.x,hit.point.y,hit.point.z),normal=new Vector3(hit.normal.x,hit.normal.y,hit.normal.z);
  assert.ok(normal.dot(point.clone().sub(p))>0,`${shape.id}: correction points inward`);
  const error=Math.min(...triangles.map(t=>t.closestPointToPoint(point,new Vector3()).distanceTo(point)));
  maxSurfaceError=Math.max(maxSurfaceError,error);assert.ok(error<.00002,`${shape.id}: corrected contact leaves visible geometry by ${error} m`);
  assert.ok(Math.abs(hit.depth-radius-point.distanceTo(p))<.00002);
  assert.equal(world.overlap(point.clone().addScaledVector(normal,radius+.0002),radius),null,`${shape.id}: correction still overlaps`);
  interiorSamples++;
 }
 try{
  checkInside(center,.001);
  for(const triangle of triangles){
   const point=triangle.getMidpoint(new Vector3()),normal=triangle.getNormal(new Vector3());
   if(normal.dot(point.clone().sub(center))<0)normal.negate();
   checkInside(point.clone().lerp(center,.1),.023);
   const hit=world.sweep(point.clone().addScaledVector(normal,.2),normal.clone().multiplyScalar(-.4),.023);
   assert.equal(hit?.surface.id,shape.id,`${shape.id}: missing outside face`);
   const error=Math.hypot(hit.point.x-point.x,hit.point.y-point.y,hit.point.z-point.z);maxCastError=Math.max(maxCastError,error);
   assert.ok(error<.00002,`${shape.id}: exterior collision differs from its visible face by ${error} m`);exteriorCasts++;
  }
 }finally{world.free();}
}
// Also exercise the combined world's solid broadphase, beyond triangle bounds.
const world=new StaticWorld(pack);
try{
 assert.equal(world.stats.solids,457);
 for(const s of solids){const p=new Vector3();for(let i=0;i<s.vertices.length;i+=3)p.add(new Vector3().fromArray(s.vertices,i));p.divideScalar(s.vertices.length/3);assert.ok(world.overlap(p,.001),`${s.id}: combined broadphase missed an interior`);}
}finally{world.free();}
const receipt={layout:pack.layoutSha256,physics:BROWSER_PHYSICS,solids:solids.length,interiorSamples,exteriorCasts,maxSurfaceErrorMeters:maxSurfaceError,maxCastErrorMeters:maxCastError};
await writeFile('.local/browser-physics/solid-proof.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
