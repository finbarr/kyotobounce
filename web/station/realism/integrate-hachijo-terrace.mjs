import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),station=await read(m.station),detail=await read(parent.detail),report=await read(component+'/report.json'),motion=await read(component+'/motion.json');
assert.equal(report.componentPrefix,'hachijo-terrace-');assert.deepEqual(old.lifts,next.lifts);assert.deepEqual(old.escalators,next.escalators);
assert.equal(motion.lifts.length,3);assert.deepEqual(motion.lifts.map(l=>l.id),report.geometry.liftIds);
for(const l of motion.lifts){assert(!next.lifts.some(v=>v.id===l.id));for(const p of l.parts){const a=next.authoredMaterials.find(a=>a.label===p.appearance);assert(a,p.appearance);p.appearance=a.id;}}
next.lifts.push(...motion.lifts);station.lifts=next.lifts;next.architecture.hachijoTerraceV2={scope:report.scope,limits:report.limits};
const raw=JSON.stringify(next)+'\n';m.layoutSha256=sha(raw);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration.layoutSha256=m.layoutSha256;m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=report.geometry.spawn;
await writeFile(m.layout,raw);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');console.log({layoutSha256:m.layoutSha256,lifts:next.lifts.length});
