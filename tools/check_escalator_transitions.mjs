// Native evidence must cover all 40 physical transfer plates, including the
// centred retry where the first throw did not reach a plate. No phase timeout
// is treated as shot completion.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const [layoutFile,out,...reports]=process.argv.slice(2);
if(!reports.length)throw Error('Usage: node tools/check_escalator_transitions.mjs LAYOUT OUT NATIVE_REPORT...');
const layout=JSON.parse(await readFile(layoutFile)),cases=(await Promise.all(reports.map(async p=>JSON.parse(await readFile(p))))).flatMap(r=>r.results);
const checked=[];
for(const lane of layout.escalators)for(const end of ['lower','upper']){
 const id=lane.id+'-'+end+'-comb-transfer',plate=layout.panels.find(p=>p.id===id);assert(plate,id);
 const runs=cases.filter(r=>r.id===lane.id+'-'+end||r.id===lane.id+'-'+end+'-centered');assert(runs.length,'Missing native trial '+id);
 assert(runs.every(r=>!r.error&&!r.failure),'Successful native placement '+id);
 assert(runs.some(r=>r.surfaces.includes(id)),'Native contact '+id);
 const c=lane.lowerCenter,u=lane.uphill,side={x:u.z,z:-u.x};
 const along=p=>(p.x-c.x)*u.x+(p.z-c.z)*u.z,across=p=>(p.x-c.x)*side.x+(p.z-c.z)*side.z;
 const low=Math.min(...plate.vertices.map(along)),high=Math.max(...plate.vertices.map(along)),top=Math.max(...plate.vertices.map(p=>p.y)),width=Math.max(...plate.vertices.map(across));
 let footprintSamples=0;
 for(const run of runs)for(const s of run.trace.states){
  if(s.phase!=='Flight'&&s.phase!=='Result')continue;
  // Detect entering the plate solid from its walkable top; exclude balls
  // which have legitimately travelled below the escalator from elsewhere.
  if(along(s.ball)>low+.002&&along(s.ball)<high-.002&&Math.abs(across(s.ball))<width-.002&&s.ball.y>top-.15){
   footprintSamples++;assert(s.ball.y>=top-.002,`${id}: ball centre entered transfer solid at ${s.flightTime}`);
  }
 }
 checked.push({id,footprintSamples,contact:true});
}
const result={status:'pass',nativeCases:cases.length,plates:checked.length,checked};await writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,nativeCases:cases.length,plates:checked.length}));
