import assert from 'node:assert/strict';
import {ComboTracker,scoreAttempt} from '../scoring.ts';
import {SCORING_VERSION} from '../types.ts';
const p=(x,y=.023,z=0)=>({x,y,z});
const pose=(t,x,y=.023,z=0)=>({t,p:p(x,y,z),q:{x:0,y:0,z:0,w:1}});
const c={id:'combo',revision:1,name:'Combo',creator:'tester',throwModel:'robot-v4',scoring:SCORING_VERSION,start:{center:p(0,0),radius:.75,surface:'floor'},goal:{center:p(20,0),radius:1,surface:'floor'},layout:'test',physics:'test'};
const hits=Array.from({length:12},(_,i)=>({surface:`bank-${i}`,label:`Bank ${i}`,point:p(i*1.4,0),time:i*.5+.1,speed:4,qualifying:true}));
const result=(extra={})=>({type:'result',attempt:'a',id:'tester',challenge:c,reason:'Target settled',success:true,score:0,surfaces:12,impacts:12,duration:10,releaseTime:20,chargeTime:17,thrower:{},launchPosition:p(0,1),velocity:p(4,0),spin:p(0,0),layout:'test',physics:'test',profile:'test',poses:[pose(0,0,1),pose(6,15,1),pose(10,20)],contacts:hits,...extra});
const monster=scoreAttempt(result());assert.ok(monster.total>1_000_000,'A demanding varied line earns millions, not a fixed 10k ceiling');assert.equal(monster.styleBanks,12);
const repeated=scoreAttempt(result({contacts:hits.map(h=>({...h,surface:'wall'}))}));assert.equal(repeated.styleBanks,1);
const treads=scoreAttempt(result({contacts:hits.map((h,i)=>({...h,surface:`west-escalator-step-${i}`}))}));assert.equal(treads.styleBanks,1,'One escalator is one bank family');
const chatter=scoreAttempt(result({contacts:hits.map(h=>({...h,point:p(1,0)}))}));assert.equal(chatter.styleBanks,1);
const slow=scoreAttempt(result({contacts:hits.map(h=>({...h,speed:.5}))}));assert.equal(slow.styleBanks,0);
const stationary=scoreAttempt(result({poses:[pose(0,20),pose(240,20)],contacts:[]}));assert.equal(stationary.total,10000,'Waiting adds no points');
const creep=scoreAttempt(result({poses:[pose(0,17),pose(240,20)],contacts:[]}));assert.equal(creep.total,34000,'Slow rolling earns a flat 100 points per second');
const spinning=scoreAttempt(result({poses:[pose(0,20),{...pose(240,20),q:{x:0,y:1,z:0,w:0}}],contacts:[]}));assert.equal(spinning.total,10000,'Spinning adds no points');
assert.equal('timeMultiplier' in spinning,false,'Retired time factor is removed from the score contract');
const tagPoses=[pose(0,17),pose(.03,23),pose(3,40)];
const tag=scoreAttempt(result({poses:tagPoses,contacts:[],success:false}));assert.equal(tag.goalVisited,true,'Swept native poses catch high-speed crossings');assert.equal(tag.landingMultiplier,.25,'Touching the goal banks 25% even when it escapes');
const farm=scoreAttempt(result({poses:[...tagPoses,pose(50,80)],contacts:hits,success:false}));assert.equal(farm.styleBanks,0,'No banks after the first target entry');assert.equal(farm.potential,15000,'Post-tag movement adds only 100 flat points per second');assert.equal(farm.bankMultiplier,1);
for(const height of [-1,3]){const miss=scoreAttempt(result({poses:tagPoses.map(a=>({...a,p:{...a.p,y:height}})),contacts:hits,success:false}));assert.equal(miss.goalVisited,false,'Other floors are not target hits');assert.equal(miss.total,0,'Even a large combo earns zero on a distant untagged miss');}
const rings=[0,.25,.5,.75,1].map(f=>scoreAttempt(result({success:false,poses:[pose(0,21-.023+7*f)],contacts:[]})).landingMultiplier);
assert.deepEqual(rings.map(x=>Math.round(x*100)),[100,75,50,25,0],'Bullseye percentages match the actual landing formula');
assert.equal(scoreAttempt(result({reason:'Recalled'})).total,0);
assert.equal(scoreAttempt(result({challenge:{...c,requiredSurface:'missing'}})).total,0);
const tracker=new ComboTracker(c);const r=result();for(const h of hits)tracker.contact(h);tracker.poses(r.poses.slice(0,2));const before=tracker.value();tracker.poses(r.poses.slice(2));assert.equal(before.bankMultiplier,monster.bankMultiplier,'Movement cannot increase the multiplier');assert.equal(monster.potential-before.potential,monster.movementPoints-before.movementPoints,'Only flat movement points grow between banks');assert.deepEqual(tracker.value({success:true}),monster,'Chunked live telemetry and final replay calculate exactly the same score');
assert.throws(()=>tracker.poses([pose(-1,0)]),/backwards/);
console.log('PASS million-point combos, repeated surfaces, chatter, swept tags, ring accuracy, linear movement bonus without time/spin multipliers, rest and live/final parity');

await import('./waypoint-scoring.mjs');

// Count translating intervals only, with the same result for every chunk size.
const motionCourse={...c,goal:{center:p(0,0),radius:2,surface:'floor'}};
const motionPoses=[pose(0,0),pose(2,1),pose(5,1),{...pose(8,1),q:{x:0,y:1,z:0,w:0}},pose(10,0)];
const movement=scoreAttempt(result({challenge:motionCourse,contacts:[],poses:motionPoses,success:true}));
assert.equal(movement.movingSeconds,4);assert.equal(movement.movementPoints,400);assert.equal(movement.total,10400);
const chunked=new ComboTracker(motionCourse);for(const item of motionPoses)chunked.poses([item]);assert.deepEqual(chunked.value({success:true}),movement);
const fractional=scoreAttempt(result({challenge:motionCourse,contacts:[],poses:[pose(0,0),pose(.125,1)],success:true}));assert.equal(fractional.movementPoints,12,'Fractional seconds accrue individual points, not one-second awards');
const multiplied=scoreAttempt(result({challenge:motionCourse,contacts:hits,poses:motionPoses,success:true}));assert.equal(multiplied.movementPoints,400,'Banks cannot multiply movement points');assert.equal(multiplied.total,Math.round(10000*multiplied.bankMultiplier)+400);
const missed=scoreAttempt(result({poses:[pose(0,0),pose(10,-20)],contacts:[],success:false}));assert.equal(missed.movementPoints,1000);assert.equal(missed.total,0,'Motion alone cannot clear a missed target');
const recalled=scoreAttempt(result({challenge:motionCourse,contacts:[],poses:motionPoses,reason:'Recalled'}));assert.equal(recalled.total,0);assert.equal(recalled.movementPoints,0);
console.log('PASS 100 points per moving second, fractional ticks, pause/spin exclusion, unmultiplied bonus, chunk parity and misses');
