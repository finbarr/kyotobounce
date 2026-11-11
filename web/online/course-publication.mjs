import {validateCourse} from '../public/physics/designer.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {THROW_MODEL} from '../public/throw-power.js';
import {fields,insist,uuid,HttpError} from './protocol.mjs';

// Treat every submitted field as untrusted, including geometry and ownership.
// The saved publication candidate becomes trusted only after these checks;
// its solution is separately reconstructed from legal controller inputs.
export function publicationCourse(world,submitted,owner,baseRevision){
 fields(submitted,['id','revision','name','layout','physics','scoring','throwModel','start','goal','waypoints']);
 insist(uuid(submitted.id),400,'Invalid course ID');
 insist(Number.isSafeInteger(baseRevision)&&baseRevision>=0&&baseRevision<1000000&&submitted.revision===baseRevision+1,400,'Publish the next course revision');
 insist(typeof submitted.name==='string'&&submitted.name.trim().length>0&&submitted.name.length<=64&&!/[\u0000-\u001f\u007f]/.test(submitted.name),400,'Use a course name of 1–64 characters');
 insist(submitted.layout===world.layoutSha256&&submitted.physics===BROWSER_PHYSICS&&submitted.scoring==='waypoint-v4'&&submitted.throwModel===THROW_MODEL,400,'Use the current station, physics and scoring');
 function vector(value){fields(value,['x','y','z']);insist(Object.values(value).every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=10000),400,'Invalid course coordinates');return {x:value.x,y:value.y,z:value.z};}
 function disk(value,waypoint=false){
  fields(value,waypoint?['id','center','normal','radius','surface']:['center','normal','radius','surface']);
  insist(typeof value.surface==='string'&&value.surface.length>0&&value.surface.length<=256,400,'Invalid course surface');
  const center=vector(value.center),normal=vector(value.normal);
  insist(Math.abs(Math.hypot(normal.x,normal.y,normal.z)-1)<=.001&&(waypoint||normal.y>.995),400,'Invalid course surface normal');
  return {...(waypoint?{id:value.id}:{}),center,normal,radius:value.radius,surface:value.surface};
 }
 insist(Array.isArray(submitted.waypoints)&&submitted.waypoints.length<=32,400,'Use at most 32 waypoints');
 const course={id:submitted.id,revision:submitted.revision,name:submitted.name.trim(),creator:owner,layout:submitted.layout,physics:BROWSER_PHYSICS,scoring:'waypoint-v4',throwModel:THROW_MODEL,start:disk(submitted.start),goal:submitted.goal===null?null:disk(submitted.goal),waypoints:submitted.waypoints.map(w=>disk(w,true))};
 try{validateCourse(world,course);}catch(error){throw new HttpError(400,error.message);}
 return course;
}

export function solvedPublication(course,result){
 return ['Ball stopped','Target reached'].includes(result.reason)&&result.success&&result.score>0&&
  course.waypoints.every(w=>result.waypointHits.some(hit=>hit.waypointId===w.id))&&
  (!course.goal||result.destinationReached);
}
