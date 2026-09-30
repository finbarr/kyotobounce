// Identify the blocked B3 connection and preserve every upper tread's footprint.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const bounds=p=>['x','y','z'].map(k=>[Math.min(...p.vertices.map(v=>v[k])),Math.max(...p.vertices.map(v=>v[k]))]);
const retainedStair=layout.panels.filter(p=>p.id.startsWith('isetan-basement-')&&(/-(lower|upper)-step-/.test(p.id)||p.id==='isetan-basement-stair-landing')).map(p=>({id:p.id,role:p.role,bounds:bounds(p)}));
assert.equal(retainedStair.length,23);
const retiredIds=['central-lift-parking-west','isetan-basement-b2-floor',...retainedStair.map(p=>p.id)];assert(retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
const B3=bounds(layout.panels.find(p=>p.id==='central-lift-parking-floor'))[1][1],B2=bounds(layout.panels.find(p=>p.id==='isetan-basement-b2-floor'))[1][1];assert(Math.abs(B2-B3-3.6)<1e-5);
const spec={componentPrefix:'isetan-parking-',parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[],retiredBoxIds:[],retiredSourceOnlyIds:[],modifiedFlightIds:[],modifiedPanelIds:[],retainedStair,B3,B2,well:[[-83.3,-77.8],[8.2,14.2]],stepsPerFlight:11,going:.3};
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');console.log({retired:retiredIds.length,B3,B2});
