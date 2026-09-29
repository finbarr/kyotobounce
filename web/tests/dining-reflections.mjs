import assert from'node:assert/strict';
import * as THREE from'three';
import {usesDiningReflection,applyStationMaterial} from'../public/station-materials.js';
import {createStationReflections} from'../public/station-lighting.js';
for(const name of['Daruma | brushed steel','Daruma kitchen | brushed stainless','Daruma wall | Kyoto historical prints','Daruma ceiling | warm white plaster'])assert(usesDiningReflection(name));
for(const name of['Kotetsu | brushed steel','Registered West restaurant | dark stone floor | Browser','Daruma exterior unrelated'])assert(!usesDiningReflection(name));
// Metalwork using a local environment must not have the hall sampler injected.
const textures={steelSurface:new THREE.Texture(),stoneSurface:new THREE.Texture(),stoneColor:new THREE.Texture()};
for(const[ name,expected ]of[['Daruma | brushed steel',0],['Daruma kitchen | brushed stainless',0],['Registered courtyard | niwa-service-steel | Browser',0],['Steel - atrium',1]]){
 let patches=0;const material=new THREE.MeshStandardMaterial();material.name=name;
 applyStationMaterial(material,'stainless',textures,{uniforms:{},patch(){patches++;}});
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);assert.equal(patches,expected,name);
}
const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial();material.name='Daruma ceiling | warm white plaster';
const base=createStationReflections(null,scene,new Set()),dining=createStationReflections(null,scene,new Set(),{diningMaterials:[material]});
assert.equal(dining.stats.zones.length,base.stats.zones.length+1);assert.equal(dining.stats.zones.at(-1).name,'daruma-dining');assert.equal(dining.stats.captures,0);assert.equal(scene.children.length,0,'Planning a local capture adds no realtime lights');dining.dispose();base.dispose();
console.log('PASS dining material scope, local stainless sampler, optional single probe and no realtime light allocation');
const {createDiningCaptureLighting}=await import('../public/station-lighting.js');
const fixture={id:'restaurant-practical-daruma-pendant-lens--0.8',position:{x:2,y:3,z:4},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.83,b:.62},intensity:3.3,range:7,spotAngle:100,innerSpotAngle:50};
const lighting=createDiningCaptureLighting([fixture,{...fixture,id:'restaurant-practical-daruma-front-light-lens-0.4'},{...fixture,id:'hall'}]);
const lamps=lighting.children.filter(o=>o.isLight);assert.equal(lamps.length,1);assert.equal(lamps[0].castShadow,false);assert.deepEqual(lamps[0].position.toArray(),[2,2.92,-4]);assert.deepEqual(lamps[0].target.position.toArray(),[2,1.92,-4]);assert.equal(lamps[0].intensity,26.4);assert.equal(lamps[0].distance,7);assert.deepEqual(lamps[0].color.toArray(),[1,.83,.62]);lamps.forEach(l=>l.dispose());
console.log('PASS fixed authored capture sources, native coordinate conversion, intensity/cones and exclusion of corridor fixtures');
