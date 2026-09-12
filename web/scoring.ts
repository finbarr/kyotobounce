import {WAYPOINT_SCORING} from './types.ts';
import type { NativeResult,Vector,WaypointHit } from './types.ts';
export const ARCADE_SCORING='combo-v5';
export type ScoreBreakdown={version:string;outcome:'perfect'|'tagged'|'near'|'miss'|'forfeit'|'route-missed';waypointCount?:number;waypointIds?:string[];waypointHits?:WaypointHit[];waypointBase?:number;waypointMultiplier?:number;destinationReached?:boolean;destinationBonus?:number;accuracy:number;style:number;styleBanks:number;stylePercent:number;goalVisited:boolean;distance:number;proximityRange:number;endPosition:Vector;total:number;base?:number;bankMultiplier?:number;timeMultiplier?:number;activeSeconds?:number;landingMultiplier?:number;potential?:number;firstVisit?:number|null;lastBank?:string};
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
// Quaternion signs are interchangeable: q and -q describe the same rotation.
function rotates(a:Pose['q'],b:Pose['q']){
 const an=Math.hypot(a.x,a.y,a.z,a.w),bn=Math.hypot(b.x,b.y,b.z,b.w);
 if(!Number.isFinite(an)||!Number.isFinite(bn)||!an||!bn)throw new Error('Invalid recorded rotation');
 const direct=Math.hypot(a.x/an-b.x/bn,a.y/an-b.y/bn,a.z/an-b.z/bn,a.w/an-b.w/bn);
 const flipped=Math.hypot(a.x/an+b.x/bn,a.y/an+b.y/bn,a.z/an+b.z/bn,a.w/an+b.w/bn);
 // Ignore normalization roundoff far below native float precision.
 return Math.min(direct,flipped)>1e-10;
}
type Contact=NativeResult['contacts'][number];
type Challenge=NonNullable<NativeResult['challenge']>;
export const BASE_POINTS=10000,BANK_FACTOR=1.75,WAYPOINT_FACTOR=2;
export const proximityRange=(c:Challenge)=>clamp(distance(c.start.center,c.goal!.center)*.35,3,12);
// A tracker consumes every native physics pose, including between network frames.
// The identical calculation drives the live HUD and the immutable final replay.
export class ComboTracker {
 c:Challenge;last:Pose|null=null;firstVisit=Infinity;activeSeconds=0;contacts:Contact[]=[];waypointHits:WaypointHit[]=[];
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
    const dt=pose.t-a.t;
    // Time follows every native translation and rotation until true rest.
    const moving=distance(a.p,pose.p)>0||rotates(a.q,pose.q);
    if(moving)this.activeSeconds+=dt;
    if(this.c.goal&&this.firstVisit===Infinity&&entersGoal(a.p,pose.p,this.c.goal!.center,this.c.goal!.radius,.023))this.firstVisit=pose.t;
   }
   if(this.c.goal&&entersGoal(pose.p,pose.p,this.c.goal!.center,this.c.goal!.radius,.023))this.firstVisit=Math.min(this.firstVisit,pose.t);
   this.last=pose;
  }
 }
 value(options:{success?:boolean;destinationReached?:boolean;reason?:string}={}):ScoreBreakdown{
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
  const bankMultiplier=BANK_FACTOR**banks,timeMultiplier=1+Math.min(this.activeSeconds,60)/12;
  // No gameplay ceiling: only guard the integer storage/transport precision.
  const potential=Math.min(Number.MAX_SAFE_INTEGER,Math.round(BASE_POINTS*bankMultiplier*timeMultiplier));
  const forfeit=['Recalled','Player left'].includes(options.reason||'');
  const routeOK=!this.c.requiredSurface||this.contacts.some(h=>h.qualifying&&h.surface===this.c.requiredSurface);
  const landingMultiplier=forfeit||!routeOK?0:options.success?1:Math.max(goalVisited?.25:0,clamp(1-gap/range));
  const total=Math.round(potential*landingMultiplier),accuracy=Math.round(BASE_POINTS*landingMultiplier);
  return {version:ARCADE_SCORING,outcome:forfeit?'forfeit':!routeOK?'route-missed':options.success?'perfect':goalVisited?'tagged':total?'near':'miss',accuracy,style:total-accuracy,styleBanks:banks,stylePercent:bankMultiplier*timeMultiplier-1,goalVisited,distance:gap,proximityRange:range,endPosition,total,base:BASE_POINTS,bankMultiplier,timeMultiplier,activeSeconds:this.activeSeconds,landingMultiplier,potential,firstVisit:Number.isFinite(this.firstVisit)?this.firstVisit:null,lastBank};
 }
 waypointValue(options:{destinationReached?:boolean;reason?:string}):ScoreBreakdown{
  const hits=this.waypointHits.filter(h=>h.time<=(this.last?.t??0));
  const seen=new Set<string>();let banks=0,lastTime=-Infinity,lastPoint:Vector|null=null,lastBank='';
  for(const hit of this.contacts){
   const family=hit.surface.replace(/-(?:step|tread)-?\d+$/,'');
   if(!hit.qualifying||hit.speed<1||hit.time>(this.last?.t??0)||seen.has(family)||hit.time-lastTime<.18||(lastPoint&&distance(hit.point,lastPoint)<.6))continue;
   seen.add(family);banks++;lastTime=hit.time;lastPoint=hit.point;lastBank=hit.label;
  }
  const safe=(n:number)=>Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.round(n)));
  const waypointCount=hits.length,waypointBase=BASE_POINTS*(WAYPOINT_FACTOR**waypointCount-1),bankMultiplier=Math.min(Number.MAX_SAFE_INTEGER,BANK_FACTOR**banks),timeMultiplier=1+Math.min(this.activeSeconds,60)/12;
  const forfeit=['Recalled','Player left'].includes(options.reason||''),routeOK=!this.c.requiredSurface||this.contacts.some(h=>h.qualifying&&h.surface===this.c.requiredSurface);
  const destinationReached=!!this.c.goal&&!!options.destinationReached;
  const earned=waypointBase?safe(waypointBase*bankMultiplier*timeMultiplier):0;
  const destinationBonus=destinationReached?safe(Math.max(BASE_POINTS,waypointBase)*bankMultiplier*timeMultiplier):0;
  const total=forfeit||!routeOK?0:safe(earned+destinationBonus);
  return {version:WAYPOINT_SCORING,outcome:forfeit?'forfeit':!routeOK?'route-missed':destinationReached?'perfect':waypointCount?'tagged':'miss',accuracy:total,style:0,styleBanks:banks,stylePercent:bankMultiplier*timeMultiplier-1,goalVisited:Number.isFinite(this.firstVisit)||destinationReached,distance:0,proximityRange:0,endPosition:this.last?.p||this.c.start.center,total,base:BASE_POINTS,bankMultiplier,timeMultiplier,activeSeconds:this.activeSeconds,landingMultiplier:total?1:0,potential:total,firstVisit:Number.isFinite(this.firstVisit)?this.firstVisit:null,lastBank,waypointCount,waypointIds:hits.map(h=>h.waypointId),waypointHits:hits,waypointBase,waypointMultiplier:WAYPOINT_FACTOR**waypointCount,destinationReached,destinationBonus:forfeit||!routeOK?0:destinationBonus};
 }

}
export function scoreAttempt(result:NativeResult):ScoreBreakdown{
 if(![ARCADE_SCORING,WAYPOINT_SCORING].includes(result.challenge?.scoring||''))throw new Error('Unsupported scoring rules');
 if(!result.poses.length)throw new Error('Invalid recorded trajectory');
 const tracker=new ComboTracker(result.challenge!);
 for(const hit of result.contacts)tracker.contact(hit);
 for(const hit of result.waypointHits||[])tracker.waypoint(hit);
 tracker.poses(result.poses);
 return tracker.value(result);
}
