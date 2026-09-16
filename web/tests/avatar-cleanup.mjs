import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatar,disposeAvatar} from '../public/avatar.js';
const bytes=await readFile(new URL('../public/assets/ori.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let sharedDisposed=0;asset.scene.traverse(o=>{if(o.isMesh){o.geometry.addEventListener('dispose',()=>sharedDisposed++);o.material.addEventListener('dispose',()=>sharedDisposed++);}});
for(const character of ['ori','koma','don']){
 const a=createAvatar(asset,{character}),scene=new THREE.Scene();scene.add(a.group);
 let released=0;const owned=new Set([...a.trim.map(m=>m.geometry),...a.trimMaterials]);
 a.model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.computeBoneTexture();owned.add(o.skeleton.boneTexture);}});
 for(const resource of owned)resource.addEventListener('dispose',()=>released++);
 disposeAvatar(a);assert.equal(a.group.parent,null);assert.equal(released,owned.size,'All avatar-owned geometry, palette and bone textures are disposed');
 assert.equal(sharedDisposed,0,'Other avatars still need the shared source mesh and materials');
}
console.log('PASS robot retirement releases owned GPU resources and preserves shared source assets for all characters');
