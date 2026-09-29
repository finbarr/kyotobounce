import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),station=await read(m.station),detail=await read(parent.detail),r=await read(component+'/report.json'),lifts=await read(component+'/lift-specs.json');
assert.deepEqual(old.lifts,next.lifts);assert.deepEqual(old.escalators,next.escalators);
assert.deepEqual(r.geometry.retiredLiftIds,['subway-hachijo-east-lift']);
for(const l of lifts)for(const p of l.parts){const material=next.authoredMaterials.find(a=>a.label===p.appearance);assert(material,p.appearance);p.appearance=material.id;}
next.lifts=[...old.lifts.filter(l=>!r.geometry.retiredLiftIds.includes(l.id)),...lifts];assert.equal(new Set(next.lifts.map(l=>l.id)).size,next.lifts.length);station.lifts=next.lifts;
next.architecture.hachijoLiftV2={scope:'Exterior station-frontage lift between the public underpass and Hachijo forecourt.',limits:r.limits};next.architecture.hachijoCrossingV2={scope:r.scope,limits:r.limits};
const raw=JSON.stringify(next)+'\n';m.layoutSha256=sha(raw);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration.layoutSha256=m.layoutSha256;m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=r.geometry.spawn;
await writeFile(m.layout,raw);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');console.log({layoutSha256:m.layoutSha256,lifts:next.lifts.length});
