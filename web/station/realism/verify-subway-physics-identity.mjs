// Cache native acceptance across a change limited to noncolliding ceiling trim.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifestPath,receipt,mode]=process.argv.slice(2);assert(['capture','verify'].includes(mode));assert(receipt.startsWith('.local/'));
const sha=b=>createHash('sha256').update(b).digest('hex'),m=JSON.parse(await readFile(manifestPath)),raw=await readFile(m.layout),layout=JSON.parse(raw);
assert.equal(sha(raw),m.layoutSha256);
const physical=p=>Object.fromEntries(Object.entries(p).filter(([key])=>!['appearance','uv','normals','browserMaterial'].includes(key)));
const records={spawn:m.spawn,boxes:layout.boxes.map(physical),beams:layout.beams.map(physical),flights:layout.flights.map(physical),
 panels:layout.panels.filter(p=>p.collision!==false).map(physical).sort((a,b)=>a.id.localeCompare(b.id)),
 escalators:layout.escalators,lifts:layout.lifts};
const identity={layoutSha256:m.layoutSha256,sections:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,{count:Array.isArray(v)?v.length:1,sha256:sha(JSON.stringify(v))}]))};
if(mode==='capture')await writeFile(receipt,JSON.stringify(identity,null,2)+'\n');
else{
 const previous=JSON.parse(await readFile(receipt));assert.deepEqual(identity.sections,previous.sections,'Native collision or motion changed; previous runtime checks cannot be reused');
 await writeFile(receipt.replace(/\.json$/,'-verified.json'),JSON.stringify({pass:true,scope:'All collision-enabled panels, boxes, beams, flights, moving hardware and preview spawn are unchanged; visual geometry checked separately',previousLayoutSha256:previous.layoutSha256,...identity},null,2)+'\n');
}
console.log(mode,identity.layoutSha256,identity.sections.panels.count,'colliding panels');
