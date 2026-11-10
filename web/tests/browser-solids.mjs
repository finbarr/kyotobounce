import assert from 'node:assert/strict';
import {Vector3,Quaternion} from 'three';
import {StaticWorld} from '../public/physics/static-world.js';
import {Ball} from '../public/physics/ball.js';
import {Walker} from '../public/physics/walker.js';
import {v,identity} from '../public/physics/math.js';

const near=(a,b,t=2e-5)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
export function prism({position=v(),half=v(.6,.3,.2),rotation=identity(),mask=3,convex=true}={}){
 const q=new Quaternion(rotation.x,rotation.y,rotation.z,rotation.w),vertices=[];
 for(const [x,y,z] of [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]){
  const p=new Vector3(x*half.x,y*half.y,z*half.z).applyQuaternion(q).add(position);vertices.push(p.x,p.y,p.z);
 }
 return {id:'casing',kind:'mesh',material:'steel',mask,convex,vertices:new Float32Array(vertices),indices:new Uint32Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5])};
}
const make=shapes=>new StaticWorld({shapes,escalators:[],fallLimitY:-10});
assert.throws(()=>make([prism({half:v(.6,0,.2)})]),/Invalid convex station volume/,'A flat panel cannot silently become a solid');
for(const position of [v(),v(-147.3,49.1937,-23.8)]){
 const shape=prism({position}),world=make([shape]);
 const deep=world.overlap(position,.023);assert.ok(deep,'A sphere deep inside a casing overlaps its volume');near(deep.depth,.223);
 assert.ok(Math.abs(deep.normal.z)>.99999);near(Math.abs(deep.point.z-position.z),.2);
 for(const sign of [-1,1]){
  const p=v(position.x,position.y,position.z+sign*.19),hit=world.overlap(p,.023);
  near(hit.depth,.033);near(hit.normal.z,sign);near(hit.point.z,position.z+sign*.2);
  const outside=v(hit.point.x+hit.normal.x*.0232,hit.point.y+hit.normal.y*.0232,hit.point.z+hit.normal.z*.0232);
  assert.equal(world.overlap(outside,.023),null,'Correction goes out of the solid, never further inside');
 }
 const ball=new Ball(world);ball.launch(position,v(),v());ball.step();
 assert.equal(world.overlap(ball.position,ball.profile.radius),null,'Physics recovers an interior overlap');assert.equal(ball.budgetExhaustions,0);
 world.free();assert.equal(world.solidTree,null);
}
for(const mask of [1,2]){
 const world=make([prism({mask})]);assert.ok(world.overlap(v(),.023,mask));assert.equal(world.overlap(v(),.023,mask===1?2:1),null);world.free();
}
const shell=make([prism({convex:false})]);assert.equal(shell.overlap(v(),.023),null,'Ordinary surface meshes do not acquire invented interiors');shell.free();
const solid=make([prism({position:v(0,1.5,0),half:v(2,2,2)})]),walker=new Walker(solid,v());
assert.equal(walker.release(0,0),null,'A hand deep inside a solid cannot release a ball');solid.free();

// Outside faces, edges and corners must still agree with an analytic solid box,
// including a rotated casing at station-scale coordinates.
let seed=1024;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(const position of [v(),v(-147.3,49.1937,-23.8)]){
 const half=v(.6,.3,.2),rotation=new Quaternion().setFromAxisAngle(new Vector3(1,2,3).normalize(),.7),mesh=make([prism({position,half,rotation})]),box=make([{id:'casing',material:'steel',kind:'box',position,half,rotation,mask:3}]);
 for(let i=0;i<300;i++){
  const axis=new Vector3(random()-.5,random()-.5,random()-.5).normalize(),start=axis.clone().multiplyScalar(2).add(position),delta=axis.clone().multiplyScalar(-3),a=mesh.sweep(start,delta,.023),b=box.sweep(start,delta,.023);
  assert.ok(a&&b);near(a.distance,b.distance,5e-5);
  for(const key of ['x','y','z']){near(a.point[key],b.point[key],5e-5);near(a.normal[key],b.normal[key],.001);}
 }
 mesh.free();box.free();
}
console.log('PASS convex solids: deep/shallow overlap, outward correction, masks, release rejection, ordinary shells and 600 exterior face/edge/corner casts');
