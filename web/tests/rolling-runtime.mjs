import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const client=new Client(),out='artifacts/phase3/at-rest';await mkdir(out,{recursive:true});
try{
 await client.join();await client.request('select-challenge',{challengeId:null},'selected');
 const shotPromise=client.throw(876,{yaw:90,pitch:35},120000);
 await Promise.race([client.next(s=>s.type==='state'&&s.phase==='Flight'&&s.flightTime>30,45000),shotPromise.then(shot=>{throw new Error('Control throw stopped before 30 seconds: '+shot.result.duration);})]);
 const at30=structuredClone(client.state);
 assert.equal(client.messages.filter(m=>m.type==='result').length,0,'No 30-second finish');
 assert.ok(!at30.diagnostics.sleeping,'The ball is still physically moving after 30 seconds');
 const shot=await shotPromise;await delay(1200);const later=client.state;
 assert.equal(shot.result.reason,'Ball stopped outside the goal');assert.ok(shot.result.duration>30);
 assert.equal(later.phase,'Result');assert.equal(later.diagnostics.sleeping,true);assert.equal(later.diagnostics.simulating,false);
 assert.deepEqual(later.velocity,{x:0,y:0,z:0});assert.deepEqual(later.spin,{x:0,y:0,z:0});
 assert.equal(client.messages.filter(m=>m.type==='result').length,1);
 assert.deepEqual(later.ball,shot.state.ball);assert.equal(later.flightTime,shot.state.flightTime);
 await writeFile(`${out}/runtime.json`,JSON.stringify({status:'pass',at30,result:shot.result,atRest:shot.state,later},null,2));
 console.log(`PASS real atrium: still in play after 30 seconds; finished at physical rest after ${shot.result.duration.toFixed(2)} seconds`);
}finally{client.close();}
