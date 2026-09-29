// Open the blank walls beside the public passage between North and Central 1 gates.
import assert from 'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';
const[manifest,out]=process.argv.slice(2),m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),l=JSON.parse(raw);assert(out.startsWith('.local/'));assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const retiredIds=['subway-north-public-wall','subway-north-public-base','subway-north-public-band','east-transfer-public-wall--15','east-transfer-public-base--15','east-transfer-public-band--15'];for(const id of retiredIds)assert.equal(l.panels.filter(p=>p.id===id).length,1);
// These narrow joints were attached to the removed walls, not freestanding posts.
for(const [x,zs]of [[147.1,[-12,-8,-4,0,4,8,12,16,20]],[155.4,[-32,-28,-24,-20,-16,-12,-8,-4,0,4]]])for(const z of zs){const id=`subway-passage-wall-joint-${x}-${z}`;assert.equal(l.panels.filter(p=>p.id===id).length,1);retiredIds.push(id);}
const deck=l.panels.find(p=>p.id==='subway-south-lift-rebuilt-subway-lift-subway-escalators-subway-north-paid-deck');assert(deck);assert(Math.abs(Math.max(...deck.vertices.map(v=>v.y))+6.2)<1e-5);
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[],floor:-6.2,ceiling:-2.8,reusedDeck:deck.id},null,2)+'\n');
