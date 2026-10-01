import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(manifest.startsWith('.local/'));
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),station=await read(m.station),detail=await read(parent.detail),report=await read(component+'/report.json'),motion=await read(component+'/motion.json');
assert.equal(report.componentPrefix,'east-public-lift-');assert.equal(motion.lifts.length,1);assert.deepEqual(motion.escalators,[]);assert.deepEqual(next.lifts,old.lifts);assert.deepEqual(next.escalators,old.escalators);
for(const lift of motion.lifts){assert(!old.lifts.some(v=>v.id===lift.id));for(const p of lift.parts){const material=next.authoredMaterials.find(m=>m.label===p.appearance);assert(material,p.appearance);p.appearance=material.id;}}
next.lifts.push(...motion.lifts);station.lifts=next.lifts;next.architecture.eastPublicLiftV2={scope:report.scope,limits:report.limits};
const raw=JSON.stringify(next)+'\n';m.layoutSha256=sha(raw);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration={...detail.candidateMotionIntegration,layoutSha256:m.layoutSha256,eastPublicLiftV2:1};m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=parent.spawn;
await writeFile(m.layout,raw);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');console.log({layoutSha256:m.layoutSha256,lifts:next.lifts.length});
