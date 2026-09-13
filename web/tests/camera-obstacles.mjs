import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial,PlaneGeometry,Raycaster,Vector3} from 'three';
import {computeBoundsTree,acceleratedRaycast} from 'three-mesh-bvh';
import {CameraObstacles,easeCameraClearance} from '../public/camera-obstacles.js';

const origin=new Vector3(),back=new Vector3(0,0,3.8);
const wall=(z=1)=>{const mesh=new Mesh(new PlaneGeometry(10,10),new MeshBasicMaterial());mesh.position.z=z;return mesh;};
function obstacles(...meshes){
  const root=new Group();root.add(...meshes);
  root.traverse(mesh=>{if(mesh.isMesh){computeBoundsTree.call(mesh.geometry);mesh.raycast=acceleratedRaycast;}});
  return new CameraObstacles(root);
}
function close(actual,expected,message){assert.ok(Math.abs(actual-expected)<1e-4,`${message}: ${actual} vs ${expected}`);}
const thin=wall(),collision=obstacles(thin);
assert.equal(new Raycaster(origin,back.clone().normalize(),0,3.8).intersectObject(thin).length,0,'Reproduce the old single-sided ray missing a thin wall');
close(collision.clearance(origin,back),.83,'Stop the camera volume before the back of a thin wall');
thin.rotation.y=Math.PI;
close(obstacles(thin).clearance(origin,back),.83,'Both wall sides block the camera');
assert.equal(thin.material.side,0,'Collision never changes rendering materials');
const near=wall(.1);
assert.equal(obstacles(near).clearance(origin,back),0,'A close obstruction beats the old 18cm minimum');
close(obstacles(near).clearance(origin,new Vector3(0,0,-3.8)),3.8,'Escape an initial overlap by moving away');

const edge=new Mesh(new BoxGeometry(1,4,.2),new MeshBasicMaterial());edge.position.set(.6,0,2);
const edgeCollision=obstacles(edge);
assert.equal(new Raycaster(origin,back.clone().normalize(),0,3.8).intersectObject(edge).length,0,'Reproduce a centre ray missing an obstacle edge');
close(edgeCollision.clearance(origin,back),1.9-Math.sqrt(.16**2-.1**2)-.01,'Camera radius catches a grazing edge');
for(let i=-30;i<=30;i++){
  const target=new Vector3(Math.sin(i*.005)*3.8,0,Math.cos(i*.005)*3.8);
  const distance=edgeCollision.clearance(origin,target);
  const camera=target.clone().setLength(distance);
  const box=edgeCollision.meshes[0].bounds;
  assert.ok(box.distanceToPoint(camera)>=.16-1e-5,'A small orbit cannot put the camera inside the obstacle');
}

const transformed=wall();transformed.position.set(3,2,-4);transformed.rotation.set(.2,.6,.1);transformed.scale.set(2,.6,1.5);
const scaledCollision=obstacles(transformed);
const localStart=new Vector3(0,0,-1).applyMatrix4(transformed.matrixWorld),localEnd=new Vector3(0,0,2).applyMatrix4(transformed.matrixWorld);
close(scaledCollision.clearance(localStart,localEnd),1.33,'Nonuniform scale and rotation retain world-space clearance');
close(obstacles(wall(3),wall(.8)).clearance(origin,back),.63,'Nearest obstruction wins regardless of traversal order');
close(obstacles(wall(8)).clearance(origin,back),3.8,'A wall beyond the requested camera has no effect');
assert.equal(collision.clearance(origin,origin),0,'Zero-length camera boom is safe');

const floor=wall(0);floor.rotation.x=-Math.PI/2;
const floorCollision=obstacles(floor),ball=new Vector3(0,.023,0),ballView=new Vector3(0,.3,3.8);
close(floorCollision.clearance(ball,ballView,0,.16),ball.distanceTo(ballView),'A ball resting on a floor retains its camera distance');
assert.equal(obstacles(wall(.1)).clearance(origin,back,0,.16),0,'Ball camera also respects very close hits');
assert.equal(easeCameraClearance(3.8,.3,1/60),.3,'Camera retracts in the current frame');
const eased=easeCameraClearance(.3,3.8,1/60);assert.ok(eased>.3&&eased<3.8,'Camera returns smoothly after an obstacle clears');
console.log('PASS camera wall sides, close hits, corners, orbit sweep, transformed meshes, nearest contact, floor-bound ball and collision easing');
