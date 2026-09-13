// Private network fault injection: buffer eight seconds of ordinary 30 Hz input,
// then deliver the TCP backlog. The authority must retain the live flight.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4306';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const proxy=new WebSocketServer({host:'127.0.0.1',port:0});await once(proxy,'listening');
let paused=false,upstream,downstream;const up=[],down=[];let closed=null,inputs=0;
proxy.on('connection',socket=>{
 downstream=socket;upstream=new WebSocket(origin.replace('http','ws'),{origin});
 socket.on('message',raw=>{if(paused||upstream.readyState!==1)up.push(raw);else upstream.send(raw);});
 upstream.on('open',()=>{if(!paused)up.splice(0).forEach(raw=>upstream.send(raw));});
 upstream.on('message',raw=>{if(paused)down.push(raw);else if(socket.readyState===1)socket.send(raw);});
 upstream.on('close',(code,reason)=>{closed={code,reason:reason.toString()};if(socket.readyState===1)socket.close([1005,1006].includes(code)?1001:code,reason);});
 socket.on('close',()=>upstream.close());
});
const c=new Client('ws://127.0.0.1:'+proxy.address().port);let ticker;
try{
 await c.join();const course=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-crossstation');await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
 const aim=course.hint;ticker=setInterval(()=>{if(c.socket.readyState===1){c.input(aim);inputs++;}},1000/30);
 c.input(aim);await delay(150);c.send('charge',{challengeId:course.id,revision:course.revision,layout:c.state.layout,physics:c.state.physics,powerRange:aim.powerRange});await delay(aim.holdMs);c.send('release');await c.next(m=>m.type==='state'&&m.phase==='Flight');await delay(500);
 {const deadline=performance.now()+15000;while(c.playback.stats().shotBufferedSeconds<10){assert.ok(performance.now()<deadline,'Trajectory should build ten seconds of runway');await delay(50);}}
 const bufferedBefore=c.playback.stats().shotBufferedSeconds;
 const before=c.state.stationTime;paused=true;await delay(8000);const heldInputs=up.length;paused=false;
 up.splice(0).forEach(raw=>upstream.send(raw));down.splice(0).forEach(raw=>{if(downstream.readyState===1)downstream.send(raw);});await delay(1200);
 const result={closed,heldInputs,normalInputHz:30,bufferedBefore,underrunMs:c.playback.stats().shotUnderrunMs,simulationAdvance:c.state.stationTime-before,phase:c.state.phase,inputs};
 console.log(JSON.stringify(result));
 {assert.equal(closed,null,'A network stall must not turn normal input into a policy disconnect');assert.ok(result.simulationAdvance>8,'Native simulation continues during the network gap');assert.equal(c.state.phase,'Flight');assert.equal(result.underrunMs,0,'Buffered animation never waits for a snapshot during the outage');}
}finally{clearInterval(ticker);c.close();upstream?.terminate();downstream?.terminate();await new Promise(r=>proxy.close(r));}
