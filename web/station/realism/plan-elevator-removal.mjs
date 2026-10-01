// Explicit elevator ownership: shared floors and public routes are not selected by name.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),m=await read(manifest),raw=await readFile(m.layout),l=JSON.parse(raw);
assert.equal(createHash('sha256').update(raw).digest('hex'),m.layoutSha256);
const groups=[
 ['subway-hachijo-east-lift',/^hachijo-crossing-north-(shaft-|pit$)/],
 ['subway-hachijo-south-lift',/^hachijo-crossing-south-(shaft-|pit$)/],
 ['porta-west-public-lift',/^porta-west-lift-(shaft-|pavilion-|pit$)/],
 ['station-central-lift',/^central-lift-(shaft-(west|south|north)$|pit$|core-roof$)/],
 ...['central-one','exit-five','south'].map(id=>['subway-refit-'+id+'-lift',new RegExp('^subway-refit-'+id+'-lift-(pit|side-.*|back|roof)$')]),
 ...['west','south','east'].map((id,i)=>['hachijo-terrace-'+id+'-lift',new RegExp('^hachijo-terrace-lift-'+i+'-(left|right|back|roof|pit)$')]),
 ['granvia-entrance-lift',/^granvia-entrance-lift-shaft-(back|side-.*|pit|roof)$/],
 ...['west','east'].map(id=>['granvia-parking-'+id+'-lift',new RegExp('^granvia-parking-'+id+'-(back|south|north|pit|roof)$')]),
 ['isetan-north-lift',/^isetan-(north-core|sixth-north|seventh-north|eighth-north)-(shaft-(back|west|east)|pit|core-roof)$/],
 ['station-east-public-lift',/^east-public-lift-shaft-(west|east|back|pit|roof)$/],
];
assert.equal(groups.length,l.lifts.length);
const bounds=ps=>Object.fromEntries(['x','y','z'].map(k=>[k,[Math.min(...ps.flatMap(p=>p.vertices.map(v=>v[k]))),Math.max(...ps.flatMap(p=>p.vertices.map(v=>v[k])))]]));
const shafts=groups.map(([id,pattern])=>{const lift=l.lifts.find(v=>v.id===id),panels=l.panels.filter(p=>pattern.test(p.id));assert(lift&&panels.length>=4,id);return{id,retired:panels.map(p=>p.id),bounds:bounds(panels),lift};});
const retired=new Set(shafts.flatMap(s=>s.retired));
for(const p of l.panels){
 if(['call-button','call-plate','lift-indicator','indicator'].includes(p.role)||/^kintetsu-lift-/.test(p.id)||
 /^(central-lift|isetan-(north-core|sixth-north|seventh-north|eighth-north))-(floor-label|entrance-label)/.test(p.id)||
 /^porta-west-lift-(mall|forecourt)-sign$/.test(p.id)||/^hachijo-crossing-(north|south)-(lower|upper)-sign$/.test(p.id))retired.add(p.id);
}
// Export only nearby, thin horizontal slabs for the planar hole repair. Deep
// slabs and steps cannot accidentally become a replacement floor.
const slabs=[];
for(const p of l.panels){
 if(retired.has(p.id)||/joint/.test(p.role||'')||!/(floor|ceiling|landing)/.test(p.role||'')&&!['concourse','granvia-entrance-lift-upper-landing','granvia-entrance-lift-upper-walk'].includes(p.id))continue;
 const b=bounds([p]);if(b.y[1]-b.y[0]>1.8||b.y[1]-b.y[0]<.005)continue;
 const near=shafts.filter(s=>b.x[1]>=s.bounds.x[0]-.1&&b.x[0]<=s.bounds.x[1]+.1&&b.z[1]>=s.bounds.z[0]-.1&&b.z[0]<=s.bounds.z[1]+.1&&b.y[1]>=s.bounds.y[0]&&b.y[0]<=s.bounds.y[1]);if(!near.length)continue;
 const triangles=[];for(let i=0;i<p.triangles.length;i+=3){const vs=p.triangles.slice(i,i+3).map(k=>p.vertices[k]);if(vs.every(v=>Math.abs(v.y-b.y[1])<.00003))triangles.push(vs.map(v=>[v.x,v.z]));}
 if(triangles.length)slabs.push({id:p.id,role:p.role,bounds:b,appearance:p.appearance,material:p.material,shafts:near.map(s=>s.id),triangles});
}
const paving=l.panels.filter(p=>p.id.startsWith('municipal-plaza-')).map(p=>({id:p.id,appearance:p.appearance,material:p.material,triangles:Array.from({length:p.triangles.length/3},(_,i)=>p.triangles.slice(i*3,i*3+3).map(k=>p.vertices[k]))}));
await writeFile(out+'/plan.json',JSON.stringify({parent:m,retired:[...retired],shafts,slabs,paving,materials:l.authoredMaterials})+'\n');
console.log({shafts:shafts.length,staticRemoved:retired.size,dynamicRemoved:l.lifts.reduce((n,l)=>n+l.parts.length,0),nearbySlabs:slabs.length});
