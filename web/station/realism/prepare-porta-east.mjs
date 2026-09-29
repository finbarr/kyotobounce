import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
const[manifest,out]=process.argv.slice(2),m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),layout=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);assert(out.startsWith('.local/'));
const retiredIds=['porta-plaza-east-wall','subway-passage-north-turn-north-east'];
for(const id of retiredIds)assert(layout.panels.some(p=>p.id===id),id);
// The existing concourse deck continues behind its enclosed paid hall. Reuse
// its northern strip instead of placing a second floor on top of it.
const deck=layout.panels.find(p=>p.id==='subway-lift-subway-escalators-subway-north-paid-deck');assert(deck);
const bounds=Object.fromEntries(['x','y','z'].map(k=>[k,[Math.min(...deck.vertices.map(v=>v[k])),Math.max(...deck.vertices.map(v=>v[k]))]]));
assert.deepEqual(bounds.x,[162,192]);assert(bounds.z[1]>=55);assert(Math.abs(bounds.y[1]+6.2)<1e-5);
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[],floor:-6.2,ceiling:-2.8,reusedDeck:deck.id,reusedBounds:bounds},null,2)+'\n');console.log({retiredIds,reusedDeck:deck.id});
