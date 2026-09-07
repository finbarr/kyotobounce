import assert from 'node:assert/strict';
import { Store } from '../store.ts';
import { THROW_MODEL } from '../types.ts';
const s=new Store(':memory:');
try{
 const a=s.guest(),b=s.guest();s.rename(a.id,'A');s.rename(b.id,'B');
 const c={id:'fixture',revision:1,creator:a.id,name:'Storage fixture',layout:'layout',physics:'physics',start:{center:{x:0,y:0,z:0},radius:1,surface:'floor'},goal:{center:{x:2,y:0,z:0},radius:1,surface:'floor'}};
 s.saveChallenge(c);
 const result=(id,guest,score,duration,revision=1)=>({type:'result',attempt:id,id:guest,challenge:{...c,revision},layout:'layout',physics:'physics',profile:'profile',success:true,score,surfaces:(score-1000)/100,impacts:3,duration,releaseTime:20,chargeTime:19,thrower:{id:guest},launchPosition:{x:0,y:1,z:0},velocity:{x:1,y:0,z:0},spin:{x:0,y:0,z:0},poses:[{t:0,p:{x:0,y:1,z:0},q:{x:0,y:0,z:0,w:1}}],contacts:[]});
 assert.equal(s.saveResult(result('a1',a.id,1100,3),'animation'),true);
 assert.equal(s.saveResult(result('a1',a.id,999900,1),'animation'),false);
 assert.equal(s.replay('a1').score,1100,'Duplicate attempt cannot replace its score or replay');
 s.saveResult(result('a2',a.id,1200,4),'animation');s.saveResult(result('b1',b.id,1200,3),'animation');
 assert.deepEqual(s.leaderboard(c).map(r=>r.attempt),['b1','a2'],'One best per guest, duration breaks equal scores');
 s.saveChallenge({...c,revision:2,throwModel:'robot-v2',goal:{...c.goal,radius:.5}});s.saveResult(result('a3',a.id,1400,2,2),'animation');
 assert.equal(s.leaderboard(c).length,2);assert.deepEqual(s.leaderboard({...c,revision:2}).map(r=>r.attempt),['a3'],'Revisions have separate boards');
 const miss={...result('miss',b.id,0,30),success:false,surfaces:0};s.saveResult(miss,'animation');assert.equal(s.replay('miss'),null);assert.equal(s.leaderboard(c).length,2);
 assert.equal(s.guest(a.token).id,a.id,'Guest token restores identity');
 const replayBefore=JSON.stringify(s.replay('a1')),old=s.challenge(c.id,2);
 s.upgradeThrowModels();const upgraded=s.challenge(c.id);
 assert.equal(upgraded.revision,3);assert.equal(upgraded.throwModel,THROW_MODEL);
 assert.deepEqual(upgraded.goal,old.goal);assert.deepEqual(s.challenge(c.id,2),old);
 assert.equal(s.leaderboard(upgraded).length,0,'New throw rules cannot inherit old scores');
 assert.deepEqual(s.leaderboard(old).map(r=>r.attempt),['a3']);
 assert.equal(JSON.stringify(s.replay('a1')),replayBefore,'Historical replay is immutable');
 s.upgradeThrowModels();assert.equal(s.challenge(c.id).revision,3,'Restart cannot create duplicate revisions');
 console.log('PASS SQLite score/replay atomic record, duplicates, best-per-guest, ties, revisions, misses and guest identity');
}finally{s.close();}
