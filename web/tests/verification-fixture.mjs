import {StaticWorld} from '../public/physics/static-world.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {INPUT_FORMAT} from '../verification.mjs';
import {v,identity} from '../public/physics/math.js';
export const shape=(id,position,half)=>({kind:'box',id,position,half,rotation:identity(),material:'stone',mask:3});
export const fixtureWorld=()=>new StaticWorld({layoutSha256:'test',shapes:[shape('floor',v(0,-.1,0),v(100,.1,100)),shape('wall',v(0,2,-3),v(100,2,.1))],escalators:[],fallLimitY:-10});
export const course={id:'test',revision:1,layout:'test',physics:BROWSER_PHYSICS,scoring:'waypoint-v4',start:{center:v(),normal:v(0,1,0),radius:.5,surface:'floor'},goal:null,waypoints:[{id:'bank',center:v(-.22,1,-2.9),normal:v(0,0,1),radius:1,surface:'wall'}]};
export const header={format:INPUT_FORMAT,courseId:course.id,revision:1,layout:course.layout,physics:course.physics,scoring:course.scoring,walkSteps:0,chargeTime:0,releaseTime:0,aim:{yaw:-180,pitch:5,top:0,kick:0,power:.3,powerRange:'precision'}};
export async function simulate(world,c,h,runs,options){
 const {ShotVerification}=await import('../verification.mjs'),job=new ShotVerification(world,c,h,runs,options),poses=[],contacts=[];let reply;
 do{reply=await job.advance();if(reply.recording){poses.push(...reply.recording.poses);contacts.push(...reply.recording.contacts);}}while(reply.status!=='verified');
 return {result:reply.result,poses,contacts};
}
