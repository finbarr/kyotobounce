// Produce review-only combined files; never mutate the canonical source/export.
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [layoutArg,stationArg,shopArg,outArg]=process.argv.slice(2);
if(!outArg)throw Error('Usage: node web/levels/compose-candidate.mjs base-layout.json base-station.json shop-directory .local/fresh');
const out=resolve(outArg);assert.ok(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const bytes=await readFile(layoutArg),base=JSON.parse(bytes),station=JSON.parse(await readFile(stationArg,'utf8')),shop=JSON.parse(await readFile(resolve(shopArg,'colliders.json'),'utf8'));
const ids=new Set(['boxes','panels','flights','beams','escalators'].flatMap(k=>(base[k]||[]).map(x=>x.id)));
for(const b of shop.boxes){assert.ok(!ids.has(b.id),`Duplicate surface ${b.id}`);ids.add(b.id);}
const combined=JSON.stringify({...base,boxes:[...base.boxes,...shop.boxes]})+'\n',sha=s=>createHash('sha256').update(s).digest('hex');
await writeFile(resolve(out,'station-layout.json'),combined);
await writeFile(resolve(out,'station.json'),JSON.stringify({...station,layoutSha256:sha(combined),konbiniAsset:'/assets/konbini.glb'})+'\n');
await copyFile(resolve(shopArg,'konbini.glb'),resolve(out,'konbini.glb'));
await writeFile(resolve(out,'integration.json'),JSON.stringify({status:'Review candidate; base-opening/registration and native route proof outstanding',baseLayout:resolve(layoutArg),baseSha256:sha(bytes),layoutSha256:sha(combined),shop:resolve(shopArg),registration:shop.registration,sourcePreserved:true,sharedNeeds:['Root appends candidate GLB to station before BVH/camera collision construction using integration.patch.','Structural owner resolves coincident west-2f-landing/shop floor support; do not edit cafe or create an invisible catch plane.','Root binds final course revisions to the actual combined layout hash/physics and preserves historical pairs.']},null,2));
console.log(JSON.stringify({out,layoutSha256:sha(combined)}));
