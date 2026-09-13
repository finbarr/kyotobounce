import assert from 'node:assert/strict';
import {ComboTracker,scoreAttempt} from '../scoring.ts';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
const p=(x,y=0,z=0)=>({x,y,z}),q={x:0,y:0,z:0,w:1};
const start={center:p(0),radius:.75,surface:'floor'},goal={center:p(20),radius:1,surface:'floor'};
const targets=Array.from({length:3},(_,i)=>({id:`w${i}`,center:p(i),normal:p(0,1),radius:.5,surface:'floor'}));
const c={id:'waypoint-test',revision:1,name:'Targets',creator:'test',layout:'test',physics:'kyoto-p3-3',throwModel:'robot-v4',scoring:'waypoint-v3',start,goal:null,waypoints:targets};
const hits=targets.map((w,i)=>({waypointId:w.id,time:i+1,point:w.center,normal:w.normal,surface:w.surface}));
const result=(extra={})=>({challenge:c,success:false,destinationReached:false,reason:'Ball stopped',score:0,surfaces:0,contacts:[],poses:[{t:0,p:p(0,1),q},{t:12,p:p(20,.023),q}],waypointHits:hits,...extra});
const earned=scoreAttempt(result());assert.equal(earned.waypointBase,80000);assert.equal(earned.total,81200);assert.equal(earned.movementPoints,1200);assert.equal(earned.waypointMultiplier,8,'Label is the current waypoint component');
assert.equal(scoreAttempt(result({challenge:{...c,goal}})).total,earned.total,'Missing a destination never removes waypoint points');
const dest=scoreAttempt(result({challenge:{...c,goal},success:true,destinationReached:true}));assert.equal(dest.destinationBonus,earned.total-earned.movementPoints);assert.equal(dest.total,161200);
assert.equal(scoreAttempt(result({challenge:{...c,goal,waypoints:[]},waypointHits:[],destinationReached:true})).total,21200,'Destination-only course earns base points and the landing bonus');
assert.equal(scoreAttempt(result({waypointHits:[]})).total,11200,'Zero waypoints still bank the base and movement');assert.equal(scoreAttempt(result({reason:'Recalled'})).total,0);assert.equal(scoreAttempt(result({challenge:{...c,requiredSurface:'missing'}})).total,earned.total);
assert.equal(scoreAttempt(result({waypointHits:[...hits,...hits]})).total,earned.total,'Repeated waypoint contacts score once');
assert.throws(()=>scoreAttempt(result({waypointHits:[{...hits[0],normal:p(0,-1)}]})),/contact/);
assert.throws(()=>scoreAttempt(result({waypointHits:[{...hits[0],point:p(0,.02)}]})),/contact/);
assert.throws(()=>scoreAttempt(result({waypointHits:[{...hits[0],waypointId:'forged'}]})),/hit/);
const live=new ComboTracker(c);live.poses(result().poses.slice(0,1));for(const h of hits)live.waypoint(h);assert.equal(live.value().total,10000,'Future native hits wait for trajectory time; only the base is present');live.poses(result().poses.slice(1));assert.deepEqual(live.value(),earned);
const quiet=structuredClone(result());quiet.poses.push({...quiet.poses.at(-1),t:240,q:{x:0,y:1,z:0,w:0}});assert.deepEqual(scoreAttempt(quiet),earned,'A long spin after collecting waypoints leaves every factor and score unchanged');
const postGoalBank={surface:'wall',label:'Wall',qualifying:true,speed:3,time:11,point:p(30)};
assert.equal(scoreAttempt(result({challenge:{...c,goal:{...goal,center:p(0)}},contacts:[postGoalBank]})).styleBanks,1,'Waypoint mode does not freeze banks at destination entry');
const many=Array.from({length:32},(_,i)=>({...targets[0],id:`n${i}`}));const manyHits=many.map(w=>({...hits[0],waypointId:w.id}));
const huge=scoreAttempt(result({challenge:{...c,waypoints:many},waypointHits:manyHits,contacts:Array.from({length:100},(_,i)=>({...postGoalBank,surface:`wall${i}`,time:i*.2,point:p(i)})),poses:[{t:0,p:p(0),q},{t:60,p:p(20),q}]}));assert.equal(huge.total,10000*(2**32+.5*huge.styleBanks)+6000);assert.ok(Number.isSafeInteger(huge.total));assert.ok(Number.isFinite(huge.bankMultiplier));

