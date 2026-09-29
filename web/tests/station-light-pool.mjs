import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStationLightPool} from '../public/station-look.js';
const down={x:0,y:-1,z:0},warm={r:1,g:.83,b:.62,a:1};
const fixtures=[
 {id:'hall',position:{x:0,y:3,z:0},direction:down,range:8,intensity:20},
 {id:'unselected-upper',position:{x:0,y:48,z:0},direction:down,range:8,intensity:20},
 ...[0,1,2].map(i=>({id:'restaurant-practical-'+i,position:{x:i*6,y:48,z:0},direction:down,range:7,intensity:22,spotAngle:85,innerSpotAngle:45,linearColor:warm}))
];
const scene=new THREE.Scene(),pool=createStationLightPool(scene,fixtures),lights=[...pool.lights];let time=0;
function advance(position,frames=90){for(let i=0;i<frames;i++){
 const before=lights.map(l=>l.position.clone());pool.update(new THREE.Vector3(...position),time);time+=1/60;
 assert.equal(pool.lights.length,2);assert.equal(scene.children.filter(o=>o.isSpotLight).length,2);
 lights.forEach((l,j)=>{assert.equal(l.castShadow,false);assert(l.intensity>=0&&l.intensity<=180);if(!l.position.equals(before[j]))assert.equal(l.intensity,0,'Relocate only after fading out');});
}}
advance([0,46,0]);assert(pool.stats.activeFixtures.some(f=>f.id==='restaurant-practical-0'&&f.intensity>0));assert(!pool.stats.activeFixtures.some(f=>f.id==='unselected-upper'));
for(const light of lights.filter(l=>l.intensity>0)){assert.equal(light.distance,7);assert(Math.abs(light.angle-THREE.MathUtils.degToRad(42.5))<1e-9);assert(Math.abs(light.penumbra-(1-45/85))<1e-9);assert.deepEqual(light.color.toArray(),[1,.83,.62]);}
advance([0,46,-9]);assert(pool.stats.activeFixtures.some(f=>f.id==='restaurant-practical-0'&&f.intensity>0),'Light remains visible on approach beyond the cone range');
advance([12,46,0]);assert(pool.stats.activeFixtures.some(f=>f.id==='restaurant-practical-2'&&f.intensity>0));
advance([0,1,0]);assert(pool.stats.activeFixtures.some(f=>f.id==='hall'&&f.intensity>0));const hall=lights.find(l=>l.intensity>0);assert.equal(hall.angle,Math.PI/3);assert.equal(hall.distance,13);assert.deepEqual(hall.color.toArray(),new THREE.Color(0xffdab0).toArray());
time=0;advance([12,46,0]);assert.equal(pool.stats.clockResets,1);assert(pool.stats.activeFixtures.some(f=>f.id==='restaurant-practical-2'&&f.intensity>0));
advance([100,46,0]);assert(lights.every(l=>l.intensity===0));assert.deepEqual(pool.lights,lights);
console.log('PASS two fixed shadowless lights, upper restaurant selection, authored cones/color/range, fade-before-relocation, hall restoration and clock rollback');
