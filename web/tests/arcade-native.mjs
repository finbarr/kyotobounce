import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const out='artifacts/phase3/at-rest/scoring';await mkdir(out,{recursive:true});
const c=new Client(),checks=[];
try{
 await c.join();const course=c.messages.find(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');assert.equal(course.scoring,'accuracy-v3');
 await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 // A slightly wide shot must receive proximity credit rather than zero.
 const near=await c.throw(365,{yaw:104,pitch:15});checks.push({name:'near',result:near.result});console.log('near',near.result.breakdown);
 assert.equal(near.result.breakdown.outcome,'near');assert.ok(near.result.score>0&&near.result.score<7500);assert.equal(near.result.success,false);assert.equal(near.result.saved,true);
 const replay=(await c.request('replay',{attempt:near.result.attempt},'replay')).replay;assert.equal(replay.success,false);assert.equal(replay.score,near.result.score);assert.ok(replay.poses.length>100);
 const board=(await c.request('leaderboard',{challengeId:course.id,revision:course.revision},'leaderboard')).entries;assert.ok(board.some(e=>e.attempt===near.result.attempt));
 c.send('recall');await delay(150);
 const tagged=await c.throw(440,{yaw:90,pitch:15});checks.push({name:'tagged',result:tagged.result});console.log('tagged',tagged.result.breakdown);
 assert.equal(tagged.result.breakdown.outcome,'tagged');assert.equal(tagged.result.breakdown.accuracy,7500);assert.ok(tagged.result.score<10000);
 c.send('recall');await delay(150);
 const initialCount=c.messages.filter(m=>m.type==='result').length;
 c.input({yaw:0,pitch:5});await delay(120);const lost=c.next(m=>m.type==='notice',15000);
 c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics});await delay(1250);c.send('release');
 const lostNotice=await lost;assert.match(lostNotice.message,/left the station/);await delay(150);
 assert.equal(c.messages.filter(m=>m.type==='result').length,initialCount);assert.equal(c.state.phase,'Aim');checks.push({name:'lost-cancelled',notice:lostNotice});
 c.input();await delay(100);c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics});await delay(365);c.send('release');await delay(500);
 const recalled=c.next(m=>m.type==='notice');c.send('recall');const recallNotice=await recalled;await delay(150);
 assert.match(recallNotice.message,/recalled/);assert.equal(c.messages.filter(m=>m.type==='result').length,initialCount);assert.equal(c.state.phase,'Aim');checks.push({name:'recall-cancelled',notice:recallNotice});
 const rejected=c.next(m=>m.type==='error');c.send('release',{score:99999});const spoof=await rejected;assert.match(spoof.message,/intent only/);
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',checks},null,2));console.log('PASS actual physics: partial leaderboard/replay, goal tag then escape, lost-ball cancellation, recall cancellation and intent-only authority');
}catch(e){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),checks,state:c.state},null,2));throw e;}finally{c.close();}
