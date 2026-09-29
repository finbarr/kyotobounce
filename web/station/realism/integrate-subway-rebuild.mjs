// Reconcile moving hardware after exact static removal and composition.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [basePath,manifestPath,component]=process.argv.slice(2);
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await read(basePath),m=await read(manifestPath),raw=await readFile(m.layout),layout=JSON.parse(raw);
const station=await read(m.station),detail=await read(base.detail),report=await read(component+'/report.json'),motion=await read(component+'/motion.json');
assert.equal(sha(raw),m.layoutSha256);assert.equal(report.sourceLayoutSha256,base.layoutSha256);
const {retiredIds,retiredLiftIds,retiredEscalatorIds}=report.geometry;
assert(retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
assert(retiredLiftIds.every(id=>layout.lifts.some(p=>p.id===id)));
assert(retiredEscalatorIds.every(id=>layout.escalators.some(p=>p.id===id)));
assert(!layout.escalators.some(e=>e.id.startsWith(report.componentPrefix)),'Already integrated');
for(const l of motion.lifts)for(const p of l.parts){
 const material=layout.authoredMaterials.find(m=>m.label===p.appearance);assert(material,p.appearance);p.appearance=material.id;
}
layout.lifts=[...layout.lifts.filter(l=>!retiredLiftIds.includes(l.id)),...motion.lifts];
layout.escalators=[...layout.escalators.filter(e=>!retiredEscalatorIds.includes(e.id)),...motion.escalators];
detail.combSupports=[...detail.combSupports.filter(s=>!retiredIds.includes(s.support)),...motion.combSupports];
assert(detail.combSupports.every(s=>layout.panels.some(p=>p.id===s.support)),'Every comb support exists');
// The shared detail GLB predates the authored subway banks; their chassis is
// in the static component and steps are built from the new movement paths.
const hardware=readGLB(await readFile(base.hardware)).json;
assert(!hardware.nodes.some(n=>retiredEscalatorIds.some(id=>(n.name||'').includes(id))));
layout.architecture.subwayReconstruction={scope:report.scope,limits:report.limits,component,
 specSha256:report.specSha256,retiredPanels:retiredIds.length};
station.lifts=layout.lifts;station.escalators=layout.escalators;
const bytes=JSON.stringify(layout)+'\n';m.layoutSha256=sha(bytes);station.layoutSha256=m.layoutSha256;
detail.candidateMotionIntegration={...detail.candidateMotionIntegration,layoutSha256:m.layoutSha256,
 scope:'Retain unrelated station hardware; replace four subway chains, both platform lifts and Exit 5 street lift.',
 parentLayoutSha256:base.layoutSha256,subwayEscalatorsV2:motion.escalators.length};
m.motionLayout=m.layout;m.detail=dirname(manifestPath)+'/atrium-detail.json';m.spawn=report.geometry.spawn;
await writeFile(m.layout,bytes);await writeFile(m.station,JSON.stringify(station)+'\n');
await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifestPath,JSON.stringify(m,null,2)+'\n');
await writeFile(dirname(manifestPath)+'/motion-integration.json',JSON.stringify({pass:true,layoutSha256:m.layoutSha256,
 retiredLiftIds,retiredEscalatorIds,lifts:motion.lifts.map(l=>l.id),escalators:motion.escalators.map(e=>e.id),
 retainedHardwareSha256:base.hardwareSha256},null,2)+'\n');
console.log({layoutSha256:m.layoutSha256,lifts:layout.lifts.length,escalators:layout.escalators.length});
