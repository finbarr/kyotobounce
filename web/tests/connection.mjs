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
advance(5000);const probe=sockets[1].sent.at(-1);assert.equal(probe.type,'ping');
advance(20);sockets[1].receive({type:'pong',sequence:probe.sequence});assert.equal(statuses.at(-1),'latency');
advance(20000);assert.equal(sockets[1].readyState,3,'Silent connection closes after missed heartbeat');
advance(500);sockets[2].open();sockets[2].receive({type:'welcome'});
transport.stop();assert.equal(sockets[2].sent.at(-1).type,'leave');advance(60000);assert.equal(sockets.length,3);
assert.ok(statuses.includes('reconnecting'));console.log('PASS coalesced input, control order, bounded queue, authenticated resume handshake, heartbeat and no stale command replay');
