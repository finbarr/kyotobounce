import assert from 'node:assert/strict';
import {scoreAt,heatTier,collectedIds,scoreEvents,pendingScoreEvent,HEAT_STAGES,allWaypointsCollected} from '../public/waypoint-score.js';
import {celebrationProfile} from '../public/celebration.js';
import {routeBounds,waypointGeometry} from '../public/waypoint-targets.js';
import {ballHeat} from '../public/ball-heat.js';
import * as THREE from 'three';
const frames=[{t:0,score:{version:'waypoint-v3',total:0,waypointIds:[]}},{t:2,score:{version:'waypoint-v3',total:310000,waypointIds:['a','b']}}];
assert.equal(scoreAt(frames,-1),null);assert.equal(scoreAt(frames,1).total,0);assert.equal(scoreAt(frames,2).total,310000);assert.deepEqual([...collectedIds(scoreAt(frames,1))],[]);assert.deepEqual([...collectedIds(scoreAt(frames,3))],['a','b']);
assert.equal(heatTier({version:'waypoint-v3',total:0,potential:100000000,waypointMultiplier:1024}),0,'hypothetical and next award cannot heat the ball');
assert.equal(heatTier({version:'distinct-v1',total:100000000}),0,'legacy score does not adopt new heat thresholds');
for(const [total,tier]of [[24999,0],[25000,1],[100000,2],[350000,3],[1000000,4],[5000000,5],[20000000,6]])assert.equal(heatTier({version:'waypoint-v3',total}),tier);
const start={center:{x:0,y:0,z:0},radius:1};const bounds=routeBounds({start,goal:null,waypoints:[{center:{x:20,y:15,z:-8},radius:2}]});assert.ok(bounds.box.containsPoint(new THREE.Vector3(22,17,10)),'framing includes off-axis wall/ceiling patch bounds');
const scene=new THREE.Scene(),ball=new THREE.Mesh(new THREE.SphereGeometry(.023),new THREE.MeshStandardMaterial({color:0xf1673d})),trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial());scene.add(ball,trail);const scale=ball.scale.clone(),radius=ball.geometry.parameters.radius,heat=ballHeat({scene,ball,trail});
for(let i=0;i<400;i++)heat.update({score:{version:'waypoint-v3',total:10000000},attempt:'a',mode:'play',time:i/60},1/60,'Flight');
assert.equal(heat.state.tier,5);assert.ok(heat.state.activeParticles<=128);assert.equal(scene.children.filter(o=>o.isLight).length,0);assert.ok(ball.scale.equals(scale));assert.equal(ball.geometry.parameters.radius,radius);
heat.update({score:{version:'waypoint-v3',total:10000000},attempt:'a',mode:'replay',time:4},1/60,'Flight',true);assert.equal(heat.state.activeParticles,0,'reduced motion keeps tint without particles');
heat.update({score:null,attempt:'a',mode:'replay',time:-1},1/60,'Charging');assert.equal(heat.state.tier,0,'scrub before shot clears heat');
heat.update({score:{version:'waypoint-v3',total:10000000},attempt:'b',mode:'play',time:2},1/60,'Flight');heat.update({score:null,attempt:'b',mode:'play',time:3},1/60,'Aim');assert.equal(heat.state.tier,0,'recall resets heat');
heat.dispose();assert.equal(scene.children.length,2);console.log('PASS waypoint score-frame selection, route bounds and bounded heat lifecycle');

const base={version:'waypoint-v3',total:70000,styleBanks:0,bankMultiplier:1,waypointCount:3,waypointMultiplier:8};
for(let i=0;i<2000;i++)assert.deepEqual(scoreEvents(base,{...base,activeSeconds:i,timeMultiplier:i,total:70000+i}),[],'Time/accuracy-only changes cannot trigger celebrations');
assert.deepEqual(scoreEvents({...base,total:24950},{...base,total:25150,movementPoints:200}),[],'A movement-only heat threshold cannot fire a stinger');
const bank={...base,styleBanks:1,bankMultiplier:1.75,total:122500,lastBank:'Steel bank'};
assert.deepEqual(scoreEvents(base,bank).map(e=>e.kind),['bank','special']);assert.deepEqual(scoreEvents(bank,bank),[]);
assert.deepEqual(scoreEvents(bank,{...bank,waypointCount:4,waypointMultiplier:16,total:262500}).map(e=>e.kind),['waypoint']);
assert.deepEqual(scoreEvents(bank,base),[],'Backward scrubs do not fire old cues');
for(const [tier,stage] of HEAT_STAGES.entries())assert.equal(heatTier({version:'waypoint-v3',total:stage.at}),tier);
console.log('PASS action-only celebration events, no idle cues, six earned heat stages');

