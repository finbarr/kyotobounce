import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene,PerspectiveCamera,Matrix4,Vector3} from 'three';
import {createEscalators} from '../public/escalators.js';
// Portable regression data keeps npm test independent of the optional art pack.
// --station repeats the same assertions against the installed production lanes.
const station=process.argv.includes('--station');
const specs=station?JSON.parse(await readFile('web/public/assets/station.json')).escalators:Array.from({length:20},(_,i)=>{
 const run=8+i,height=4+i*.3,angle=i*Math.PI/4;
 const path=[[0,0,-.9],[0,0,-.35],[0,.1,.35],[0,height-.1,run-.35],[0,height,run+.35],[0,height,run+.9],[0,height-1,run+.9],[0,-1,-.9],[0,0,-.9]].map(([x,y,z])=>({x,y,z}));
 return {id:`test-lane-${i}`,lowerCenter:{x:i%5*35,y:i%3*3,z:Math.floor(i/5)*20},uphill:{x:Math.sin(angle),y:0,z:Math.cos(angle)},run,height,width:.8+i*.02,flatLength:.9,stepHeight:.24,stepCount:60+i*2,speed:i%2?-.5:.5,phase:i/20,publicPointCount:6,path};
});
const supports=station?JSON.parse(await readFile('web/public/assets/atrium-detail.json')).combSupports:specs.flatMap(s=>[{support:s.id+'-lower-comb-transfer',along:-.9,length:.42},{support:s.id+'-upper-comb-transfer',along:s.run+.9,length:.42}]);
const baselineScene=new Scene(),candidateScene=new Scene();
const baseline=createEscalators(baselineScene,specs,supports),candidate=createEscalators(candidateScene,specs,supports);
const camera=new PerspectiveCamera(110,1,.01,2000);
baseline(0);candidate(0);
camera.position.set(10000,10000,10000);camera.lookAt(10001,10000,10000);candidate(200,camera);
assert.equal(candidate.stats.updated,0);assert.equal(candidate.stats.skipped,specs.length);
for(const time of [1,10000,2.5,-10,333.333]){
 baseline(time);
 for(let lane=0;lane<specs.length;lane++){
  const original=baselineScene.children[lane].children[0],actual=candidateScene.children[lane].children[0];
  actual.updateWorldMatrix(true,false);
  const center=actual.boundingBox.getCenter(new Vector3()).applyMatrix4(actual.matrixWorld);
  camera.position.copy(center).add(new Vector3(0,35,35));camera.lookAt(center);candidate(time,camera);
  assert.ok(original.count>0,'Fixture draws exposed treads');
  assert.equal(actual.count,original.count);
  assert.deepEqual(actual.instanceMatrix.array,original.instanceMatrix.array,`Lane ${lane} resumes absolute phase at ${time}`);
  assert.deepEqual(actual.geometry.attributes.treadSize.array,original.geometry.attributes.treadSize.array);
  // Conservative visibility bounds contain every drawn tread at sampled phases.
  for(let i=0;i<actual.count;i++){
   const values=actual.instanceMatrix.array.subarray(i*16,i*16+16);
   const transform=new Matrix4().fromArray(values);
   for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
    const p=new Vector3(x,y,z).applyMatrix4(transform);
    assert.ok(actual.boundingBox.containsPoint(p),`Lane ${lane} encloses each tread corner`);
   }
  }
 }
}
assert.ok(specs.some(s=>s.speed<0),'Fixture covers both lane directions');
console.log(`PASS ${specs.length} ${station?'station':'portable'} escalator lanes: culling, camera return, large skips, rewind, reverse speed and conservative bounds`);
