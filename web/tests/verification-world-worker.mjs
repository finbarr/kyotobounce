// Local workerd acceptance entry only; never packaged into the live game.
import {loadVerificationWorld} from '../verification-world.mjs';
import {ShotVerification,INPUT_FORMAT} from '../verification.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import catalog from '../starter-challenges.json' with {type:'json'};
let ready;
async function world(env){
 ready??=(async()=>{
  const response=await env.ASSETS.fetch('https://assets.invalid/manifest.json');
  return loadVerificationWorld(await response.json(),async name=>new Uint8Array(await(await env.ASSETS.fetch('https://assets.invalid/'+name)).arrayBuffer()));
 })().catch(error=>{ready=null;throw error;});
 return ready;
}
export default{async fetch(request,env){
 if(request.method!=='POST')return new Response('Not found',{status:404});
 const {id}=await request.json(),course=catalog.find(c=>c.id===id);
 if(!course)return new Response('Unknown course',{status:400});
 const a=course.hint,header={format:INPUT_FORMAT,courseId:course.id,revision:course.revision,layout:course.layout,physics:BROWSER_PHYSICS,scoring:course.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:((a.yaw+180)%360+360)%360-180,pitch:a.pitch,top:a.top,kick:a.kick,power:a.holdMs/2800,powerRange:a.powerRange}};
 const job=new ShotVerification(await world(env),{...course,physics:BROWSER_PHYSICS},header,[]),poses=[],contacts=[];let response,batches=0;
 do{
  response=await job.advance();if(response.recording){poses.push(...response.recording.poses);contacts.push(...response.recording.contacts);}
  if(++batches>10000||(job.shot?.steps||0)>180*180)throw Error('Test observation limit reached without physical rest');
 }while(response.status!=='verified');
 const result={...response.result,poses,contacts},digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(result)));
 return Response.json({id,sha256:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''),score:result.score,success:result.success,waypoints:result.waypointHits.length,velocity:job.shot.ball.velocity,spin:job.shot.ball.spin,budgetExhaustions:job.shot.ball.budgetExhaustions});
}};