// The accepted example is order-independent: banks never acquire waypoint doublings.
const sequence=new ComboTracker(c);sequence.poses([{t:0,p:p(0,1),q}]);
const values=[];let time=0,bankIndex=0,targetIndex=0;
for(const action of ['waypoint','bank','waypoint','bank','bank','waypoint']){
 time++;
 if(action==='waypoint')sequence.waypoint({...hits[targetIndex++],time});
 else sequence.contact({...postGoalBank,surface:`bank-${bankIndex++}`,time,point:p(time*2),speed:100});
 sequence.poses([{t:time,p:p(time,1),q}]);values.push(sequence.value().comboMultiplier);
}
assert.deepEqual(values,[2,2.5,4.5,5,5.5,9.5]);
assert.equal(sequence.value().total,95600);
const reordered=scoreAttempt(result({contacts:sequence.contacts,waypointHits:hits}));
assert.equal(reordered.comboMultiplier,9.5,'Identical targets and banks produce the same multiplier regardless of order');
assert.equal(reordered.total-reordered.movementPoints,sequence.value().total-sequence.value().movementPoints);
const one=scoreAttempt(result({waypointHits:[hits[0]],contacts:[postGoalBank]}));
const two=scoreAttempt(result({waypointHits:hits.slice(0,2),contacts:[postGoalBank]}));
assert.equal(one.potential-one.movementPoints,25000);assert.equal(two.potential-two.movementPoints,45000);
assert.equal(two.potential-one.potential,20000,'The next waypoint doubles only the 20000 target component, never the 5000 bank credit');
for(const partial of [one,two]){assert.equal(partial.total,partial.potential);assert.equal(partial.outcome,'tagged');}
const partialLanding=scoreAttempt(result({challenge:{...c,goal},success:true,destinationReached:true,waypointHits:hits.slice(0,2)}));
assert.equal(partialLanding.total,81200,'Partial routes bank target points and destination bonus');assert.equal(partialLanding.destinationBonus,40000);assert.equal(partialLanding.outcome,'perfect');
assert.equal(scoreAttempt(result({waypointHits:[hits[0],hits[0],hits[1]]})).total,41200,'Duplicate hits cannot stand in for the missing target');
const inPlay=new ComboTracker(c);inPlay.waypoint(hits[0]);inPlay.poses(result().poses);assert.ok(inPlay.value().total>0,'Live partial routes still show points in play');assert.equal(inPlay.value({final:true}).total,inPlay.value().total);
assert.equal(scoreAttempt(result({waypointHits:[],contacts:sequence.contacts})).total,26200,'Surface-only shots rank without exponential bank growth');
assert.equal(scoreAttempt(result({contacts:[...sequence.contacts,...sequence.contacts]})).comboMultiplier,9.5,'Repeated surfaces never farm bank credit');
assert.equal(scoreAttempt(result({contacts:sequence.contacts.map(h=>({...h,speed:1}))})).comboMultiplier,9.5,'Speed above qualification does not increase bank value');

