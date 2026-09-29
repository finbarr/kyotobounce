// Retire the solid wall at the mapped eastern Central 1 entrance.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2),m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),l=JSON.parse(raw);
assert(out.startsWith('.local/'));
assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const retiredIds=['subway-platforms-paid-east-central'];
const wall=l.panels.filter(p=>retiredIds.includes(p.id));assert.equal(wall.length,1);
for(const [axis,min,max]of [['x',189.925,190.075],['y',-6.2,-2.8],['z',-48,2]]){
 assert(Math.abs(Math.min(...wall[0].vertices.map(v=>v[axis]))-min)<1e-5);
 assert(Math.abs(Math.max(...wall[0].vertices.map(v=>v[axis]))-max)<1e-5);
}
await mkdir(out,{recursive:true});
await writeFile(out+'/spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[],floor:-6.2,ceiling:-2.8,opening:{minZ:-48,maxZ:-36}},null,2)+'\n');
