import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {BallRotationBuffer,rotationSpeed,spinMarkOpacity} from '../public/ball-rotation.js';
const axis=new Vector3(.2,.9,-.1).normalize(),out=new Quaternion();
const pose=(t,angle)=>{const q=new Quaternion().setFromAxisAngle(axis,angle);return {t,q:{x:q.x,y:q.y,z:q.z,w:q.w}};};
const expected=angle=>{const q=new Quaternion().setFromAxisAngle(axis,angle);return new Quaternion(-q.x,-q.y,q.z,q.w);};
for(const speed of [-200,-150,-95,-85,85,95,150,200]){
 const buffer=new BallRotationBuffer();
 const samples=Array.from({length:181},(_,i)=>pose(i/180,speed*i/180));
 // Irregular 30 Hz delivery plus a 100 ms network gap. Every native subframe survives.
 for(let i=0;i<samples.length;i+=6)buffer.add({phase:'Flight',releaseTime:100,rotationSamples:samples.slice(i,i+6)});
 for(let t=.001;t<.99;t+=.0047){assert.equal(buffer.sample(100+t,out),true);assert.ok(out.angleTo(expected(speed*t))<1e-6,`Incorrect direction/turn count at ${speed} rad/s`);}
}
const decaying=new BallRotationBuffer(),w=150,decel=26,angle=t=>w*t-.5*decel*t*t;
decaying.add({phase:'Flight',releaseTime:0,rotationSamples:Array.from({length:901},(_,i)=>pose(i/180,angle(i/180)))});
for(let t=3.02;t<4.99;t+=.017){decaying.sample(t,out);assert.ok(out.angleTo(expected(angle(t)))<.0002,'Deceleration must retain the accumulated turns');}
const collision=new BallRotationBuffer();
const angleAfter=t=>t<=.02?150*t:3-80*(t-.02);
collision.add({phase:'Flight',releaseTime:0,rotationSamples:[0,.01,.02,.03,.04].map(t=>pose(t,angleAfter(t)))});
for(const t of [.005,.015,.025,.035]){collision.sample(t,out);assert.ok(out.angleTo(expected(angleAfter(t)))<1e-6,'A real impact reversal must be preserved');}
collision.add({phase:'Aim'});assert.equal(collision.sample(.01,out),false,'Recall clears the previous throw');
assert.equal(spinMarkOpacity(0,1/30),1);assert.equal(spinMarkOpacity(200,1/30),0);assert.ok(spinMarkOpacity(40,1/30)<spinMarkOpacity(40,1/120),'Low frame rates need more seam blur');
assert.ok(Math.abs(rotationSpeed(pose(0,0).q,pose(1/180,1).q,1/180)-180)<1e-6);
console.log('PASS 180 Hz rotation through full turns, both directions, decay, genuine impact reversals, recall and low-FPS seam aliasing');
