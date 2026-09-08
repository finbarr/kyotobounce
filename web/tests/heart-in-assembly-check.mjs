import assert from 'node:assert/strict';import{readFile,writeFile,open}from'node:fs/promises';import{createHash}from'node:crypto';
const root='.local/station-detail/candidate',bytes=await readFile(`${root}/station-layout.json`),candidate=JSON.parse(bytes),base=JSON.parse(await readFile('runtime/station-layout.json')),layer=JSON.parse(await readFile('.local/station-detail/layer/colliders.json'));
const hash=createHash('sha256').update(bytes).digest('hex');
for(const key of ['boxes','beams','panels'])assert.deepEqual(candidate[key].filter(r=>!r.id.startsWith('konbini-')),base[key].filter(r=>!r.id.startsWith('konbini-')),`${key}: unrelated collision changed`);
assert.deepEqual(candidate.boxes.filter(r=>r.id.startsWith('konbini-')),layer.boxes);
for(const key of Object.keys(base).filter(k=>!['boxes','beams','panels','authoredLights','authoredMaterials'].includes(k)))assert.deepEqual(candidate[key],base[key],key);
assert.deepEqual(candidate.authoredLights.filter(l=>!l.id.startsWith('konbini-')),base.authoredLights);
assert.equal(JSON.parse(await readFile(`${root}/browser/station.json`)).layoutSha256,hash);
assert.equal(JSON.parse(await readFile(`${root}/browser/atrium-detail.json`)).sourceLayoutSha256,hash);
async function info(path){const f=await open(path);try{const header=Buffer.alloc(20);await f.read(header,0,20,0);assert.equal(header.readUInt32LE(0),0x46546c67);const b=Buffer.alloc(header.readUInt32LE(12));await f.read(b,0,b.length,20);const j=JSON.parse(b.toString());return{bytes:(await f.stat()).size,batches:j.meshes.reduce((n,m)=>n+m.primitives.length,0),triangles:j.meshes.reduce((n,m)=>n+m.primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),0),materials:j.materials.length,textures:j.textures?.length||0,emissiveMaterials:j.materials.filter(m=>m.emissiveFactor?.some(v=>v>0)).length};}finally{await f.close();}}
const before=await info('web/public/assets/atrium.glb'),after=await info(`${root}/browser/atrium.glb`);assert(after.emissiveMaterials>0,'Fixture emission exported');
const result={status:'pass',layout:hash,unchangedOtherCollision:true,matchedShopBoxes:layer.boxes.length,before,after,delta:Object.fromEntries(['bytes','batches','triangles','materials','textures'].map(k=>[k,after[k]-before[k]]))};await writeFile(`${root}/verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
