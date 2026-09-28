import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import{construction}from'./component-mesh.mjs';
const[path,out]=process.argv.slice(2),b=await readFile(path),s=JSON.parse(b),sha=b=>createHash('sha256').update(b).digest('hex');
const c=construction([{name:'Retained concourse — preview granite',pbrMetallicRoughness:{baseColorFactor:[.24,.25,.25,1],metallicFactor:.05,roughnessFactor:.6}}]);
const ring=r=>r.map(([x,z])=>[x,s.floorY,z]);c.slab('concourse',ring(s.outer),s.holes.map(ring),s.depthM,0,'floor');
const p=c.panels[0];for(const k of ['material','role','collision','appearance'])if(k in s.sourcePanel)p[k]=s.sourcePanel[k];
assert(c.panels.length===1);console.log(JSON.stringify(await c.save(out,'concourse-join.glb',{meaning:s.meaning,specSha256:sha(b),inputs:s.inputs,areasM2:s.areasM2,limits:s.limits,toolSha256:sha(await readFile(new URL(import.meta.url)))})));
