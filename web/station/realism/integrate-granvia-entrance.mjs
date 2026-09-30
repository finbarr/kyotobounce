// Bind the two moving chains and lift to the same candidate used for static geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(manifest.startsWith('.local/'));
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),station=await read(m.station),detail=await read(parent.detail),report=await read(component+'/report.json'),motion=await read(component+'/motion.json');
assert.equal(report.componentPrefix,'granvia-entrance-');assert.equal(motion.escalators.length,2);assert.equal(motion.lifts.length,1);assert.equal(motion.combSupports.length,4);
assert.deepEqual(next.escalators,old.escalators);assert.deepEqual(next.lifts,old.lifts);
for(const e of motion.escalators){assert(!old.escalators.some(v=>v.id===e.id));for(const end of['lower','upper']){const id=e.id+'-'+end+'-comb-transfer',p=next.panels.find(p=>p.id===id),s=motion.combSupports.find(s=>s.support===id);assert(p&&s&&!detail.combSupports.some(s=>s.support===id));const a=p.vertices.map(v=>(v.x-e.lowerCenter.x)*e.uphill.x+(v.z-e.lowerCenter.z)*e.uphill.z);assert(Math.abs(Math.min(...a)-(s.along-s.length/2))<1e-5);assert(Math.abs(Math.max(...a)-(s.along+s.length/2))<1e-5);}}
for(const lift of motion.lifts){assert(!old.lifts.some(v=>v.id===lift.id));for(const p of lift.parts){const material=next.authoredMaterials.find(m=>m.label===p.appearance);assert(material,p.appearance);p.appearance=material.id;}}
next.escalators.push(...motion.escalators);next.lifts.push(...motion.lifts);station.escalators=next.escalators;station.lifts=next.lifts;
next.architecture.granviaEntranceV2={scope:report.scope,combSupports:motion.combSupports,limits:report.limits};detail.combSupports.push(...motion.combSupports);
const raw=JSON.stringify(next)+'\n';m.layoutSha256=sha(raw);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration={...detail.candidateMotionIntegration,layoutSha256:m.layoutSha256,granviaEntranceV2:2};m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=report.geometry.spawn;
await writeFile(m.layout,raw);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');console.log({layoutSha256:m.layoutSha256,escalators:next.escalators.length,lifts:next.lifts.length});
