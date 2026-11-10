import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Scene,Matrix4,Vector3} from 'three';
import {createEscalators} from '../public/escalators.js';
import {MovingEscalator} from '../public/physics/motion.js';
import {StaticWorld} from '../public/physics/static-world.js';
import {Ball,STEP} from '../public/physics/ball.js';
import {Walker} from '../public/physics/walker.js';
import {v,length,identity} from '../public/physics/math.js';
import {compileCollision} from '../../tools/browser-collision.mjs';
import {encodeCollisionPack,decodeCollisionPack} from '../public/physics/collision-pack.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const spec={id:'moving-test',lowerCenter:v(),uphill:v(0,0,1),width:2,stepHeight:.24,stepCount:24,speed:.5,phase:0,run:4,flatLength:0,publicPointCount:5,path:[v(),v(0,.5,1),v(0,1,2),v(0,1.5,3),v(0,2,4),v(0,1,4),v(0,-1,0),v()]};
const layout={schemaVersion:1,units:'meters',spawn:v(),boxes:[],panels:[],beams:[],flights:[],escalators:[spec]};
const compiled=compileCollision(layout,'motion-fixture'),pack=decodeCollisionPack(encodeCollisionPack(compiled.metadata,compiled.arrays)),world=new StaticWorld(pack),lane=world.motion.lanes[0];

// Exact piecewise rail position/velocity at turns, including reverse and wrap.
for(const speed of [.5,-.5,0]){
 const rail=new MovingEscalator({...spec,speed});
 for(const t of [0,.1,1,10,10000])for(const step of [0,1,23]){
  const pose=rail.pose(step,t);assert.ok(pose.nextBoundary>0);near(pose.velocity.length(),Math.abs(speed),1e-7);
  const advance=Math.min(.001,pose.nextBoundary*.5),later=rail.pose(step,t+advance);
  near(later.center.distanceTo(pose.center.clone().addScaledVector(pose.velocity,advance)),0,1e-9);
 }
 if(speed){
  const t=rail.distance[1]/Math.abs(speed),a=rail.pose(0,t-1e-6),b=rail.pose(0,t+1e-6);
  assert.ok(a.center.distanceTo(b.center)<.000002,'No teleport at path boundary');
 }
}

// For a stationary sphere above a climbing step, time to contact is determined
// solely by tread ascent. Frozen support and dynamic contact are distinct.
const pose=lane.pose(3,0),radius=.023,p=pose.center.clone();p.y+=lane.half.y+radius+.001;
const hit=lane.sweep(p,v(),radius,0,STEP);
assert.ok(hit);near(hit.time,.001/pose.velocity.y,1e-7);near(hit.normal.y,1);assert.equal(hit.surface.id,spec.id);
const frozen=lane.sweep(p,v(0,-.01,0),radius,0,1,{freeze:true});near(frozen.time,.1,1e-6);
const sleeper=new Ball(world);sleeper.launch(p,v(),v());sleeper.sleeping=true;sleeper.step();
assert.equal(sleeper.sleeping,false,'An incoming tread wakes a sleeping ball');assert.ok(sleeper.velocity.y>0);assert.ok(sleeper.contacts.some(c=>c.surface===spec.id));
const rider=new Ball(world);rider.launch(p,v(),v());
let supported=0;for(let i=0;i<180;i++){rider.step();if(rider.supported)supported++;assert.equal(rider.sleeping,false,'A carried ball cannot become a settled result');}
assert.ok(supported>10,'Moving support applies contact friction');

// Bucket selection is only a broadphase: exhaustive sweeps must give exactly
// the same earliest face/edge contact, even across multiple rail boundaries.
let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(const speed of [.5,-.5]){
 const rail=new MovingEscalator({...spec,speed});
 for(let i=0;i<250;i++){
  const origin=v((random()-.5)*3,random()*4-1,random()*6-1),delta=v((random()-.5)*2,(random()-.5)*3,(random()-.5)*4),time=random()*100,duration=.001+random()*3;
  assert.deepEqual(rail.sweep(origin,delta,.023,time,duration),rail.sweep(origin,delta,.023,time,duration,{exhaustive:true}));
 }
}

