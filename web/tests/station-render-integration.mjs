// Authored additions retain their color, maps and emission through station dressing.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {dressStation} from '../public/station-look.js';
import {stationMaterialFamily} from '../public/station-materials.js';
import {addStationDetails,hasStationWayfinding} from '../public/station-details.js';
const names=['k025-Warm ivory tile | Browser','k025-warm opal downlight | Browser','K027 pale limestone | Browser','K027 lamp lens | Browser','k028-polished granite | Browser','k029-red | Browser','k029-glass | Browser'];
if(process.env.KYOTO_RENDER_MATERIALS)for(const m of JSON.parse(await readFile(process.env.KYOTO_RENDER_MATERIALS)))names.push(m.label+' | Browser');
// Optionally audit every real combined-export material, not just collision-prone names.
if(process.env.KYOTO_RENDER_GLB){const bytes=await readFile(process.env.KYOTO_RENDER_GLB);const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));for(const m of json.materials||[])if(/^k02[5789][- ]/i.test(m.name))names.push(m.name);}
const scene=new THREE.Scene(),station=new THREE.Group(),sun=new THREE.DirectionalLight();scene.add(station,sun,new THREE.HemisphereLight());
const snapshot=m=>({color:m.color.toArray(),emissive:m.emissive.toArray(),emissiveIntensity:m.emissiveIntensity,roughness:m.roughness,metalness:m.metalness,opacity:m.opacity,map:m.map,onBeforeCompile:m.onBeforeCompile});
const materials=[...new Set(names)].map(name=>{assert.equal(stationMaterialFamily(name),null,name);const m=new THREE.MeshStandardMaterial({name,color:0xdb572b,emissive:0x173957,emissiveIntensity:.37,roughness:.31,metalness:.42,opacity:.72,map:new THREE.Texture()});station.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m));return[m,snapshot(m)];});
const renderer={toneMappingExposure:1,shadowMap:{},capabilities:{getMaxAnisotropy:()=>8}};
const look=dressStation(renderer,scene,sun,station,{authoredLights:[]});
for(const[m,before]of materials)assert.deepEqual(snapshot(m),before,m.name);
for(const hash of ['650fed69aa6ab63af523f8f8aa8819858672ffd3994a1be6c2e9ea1aaa7731d2','unknown']){const result=addStationDetails(new THREE.Scene(),{sourceLayoutSha256:hash});assert.equal(result.group.children.length,0);assert.equal(result.stats.signFaces,0);}
assert.equal(stationMaterialFamily('Atrium | honed granite floor | Browser'),'floor');
assert.equal(stationMaterialFamily('Garden guard glazing | Browser'),'guard');
look.dispose?.();
console.log(`PASS ${materials.length} authored material names preserve color/emission/maps; retained station families and unregistered-layout exclusion`);

for(const hash of ['485daa6d8189436f526f6f89e7b82818ff3171de92f45ac40bf65da5e2419b2d','7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775'])assert.equal(hasStationWayfinding(hash),true);