const simultaneous={version:'waypoint-v3',total:52500,styleBanks:1,bankMultiplier:1.75,waypointCount:2,waypointMultiplier:4,waypointIds:['patch-1','patch-2']};
const doubleEvents=scoreEvents(null,simultaneous);
assert.deepEqual(doubleEvents.map(e=>e.kind),['bank','waypoint','special']);
const doublePopup=doubleEvents.reduce(pendingScoreEvent,null);
assert.equal(doublePopup.kind,'waypoint');assert.equal(doublePopup.label,'DOUBLE TARGET');assert.equal(doublePopup.count,2);assert.equal(doublePopup.tier,1);
assert.deepEqual([...collectedIds(simultaneous)],['patch-1','patch-2']);
assert.deepEqual(scoreEvents(simultaneous,simultaneous),[],'Repeated frames cannot replay a double hit');
assert.equal(scoreEvents(null,{...simultaneous,waypointCount:3,waypointMultiplier:8}).find(e=>e.kind==='waypoint').label,'3 TARGETS AT ONCE');
assert.equal(pendingScoreEvent(doublePopup,{kind:'bank'}),doublePopup,'A following bank cannot hide the double hit');
console.log('PASS simultaneous waypoint cue survives bank/tier coalescing and retains both markers');

for(const radius of [.1,.85,2]){
 const geometry=waypointGeometry(radius);
 for(const mesh of Object.values(geometry)){
  const p=mesh.attributes.position;let farthest=0;
  for(let i=0;i<p.count;i++)farthest=Math.max(farthest,Math.hypot(p.getX(i),p.getY(i)));
  assert.ok(Math.abs(farthest-radius)<1e-6,'Both fill and painted ring end at the scoring radius');mesh.dispose();
 }
}
console.log('PASS visible waypoint borders match native scoring bounds');

const course={scoring:'waypoint-v3',waypoints:[{id:'patch-1'},{id:'patch-2'}],goal:{center:{x:10,y:0,z:0},radius:1}};
const partial={...simultaneous,waypointCount:1,waypointIds:['patch-1'],total:10000};
const complete={...simultaneous,total:30000,destinationReached:false,outcome:'chain'};
assert.equal(allWaypointsCollected(partial,course),false);
assert.equal(allWaypointsCollected(complete,course),true,'The optional destination is not needed for 100% waypoints');
for(const invalid of [{...complete,waypointIds:['patch-1','patch-1']},{...complete,waypointIds:['old-patch-1','old-patch-2']},{...complete,outcome:'forfeit'},{...complete,outcome:'route-missed'},{...complete,version:'combo-v7'}])assert.equal(allWaypointsCollected(invalid,course),false,'Actual collected IDs and valid outcome are required');
assert.equal(allWaypointsCollected(complete,{...course,waypoints:[]}),false,'An empty course is not a perfect route');
assert.equal(allWaypointsCollected(complete,null),false);
const clearEvents=scoreEvents(null,complete,course);
assert.deepEqual(clearEvents.map(e=>e.kind),['bank','waypoint','special','clear']);
const clearPopup=clearEvents.reduce(pendingScoreEvent,null);
assert.equal(clearPopup.kind,'clear');assert.equal(clearPopup.count,2);assert.equal(clearPopup.tier,6);
assert.equal(pendingScoreEvent(clearPopup,{kind:'special',tier:2}),clearPopup,'A later promotion cannot hide the all-clear');
assert.equal(scoreEvents(partial,complete,course).filter(e=>e.kind==='clear').length,1);
for(let i=0;i<100;i++)assert.deepEqual(scoreEvents(complete,{...complete,total:complete.total+i*100},course),[],'Repeated frames and movement points never repeat the all-clear');
assert.deepEqual(scoreEvents(complete,partial,course),[],'Rewinding does not celebrate');
assert.equal(celebrationProfile({saved:true,score:30000,breakdown:complete,challenge:course}).tier,5,'Even a low-score perfect route earns the biggest dance');
assert.equal(celebrationProfile({saved:true,score:30000,breakdown:complete,challenge:course}).duration,7.2);
assert.equal(celebrationProfile({saved:true,score:10000,breakdown:partial,challenge:course}).tier,1);
assert.equal(celebrationProfile({saved:true,score:30000,breakdown:{...complete,outcome:'forfeit'},challenge:course}).tier,0);
const clearHeat=ballHeat({scene,ball,trail});
clearHeat.update({score:partial,challenge:course,attempt:'clear',mode:'play',time:1},1/60,'Flight');assert.equal(clearHeat.state.tier,0);
clearHeat.update({score:complete,challenge:course,attempt:'clear',mode:'play',time:2},1/60,'Flight');assert.equal(clearHeat.state.tier,6,'Every waypoint unlocks the maximum ball effect');
assert.ok(clearHeat.state.activeParticles<=128);assert.ok(ball.scale.equals(scale));assert.equal(scene.children.filter(o=>o.isLight).length,0);
clearHeat.update({score:complete,challenge:course,attempt:'clear',mode:'play',time:3},1/60,'Flight',true);assert.equal(clearHeat.state.tier,6);assert.equal(clearHeat.state.activeParticles,0);
clearHeat.update({score:null,challenge:course,attempt:'clear',mode:'play',time:4},1/60,'Aim');assert.equal(clearHeat.state.tier,0);clearHeat.dispose();
console.log('PASS all-waypoint ID validation, one-shot priority, optional destination, maximum dance and bounded ball effects');
