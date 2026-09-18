import assert from 'node:assert/strict';
import {Client} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local server');
const clients=[];
async function enter(token){
 const client=new Client(origin.replace(/^http/,'ws'));clients.push(client);await client.join(token);
 if(!client.messages.some(m=>m.type==='session'&&!m.restoring))await client.next(m=>m.type==='session'&&!m.restoring);
 return client;
}
try{
 const fresh=await enter(),catalog=fresh.messages.findLast(m=>m.type==='catalog').challenges;
 const campaign=catalog.filter(c=>c.campaign).sort((a,b)=>a.order-b.order),first=campaign[0],next=campaign[1];
 assert.equal(first.order,0);
 if(fresh.state.challenge?.id!==first.id)await fresh.next(m=>m.type==='state'&&m.challenge?.id===first.id);
 assert.equal(fresh.messages.findLast(m=>m.type==='session').challenge.id,first.id);
 const p=fresh.state.players.find(p=>p.id===fresh.id),start=first.start.center;
 assert.ok(Math.hypot(p.feet.x-start.x,p.feet.z-start.z)<=first.start.radius+.01,'The native robot starts inside level 1');
 await fresh.request('select-challenge',{challengeId:next.id},'selected');const token=fresh.token;fresh.close();
 const returning=await enter(token);assert.equal(returning.messages.findLast(m=>m.type==='session').challenge.id,next.id,'Returning players resume their chosen level');
 await assert.rejects(returning.request('select-challenge',{challengeId:null},'selected'),/Choose a level/);
 await returning.request('design-start',{},'design-ready');
 await returning.request('design-cancel',{},'design-cancelled');
 assert.equal(returning.messages.findLast(m=>m.type==='session').challenge.id,next.id,'Leaving the designer returns to the selected level');
 returning.close();
 const restored=await enter(token);assert.equal(restored.messages.findLast(m=>m.type==='session').challenge.id,next.id,'The selected level survives designing and reconnecting');
 console.log('PASS native first-level spawn, saved stage restoration and designer return and required level selection');
}finally{for(const client of clients)client.close();}
