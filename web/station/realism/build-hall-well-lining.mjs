// Close source wall and soffit faces around the two descending banks.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [specPath,out]=process.argv.slice(2),bytes=await readFile(specPath),s=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(await readFile(s.sourceInventory.path)),s.sourceInventory.sha256);
const c=construction([{name:'Hall basement | provisional wall and soffit',pbrMetallicRoughness:{baseColorFactor:[.54,.53,.50,1],roughnessFactor:.75,metallicFactor:0}}],{flatNormals:true});
c.add('hall-basement-well-lining',s.vertices,s.indices,0,'hall-basement-wall');c.panels[0].material='facade';
const r=await c.save(out,'hall-well-lining.glb',{status:'Uninstalled municipal wall/soffit enclosure; provisional material; hidden exterior backing extended to upper floor underside.',specSha256:sha(bytes),sourceInventory:s.sourceInventory,sourceSha256:s.sourceSha256,geometry:{sourceFaces:s.sourceFaces.length,hiddenBackingExtensionTriangles:s.hiddenBackingExtensionTriangles,clipWorldY:s.clipWorldY,volumeM3:s.volumeM3},limits:s.limits});console.log(JSON.stringify(r));
