import assert from'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';
const [beforeFile,afterFile,apronFile,out]=process.argv.slice(2);const read=async p=>JSON.parse(await readFile(p));const before=await read(beforeFile),after=await read(afterFile),aprons=await read(apronFile);
const breach=r=>r.trace.states.some(s=>s.phase==='Flight'&&s.ball.x>=29.5&&s.ball.x<=34.3&&s.ball.z>5.94&&s.ball.z<7.06&&s.ball.y<5.48&&s.ball.y>4.9);
assert(before.results.some(breach),'Baseline must reproduce entry into solid landing');
const lifts=after.results.filter(r=>r.id.includes('--130-'));assert.equal(lifts.length,4);
for(const r of lifts){assert(!r.error&&!breach(r),r.id+' must not enter the landing slab');assert.equal(r.final.phase,'Result');assert(r.final.ball.y>5.52);assert(r.final.diagnostics.sleeping);assert(Math.hypot(...Object.values(r.final.velocity))<1e-5&&Math.hypot(...Object.values(r.final.spin))<1e-5);}
for(const r of aprons.results){assert(r.surfaces.some(s=>s.startsWith('east-lower-runout-apron-')),r.id+' must hit new support');for(const s of r.trace.states){const b=s.ball;if(s.phase==='Flight'&&b.x>=28.624&&b.x<=29.476)assert(b.y>=5.52,r.id+' ball penetrated repaired apron footprint');}}
const result={status:'pass',baselineReproduced:true,topTransferPhases:lifts.length,apronContacts:aprons.results.length,nativeStoppedWithZeroTranslationAndSpin:true};await writeFile(out,JSON.stringify(result,null,2));console.log(result);
