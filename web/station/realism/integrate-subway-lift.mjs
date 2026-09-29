import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),station=await read(m.station),detail=await read(parent.detail),report=await read(component+'/report.json'),lift=await read(component+'/lift-spec.json');
assert.deepEqual(old.escalators,next.escalators);assert(!next.lifts?.some(l=>l.id===lift.id));
for(const p of lift.parts){const appearance=next.authoredMaterials.find(a=>a.label===p.appearance);assert(appearance,p.appearance);p.appearance=appearance.id;}
next.lifts=[...(next.lifts||[]),lift];station.lifts=next.lifts;
next.architecture.subwayLiftV2={scope:report.scope,limits:report.limits};
const raw=JSON.stringify(next)+'\n';m.layoutSha256=sha(raw);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration.layoutSha256=m.layoutSha256;
m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=report.geometry.spawn;
await writeFile(m.layout,raw);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');console.log({layoutSha256:m.layoutSha256,lifts:next.lifts.length});
