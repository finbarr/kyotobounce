import assert from 'node:assert/strict';
import {ComboTracker,scoreAttempt} from '../scoring.ts';
import {Store} from '../store.ts';
import {SCORING_VERSION} from '../types.ts';
const p=(x,y=.023,z=0)=>({x,y,z});
const pose=(t,x,y=.023,z=0)=>({t,p:p(x,y,z),q:{x:0,y:0,z:0,w:1}});
const c={id:'combo',revision:1,name:'Combo',creator:'tester',throwModel:'robot-v3',scoring:SCORING_VERSION,start:{center:p(0,0),radius:.75,surface:'floor'},goal:{center:p(20,0),radius:1,surface:'floor'},layout:'test',physics:'test'};
const hits=Array.from({length:12},(_,i)=>({surface:`bank-${i}`,label:`Bank ${i}`,point:p(i*1.4,0),time:i*.5+.1,speed:4,qualifying:true}));
const result=(extra={})=>({type:'result',attempt:'a',id:'tester',challenge:c,reason:'Target settled',success:true,score:0,surfaces:12,impacts:12,duration:10,releaseTime:20,chargeTime:17,thrower:{},launchPosition:p(0,1),velocity:p(4,0),spin:p(0,0),layout:'test',physics:'test',profile:'test',poses:[pose(0,0,1),pose(6,15,1),pose(10,20)],contacts:hits,...extra});
const monster=scoreAttempt(result());assert.ok(monster.total>1_000_000,'A demanding varied line earns millions, not a fixed 10k ceiling');assert.equal(monster.styleBanks,12);
const repeated=scoreAttempt(result({contacts:hits.map(h=>({...h,surface:'wall'}))}));assert.equal(repeated.styleBanks,1);
const treads=scoreAttempt(result({contacts:hits.map((h,i)=>({...h,surface:`west-escalator-step-${i}`}))}));assert.equal(treads.styleBanks,1,'One escalator is one bank family');
const chatter=scoreAttempt(result({contacts:hits.map(h=>({...h,point:p(1,0)}))}));assert.equal(chatter.styleBanks,1);
const slow=scoreAttempt(result({contacts:hits.map(h=>({...h,speed:.5}))}));assert.equal(slow.styleBanks,0);
const stationary=scoreAttempt(result({poses:[pose(0,20),pose(240,20)],contacts:[]}));assert.equal(stationary.timeMultiplier,1,'Stationary rest adds no time');
const creep=scoreAttempt(result({poses:[pose(0,17),pose(240,20)],contacts:[]}));assert.equal(creep.timeMultiplier,6,'Slow creep earns time up to the existing 60-second bonus cap');
const tagPoses=[pose(0,17),pose(.03,23),pose(3,40)];
const tag=scoreAttempt(result({poses:tagPoses,contacts:[],success:false}));assert.equal(tag.goalVisited,true,'Swept native poses catch high-speed crossings');assert.equal(tag.landingMultiplier,.25,'Touching the goal banks 25% even when it escapes');
const farm=scoreAttempt(result({poses:[...tagPoses,pose(50,80)],contacts:hits,success:false}));assert.equal(farm.styleBanks,0,'No banks after the first target entry');assert.equal(farm.activeSeconds,50,'Movement after a tag keeps earning time');
// Entry, slow translation, pure spin, equivalent quaternion sign, then rest.
const settlePoses=[pose(0,18),pose(1,19.5),pose(2,19.6),{...pose(3,19.6),q:{x:0,y:1,z:0,w:0}},{...pose(4,19.6),q:{x:0,y:-1,z:0,w:0}},{...pose(5,19.6),q:{x:0,y:-1,z:0,w:0}}];
const settling=new ComboTracker(c);settling.poses(settlePoses.slice(0,2));assert.equal(settling.value().firstVisit,1);assert.equal(settling.value().activeSeconds,1);
settling.poses(settlePoses.slice(2,3));assert.equal(settling.value().activeSeconds,2,'Post-entry movement below 0.35 m/s still earns time');
settling.poses(settlePoses.slice(3,4));assert.equal(settling.value().activeSeconds,3,'Pure spin earns time until rotation stops');
settling.poses(settlePoses.slice(4));assert.equal(settling.value().activeSeconds,3,'Quaternion sign changes and rest do not earn time');
settling.poses([{...pose(6,19.6),q:{x:1e-12,y:-1.0000001,z:0,w:0}}]);assert.equal(settling.value().activeSeconds,3,'Equivalent quaternion normalization and roundoff do not manufacture time');
assert.deepEqual(settling.value({success:true}),scoreAttempt(result({poses:settlePoses,contacts:[]})));
const archived=result({challenge:{...c,scoring:'combo-v4'},poses:settlePoses,contacts:[]});
const legacy=scoreAttempt(archived);assert.equal(legacy.version,'combo-v4');assert.equal(legacy.activeSeconds,1);assert.equal(legacy.total,10833,'Archived v4 keeps its exact original arithmetic');
assert.equal(scoreAttempt(result({challenge:archived.challenge,poses:[pose(0,17),pose(240,20)],contacts:[]})).timeMultiplier,1,'Archived v4 retains slow-creep exclusion');
for(const height of [-1,3]){const miss=scoreAttempt(result({poses:tagPoses.map(a=>({...a,p:{...a.p,y:height}})),contacts:hits,success:false}));assert.equal(miss.goalVisited,false,'Other floors are not target hits');assert.equal(miss.total,0,'Even a large combo earns zero on a distant untagged miss');}
const rings=[0,.25,.5,.75,1].map(f=>scoreAttempt(result({success:false,poses:[pose(0,21-.023+7*f)],contacts:[]})).landingMultiplier);
assert.deepEqual(rings.map(x=>Math.round(x*100)),[100,75,50,25,0],'Bullseye percentages match the actual landing formula');
assert.equal(scoreAttempt(result({reason:'Recalled'})).total,0);
assert.equal(scoreAttempt(result({challenge:{...c,requiredSurface:'missing'}})).total,0);
const tracker=new ComboTracker(c);const r=result();for(const h of hits)tracker.contact(h);tracker.poses(r.poses.slice(0,2));const before=tracker.value();tracker.poses(r.poses.slice(2));assert.ok(before.potential<monster.potential);assert.deepEqual(tracker.value({success:true}),monster,'Chunked live telemetry and final replay calculate exactly the same score');
assert.throws(()=>tracker.poses([pose(-1,0)]),/backwards/);
const s=new Store(':memory:');try{
 const guest=s.guest();const old={...c,scoring:'accuracy-v3',allowedInputs:{chargeSeconds:1.2,power:[0,1],pitch:[-65,80],top:[-200,200],kick:[-200,200]},hint:{yaw:90,pitch:15,top:0,kick:0,holdMs:360,note:'test'}};
 s.saveChallenge(old);s.saveResult(result({attempt:'old',id:guest.id,challenge:old,score:10800}),'ori-carry-v2');const replay=JSON.stringify(s.replay('old'));
 s.upgradeScoring();s.upgradeScoring();const latest=s.challenge(c.id);assert.equal(latest.revision,2);assert.equal(latest.scoring,SCORING_VERSION);assert.equal(latest.allowedInputs.chargeSeconds,2.8);assert.equal(latest.hint.holdMs,840);assert.equal(s.leaderboard(latest).length,0);assert.equal(JSON.stringify(s.replay('old')),replay,'Old scores and immutable replays stay untouched');
 const oldCombo={...c,id:'old-combo',scoring:'combo-v4',allowedInputs:{chargeSeconds:2.8,power:[0,1],pitch:[-65,80],top:[-200,200],kick:[-200,200]},hint:{yaw:90,pitch:15,top:0,kick:0,holdMs:840,note:'v4'}};
 s.saveChallenge(oldCombo);s.saveResult({...archived,attempt:'old-combo',id:guest.id,challenge:oldCombo,score:legacy.total,breakdown:legacy},'ori-carry-v2');
 const oldBody=JSON.stringify(s.challenge(oldCombo.id,1)),oldReplay=JSON.stringify(s.replay('old-combo')),oldBoard=JSON.stringify(s.leaderboard(oldCombo));
 s.upgradeScoring();s.upgradeScoring();const current=s.challenge(oldCombo.id);assert.equal(current.revision,2);assert.equal(current.scoring,SCORING_VERSION);assert.equal(current.hint.holdMs,840);
 assert.equal(JSON.stringify(s.challenge(oldCombo.id,1)),oldBody);assert.equal(JSON.stringify(s.replay('old-combo')),oldReplay);assert.equal(JSON.stringify(s.leaderboard(oldCombo)),oldBoard);assert.equal(s.leaderboard(current).length,0);
}finally{s.close();}
console.log('PASS million-point combos, repeated surfaces, chatter, swept tags, ring accuracy, post-entry movement/spin timer, rest, legacy stability, live/final parity and rules migration');