const store=new Store(':memory:');try{
 store.saveChallenge(c);
 const worker={ready:true,capabilities:[],request:async()=>({}),send(){}};const game=new Competition(store,worker,()=>{});game.layout=c.layout;game.physics=c.physics;const member={id:'session',guest:{id:'test'},restoring:false};
 await assert.rejects(game.command(member,{type:'place',slot:'waypoint',origin:p(0),direction:p(0,-1),radius:.5}),/does not support/);
 await assert.rejects(game.command(member,{type:'release',waypointHits:hits}),/intent only/);
 worker.capabilities=['waypoint-v3'];
 const save={type:'save-challenge',name:'Targets',start,goal:null,waypoints:targets,scoring:'waypoint-v3'};
 await assert.rejects(game.command(member,{...save,waypoints:[targets[0],targets[0]]}),/unique/);
 await assert.rejects(game.command(member,{...save,waypoints:[]}),/at least one/);
 const saved=await game.command(member,save);assert.equal(saved.challenge.goal,null);assert.equal(saved.challenge.waypoints.length,3);
 store.saveChallenge({...c,id:'required-route',requiredSurface:'wall'});const revised=await game.command(member,{...save,editId:'required-route'});assert.equal(revised.challenge.requiredSurface,'wall','Editing a course retains its required route');
 const guest=store.guest();member.guest=guest;member.selected=c;game.members.set(member.id,member);
 for(const destinationReached of [false,true]){
  const course={...c,goal};store.db.prepare('UPDATE challenges SET body=? WHERE id=?').run(JSON.stringify(course),c.id);
  const attempt=`partial-${destinationReached}`;member.attempt=attempt;game.pending.set(attempt,{id:member.id,challenge:course});
  game.result({...result({challenge:course,waypointHits:hits.slice(0,2),destinationReached,success:destinationReached,score:destinationReached?1000:0}),id:member.id,attempt,layout:c.layout,physics:c.physics,duration:12,impacts:0});
  assert.equal(member.lastResult.success,false,'Partial routes do not clear the course');assert.equal(member.lastResult.saved,true);assert.ok(member.lastResult.score>0);assert.equal(store.replay(attempt).score,member.lastResult.score);assert.ok(store.attemptRank(c,attempt)>0);
 }
 store.db.prepare('UPDATE challenges SET body=? WHERE id=?').run(JSON.stringify(c),c.id);
 member.attempt='zero-targets';game.pending.set(member.attempt,{id:member.id,challenge:c});game.result({...result({waypointHits:[]}),id:member.id,attempt:member.attempt,layout:c.layout,physics:c.physics,duration:12,impacts:0});assert.equal(member.lastResult.score,11200);assert.equal(member.lastResult.success,false);assert.equal(store.replay('zero-targets').score,11200);
 member.guest=store.guest();
 for(const [attempt,expected]of [['record-one',true],['record-tie',false]]){
  member.attempt=attempt;game.pending.set(attempt,{id:member.id,challenge:c});
  game.result({...result(),id:member.id,attempt,layout:c.layout,physics:c.physics,duration:12,impacts:0});
  assert.deepEqual(store.replay(attempt).records,{personalBest:expected,courseBest:false},'Only strict improvements are record events');
 }
 const champion=store.guest();
 for(let i=0;i<10;i++)store.saveResult({...result(),id:champion.id,attempt:`champion-${i}`,score:1_000_000_000+i,duration:12},'animation');
 for(const [attempt,player,personalBest]of [['off-board-tie',member.guest,false],['off-board-first',store.guest(),true]]){
  member.guest=player;member.attempt=attempt;game.pending.set(attempt,{id:member.id,challenge:c});
  game.result({...result(),id:member.id,attempt,layout:c.layout,physics:c.physics,duration:12,impacts:0});
  const replay=store.replay(attempt);assert.ok(replay.standings.rank>10,'Off-board scores retain their overall placement');assert.deepEqual(replay.records,{personalBest,courseBest:false},'Off-board players retain accurate personal records');
 }
 store.discardRetired(c.layout,c.physics);assert.ok(store.replay('partial-false'));assert.ok(store.replay('zero-targets'),'Current zero-target replays survive restart cleanup');
 assert.ok(store.personalPlacement(c,guest.id).rank>10);
}finally{store.close();}
console.log('PASS in-bounds partial/zero-target ranking, separate full-route completion, destination bonus, restart retention, once-only contacts, anti-spoof and safe integers');

for(const reason of ['Recalled','Player left','Ball left the station'])assert.equal(scoreAttempt(result({reason})).total,0);
const escaped=result({poses:[{t:0,p:p(0,1),q},{t:3,p:p(0,-5.1),q},{t:12,p:p(0,1),q}]});assert.equal(scoreAttempt(escaped).total,0,'Crossing the native boundary forfeits even if later poses return');