// Walkers use the smooth public deck, get carried while idle, and can walk
// against the belt. Neither the hidden return chain nor nearby floor carries.
const walker=new Walker(world,v(0,.52501,1));
for(let i=0;i<180;i++)walker.move({x:0,z:0},0,false,STEP);
assert.ok(walker.grounded);assert.ok(walker.feet.z>1.4);assert.ok(walker.feet.y>.72);
const carried=walker.feet.z;
for(let i=0;i<90;i++)walker.move({x:0,z:-1},0,false,STEP);
assert.ok(walker.feet.z<carried-.4);assert.equal(lane.walkingVelocity(v(2,1,2)),null);assert.equal(lane.walkingVelocity(v(0,-1,2)),null);
const rotated=new MovingEscalator({...spec,lowerCenter:v(10,0,20),uphill:v(1,0,0)});
const carry=rotated.walkingVelocity(v(12,1.025,20));assert.ok(carry.x>.4);near(carry.z,0);

const floor={kind:'box',id:'fixed',material:'granite',position:v(10,-.5,0),half:v(1,.5,1),rotation:identity(),mask:3};
const fixed=new StaticWorld({shapes:[floor],escalators:[spec],fallLimitY:-10});
const parked=new Ball(fixed);parked.launch(v(10,.0232,0),v(),v());for(let i=0;i<300;i++)parked.step();
assert.equal(parked.sleeping,true);assert.equal(length(parked.velocity)+length(parked.spin),0);
const resting={...parked.position};for(let i=0;i<360;i++)parked.step();assert.deepEqual(parked.position,resting,'Nearby moving machinery must not wake a ball without contact');
world.free();fixed.free();
console.log('PASS browser escalators: path turns, reverse/wrap, exact swept treads, wake-up, moving support, exhaustive broadphase and walking carry');

if(process.argv.includes('--station')){
 const station=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),scene=new Scene();
 const render=createEscalators(scene,station.escalators);let tops=0,maxError=0;const carry=[];
 for(const time of [0,.123,7.5,333.333,10000]){
  render(time);scene.updateMatrixWorld(true);
  for(let i=0;i<scene.children.length;i++){
   const mesh=scene.children[i].children[0],lane=station.motion.lanes[i];
   for(let step=0;step<mesh.count;step+=7){
    const matrix=new Matrix4();mesh.getMatrixAt(step,matrix);
    const top=new Vector3(0,.5,0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);top.z=-top.z;
    const hit=lane.sweep({x:top.x,y:top.y+.001,z:top.z},v(0,-.002,0),.0001,time,1,{freeze:true});
    assert.ok(hit,`${lane.spec.id}: visible tread has collision at ${time}`);
    const error=Math.abs(hit.point.y-top.y);assert.ok(error<.00003,`${lane.spec.id}: rendered top mismatch ${error}`);maxError=Math.max(error,maxError);tops++;
   }
  }
 }
 for(const lane of station.motion.lanes){
  const point=lane.points[Math.floor((lane.spec.publicPointCount-1)/2)].clone().applyQuaternion(lane.rotation).add(lane.position);point.y+=.09;
  const walker=new Walker(station,point);
  for(let i=0;i<20;i++)walker.move({x:0,z:0},0,false,STEP);
  const before={...walker.feet};for(let i=0;i<180;i++)walker.move({x:0,z:0},0,false,STEP);
  const distance=Math.hypot(walker.feet.x-before.x,walker.feet.y-before.y,walker.feet.z-before.z);
  assert.ok(walker.grounded&&distance>.40&&distance<.60,`${lane.spec.id}: carried ${distance} m, grounded ${walker.grounded}`);
  carry.push({id:lane.spec.id,distance});
 }
 const receipt={lanes:station.escalators.length,visibleTops:tops,maxTopErrorMeters:maxError,carry};
 await writeFile('.local/browser-physics/motion-proof.json',JSON.stringify(receipt,null,2)+'\n');station.free();
 console.log(`PASS ${receipt.lanes} station escalators: ${tops} rendered tread/collision comparisons (max ${maxError} m), grounded walking carry in both directions`);
}
