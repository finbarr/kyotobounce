import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const [reportFile,out]=process.argv.slice(2);if(!out)throw Error('Usage: node tools/check_garden_evidence.mjs NATIVE_REPORT OUT');
const r=JSON.parse(await readFile(reportFile));assert.equal(r.results.length,9);assert(r.results.every(s=>!s.error&&!s.failure));
const walk=r.results.find(s=>s.id==='continuous-garden-walk');assert.equal(walk.checkpoints.length,3);
const positions=walk.trace.states.flatMap(s=>s.players.map(p=>p.feet));const placed=positions.findIndex(p=>p.y>49.57);assert(placed>=0);const feet=positions.slice(placed);assert(Math.min(...feet.map(p=>p.y))>49.57);assert(walk.checkpoints[1].feet.y>54.49);
const balls=r.results.filter(s=>s!==walk);assert(balls.every(s=>s.frames>60&&(s.final.flightTime>5||s.final.phase==='Result')&&s.minBallY>54.49));
for(const id of ['west-guard','east-guard','north-guard','south-guard'])assert(r.results.find(s=>s.id===id).surfaces.includes('k008-perimeter-guard-glass'));
for(const id of ['west','east','arrival','south'])assert(balls.some(s=>s.surfaces.includes('k008-garden-deck-'+id)));
for(const s of balls.filter(s=>s.final.phase==='Result')){assert(s.final.diagnostics.sleeping);assert.equal(Math.hypot(...Object.values(s.final.velocity)),0);assert.equal(Math.hypot(...Object.values(s.final.spin)),0);}
const result={status:'pass',layout:r.layoutSha256,continuousWalkCheckpoints:walk.checkpoints,floorSections:4,perimeterSides:4,shots:balls.length,ballMinimumY:Math.min(...balls.map(s=>s.minBallY)),endedShotsPhysicallyRested:true};await writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
