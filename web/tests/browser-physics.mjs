import assert from 'node:assert/strict';
import {Vector3,Triangle} from 'three';
import {StaticWorld} from '../public/physics/static-world.js';
import {Ball,resolveContact,STEP} from '../public/physics/ball.js';
import {Walker} from '../public/physics/walker.js';
import {ballProfile} from '../public/physics/materials.js';
import {v,length,identity} from '../public/physics/math.js';
import {boxSweep,triangleSweep,segmentSweep} from '../public/physics/sweeps.js';
import {encodeCollisionPack,decodeCollisionPack} from '../public/physics/collision-pack.js';
import {compileCollision,fallLimitY} from '../../tools/browser-collision.mjs';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} within ${t}`),V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const floor={kind:'box',id:'floor',material:'granite',position:v(0,-.5,0),half:v(1000,.5,1000),rotation:identity(),mask:3};
const world=shapes=>new StaticWorld({shapes,fallLimitY:-10,escalators:[]});

// Analytic face, round edge and round corner distances, including tiny clearances.
const triangle=new Triangle(V(-100,0,-100),V(0,0,100),V(100,0,-100));
for(const x of [0,37]){
 const hit=triangleSweep(V(x,.0232,0),V(0,-.0004,0),.023,triangle);
 near(hit.fraction,.5,1e-10);near(hit.normal.y,1);near(hit.point.y,0);
}
near(boxSweep(V(0,2,0),V(0,-4,0),v(1,1,1),.1).fraction,.225);
const edge=boxSweep(V(1.06,2,0),V(0,-2,0),v(1,1,1),.1);
near(edge.fraction,.46);near(edge.normal.x,.6);near(edge.normal.y,.8);
const corner=boxSweep(V(1.06,2,1.06),V(0,-2,0),v(1,1,1),.1);
near(corner.fraction,(1-Math.sqrt(.01-2*.0036))/2);
assert.equal(boxSweep(V(1.11,2,0),V(0,-2,0),v(1,1,1),.1),null);
near(segmentSweep(V(2,0,0),V(-4,0,0),V(0,-1,0),V(0,1,0),.25),.4375);
near(segmentSweep(V(0,2,0),V(0,-4,0),V(0,-1,0),V(0,1,0),.25),.1875);

const walls=world([floor,{...floor,id:'wall',position:v(0,2,-2),half:v(4,2,.001),mask:1}]);
const impact=walls.sweep(v(0,1,0),v(0,0,-100),ballProfile.radius);
assert.equal(impact.surface.id,'wall');near(impact.point.z,-1.999);near(impact.normal.z,1);
assert.equal(walls.sweep(v(0,1,0),v(0,0,-100),ballProfile.radius,2),null);
const overlap=walls.overlap(v(0,.02,0),.023);near(overlap.depth,.003);near(overlap.point.y,0);
// A waist-height obstruction must hit the capsule between its end hemispheres.
// Sliding follows the wall instead of stopping all horizontal movement.
const walking=world([floor,{...floor,id:'waist-wall',position:v(0,.9,-2),half:v(4,.04,.01)}]);
const bodyHit=walking.capsuleSweep(v(0,.02501,0),v(0,0,-4),.24,1.8,.025);
assert.ok(bodyHit&&bodyHit.fraction<.5);near(bodyHit.normal.z,1);
const walker=new Walker(walking,v(0,.03,0));
for(let i=0;i<360;i++)walker.move({x:.3,z:1},180,false,STEP);
assert.ok(walker.grounded);assert.ok(walker.feet.z>-1.73,'Full body cannot pass through the wall');assert.ok(walker.feet.x<-.6,'Player can slide sideways along the wall');near(walker.feet.y,.025,2e-5);
const angle=Math.PI/4,rotated=world([{...floor,id:'rotated',position:v(12,3,-7),half:v(1,1,1),rotation:{x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)}}]);
const rotatedHit=rotated.sweep(v(12,3,0),v(0,0,-10),.023);assert.equal(rotatedHit.surface.id,'rotated');near(rotatedHit.point.z,-7+Math.SQRT2,1e-5);
const capsule=world([{...floor,kind:'capsule',radius:.1,half:v(.1,1,.1),position:v()}]);
near(capsule.sweep(v(2,0,0),v(-4,0,0),.023).point.x,.1);

// Restitution, Coulomb friction and angular impulse are checked independently.
const normal=v(0,1,0),profile=ballProfile;
const bounce=resolveContact(v(0,-10,0),v(),normal,profile,.7,.3,.12);
near(bounce.velocity.y,7,2e-6);near(length(bounce.spin),0);
const friction=resolveContact(v(100,-2,0),v(),normal,profile,.7,.1,0);
near(friction.normalImpulse,3.4*profile.mass);near(length(friction.tangentImpulse),.1*friction.normalImpulse);
near(friction.velocity.x,99.66,1e-5);near(friction.spin.z,-.34/(profile.inertiaFactor*profile.radius),1e-5);
const separating=resolveContact(v(3,2,0),v(1,2,3),normal,profile,.7,.5,.12);assert.deepEqual(separating.velocity,v(3,2,0));

// Spin alone must keep a shot alive; physical load friction eventually stops it.
const flat=world([floor]),ball=new Ball(flat);ball.launch(v(0,.0232,0),v(),v(0,200,0));
for(let i=0;i<90;i++)ball.step();assert.equal(ball.sleeping,false);assert.ok(length(ball.spin)>100);
for(let i=0;i<1800&&!ball.sleeping;i++)ball.step();assert.equal(ball.sleeping,true);assert.deepEqual(ball.velocity,v());assert.deepEqual(ball.spin,v());
const empty=world([]),falling=new Ball(empty);falling.launch(v(0,100,0),v(),v());
for(let i=0;i<6000;i++)falling.step();assert.equal(falling.sleeping,false,'No timer stops moving flight');
function shot(){const ball=new Ball(flat);ball.launch(v(0,1.525,0),v(0,1,10),v(25,0,0));const positions=[];for(let i=0;i<9000&&!ball.sleeping;i++){ball.step();positions.push({...ball.position,q:{...ball.rotation}});}assert.ok(ball.sleeping);assert.equal(ball.budgetExhaustions,0);return positions;}
assert.deepEqual(shot(),shot(),'Every fixed-step replay pose is repeatable');

// Exported stair treads and walking ramps use different collision masks, while
// retaining real surfaces and exact bounds through the compact format.
const layout={schemaVersion:1,units:'meters',spawn:v(),boxes:[],beams:[],panels:[],escalators:[],flights:[{id:'stairs',material:'stone',baseElevation:0,rise:.2,foundationDepth:0,contours:[0,1,2].map(y=>({points:[{x:-1,y},{x:1,y}]}))}]};
const compiled=compileCollision(layout,'fixture'),encoded=encodeCollisionPack(compiled.metadata,compiled.arrays),decoded=decodeCollisionPack(encoded),stairs=world(decoded.shapes);
assert.equal(decoded.layoutSha256,'fixture');assert.equal(decoded.shapes.length,2);
near(stairs.sweep(v(0,2,.5),v(0,-3,0),.023,1).point.y,.2);
near(stairs.sweep(v(0,2,.5),v(0,-3,0),.023,2).normal.y,1/Math.sqrt(1+.2**2));
const climber=new Walker(stairs,v(0,.15,.25));for(let i=0;i<130;i++)climber.move({x:0,z:1},0,false,STEP);
assert.ok(climber.feet.z>1.1);assert.ok(climber.feet.y>.24,'Capsule follows the walking ramp above the real stair treads');
const parked={...climber.feet};for(let i=0;i<180;i++)climber.move({x:0,z:0},0,false,STEP);
near(climber.feet.z,parked.z,1e-5);
near(fallLimitY({...layout,escalators:[{lowerCenter:v(0,-3,0),path:[v(0,-2,0)]}]}),-11);
assert.throws(()=>decodeCollisionPack(encoded.slice(0,17)),/Truncated/);
const corrupt=encoded.slice();new DataView(corrupt.buffer).setUint32(12,0xfffffff0,true);assert.throws(()=>decodeCollisionPack(corrupt),/Truncated/);
const bad=structuredClone(compiled.metadata);bad.shapes[0].vertices.offset=-4;assert.throws(()=>decodeCollisionPack(encodeCollisionPack(bad,compiled.arrays)),/Invalid/);
for(const w of [walls,walking,rotated,capsule,flat,empty,stairs])w.free();
console.log('PASS browser physics: analytic contacts, masks, stairs, impulse model, spin settling, no timeout finish, deterministic poses and collision pack validation');
