// Open the public subway return and the existing B2 cross-passage.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const parent=JSON.parse(await readFile(manifest)),raw=await readFile(parent.layout),layout=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),parent.layoutSha256);
const retiredIds=['subway-passage-north-turn-side-137','porta-connection-north-wall'];
assert(retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
const floor=layout.panels.find(p=>p.id==='porta-connection-b2-deck');assert(floor);
await mkdir(out,{recursive:true});
const spec={parentLayoutSha256:parent.layoutSha256,retiredIds,retiredLights:[],b2:Math.max(...floor.vertices.map(v=>v.y)),plaza:-6.2,ceiling:-2.8};
await writeFile(out+'/scope.json',JSON.stringify(spec,null,2)+'\n');console.log(spec);
