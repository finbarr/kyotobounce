import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Client,delay} from './api-client.mjs';
import {scoreAttempt} from '../scoring.ts';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4292';
assert.ok(new URL(origin).hostname==='127.0.0.1','Private runtime only');
const url=origin.replace(/^http/,'ws'),clients=[];
const make=()=>{const c=new Client(url);clients.push(c);return c;};
async function resume(old,token=old.token,lastResultAttempt){
 const c=make();await once(c.socket,'open');
 const welcomed=await c.request('hello',{token,sessionId:old.id,lastResultAttempt},'welcome');
 if(!c.state)await c.next(m=>m.type==='state');return {c,welcomed};
}
try{
 let c=make();await c.join();const course=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-first-bank');
 await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const charge=()=>c.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,powerRange:'precision'});
 c.input();await delay(100);charge();await delay(260);c.send('release');await delay(700);
 assert.notEqual(c.state.phase,'Result');const old=c,id=c.id,flightTime=c.state.elapsed;
 c.socket.terminate();await delay(700);const resumed=await resume(c);c=resumed.c;
 assert.equal(resumed.welcomed.resumed,true);assert.equal(c.id,id);assert.equal(c.state.challenge.id,course.id);
 const result=c.messages.find(m=>m.type==='result')||await c.next(m=>m.type==='result',45000);
 const replay=(await c.request('replay',{attempt:result.attempt},'replay')).replay;
 assert.deepEqual(scoreAttempt(replay),result.breakdown);assert.equal(replay.score,result.score);
 c.socket.terminate();await delay(100);const cached=await resume(c);c=cached.c;
 const repeated=c.messages.find(m=>m.type==='result')||await c.next(m=>m.type==='result');assert.equal(repeated.attempt,result.attempt);
 c.socket.terminate();await delay(100);const seen=await resume(c,c.token,result.attempt);c=seen.c;await delay(200);
 assert.equal(c.messages.filter(m=>m.type==='result').length,0,'Acknowledged result not duplicated');
 c.send('recall');await delay(200);c.input();await delay(100);charge();await delay(300);
 // Also recover a half-open connection before the old server close callback.
 const replacement=await resume(c);c=replacement.c;await delay(200);
 assert.equal(c.state.phase,'Aim');assert.equal(c.state.power,0);
 c.send('release');await delay(200);assert.equal(c.state.phase,'Aim','Unreleased charge cannot become a stale throw');
 const thief=await resume(c,'wrong-token');assert.equal(thief.welcomed.resumed,false);assert.notEqual(thief.c.id,c.id);thief.c.close();
 c.close();await delay(200);const sessions=await(await fetch(origin+'/api/debug/sessions')).json();
 assert.ok(!sessions.sessions.some(s=>s.id===id),'Explicit leave frees slot');
 console.log(JSON.stringify({status:'pass',checks:['in-flight resume preserves session and score','saved replay parity','missed result recovery','result acknowledgement dedup','half-open windup cancels','wrong token cannot resume','explicit leave frees slot'],flightTime,attempt:result.attempt}));
}finally{clients.forEach(c=>c.close());}
