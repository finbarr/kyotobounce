// Read the current hall datums and record the exact walls replaced by this repair.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),l=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const retiredIds=['central-lift-b1-west','central-lift-b2-west','central-lift-b2-north','central-lift-b2-retained-west-north'];
for(const id of retiredIds)assert.equal(l.panels.filter(p=>p.id===id).length,1,id);
const height=id=>Math.max(...l.panels.find(p=>p.id===id).vertices.map(v=>v.y));
const b1=height('central-lift-b1-floor'),b2=height('central-lift-b2-floor');assert(b1>b2&&b1-b2<4);
const spec={parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[],b1,b2,b1North:Math.max(...l.panels.find(p=>p.id==='central-lift-b1-floor').vertices.map(v=>v.z))};
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');console.log(spec);
