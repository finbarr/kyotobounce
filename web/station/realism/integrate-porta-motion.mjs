// Coordinate the appended lower banks across native, browser and comb metadata.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert(manifest.startsWith('.local/'));
const m=await read(manifest),layout=await read(m.layout),station=await read(m.station),detail=await read(m.detail),motion=await read(component+'/motion.json'),report=await read(component+'/report.json');
const expected=report.componentPrefix==='station-escalators-'?2:4;
assert.equal(motion.escalators.length,expected);assert.equal(motion.combSupports.length,2*expected);
assert.deepEqual(layout.escalators,station.escalators);
for(const lane of motion.escalators){
 assert(!layout.escalators.some(e=>e.id===lane.id));
 for(const end of ['lower','upper']){
  const id=lane.id+'-'+end+'-comb-transfer',support=motion.combSupports.find(s=>s.support===id),panel=layout.panels.find(p=>p.id===id);
  assert(support&&panel&&!detail.combSupports.some(s=>s.support===id));
  const along=panel.vertices.map(v=>(v.x-lane.lowerCenter.x)*lane.uphill.x+(v.z-lane.lowerCenter.z)*lane.uphill.z);
  assert(Math.abs(Math.min(...along)-(support.along-support.length/2))<.00001);
  assert(Math.abs(Math.max(...along)-(support.along+support.length/2))<.00001);
 }
}
layout.escalators.push(...motion.escalators);station.escalators=layout.escalators;
const architectureKey=report.motionArchitecture||'portaConnectionV2';
assert(!layout.architecture[architectureKey]);
layout.architecture[architectureKey]={scope:report.scope,combSupports:motion.combSupports,limits:report.limits};
const bytes=JSON.stringify(layout)+'\n';station.layoutSha256=sha(bytes);
detail.combSupports.push(...motion.combSupports);
detail.candidateMotionIntegration={...detail.candidateMotionIntegration,layoutSha256:sha(bytes),[report.motionArchitecture||'portaLowerBanks']:motion.escalators.length};
// sourceLayoutSha256 remains the provenance of the unchanged hardware GLB.
const directory=manifest.slice(0,manifest.lastIndexOf('/'));m.layoutSha256=sha(bytes);m.motionLayout=m.layout;m.detail=directory+'/atrium-detail.json';m.spawn=report.geometry.spawn||{x:1.2,y:report.geometry.B2,z:3};
await writeFile(m.layout,bytes);await writeFile(m.station,JSON.stringify(station)+'\n');await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');
console.log({layoutSha256:m.layoutSha256,lanes:layout.escalators.length,added:expected});
