import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),station=await read(m.station),detail=await read(parent.detail),report=await read(component+'/report.json'),lift=await read(component+'/lift-spec.json');
assert.deepEqual(old.escalators,next.escalators);
const retired=report.geometry.retiredLiftIds||[];assert(!retired.length||report.componentPrefix==='isetan-north-core-'&&retired.length===1&&retired[0]===lift.id&&lift.id==='isetan-north-lift');
assert.deepEqual(next.lifts,old.lifts);assert(retired.every(id=>next.lifts.some(l=>l.id===id)));next.lifts=next.lifts.filter(l=>!retired.includes(l.id));assert(!next.lifts.some(l=>l.id===lift.id));
for(const p of lift.parts){const appearance=next.authoredMaterials.find(a=>a.label===p.appearance);assert(appearance,p.appearance);p.appearance=appearance.id;}
next.lifts=[...(next.lifts||[]),lift];station.lifts=next.lifts;
const architectureKey={'hachijo-lift-':'hachijoLiftV2','exit-five-':'exitFiveLiftV2','subway-lift-':'subwayLiftV2','subway-south-lift-':'subwaySouthLiftV2','porta-west-lift-':'portaWestLiftV2','central-lift-':'centralLiftV2','isetan-lift-':'isetanLiftV2','isetan-north-core-':'isetanNorthCoreV2'}[report.componentPrefix];assert(architectureKey,'Recognized lift component');
next.architecture[architectureKey]={scope:report.scope,limits:report.limits};
const raw=JSON.stringify(next)+'\n';m.layoutSha256=sha(raw);station.layoutSha256=m.layoutSha256;detail.candidateMotionIntegration.layoutSha256=m.layoutSha256;
m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=report.geometry.spawn;
await writeFile(m.layout,raw);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');console.log({layoutSha256:m.layoutSha256,lifts:next.lifts.length});
