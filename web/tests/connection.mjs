import assert from 'node:assert/strict';
import {ConnectionQueue} from '../connection-queue.ts';
import {gameConnection} from '../public/connection.js';

// A stalled native command may accumulate motion, but never delay a control
// behind obsolete motion or reorder aim across a charge/release barrier.
let release;const seen=[];
const queue=new ConnectionQueue(async m=>{seen.push(m);if(m.type==='select')await new Promise(r=>release=r);});
queue.push({type:'select'});
for(let n=0;n<180;n++)assert.ok(queue.push({type:'input',n}));
queue.push({type:'charge'});queue.push({type:'input',n:180});queue.push({type:'release'});
assert.equal(queue.pending,5);release();await new Promise(r=>setImmediate(r));
assert.deepEqual(seen.map(m=>m.n??m.type),['select',179,'charge',180,'release']);
const blocked=new ConnectionQueue(async()=>new Promise(r=>release=r));
for(let n=0;n<64;n++)assert.ok(blocked.push({type:'charge'}));
assert.equal(blocked.push({type:'release'}),false);blocked.close();release();
assert.equal(blocked.push({type:'input'}),false);

let time=0,next=0;const timers=new Map(),sockets=[],statuses=[],messages=[];
const later=(fn,ms)=>{const id=++next;timers.set(id,{fn,at:time+ms});return id;};
const advance=ms=>{const end=time+ms;while(true){const entry=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;time=entry[1].at;timers.delete(entry[0]);entry[1].fn();}time=end;};
class Socket{
 constructor(){this.readyState=0;this.bufferedAmount=0;this.sent=[];this.listeners={};sockets.push(this);}
 addEventListener(k,fn){this.listeners[k]=fn;}
 send(raw){this.sent.push(JSON.parse(raw));}
 close(){this.readyState=3;this.listeners.close?.({code:1006});}
 open(){this.readyState=1;this.listeners.open({});}
 receive(m){this.listeners.message({data:JSON.stringify(m)});}
}
let sessionId='session-A';
const transport=gameConnection({url:'ws://test',hello:()=>({token:'guest-secret',sessionId,lastResultAttempt:'result-A'}),onMessage:m=>messages.push(m),onStatus:s=>statuses.push(s),WebSocketImpl:Socket,now:()=>time,later,cancelLater:id=>timers.delete(id),random:()=>.5,events:null,document:null});
advance(0);sockets[0].open();assert.equal(sockets[0].sent[0].sessionId,'session-A');
sockets[0].receive({type:'welcome',resumed:true});assert.ok(transport.send('charge'));
sockets[0].close();assert.equal(transport.send('release'),false);advance(500);
sockets[1].open();assert.equal(sockets[1].sent[0].token,'guest-secret');
sockets[1].receive({type:'welcome',resumed:true});
assert.equal(sockets[1].sent.some(m=>m.type==='release'),false,'Never replay a stale release');
const count=messages.length;sockets[0].receive({type:'result'});assert.equal(messages.length,count,'Old socket ignored');
sockets[1].bufferedAmount=20000;assert.equal(transport.send('input'),false);sockets[1].bufferedAmount=0;
advance(1000);const probe=sockets[1].sent.at(-1);assert.equal(probe.type,'ping');
advance(20);sockets[1].receive({type:'pong',sequence:probe.sequence});assert.equal(statuses.at(-1),'latency');
advance(2980);assert.equal(sockets[1].readyState,1,'A brief packet gap gets a probe and grace period');
advance(1000);assert.equal(sockets[1].readyState,3,'Silent connection recovers within four seconds, instead of waiting twenty');
advance(500);sockets[2].open();sockets[2].receive({type:'welcome'});
transport.stop();assert.equal(sockets[2].sent.at(-1).type,'leave');advance(60000);assert.equal(sockets.length,3);
assert.ok(statuses.includes('reconnecting'));console.log('PASS coalesced input, control order, bounded queue, authenticated resume handshake, heartbeat and no stale command replay');

// Ordinary state traffic proves liveness even if a pong is delayed. Buffered
// shots have no live snapshots, so their pongs must keep the socket healthy.
const visible={hidden:false,visibilityState:'visible',addEventListener(type,fn){this.wake=fn;},removeEventListener(){}};
const healthy=gameConnection({url:'ws://test',hello:()=>({}),onMessage(){},onStatus(){},WebSocketImpl:Socket,now:()=>time,later,cancelLater:id=>timers.delete(id),random:()=>.5,events:null,document:visible});
advance(0);const live=sockets.at(-1);live.open();live.receive({type:'welcome'});
for(let i=0;i<40;i++){advance(500);live.receive({type:'state'});}assert.equal(live.readyState,1,'State traffic prevents a false timeout');
for(let i=0;i<20;i++){advance(1000);const ping=live.sent.findLast(m=>m.type==='ping');if(ping)live.receive({type:'pong',sequence:ping.sequence});}assert.equal(live.readyState,1,'Quiet precomputed playback stays connected');
visible.hidden=true;visible.visibilityState='hidden';advance(10000);assert.equal(live.readyState,1,'Hidden tabs do not churn connections');
visible.hidden=false;visible.visibilityState='visible';visible.wake();advance(2000);assert.equal(live.readyState,1,'Foreground wake gets a fresh probe and grace');healthy.stop();
console.log('PASS live-state liveness, quiet buffered shots and background/wake grace');

// Chrome can suspend a background page beyond both heartbeat and retry timers.
// A closed socket must stay parked until foreground, rather than opening fresh
// sessions every minute while no rendering/input can run.
const background={hidden:false,visibilityState:'visible',addEventListener(type,fn){this.wake=fn;},removeEventListener(){}};
const parked=gameConnection({url:'ws://test',hello:()=>({sessionId:'parked-session'}),onMessage(){},onStatus(){},WebSocketImpl:Socket,now:()=>time,later,cancelLater:id=>timers.delete(id),random:()=>.5,events:null,document:background});
advance(0);const beforeSleep=sockets.at(-1);beforeSleep.open();beforeSleep.receive({type:'welcome',resumed:true});
background.hidden=true;background.visibilityState='hidden';background.wake();beforeSleep.close();
const beforeWake=sockets.length;advance(180000);
assert.equal(sockets.length,beforeWake,'A disconnected background tab must not keep opening sockets');
background.hidden=false;background.visibilityState='visible';background.wake();
assert.equal(sockets.length,beforeWake+1,'Foreground reconnects immediately');
const afterSleep=sockets.at(-1);afterSleep.open();assert.equal(afterSleep.sent[0].sessionId,'parked-session');afterSleep.receive({type:'welcome',resumed:true});parked.stop();
console.log('PASS background disconnect parking and immediate authenticated foreground resume');
