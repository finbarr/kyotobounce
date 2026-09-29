// Retire the boundaries that block the mapped public crossing and eastern loop.
import assert from 'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';
const[manifest,out]=process.argv.slice(2),m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),l=JSON.parse(raw);assert(out.startsWith('.local/'));assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const retiredIds=['subway-north-paid-west-south','subway-north-paid-east','subway-lift-retained-wall-1-west','subway-lift-retained-wall-1-east','subway-lift-vestibule-lintel-1','kotochika-plaza-paid-boundary','porta-east-east-end-25.2','subway-central-two-public-wall-north','subway-central-two-public-base-north','subway-central-two-public-band-north','subway-passage-wall-joint-155.4--52'];
for(const id of retiredIds)assert.equal(l.panels.filter(p=>p.id===id).length,1);
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[],floor:-6.2,ceiling:-2.8},null,2)+'\n');
