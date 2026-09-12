import assert from 'node:assert/strict';
import {ComboTracker,scoreAttempt} from '../scoring.ts';
import {Store} from '../store.ts';
import {Competition} from '../competition.ts';
const p=(x,y=0,z=0)=>({x,y,z}),q={x:0,y:0,z:0,w:1};
const start={center:p(0),radius:.75,surface:'floor'},goal={center:p(20),radius:1,surface:'floor'};
const targets=Array.from({length:3},(_,i)=>({id:`w${i}`,center:p(i),normal:p(0,1),radius:.5,surface:'floor'}));
const c={id:'waypoint-test',revision:1,name:'Targets',creator:'test',layout:'test',physics:'kyoto-p3-3',throwModel:'robot-v4',scoring:'waypoint-v1',start,goal:null,waypoints:targets};
const hits=targets.map((w,i)=>({waypointId:w.id,time:i+1,point:w.center,normal:w.normal,surface:w.surface}));
const result=(extra={})=>({challenge:c,success:false,destinationReached:false,reason:'Ball stopped',score:0,surfaces:0,contacts:[],poses:[{t:0,p:p(0,1),q},{t:12,p:p(20,.023),q}],waypointHits:hits,...extra});
const earned=scoreAttempt(result());assert.equal(earned.waypointBase,70000);assert.equal(earned.total,140000);assert.equal(earned.waypointMultiplier,8,'Label means NEXT waypoint award multiplier');
assert.equal(scoreAttempt(result({challenge:{...c,goal}})).total,earned.total,'Missing a destination never removes waypoint points');
const dest=scoreAttempt(result({challenge:{...c,goal},success:true,destinationReached:true}));assert.equal(dest.destinationBonus,earned.total);assert.equal(dest.total,280000);
assert.equal(scoreAttempt(result({challenge:{...c,goal,waypoints:[]},waypointHits:[],destinationReached:true})).total,20000,'Destination-only course earns the base bonus');
assert.equal(scoreAttempt(result({waypointHits:[]})).total,0);assert.equal(scoreAttempt(result({reason:'Recalled'})).total,0);assert.equal(scoreAttempt(result({challenge:{...c,requiredSurface:'missing'}})).total,0);
assert.equal(scoreAttempt(result({waypointHits:[...hits,...hits]})).total,earned.total,'Repeated waypoint contacts score once');
assert.throws(()=>scoreAttempt(result({waypointHits:[{...hits[0],normal:p(0,-1)}]})),/contact/);
assert.throws(()=>scoreAttempt(result({waypointHits:[{...hits[0],point:p(0,.02)}]})),/contact/);
assert.throws(()=>scoreAttempt(result({waypointHits:[{...hits[0],waypointId:'forged'}]})),/hit/);
const live=new ComboTracker(c);live.poses(result().poses.slice(0,1));for(const h of hits)live.waypoint(h);assert.equal(live.value().total,0,'Future native hits wait for trajectory time');live.poses(result().poses.slice(1));assert.deepEqual(live.value(),earned);
const postGoalBank={surface:'wall',label:'Wall',qualifying:true,speed:3,time:11,point:p(30)};
assert.equal(scoreAttempt(result({challenge:{...c,goal:{...goal,center:p(0)}},contacts:[postGoalBank]})).styleBanks,1,'Waypoint mode does not freeze banks at destination entry');
const many=Array.from({length:32},(_,i)=>({...targets[0],id:`n${i}`}));const manyHits=many.map(w=>({...hits[0],waypointId:w.id}));
const huge=scoreAttempt(result({challenge:{...c,waypoints:many},waypointHits:manyHits,contacts:Array.from({length:100},(_,i)=>({...postGoalBank,surface:`wall${i}`,time:i*.2,point:p(i)})),poses:[{t:0,p:p(0),q},{t:60,p:p(20),q}]}));assert.equal(huge.total,Number.MAX_SAFE_INTEGER);assert.ok(Number.isFinite(huge.bankMultiplier));
const store=new Store(':memory:');try{
 store.saveChallenge(c);
 const worker={ready:true,capabilities:[],request:async()=>({}),send(){}};const game=new Competition(store,worker,()=>{});game.layout=c.layout;game.physics=c.physics;const member={id:'session',guest:{id:'test'},restoring:false};
 await assert.rejects(game.command(member,{type:'place',slot:'waypoint',origin:p(0),direction:p(0,-1),radius:.5}),/does not support/);
 await assert.rejects(game.command(member,{type:'release',waypointHits:hits}),/intent only/);
 worker.capabilities=['waypoint-v1'];
 const save={type:'save-challenge',name:'Targets',start,goal:null,waypoints:targets,scoring:'waypoint-v1'};
 await assert.rejects(game.command(member,{...save,waypoints:[targets[0],targets[0]]}),/unique/);
 await assert.rejects(game.command(member,{...save,waypoints:[]}),/at least one/);
 const saved=await game.command(member,save);assert.equal(saved.challenge.goal,null);assert.equal(saved.challenge.waypoints.length,3);
 store.saveChallenge({...c,id:'required-route',requiredSurface:'wall'});const revised=await game.command(member,{...save,editId:'required-route'});assert.equal(revised.challenge.requiredSurface,'wall','Editing a course retains its required route');
 const guest=store.guest();member.guest=guest;member.selected=c;game.members.set(member.id,member);
 for(const [attempt,expected]of [['record-one',true],['record-tie',false]]){
  member.attempt=attempt;game.pending.set(attempt,{id:member.id,challenge:c});
  game.result({...result(),id:member.id,attempt,layout:c.layout,physics:c.physics,duration:12,impacts:0});
  assert.deepEqual(store.replay(attempt).records,{personalBest:expected,courseBest:expected},'Only strict improvements are record events');
 }
}finally{store.close();}
console.log('PASS waypoint chain, destination bonus/miss, once-only contacts, anti-spoof, capability gating and safe integers');
