import assert from 'node:assert/strict';
import {objectiveDistance} from '../levels/objective-distance.mjs';
const r={challenge:{waypoints:[{id:'a'},{id:'b'}]},waypointHits:[{waypointId:'b',time:1.5},{waypointId:'a',time:.5}],poses:[
 {t:0,p:{x:0,y:0,z:0}}, {t:1,p:{x:3,y:4,z:0}},
 {t:2,p:{x:6,y:8,z:0}}, {t:10,p:{x:100,y:100,z:100}},
]};
assert.deepEqual(objectiveDistance(r),{distance:7.5,seconds:1.5},'Include bends and partial segments, excluding later rolling');
assert.equal(objectiveDistance({...r,waypointHits:r.waypointHits.slice(1)}),null,'Incomplete routes have no completed-route distance');
assert.equal(objectiveDistance({...r,poses:r.poses.slice(0,2)}),null,'Truncated replays cannot claim a measured distance');
console.log('PASS route distance ends at the final required waypoint in any hit order');
