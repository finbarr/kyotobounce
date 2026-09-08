import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
const source=await readFile(new URL('../public/game.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf("  if(inFlight&&!manualCamera&&phase==='Flight'"),source.indexOf('  camera=inFlight?ballCamera:aimCamera;'));
const step=new Function('THREE','snapshot','azimuth','elevation','dt','manualCamera','phase',`const inFlight=true,toThree=v=>new THREE.Vector3(v.x,v.y,-v.z);${body};return {azimuth,elevation};`);
const run=(v,a=0,e=0,dt=1/60,manual=false,phase='Flight')=>step(THREE,{velocity:v},a,e,dt,manual,phase);
for(const dt of [1/120,1/60,.1]){
 for(const v of [{x:0,y:20,z:-10},{x:0,y:-20,z:10},{x:30,y:0,z:0}]){
  const s=run(v,0,0,dt);assert(Math.abs(s.azimuth)<=1.2*dt+1e-10);assert(Math.abs(s.elevation)<=.8*dt+1e-10);
 }
}
assert.deepEqual(run({x:.1,y:.1,z:.1},.8,-.4),{azimuth:.8,elevation:-.4});
assert.equal(run({x:0,y:20,z:0},.8).azimuth,.8);
assert.deepEqual(run({x:20,y:20,z:20},.8,-.4,.1,true),{azimuth:.8,elevation:-.4});
assert.deepEqual(run({x:20,y:20,z:20},.8,-.4,.1,false,'Result'),{azimuth:.8,elevation:-.4});
const seam=run({x:-.01,y:0,z:-10},-Math.PI+.001);assert(Math.abs(seam.azimuth-(-Math.PI+.001))<.01);
let s={azimuth:0,elevation:0};for(let i=0;i<600;i++)s=run({x:0,y:100,z:0},s.azimuth,s.elevation);assert(s.elevation>=-.95&&s.elevation<-.94);
console.log('PASS flight angular bounds, reversal, yaw seam, vertical/near-rest stability, manual and result hold');
