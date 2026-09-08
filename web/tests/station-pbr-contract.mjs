import assert from 'node:assert/strict';
import {readFile,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {stationMaterialFamily,createStationTextures,applyStationMaterial,generateStationGrain} from '../public/station-materials.js';
import {createStationReflections,STATION_PROBES} from '../public/station-lighting.js';
import {createStationLightPool} from '../public/station-look.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const renderer={capabilities:{getMaxAnisotropy:()=>16}},textures=createStationTextures(renderer);
assert.equal(textures.stoneColor.colorSpace,THREE.SRGBColorSpace);
assert.equal(textures.stoneSurface.colorSpace,THREE.NoColorSpace);
assert.equal(textures.steelSurface.colorSpace,THREE.NoColorSpace);
for(const t of textures.textures){assert.equal(t.generateMipmaps,true);assert.equal(t.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(t.anisotropy,8);}
assert.equal(hash(generateStationGrain().albedo),hash(textures.stoneColor.image.data),'deterministic original source');
assert.equal(STATION_PROBES.length,3);
const scene=new THREE.Scene(),reflections=createStationReflections(renderer,scene,new Set());
const audits=[];
for(const path of ['web/public/assets/atrium.glb','web/public/assets/atrium-detail.glb',...Object.values(JSON.parse(await readFile('web/layout-assets.json')).layouts).flatMap(l=>['atrium','detail'].map(k=>'web/public'+l.assets[k].url))]){
 const file=await open(path);const header=Buffer.alloc(20);await file.read(header,0,20,0);const bytes=Buffer.alloc(header.readUInt32LE(12));await file.read(bytes,0,bytes.length,20);await file.close();
 const data=JSON.parse(bytes.toString()),mapped=[];
 for(const original of data.materials){
  const family=stationMaterialFamily(original.name);if(!family)continue;
  const material=new THREE.MeshStandardMaterial({name:original.name,map:new THREE.Texture(),normalMap:new THREE.Texture()});
  const map=material.map,normal=material.normalMap;applyStationMaterial(material,family,textures,reflections);
  assert.equal(material.map,map,'original color/nosing retained');assert.equal(material.normalMap,normal,'original normal retained');
  assert.equal(material.metalness,family==='stainless'?1:0);
  if(['guard','facade'].includes(family)){assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);assert.equal(material.forceSinglePass,true);assert.equal(material.transmission,undefined);}
  mapped.push({name:original.name,family});
 }
 assert(mapped.length>(path.includes('detail')?1:15));audits.push({path,mapped});
}
for(const name of ['Garden guard glazing','Shop window glazing','Glass - placeholder'])assert.equal(stationMaterialFamily(name),'guard');
assert.equal(stationMaterialFamily('Brushed stainless hardware'),'stainless');
for(const name of ['Fleet tactile yellow','Atrium | wayfinding white lettering','Orange sign band','Daytime stair lens'])assert.equal(stationMaterialFamily(name),null);
const old=execFileSync('git',['show','4ee2976:web/public/station-look.js'],{encoding:'utf8'}),candidate=await readFile('web/public/station-look.js','utf8');
for(const [begin,end] of [['const architecturalShadow=','// Fit once'],['export function fitStationShadowCamera','// Architectural finish layer.'],['export function createStationLightPool','export function dressStation'],['export function contactShadow',null]]){
 const original=old.slice(old.indexOf(begin),end?old.indexOf(end):undefined).trim();
 if(begin==='export function fitStationShadowCamera')assert(candidate.includes(original));else assert.equal(candidate.slice(candidate.indexOf(begin),end?candidate.indexOf(end):undefined).trim(),original,'accepted shadow/contact/pool implementation retained');
}
// Existing pool must never relocate a light with nonzero intensity.
const pool=createStationLightPool(scene,[{id:'a',position:{x:0,y:3,z:0},direction:{x:0,y:-1,z:0},range:8,intensity:20},{id:'b',position:{x:40,y:3,z:0},direction:{x:0,y:-1,z:0},range:8,intensity:20}]);
for(let i=0;i<120;i++){const before=pool.lights.map(l=>l.position.clone());pool.update(new THREE.Vector3(i<60?0:40,0,0),i/60);pool.lights.forEach((l,j)=>{if(!l.position.equals(before[j]))assert.equal(l.intensity,0);});}
const registry=JSON.parse(await readFile('web/layout-assets.json','utf8'));
for(const bundle of Object.values(registry.layouts))for(const asset of Object.values(bundle.assets)){
  const bytes=await readFile('web/public'+asset.url);assert.equal(bytes.length,asset.bytes);assert.equal(hash(bytes),asset.sha256,`${asset.url} immutable`);
}
assert.equal(hash(await readFile('runtime/station-layout.json')),JSON.parse(await readFile('web/public/assets/station.json','utf8')).layoutSha256,'current browser/native layout identity');
textures.dispose();reflections.dispose();
await (await import('node:fs/promises')).writeFile('artifacts/station-detail/photorealism/material-audit.json',JSON.stringify({audits,generatedTextureBytes:textures.bytesWithMipmaps,archives:'all six byte-identical'},null,2));
console.log('PASS current/historical family mapping, original map preservation, physical data textures, fixed shadows and light pool, archived/current geometry bytes');
