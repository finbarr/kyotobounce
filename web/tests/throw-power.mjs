import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
import {THROW_MODEL,SCORING_VERSION} from '../types.ts';
import {throwSpeed} from '../public/throw-power.js';
const starters=JSON.parse(await readFile(new URL('../starter-challenges.json',import.meta.url),'utf8'));
const store=new Store(':memory:');
try{
 for(const c of starters){store.saveChallenge(c);assert.equal(c.throwModel,THROW_MODEL);assert.ok(Number.isFinite(throwSpeed(c.hint.holdMs/2800,c.hint.powerRange)));}
 assert.equal(new Set(starters.map(c=>c.id)).size,starters.length,'Only current starter definitions ship');
 assert.equal(throwSpeed(0),.5);assert.equal(throwSpeed(1),100);assert.equal(throwSpeed(1,'precision'),12);assert.equal(throwSpeed(.5),50.25);
 assert.throws(()=>throwSpeed(.5,'full','retired-model'),/Unsupported/);
 const sent=[],worker={ready:false,send:m=>sent.push(m),request:async()=>({ok:true})};
 const competition=new Competition(store,worker,()=>{}),guest=store.guest(),member=await competition.add(guest,'power-fixture');
 member.restoring=false;competition.layout='station';competition.physics='kyoto-p3-2';
 const intent={type:'charge',layout:competition.layout,physics:competition.physics};
 await assert.rejects(competition.command(member,{...intent,powerRange:'turbo'}),/Choose precision/);
 await competition.command(member,{...intent,powerRange:'precision'});
 assert.equal(sent.at(-1).powerRange,'precision');
 await assert.rejects(competition.command(member,{type:'release',powerRange:'full'}),/intent only/,'A range cannot change on release');
 competition.clearAttempt(member);
 console.log('PASS current starter hints, linear launch ranges and charge-time locking');
}finally{store.close();}
