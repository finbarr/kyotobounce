import {WAYPOINT_SCORING} from './types.ts';
import type { NativeResult,Vector,WaypointHit } from './types.ts';
export const ARCADE_SCORING='combo-v7';
export type ScoreBreakdown={version:string;movingSeconds:number;movementPoints:number;outcome:'perfect'|'tagged'|'near'|'miss'|'forfeit'|'route-missed'|'incomplete';waypointCount?:number;waypointIds?:string[];waypointHits?:WaypointHit[];waypointBase?:number;waypointMultiplier?:number;destinationReached?:boolean;destinationBonus?:number;accuracy:number;style:number;styleBanks:number;stylePercent:number;goalVisited:boolean;distance:number;proximityRange:number;endPosition:Vector;total:number;base?:number;bankMultiplier?:number;bankBonus?:number;comboMultiplier?:number;landingMultiplier?:number;potential?:number;firstVisit?:number|null;lastBank?:string};
const distance=(a:Vector,b:Vector)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const clamp=(x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));
// A finite cylinder at floor height, swept between authoritative 180 Hz poses.
// A fast ball cannot skip the target, and flying over another floor is not a tag.
function entersGoal(a:Vector,b:Vector,g:Vector,r:number,ballRadius:number){
 let lo=0,hi=1;const dy=b.y-a.y,minY=g.y+ballRadius-.015,maxY=g.y+ballRadius+.06;
 if(Math.abs(dy)<1e-9){if(a.y<minY||a.y>maxY)return false;}
 else {const t1=(minY-a.y)/dy,t2=(maxY-a.y)/dy;lo=Math.max(0,Math.min(t1,t2));hi=Math.min(1,Math.max(t1,t2));if(lo>hi)return false;}
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=clamp(length?((g.x-a.x)*dx+(g.z-a.z)*dz)/length:lo,lo,hi);
 return Math.hypot(a.x+dx*t-g.x,a.z+dz*t-g.z)<=Math.max(0,r-ballRadius);
}
type Pose=NativeResult['poses'][number];
type Contact=NativeResult['contacts'][number];
type Challenge=NonNullable<NativeResult['challenge']>;
// Use actual target IDs, never a client count. Destination-only courses still
// need a landing; on waypoint courses it is a bonus after the complete route.
export function waypointRouteComplete(c:Challenge,hits:WaypointHit[],destinationReached:boolean){
 const targets=c.waypoints||[],ids=new Set(hits.map(h=>h.waypointId));
 return targets.length>0?targets.every(w=>ids.has(w.id)):!!c.goal&&destinationReached;
}
export const BASE_POINTS=10000,BANK_BONUS=.5,WAYPOINT_FACTOR=2,MOVEMENT_POINTS_PER_SECOND=100;
// Ignore only sub-millimetre drift; rolling and flight earn the same flat rate.
const MIN_MOVEMENT_SPEED=.001;
export const proximityRange=(c:Challenge)=>clamp(distance(c.start.center,c.goal!.center)*.35,3,12);
// A tracker consumes every native physics pose, including between network frames.
// The identical calculation drives the live HUD and the immutable final replay.
export class ComboTracker {
 c:Challenge;last:Pose|null=null;movingSeconds=0;firstVisit=Infinity;contacts:Contact[]=[];waypointHits:WaypointHit[]=[];
 constructor(challenge:Challenge){this.c=challenge;}
 waypoint(hit:WaypointHit){
  if(this.c.scoring!==WAYPOINT_SCORING)return;
  const target=this.c.waypoints?.find(w=>w.id===hit.waypointId);
  if(!target||!Number.isFinite(hit.time)||hit.time<0||hit.surface!==target.surface||[hit.point,hit.normal].some(v=>!v||Object.values(v).some(x=>!Number.isFinite(x))))throw new Error('Invalid native waypoint hit');
  const offset={x:hit.point.x-target.center.x,y:hit.point.y-target.center.y,z:hit.point.z-target.center.z};
  const dot=(a:Vector,b:Vector)=>a.x*b.x+a.y*b.y+a.z*b.z,plane=dot(offset,target.normal);
  if(dot(hit.normal,target.normal)<.995||Math.abs(plane)>.01001||Math.sqrt(Math.max(0,dot(offset,offset)-plane*plane))>target.radius+.00001)throw new Error('Invalid native waypoint contact');
  if(!this.waypointHits.some(h=>h.waypointId===hit.waypointId))this.waypointHits.push({waypointId:hit.waypointId,time:hit.time,point:hit.point,normal:hit.normal,surface:hit.surface});
 }
 contact(hit:Contact){this.contacts.push(hit);}
 poses(poses:Pose[]){
  for(const pose of poses){
   if(!Number.isFinite(pose.t)||Object.values(pose.p).some(x=>!Number.isFinite(x)))throw new Error('Invalid recorded trajectory');
   const a=this.last;
   if(a&&pose.t<a.t)throw new Error('Trajectory time moved backwards');
   if(a&&pose.t>a.t){
    const dt=pose.t-a.t;if(distance(a.p,pose.p)>MIN_MOVEMENT_SPEED*dt)this.movingSeconds+=dt;
    if(this.c.goal&&this.firstVisit===Infinity&&entersGoal(a.p,pose.p,this.c.goal!.center,this.c.goal!.radius,.023))this.firstVisit=pose.t;
   }
   if(this.c.goal&&entersGoal(pose.p,pose.p,this.c.goal!.center,this.c.goal!.radius,.023))this.firstVisit=Math.min(this.firstVisit,pose.t);
   this.last=pose;
  }
 }
 value(options:{success?:boolean;destinationReached?:boolean;reason?:string;final?:boolean}={}):ScoreBreakdown{
  if(this.c.scoring===WAYPOINT_SCORING)return this.waypointValue(options);
  const g=this.c.goal!.center,endPosition=this.last?.p||this.c.start.center;
  const gap=Math.hypot(Math.max(0,Math.hypot(endPosition.x-g.x,endPosition.z-g.z)-(this.c.goal!.radius-.023)),Math.max(0,Math.abs(endPosition.y-(g.y+.023))-.015));
  const range=proximityRange(this.c),goalVisited=!!options.success||Number.isFinite(this.firstVisit);
  const seen=new Set<string>();let banks=0,lastTime=-Infinity,lastPoint:Vector|null=null,lastBank='';
  for(const hit of this.contacts){
   const family=hit.surface.replace(/-(?:step|tread)-?\d+$/,'');
   if(!hit.qualifying||hit.speed<1||hit.time>this.firstVisit||hit.time>(this.last?.t??0)||seen.has(family)||hit.time-lastTime<.18||(lastPoint&&distance(hit.point,lastPoint)<.6))continue;
   seen.add(family);banks++;lastTime=hit.time;lastPoint=hit.point;lastBank=hit.label;
  }
  const bankBonus=BANK_BONUS*banks,bankMultiplier=1+bankBonus,comboMultiplier=bankMultiplier;
  // No gameplay ceiling: only guard the integer storage/transport precision.
  const bankPoints=Math.min(Number.MAX_SAFE_INTEGER,Math.round(BASE_POINTS*bankMultiplier));
  const forfeit=['Recalled','Player left'].includes(options.reason||'');
  const routeOK=!this.c.requiredSurface||this.contacts.some(h=>h.qualifying&&h.surface===this.c.requiredSurface);
  const landingMultiplier=forfeit||!routeOK?0:options.success?1:Math.max(goalVisited?.25:0,clamp(1-gap/range));
  const movementPoints=forfeit||!routeOK?0:Math.min(Number.MAX_SAFE_INTEGER,Math.floor(this.movingSeconds*MOVEMENT_POINTS_PER_SECOND+1e-6));
  const targetPoints=Math.round(bankPoints*landingMultiplier),accuracy=Math.round(BASE_POINTS*landingMultiplier);
  const total=targetPoints?Math.min(Number.MAX_SAFE_INTEGER,targetPoints+movementPoints):0,potential=Math.min(Number.MAX_SAFE_INTEGER,bankPoints+movementPoints);
  return {version:ARCADE_SCORING,movingSeconds:this.movingSeconds,movementPoints,outcome:forfeit?'forfeit':!routeOK?'route-missed':options.success?'perfect':goalVisited?'tagged':total?'near':'miss',accuracy,style:targetPoints-accuracy,styleBanks:banks,stylePercent:bankMultiplier-1,goalVisited,distance:gap,proximityRange:range,endPosition,total,base:BASE_POINTS,bankMultiplier,bankBonus,comboMultiplier,landingMultiplier,potential,firstVisit:Number.isFinite(this.firstVisit)?this.firstVisit:null,lastBank};
 }
 waypointValue(options:{destinationReached?:boolean;reason?:string;final?:boolean}):ScoreBreakdown{
  const hits=this.waypointHits.filter(h=>h.time<=(this.last?.t??0));
  const seen=new Set<string>();let banks=0,lastTime=-Infinity,lastPoint:Vector|null=null,lastBank='';
  for(const hit of this.contacts){
   const family=hit.surface.replace(/-(?:step|tread)-?\d+$/,'');
   if(!hit.qualifying||hit.speed<1||hit.time>(this.last?.t??0)||seen.has(family)||hit.time-lastTime<.18||(lastPoint&&distance(hit.point,lastPoint)<.6))continue;
   seen.add(family);banks++;lastTime=hit.time;lastPoint=hit.point;lastBank=hit.label;
  }
  const safe=(n:number)=>Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.round(n)));
  const waypointCount=hits.length,waypointMultiplier=WAYPOINT_FACTOR**waypointCount;
  // Bank credit never doubles when a waypoint is collected. Order does not matter.
  const bankBonus=BANK_BONUS*banks,bankMultiplier=1+bankBonus,comboMultiplier=waypointMultiplier+bankBonus;
  const waypointBase=waypointCount?BASE_POINTS*waypointMultiplier:0;
  const forfeit=['Recalled','Player left'].includes(options.reason||''),routeOK=!this.c.requiredSurface||this.contacts.some(h=>h.qualifying&&h.surface===this.c.requiredSurface);
  const destinationReached=!!this.c.goal&&!!options.destinationReached;
  const earned=waypointCount?safe(BASE_POINTS*comboMultiplier):0;
  const destinationBonus=destinationReached?safe(BASE_POINTS*comboMultiplier):0;
  const movementPoints=forfeit||!routeOK?0:Math.min(Number.MAX_SAFE_INTEGER,Math.floor(this.movingSeconds*MOVEMENT_POINTS_PER_SECOND+1e-6));
  // Movement is additive, outside every multiplier and destination bonus.
  // Live points remain in play. Only the complete route can bank them at rest.
  const incomplete=!!options.final&&!waypointRouteComplete(this.c,hits,destinationReached);
  const potential=forfeit||!routeOK||!(earned+destinationBonus)?0:safe(earned+destinationBonus+movementPoints),total=incomplete?0:potential;
  return {version:WAYPOINT_SCORING,movingSeconds:this.movingSeconds,movementPoints,outcome:forfeit?'forfeit':!routeOK?'route-missed':incomplete?'incomplete':destinationReached?'perfect':waypointCount?'tagged':'miss',accuracy:total,style:0,styleBanks:banks,stylePercent:bankMultiplier-1,goalVisited:Number.isFinite(this.firstVisit)||destinationReached,distance:0,proximityRange:0,endPosition:this.last?.p||this.c.start.center,total,base:BASE_POINTS,bankMultiplier,bankBonus,comboMultiplier,landingMultiplier:total?1:0,potential,firstVisit:Number.isFinite(this.firstVisit)?this.firstVisit:null,lastBank,waypointCount,waypointIds:hits.map(h=>h.waypointId),waypointHits:hits,waypointBase,waypointMultiplier,destinationReached,destinationBonus:forfeit||!routeOK||incomplete?0:destinationBonus};
 }

}
export function scoreAttempt(result:NativeResult):ScoreBreakdown{
 if(![ARCADE_SCORING,WAYPOINT_SCORING].includes(result.challenge?.scoring||''))throw new Error('Unsupported scoring rules');
 if(!result.poses.length)throw new Error('Invalid recorded trajectory');
 const tracker=new ComboTracker(result.challenge!);
 for(const hit of result.contacts)tracker.contact(hit);
 for(const hit of result.waypointHits||[])tracker.waypoint(hit);
 tracker.poses(result.poses);
 return tracker.value({...result,final:true});
}
