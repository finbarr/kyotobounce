import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
import {THROW_MODEL,SCORING_VERSION} from '../types.ts';
import {throwSpeed} from '../public/throw-power.js';
const starters=JSON.parse(await readFile(new URL('../starter-challenges.json',import.meta.url),'utf8'));
const store=new Store(':memory:');
try{
 for(const c of starters)store.saveChallenge(c);
 const old=store.list();store.upgradeThrowModels();store.upgradeScoring();
 for(const c of old){
  const latest=store.challenge(c.id);
  const before=throwSpeed(c.hint.holdMs/(c.allowedInputs.chargeSeconds*1000),'full',c.throwModel);
  const after=throwSpeed(latest.hint.holdMs/(latest.allowedInputs.chargeSeconds*1000),latest.hint.powerRange,latest.throwModel);
  assert.ok(Math.abs(before-after)<.003,'Legacy hints must keep their actual launch speed through both migrations');
  assert.equal(latest.hint.powerRange,'precision');assert.doesNotMatch(latest.hint.note,/\d+% power/);
  assert.deepEqual(store.challenge(c.id,c.revision),c,'Historical revisions stay immutable');
 }
 const original={...store.list()[0],id:'live-v3',revision:1,throwModel:'robot-v3',hint:{...old[0].hint,holdMs:1750}};
 store.saveChallenge(original);store.upgradeThrowModels();const updated=store.challenge(original.id);
 assert.equal(updated.throwModel,THROW_MODEL);assert.equal(updated.hint.powerRange,'full');
 assert.ok(Math.abs(throwSpeed(.625,'full','robot-v3')-throwSpeed(updated.hint.holdMs/2800,updated.hint.powerRange))<1e-8);
 const revisions=JSON.stringify(store.list());store.upgradeThrowModels();store.upgradeScoring();assert.equal(JSON.stringify(store.list()),revisions);
 const sent=[],worker={ready:false,send:m=>sent.push(m),request:async()=>({ok:true})};
 const competition=new Competition(store,worker,()=>{}),guest=store.guest(),member=await competition.add(guest,'power-fixture');
 member.restoring=false;competition.layout='station';competition.physics='kyoto-p3-2';
 const intent={type:'charge',layout:competition.layout,physics:competition.physics};
 await assert.rejects(competition.command(member,{...intent,powerRange:'turbo'}),/Choose precision/);
 await competition.command(member,{...intent,powerRange:'precision'});
 assert.equal(sent.at(-1).powerRange,'precision');
 await assert.rejects(competition.command(member,{type:'release',powerRange:'full'}),/intent only/,'A range cannot change on release');
 competition.clearAttempt(member);
 await assert.rejects(competition.command(member,{type:'select-challenge',challengeId:original.id,revision:1}),/archived/);
 assert.equal(updated.scoring,SCORING_VERSION);
 console.log('PASS launch hint migration, old revisions, idempotence, validated range and charge-time locking');
}finally{store.close();}
