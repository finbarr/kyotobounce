import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const candidate=JSON.parse(await readFile('.local/station-detail/candidate/station-layout.json'));
const proposal=JSON.parse(await readFile('.local/station-detail/candidate/collision-proposal.json'));
assert.deepEqual(candidate.panels.filter(p=>p.id.startsWith('k027-')),proposal.panels);
const original=JSON.parse(await readFile('runtime/station-layout.json'));
for(const key of Object.keys(original)){
 const fresh=['panels','authoredMaterials'].includes(key)?candidate[key].filter(p=>!p.id.startsWith('k027-')):candidate[key];
 assert.deepEqual(fresh,original[key],key);
}
await writeFile('artifacts/station-detail/east-square/preservation.json',JSON.stringify({status:'pass',unchangedCanonicalFields:Object.keys(original),newPanels:proposal.panels.length,exactLayerProposalMatchesAssembledLayout:true},null,2));
console.log('PASS all original geometry/layout fields preserved; final layer matches assembled candidate');
