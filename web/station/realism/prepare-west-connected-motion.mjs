// Package hardware generated from the same candidate layout as the station.
// Run tools/build_atrium_detail.py into this output directory first.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {optimizeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [layoutPath,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex'),lb=await readFile(layoutPath),layout=JSON.parse(lb),detail=JSON.parse(await readFile(out+'/atrium-detail.json'));
assert.equal(detail.sourceLayoutSha256,sha(lb),'Generate hardware from this exact collision layout');
// These newer components supply their own exact transfer records. Their panels
// remain in the main station export; preserve the component metadata contract.
for(const support of [...layout.architecture.hallBasementIntegration.componentCombSupports,...layout.architecture.westCirculationV2.combSupports]){
 assert(layout.panels.some(p=>p.id===support.support));
 const existing=detail.combSupports.findIndex(p=>p.support===support.support);
 if(existing>=0)detail.combSupports[existing]=support;else detail.combSupports.push(support);
}
const{output,stats}=await optimizeGLB(await readFile(out+'/atrium-detail.glb'));
await writeFile(out+'/atrium-detail.runtime.glb',output);
detail.candidateMotionIntegration={layoutSha256:sha(lb),hardwareSha256:sha(output),generatorSha256:detail.generatorSha256,scope:'Hardware regenerated from the complete registered layout, including curved stair lighting, glass fittings and moving-lane transfers.'};
await writeFile(out+'/atrium-detail.json',JSON.stringify(detail)+'\n');await writeFile(out+'/optimization.json',JSON.stringify(stats,null,2)+'\n');console.log(JSON.stringify({hardwareSha256:sha(output),bytes:output.length,triangles:stats.triangles}));
