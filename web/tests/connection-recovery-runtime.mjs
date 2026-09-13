import assert from 'node:assert/strict';
import {WebSocket,WebSocketServer} from 'ws';
import {gameConnection} from '../public/connection.js';
import {ShotPlayback} from '../public/shot-playback.js';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const proxy=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise(r=>proxy.once('listening',r));
let blackout=false,upstreams=[],downstreams=[];
proxy.on('connection',down=>{
 const up=new WebSocket(origin.replace(/^http/,'ws'));upstreams.push(up);downstreams.push(down);const pending=[];
 down.on('message',raw=>{if(blackout)return;if(up.readyState===1)up.send(raw);else pending.push(raw);});
 up.on('open',()=>{for(const raw of pending)up.send(raw);});
 up.on('message',raw=>{if(!blackout&&down.readyState===1)down.send(raw.toString());});
 down.on('close',()=>up.close());up.on('close',()=>down.close());up.on('error',()=>{});
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const messages=[],statuses=[],playback=new ShotPlayback();let guest={},transport;
const wait=async predicate=>{const end=performance.now()+15000;while(performance.now()<end){const value=predicate();if(value)return value;await delay(10);}throw Error('Recovery test timed out');};
transport=gameConnection({url:`ws://127.0.0.1:${proxy.address().port}`,hello:()=>({protocol:'shot-stream-v4',token:guest.token,sessionId:guest.sessionId}),WebSocketImpl:WebSocket,events:null,document:null,onStatus:(status,extra)=>{statuses.push({status,...extra,at:performance.now()});if(status==='interrupted')blackout=false;},onMessage:m=>{
 if(m.type==='welcome')guest=m;
 if(m.type==='shot-resume')playback.resume(m);
 if(m.type==='shot-chunk')playback.accept(m,performance.now());
 if(m.type==='result')playback.result(m);
 messages.push(m);
}});
const sample=setInterval(()=>playback.sample(performance.now()),16);
try{
 await wait(()=>messages.find(m=>m.type==='state'));
 const course=messages.find(m=>m.type==='catalog').challenges.find(c=>c.id==='kyoto-corner-store');
 transport.send('select-challenge',{challengeId:course.id});await wait(()=>messages.find(m=>m.type==='selected'));
 transport.send('input',{x:0,z:0,...course.hint});await delay(120);
 transport.send('charge',{challengeId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,powerRange:'precision'});await delay(2900);transport.send('release');
 await wait(()=>playback.shot?.complete);
 const attempt=playback.shot.attempt,at=playback.shot.clock,failedAt=performance.now();blackout=true;
 await delay(1000);assert.ok(playback.shot.clock>at+.8,'Buffered physics keeps playing through a dead socket');
 await wait(()=>statuses.find(s=>s.status==='interrupted'));
 const recovered=await wait(()=>statuses.find(s=>s.status==='connected'&&s.resumed));
 assert.ok(recovered.at-failedAt<5000,'Resume happens within five seconds of blackholing all traffic');
 assert.equal(playback.shot.attempt,attempt,'Resumes the same throw');assert.ok(playback.shot.clock>at+2,'Playback never rewinds');
 const result=await wait(()=>messages.find(m=>m.type==='result'));
 assert.equal(result.attempt,attempt);assert.ok(result.saved&&result.score>0);
 assert.equal(messages.filter(m=>m.type==='welcome'&&!m.resumed).length,1,'Recovery creates no second physics session');
 assert.equal(playback.stats().shotUnderrunMs,0);
 console.log(JSON.stringify({pass:'Real socket blackout, fast authenticated resume, uninterrupted buffered physics and saved score',recoveredMs:Math.round(recovered.at-failedAt),replay:origin+'/replay/'+attempt,score:result.score}));
}finally{clearInterval(sample);transport.stop();for(const ws of [...upstreams,...downstreams])ws.terminate();await new Promise(r=>proxy.close(r));}
