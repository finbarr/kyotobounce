import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const [beforeFile,afterFile,out]=process.argv.slice(2);
if(!out)throw Error('Usage: node tools/check_shop_evidence.mjs BEFORE AFTER OUT');
const before=JSON.parse(await readFile(beforeFile)),after=JSON.parse(await readFile(afterFile));
assert(before.results.find(s=>s.id==='missing-shop-approach-walk').final.players[0].feet.y<1);
assert(before.results.find(s=>s.id==='missing-shop-approach-ball').minBallY<1);
assert.equal(after.results.length,9);assert(after.results.every(s=>!s.error&&!s.failure));
const walk=after.results.find(s=>s.id==='continuous-shop-walk');assert.equal(walk.checkpoints.length,4);
const positions=walk.trace.states.flatMap(s=>s.players.map(p=>p.feet));const firstPlaced=positions.findIndex(p=>p.y>7.34);assert(firstPlaced>=0);assert(Math.min(...positions.slice(firstPlaced).map(p=>p.y))>7.34);
const balls=after.results.filter(s=>s!==walk);assert(balls.every(s=>s.frames>60&&(s.final.flightTime>5||s.final.phase==='Result')&&s.minBallY>7.35));
for(const [id,surface]of [['repaired-approach-ball','k019-west-2f-gallery'],['doorway-entry-ball','konbini-floor'],['shop-back-wall','konbini-back'],['shop-north-wall','konbini-side--1'],['shop-south-wall','konbini-side-1'],['shop-front-pane','konbini-front-pane-1'],['gallery-west-guard','k019-gallery-west-guard'],['gallery-south-guard','k019-gallery-south-guard']])assert(balls.find(s=>s.id===id).surfaces.includes(surface));
const entry=balls.find(s=>s.id==='doorway-entry-ball');assert(entry.trace.states.some(s=>s.phase==='Flight'&&s.ball.x>-53.8&&s.ball.y>7.35&&s.ball.z>-18.9&&s.ball.z<-17.1),'Ball passes through physical doorway');
for(const s of balls.filter(s=>s.final.phase==='Result')){assert(s.final.diagnostics.sleeping);assert.equal(Math.hypot(...Object.values(s.final.velocity)),0);assert.equal(Math.hypot(...Object.values(s.final.spin)),0);}
const result={status:'pass',layout:after.layoutSha256,baselineUnsupportedApproachReproduced:true,continuousWalkCheckpoints:walk.checkpoints,shots:balls.length,ballMinimumY:Math.min(...balls.map(s=>s.minBallY)),endedShotsPhysicallyRested:true};await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
