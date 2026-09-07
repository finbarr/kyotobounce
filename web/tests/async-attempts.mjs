import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const out='artifacts/phase3/async-play';await mkdir(out,{recursive:true});
const a=new Client(),b=new Client(),errors=[];let result;
async function select(c,id){await c.request('select-challenge',{challengeId:id},'selected');if(c.state.challenge?.id!==id)await c.next(m=>m.type==='state'&&(m.challenge?.id||null)===id);}
try{
 await a.join();await b.join(a.token);assert.equal(a.guestId,b.guestId);assert.notEqual(a.id,b.id);
 await select(a,'atrium-first-bank');await select(b,'atrium-return-ticket');await delay(100);
 assert.equal(a.state.challenge.id,'atrium-first-bank');assert.equal(b.state.challenge.id,'atrium-return-ticket');
 assert.deepEqual(a.state.players.map(p=>p.id),[a.id]);assert.deepEqual(b.state.players.map(p=>p.id),[b.id]);
 const startA=a.state.stationTime,startB=b.state.stationTime;await delay(1000);
 for(const elapsed of [a.state.stationTime-startA,b.state.stationTime-startB])assert.ok(elapsed>.8&&elapsed<1.2,'Each private clock advances once, not once per connected guest');
 const ar=a.throw(365),br=b.throw(298,{top:-200});
 await a.next(m=>m.type==='state'&&m.phase==='Flight');
 assert.equal(a.state.challenge.id,'atrium-first-bank');
 const [first,second]=await Promise.all([ar,br]);
 assert.equal(first.result.success,true);assert.equal(second.result.success,true);
 assert.equal(first.result.score,1100);assert.equal(second.result.score,1100);
 assert.ok(a.messages.filter(m=>['state','impact','result'].includes(m.type)).every(m=>m.id===a.id),'No live state leaks from another session');
 assert.ok(b.messages.filter(m=>['state','impact','result'].includes(m.type)).every(m=>m.id===b.id));
 // Another player's recorded shot can be watched without selecting their level.
 const replay=await a.request('replay',{attempt:second.result.attempt},'replay');
 assert.equal(replay.replay.challenge.id,'atrium-return-ticket');assert.equal(a.state.challenge.id,'atrium-first-bank');
 const board=await a.request('leaderboard',{challengeId:'atrium-first-bank',revision:1},'leaderboard');
 assert.ok(board.entries.some(e=>e.guest===a.guestId&&e.attempt===first.result.attempt));
 // A different browser can create a level while the first shot is in flight.
 const nextShot=a.throw(365);await a.next(m=>m.type==='state'&&m.phase==='Flight');
 await select(b,null);const start=await b.place({x:0,y:0,z:20},.75,'start'),goal=await b.place({x:8.8,y:0,z:20},.75,'goal');
 const saved=await b.request('save-challenge',{name:'Async Atrium Bank',start,goal},'saved-challenge');
 assert.equal(saved.challenge.creator,a.guestId);
 await select(b,saved.challenge.id);assert.equal(a.state.phase,'Flight');assert.equal(a.state.challenge.id,'atrium-first-bank');
 assert.equal((await nextShot).result.success,true);
 // Quitting one tab only removes its private solver.
 b.close();await delay(250);assert.equal(a.socket.readyState,1);assert.deepEqual(a.state.players.map(p=>p.id),[a.id]);
 await assert.rejects(a.request('charge',{challengeId:'atrium-first-bank',revision:1,layout:a.state.layout,physics:a.state.physics,power:1},'result'),/intent only/);
 result={status:'pass',sameGuestIndependentTabs:true,privateSessionIds:[a.id,b.id],guestId:a.guestId,simultaneousScores:[first.result.score,second.result.score],separateLevels:[first.result.challenge.id,second.result.challenge.id],createdDuringPeerFlight:saved.challenge.id,sharedReplay:second.result.attempt,clockElapsed:[a.state.stationTime-startA,b.state.stationTime-startB],errors};
 console.log('PASS private simultaneous attempts, shared score/replay identity, independent clocks and level creation during another shot');
}catch(e){result={status:'fail',error:String(e),aState:a.state,bState:b.state};throw e;}
finally{await writeFile(`${out}/protocol.json`,JSON.stringify(result,null,2)+'\n');a.close();b.close();}
