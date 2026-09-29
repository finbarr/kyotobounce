// Identify only the surfaces that obstruct the Central 2 gate and stair well.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const parent=JSON.parse(await readFile(manifest)),raw=await readFile(parent.layout),layout=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),parent.layoutSha256);
const retiredIds=[...['paid-deck','platform-ceiling','public-wall-south','public-base-south','public-band-south','platform-columns','column-bases'].map(id=>'subway-platforms-'+id),...[-88,-84,-80].map(z=>'subway-passage-wall-joint-155.4-'+z)];
assert(retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
await mkdir(out,{recursive:true});
await writeFile(out+'/scope.json',JSON.stringify({parentLayoutSha256:parent.layoutSha256,retiredIds,retiredLights:[],columns:layout.panels.filter(p=>['subway-platforms-platform-columns','subway-platforms-column-bases'].includes(p.id))},null,2)+'\n');
console.log({retiredPanels:retiredIds.length,parentLayoutSha256:parent.layoutSha256});
