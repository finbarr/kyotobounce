import assert from 'node:assert/strict';
import {LiveThrow} from '../public/live-throw.js';
import {ShotPlayback} from '../public/shot-playback.js';

const live=new LiveThrow(),playback=new ShotPlayback();
const state=(attempt,phase)=>({type:'state',attempt,phase,stationTime:1.1});
const chunk=attempt=>({type:'shot-chunk',attempt,sequence:0,base:{releaseTime:1,launchPosition:{}},frames:[state(attempt,'Flight')],events:[],complete:false});
const receive=message=>{if(!live.accepts(message))return false;if(message.type==='shot-chunk')playback.accept(message,0);return true;};
const reset=()=>{live.reset();playback.waitForAttempt();};
const oldStates=['Aim','Charging','Release','Flight','Result'].map(phase=>state('old',phase));
const oldEvents=['impact','waypoint-hit','result','notice'].map(type=>({type,attempt:'old'}));
live.charge();assert.ok(live.expect('old'));live.release();receive(chunk('old'));
assert.ok(live.follows(state('old','Flight'),'Flight'));
reset();
for(const message of [...oldStates,...oldEvents,chunk('old')])assert.equal(receive(message),false,`Reset rejects old ${message.type}/${message.phase||''}`);
assert.equal(live.expect('old'),false,'A delayed session cannot authorize a throw while holding');
assert.equal(live.resume('old'),false,'A delayed resume cannot undo a local reset');
assert.equal(playback.sample(100),null,'No abandoned trajectory remains to sample');
// Even a cached frame accidentally reaching the final presentation boundary
// cannot animate flight or switch camera after the local reset.
for(const old of oldStates){assert.equal(live.phase(old,old.phase),'Aim');assert.equal(live.follows(old,old.phase),false);}

live.charge();playback.waitForAttempt();
assert.ok(live.expect('new'));playback.expect('new');
for(const message of [...oldStates,...oldEvents,chunk('old')])assert.equal(receive(message),false,'Old attempt cannot interrupt a new charge');
assert.ok(receive(state('new','Charging')));
assert.equal(receive(state('new','Flight')),false,'Even the current attempt cannot fly before local release');
assert.equal(receive(chunk('new')),false);
assert.equal(live.follows(state('new','Flight'),'Flight'),false);
assert.equal(live.phase(state('new','Release'),'Release'),'Aim');
live.release();assert.ok(receive(chunk('new')));assert.ok(live.follows(state('new','Flight'),'Flight'));
assert.ok(receive({type:'result',attempt:'new'}),'The current authoritative result remains valid');
assert.ok(live.follows(state('new','Result'),'Result'),'Celebration keeps the completed throw camera');
assert.equal(live.expect('old'),false,'A stale session cannot replace an accepted current attempt');

reset();live.charge();live.release();assert.ok(live.expect('quick'));
assert.ok(live.follows(state('quick','Flight'),'Flight'),'Release before the charge acknowledgement is valid');
reset();assert.ok(receive(state('','Aim')),'Ordinary holding/movement updates still arrive');
live.reconnect();assert.ok(live.resume('resumed'));assert.ok(live.follows(state('resumed','Flight'),'Flight'));
reset();assert.equal(live.resume('resumed'),false,'Reset revokes reconnect permission too');
live.reconnect();live.charge();assert.equal(live.resume('resumed'),false,'A new charge cannot be replaced by reconnect backfill');
console.log('PASS reset fences raw states, chunks, events, cached phases, camera, stale sessions/resumes; new release and explicit reconnect remain valid');
