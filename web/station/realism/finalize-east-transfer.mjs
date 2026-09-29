// Rebind unchanged moving hardware to the composed static station and set its entry.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [parentPath,manifest,component]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const parent=await read(parentPath),m=await read(manifest),old=await read(parent.layout),next=await read(m.layout),detail=await read(parent.detail);
assert.deepEqual(old.escalators,next.escalators);assert.deepEqual(old.architecture.hallBasementIntegration,next.architecture.hallBasementIntegration);assert.deepEqual(old.architecture.westCirculationV2,next.architecture.westCirculationV2);assert.deepEqual(old.architecture.portaConnectionV2,next.architecture.portaConnectionV2);
detail.candidateMotionIntegration.layoutSha256=m.layoutSha256;m.motionLayout=m.layout;m.detail=manifest.slice(0,manifest.lastIndexOf('/'))+'/atrium-detail.json';m.spawn=(await read(component+'/report.json')).geometry.spawn||{x:143.5,y:-6.2,z:-55};
await writeFile(m.detail,JSON.stringify(detail)+'\n');await writeFile(manifest,JSON.stringify(m,null,2)+'\n');
const tested=await read(component+'/tested-collision.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
if(tested){const physical={boxes:next.boxes,beams:next.beams,flights:next.flights,escalators:next.escalators,panels:next.panels.filter(p=>p.collision!==false),authoredMaterials:next.authoredMaterials,authoredLights:next.authoredLights};assert.equal(hash(physical),tested.physicalSha256,'Render-only changes must preserve every physical record, material and light');await writeFile(component+'/collision-equivalence.json',JSON.stringify({pass:true,testedLayoutSha256:tested.layoutSha256,layoutSha256:m.layoutSha256,physicalSha256:tested.physicalSha256,scope:tested.scope},null,2)+'\n');}
console.log({layoutSha256:m.layoutSha256,geometrySha256:m.geometrySha256,motionUnchanged:true});
