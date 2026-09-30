// Pin the existing stair core, its two floor interfaces and crossing foundations.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const well=[[-86.3,-77.8],[8.2,14.2]],volume=[well[0],[4.59,7.36],well[1]],bounds=p=>['x','y','z'].map(k=>[Math.min(...p.vertices.map(v=>v[k])),Math.max(...p.vertices.map(v=>v[k]))]),overlap=(b,v)=>b.every(([a,z],i)=>a<v[i][1]&&z>v[i][0]);
const fixed=['isetan-ground-ceiling','isetan-second-floor','isetan-ground-lower-opening-guard','isetan-ground-fixture-stair'];
const retiredIds=layout.panels.filter(p=>fixed.includes(p.id)||p.id.startsWith('isetan-second-north-perimeter--85-')||p.id.startsWith('isetan-second-floor-joint-')&&overlap(bounds(p),[well[0],[7.34,7.37],well[1]])).map(p=>p.id);
assert(fixed.every(id=>retiredIds.includes(id)));assert(retiredIds.length===15);
const cuts=Object.fromEntries(layout.panels.filter(p=>p.id.startsWith('isetan-ground-')&&p.role==='foundation'&&overlap(bounds(p),volume)).map(p=>[p.id,volume]));assert(Object.keys(cuts).length>=2);
const spec={componentPrefix:'isetan-stair-',parentLayoutSha256:m.layoutSha256,retiredIds,retiredBoxIds:[],retiredSourceOnlyIds:[],retiredLights:['isetan-ground-light-stair'],modifiedFlightIds:[],cuts,well,ground:.006,second:7.35,stepsPerFlight:21,going:.3};
await mkdir(out,{recursive:true});await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(m,null,2)+'\n');
const nearby=layout.panels.filter(p=>p.collision!==false&&overlap(bounds(p),volume)).map(p=>({id:p.id,role:p.role,bounds:bounds(p)}));await writeFile(out+'/shaft-inventory.json',JSON.stringify(nearby,null,2)+'\n');
console.log({retired:retiredIds.length,foundations:Object.keys(cuts),shaftSurfaces:nearby.map(p=>p.id)});
