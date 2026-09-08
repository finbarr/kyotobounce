// Compare the exported visual's actual transformed triangles with native proposal.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Vector3} from 'three';
const dir='.local/station-detail/candidate',raw=await readFile(`${dir}/east-square.glb`);
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');gltf.scene.updateMatrixWorld(true);
const proposal=JSON.parse(await readFile(`${dir}/collision-proposal.json`));
const key=p=>[p.x,p.y,p.z].map(n=>Math.round(n*1000000)).join(',');
const tri=(a,b,c)=>[key(a),key(b),key(c)].sort().join('|');
const checks=[];
for(const panel of proposal.panels){
 const obj=gltf.scene.getObjectByName(panel.id);assert.ok(obj?.isMesh,panel.id);const g=obj.geometry,pos=g.attributes.position,index=g.index;
 const buckets=new Map();for(const v of panel.vertices){const k=[v.x,v.y,v.z].map(n=>Math.floor(n*1000)).join(',');if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(v);}
 let maxError=0;function snap(p){const b=[p.x,p.y,p.z].map(n=>Math.floor(n*1000));let best,d=Infinity;for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const v of buckets.get([b[0]+x,b[1]+y,b[2]+z].join(','))||[]){const e=Math.hypot(v.x-p.x,v.y-p.y,v.z-p.z);if(e<d){d=e;best=v;}}assert.ok(d<.000002,`${panel.id} visual/native error ${d}`);maxError=Math.max(maxError,d);return best;}
 const actual=[];for(let i=0;i<(index?.count??pos.count);i+=3){const pts=[];for(let j=0;j<3;j++){const v=new Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(obj.matrixWorld);pts.push(snap({x:v.x,y:v.y,z:-v.z}));}actual.push(tri(...pts));}
 const expected=[];for(let i=0;i<panel.triangles.length;i+=3)expected.push(tri(...panel.triangles.slice(i,i+3).map(j=>panel.vertices[j])));
 assert.deepEqual(actual.sort(),expected.sort(),panel.id);checks.push({id:panel.id,matchedTriangles:actual.length,maxVertexErrorM:maxError});
}
const geo=JSON.parse(await readFile(`${dir}/geometry.json`));assert.ok(geo.triangles<=45000);assert.equal(geo.newTextureBytes,0);
const jsonLength=raw.readUInt32LE(12),document=JSON.parse(raw.subarray(20,20+jsonLength).toString());assert.equal(document.textures?.length??0,0);
const hash=createHash('sha256').update(raw).digest('hex');
await writeFile('artifacts/station-detail/east-square/geometry-parity.json',JSON.stringify({status:'pass',glbSha256:hash,checks,triangles:geo.triangles,visualBytes:raw.length,newTextures:0},null,2));
console.log('PASS exact transformed GLB/native triangles for',checks.length,'substantial meshes');
