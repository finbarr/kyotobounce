// Open the North gate and extend the shared island and ceiling to its descent.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const parent=JSON.parse(await readFile(manifest)),raw=await readFile(parent.layout),layout=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),parent.layoutSha256);
const retiredIds=['subway-central-two-paid-deck','subway-central-two-platform-ceiling','subway-platforms-platform',...['public-wall-north','public-base-north','public-band-north'].map(id=>'subway-platforms-'+id),'subway-passage-north-turn-south-east',...[8,12,16,20].map(z=>'subway-passage-wall-joint-155.4-'+z),...layout.panels.filter(p=>p.id.startsWith('subway-platforms-platform-end-15.9-')).map(p=>p.id)];
assert.equal(retiredIds.length,21);assert(retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
await mkdir(out,{recursive:true});
await writeFile(out+'/scope.json',JSON.stringify({parentLayoutSha256:parent.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');
console.log({retiredPanels:retiredIds.length,parentLayoutSha256:parent.layoutSha256});
