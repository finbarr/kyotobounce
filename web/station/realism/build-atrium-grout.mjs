// Replace the tile solids with their closed exterior and matching grout finish.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw),g=await read(out+'/grout.json');
assert.equal(sha(raw),m.layoutSha256);assert.equal(g.sourceLayoutSha256,m.layoutSha256);
const floor=l.panels.find(p=>p.id===g.surface),old=structuredClone(floor);
const appearance={id:'atrium-flush-grout',label:'Atrium flush stone grout',physical:'granite',linearColor:{r:.10,g:.11,b:.12,a:1},alpha:1,metallic:0,roughness:.82};
assert(!l.authoredMaterials.some(a=>a.id===appearance.id));
const edges=new Map();let volume=0;
for(let i=0;i<g.triangles.length;i+=3){
 const ids=g.triangles.slice(i,i+3),[a,b,c]=ids.map(i=>{const v=g.vertices[i];return new T.Vector3(v.x,v.y,v.z);});volume+=a.dot(b.clone().cross(c))/6;
 for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join('|'),e=edges.get(key)||{count:0,balance:0};e.count++;e.balance+=a<b?1:-1;edges.set(key,e);}
}
assert(volume>0);assert([...edges.values()].every(e=>e.count===2&&e.balance===0),'The floor must be one closed conforming solid');
floor.vertices=g.vertices;floor.triangles=g.triangles;
floor.finishes=[0,1].map(kind=>({appearance:kind?appearance.id:floor.appearance,triangles:g.triangles.filter((_,i)=>g.finishes[Math.floor(i/3)]===kind)}));
l.authoredMaterials.push(appearance);l.architecture.atriumFloorGrout={surface:floor.id,topY:0,areaM2:g.groutAreaM2,scope:'Continuous exterior with flush grout; preserve paving pattern and public basement openings'};
const nextRaw=JSON.stringify(l)+'\n',station=await read(m.station);station.layoutSha256=sha(nextRaw);station.authoredMaterials=l.authoredMaterials;
const next={...m,layout:out+'/station-layout.json',layoutSha256:sha(nextRaw),station:out+'/station.json'};
await writeFile(next.layout,nextRaw);await writeFile(next.station,JSON.stringify(station)+'\n');await writeFile(out+'/assets.json',JSON.stringify(next,null,2)+'\n');
const proof={parent:m,surface:floor.id,oldTriangles:old.triangles.length/3,triangles:g.triangles.length/3,closedFloorVolumeM3:volume,groutAreaM2:g.groutAreaM2,missingAreaM2:g.missingAreaM2,tileOverlapAreaM2:g.tileOverlapAreaM2,layoutSha256:next.layoutSha256};
await writeFile(out+'/geometry-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
