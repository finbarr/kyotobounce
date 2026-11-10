import {Ball,STEP} from './ball.js';
import {v,add,sub,dot,plane,length,yaw,clamp} from './math.js';
import {throwSpeed} from '../throw-power.js';
import {ComboTracker,waypointRouteComplete} from '../../scoring.ts';

// This version must never share a leaderboard with the native solver. Verification
// will reproduce inputs with this module, not accept the result sent by a browser.
export const BROWSER_PHYSICS='kyoto-browser-1';
export function launchInput(feet,input){
 const angle=input.pitch*Math.PI/180,speed=throwSpeed(input.power,input.powerRange);
 return {position:add(feet,yaw(v(.22,1.5,.42),input.yaw)),velocity:yaw(v(0,speed*Math.sin(angle),speed*Math.cos(angle)),input.yaw),spin:yaw(v(input.top,0,-input.kick),input.yaw)};
}
export class Shot{
 constructor(world,challenge,launch,{attempt='local',releaseTime=0,chargeTime=0,thrower=null}={}){
  if(challenge.layout!==world.layoutSha256)throw Error('Course and collision layout differ');
  this.world=world;this.challenge={...challenge,physics:BROWSER_PHYSICS};this.attempt=attempt;this.releaseTime=releaseTime;this.chargeTime=chargeTime;this.thrower=thrower;
  this.launch=structuredClone(launch);this.ball=new Ball(world);this.ball.stationTime=releaseTime;this.ball.launch(launch.position,launch.velocity,launch.spin);
  this.tracker=new ComboTracker(this.challenge,world.fallLimitY);this.poses=[];this.contacts=[];this.waypointHits=[];this.events=[];this.impactTimes=new Map();this.surfaces=new Set();this.collected=new Set();
  this.steps=0;this.sleepDwell=0;this.goalDwell=0;this.done=false;this.reason='';this.destinationReached=false;this.recordPose();
 }
 recordPose(){const pose={t:this.ball.clock,p:{...this.ball.position},q:{...this.ball.rotation}};this.poses.push(pose);this.tracker.poses([pose]);return pose;}
 step(){
  if(this.done)return;
  const b=this.ball;b.step();this.steps++;
  for(const contact of b.contacts.splice(0)){
   for(const target of this.challenge.waypoints||[]){
    if(this.collected.has(target.id)||target.surface!==contact.surface||dot(contact.normal,target.normal)<.995)continue;
    const offset=sub(contact.point,target.center);
    if(Math.abs(dot(offset,target.normal))>.01||length(plane(offset,target.normal))>target.radius)continue;
    const hit={type:'waypoint-hit',attempt:this.attempt,waypointId:target.id,surface:contact.surface,time:contact.time,point:contact.point,normal:contact.normal};
    this.collected.add(target.id);this.waypointHits.push(hit);this.tracker.waypoint(hit);this.events.push(hit);
   }
   if(contact.speed<=.28)continue;
   const qualifying=contact.speed>=.35&&b.clock-(this.impactTimes.get(contact.surface)??-Infinity)>=.08;
   if(qualifying){this.impactTimes.set(contact.surface,b.clock);this.surfaces.add(contact.surface);}
   const hit={type:'impact',attempt:this.attempt,surface:contact.surface,label:contact.surface.replaceAll('-',' '),point:contact.point,speed:contact.speed,time:b.clock,stationTime:this.releaseTime+contact.time,qualifying};
   this.contacts.push(hit);this.tracker.contact(hit);this.events.push(hit);
  }
  this.recordPose();
  if(b.position.y<this.world.fallLimitY){this.cancel('Ball left the station');return;}
  const resting=b.sleeping&&dot(b.velocity,b.velocity)<1e-10&&dot(b.spin,b.spin)<1e-10;
  this.sleepDwell=resting?Math.fround(this.sleepDwell+STEP):0;
  const goal=this.challenge.goal,required=this.challenge.requiredSurface;
  let inGoal=false;
  if(resting&&goal&&(!required||this.surfaces.has(required))&&Math.hypot(b.position.x-goal.center.x,b.position.z-goal.center.z)<=goal.radius-b.profile.radius&&Math.abs(b.position.y-b.profile.radius-goal.center.y)<=.05){
   const support=this.world.sweep(b.position,v(0,-.004,0),b.profile.radius);
   inGoal=!!(support&&support.normal.y>.995&&support.surface.id===goal.surface&&Math.abs(support.point.y-goal.center.y)<=.05);
  }
  this.goalDwell=inGoal?Math.fround(this.goalDwell+STEP):0;
  if(this.goalDwell>=.5){this.destinationReached=true;this.done=true;this.reason='Target reached';}
  else if(this.sleepDwell>.6){this.done=true;this.reason='Ball stopped';}
 }
 cancel(reason='Recalled'){this.done=true;this.reason=reason;this.destinationReached=false;}
 get breakdown(){return this.tracker.value({destinationReached:this.destinationReached,reason:this.reason,final:this.done});}
 result(){
  if(!this.done)throw Error('The shot is still moving');
  const breakdown=this.breakdown,success=breakdown.total>0&&waypointRouteComplete(this.challenge,this.waypointHits,this.destinationReached)&&(!this.challenge.requiredSurface||this.surfaces.has(this.challenge.requiredSurface));
  return {type:'result',attempt:this.attempt,challenge:this.challenge,layout:this.world.layoutSha256,physics:BROWSER_PHYSICS,profile:this.ball.profile.id,fallLimitY:this.world.fallLimitY,reason:this.reason,success,destinationReached:this.destinationReached,score:breakdown.total,breakdown,duration:this.ball.clock,releaseTime:this.releaseTime,chargeTime:this.chargeTime,thrower:this.thrower,launchPosition:this.launch.position,velocity:this.launch.velocity,spin:this.launch.spin,poses:this.poses,contacts:this.contacts,waypointHits:this.waypointHits,surfaces:this.surfaces.size,impacts:this.contacts.filter(c=>c.qualifying).length};
 }
}
