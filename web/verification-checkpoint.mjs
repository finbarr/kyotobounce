import {serialize,deserialize} from 'node:v8';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ShotVerification} from './verification.mjs';
import {Shot} from './public/physics/shot.js';

export function verificationCourseKey(c){
 return createHash('sha256').update(JSON.stringify([c.id,c.revision,c.layout,c.physics,c.scoring,c.throwModel,c.start,c.goal,c.waypoints,c.requiredSurface])).digest('hex');
}
const copy=(value,omit)=>Object.fromEntries(Object.entries(value).filter(([key])=>!omit.includes(key)));
function restore(target,saved,omit){
 const expected=Object.keys(copy(target,omit)),actual=Object.keys(saved);
 if(expected.length!==actual.length||actual.some(key=>!expected.includes(key)))throw Error('Verification checkpoint fields changed');
 Object.assign(target,saved);
}
// These bytes are server-owned state, never an accepted HTTP request field.
// V8 serialization preserves Maps, Sets, Infinity and negative zero exactly.
export function saveVerification(job){
 if(job.running||job.failed||job.cancelled||!['walking','flight'].includes(job.status))throw Error('Verification cannot be checkpointed in this state');
 const shot=job.shot;
 const value={format:'kyoto-verifier-state-1',course:verificationCourseKey(job.course),header:job.header,attempt:job.attempt,subject:job.subject,status:job.status,
  walkedSteps:job.walkedSteps,run:job.run,remaining:job.remaining,walker:copy(job.walker,['world']),
  shot:shot?{state:copy(shot,['world','challenge','ball','tracker','designer']),ball:copy(shot.ball,['world','profile']),tracker:copy(shot.tracker,['c','fallLimitY'])}:null};
 const bytes=deflateRawSync(serialize(value));if(bytes.length>750000)throw Error('Verification checkpoint exceeded its storage limit');return bytes;
}
export function restoreVerification(world,course,bytes,commands,options){
 const saved=deserialize(inflateRawSync(bytes,{maxOutputLength:8*1024*1024}));
 if(saved.format!=='kyoto-verifier-state-1'||saved.course!==verificationCourseKey(course)||saved.attempt!==options.attempt||saved.subject!==options.subject||!['walking','flight'].includes(saved.status))throw Error('Verification checkpoint does not match this job');
 const job=new ShotVerification(world,course,saved.header,commands,options);
 restore(job.walker,saved.walker,['world']);Object.assign(job,{walkedSteps:saved.walkedSteps,run:saved.run,remaining:saved.remaining,status:saved.status});
 if(saved.shot){
  const s=saved.shot,shot=new Shot(world,course,s.state.launch,{attempt:options.attempt,thrower:s.state.thrower,chargeTime:s.state.chargeTime,releaseTime:s.state.releaseTime});
  restore(shot,s.state,['world','challenge','ball','tracker','designer']);restore(shot.ball,s.ball,['world','profile']);restore(shot.tracker,s.tracker,['c','fallLimitY']);job.shot=shot;
 }
 if((job.status==='flight')!==!!job.shot)throw Error('Verification checkpoint phase is inconsistent');return job;
}
