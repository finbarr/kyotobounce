import type { NativeResult,Vector } from './types.ts';
export const ARCADE_SCORING='combo-v4';
export type ScoreBreakdown={version:string;outcome:'perfect'|'tagged'|'near'|'miss'|'forfeit'|'route-missed';accuracy:number;style:number;styleBanks:number;stylePercent:number;goalVisited:boolean;distance:number;proximityRange:number;endPosition:Vector;total:number;base?:number;bankMultiplier?:number;timeMultiplier?:number;activeSeconds?:number;landingMultiplier?:number;potential?:number;firstVisit?:number|null;lastBank?:string};
const distance=(a:Vector,b:Vector)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const clamp=(x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));
const STYLE=[0,.08,.14,.19,.23,.25];
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
export const BASE_POINTS=10000,BANK_FACTOR=1.75;
export const proximityRange=(c:Challenge)=>clamp(distance(c.start.center,c.goal.center)*.35,3,12);
// A tracker consumes every native physics pose, including between network frames.
// The identical calculation drives the live HUD and the immutable final replay.
export class ComboTracker {
 c:Challenge;last:Pose|null=null;firstVisit=Infinity;activeSeconds=0;contacts:Contact[]=[];
 constructor(challenge:Challenge){this.c=challenge;}
 contact(hit:Contact){this.contacts.push(hit);}
 poses(poses:Pose[]){
  for(const pose of poses){
   if(!Number.isFinite(pose.t)||Object.values(pose.p).some(x=>!Number.isFinite(x)))throw new Error('Invalid recorded trajectory');
   const a=this.last;
   if(a&&pose.t<a.t)throw new Error('Trajectory time moved backwards');
   if(a&&pose.t>a.t&&this.firstVisit===Infinity){
    const dt=pose.t-a.t;
    // Resting, spinning in place and the final slow creep cannot farm time.
    if(distance(a.p,pose.p)/dt>=.35)this.activeSeconds+=dt;
    if(entersGoal(a.p,pose.p,this.c.goal.center,this.c.goal.radius,.023))this.firstVisit=pose.t;
   }
   if(entersGoal(pose.p,pose.p,this.c.goal.center,this.c.goal.radius,.023))this.firstVisit=Math.min(this.firstVisit,pose.t);
   this.last=pose;
  }
 }
 value(options:{success?:boolean;reason?:string}={}):ScoreBreakdown{
  const g=this.c.goal.center,endPosition=this.last?.p||this.c.start.center;
  const gap=Math.hypot(Math.max(0,Math.hypot(endPosition.x-g.x,endPosition.z-g.z)-(this.c.goal.radius-.023)),Math.max(0,Math.abs(endPosition.y-(g.y+.023))-.015));
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
}
export function scoreAttempt(result:NativeResult):ScoreBreakdown{
 if(result.challenge?.scoring!==ARCADE_SCORING)return scoreAccuracy(result);
 if(!result.poses.length)throw new Error('Invalid recorded trajectory');
 const tracker=new ComboTracker(result.challenge);
 for(const hit of result.contacts)tracker.contact(hit);
 tracker.poses(result.poses);
 return tracker.value(result);
}
function scoreAccuracy(result:NativeResult):ScoreBreakdown{
 const c=result.challenge;if(!c)throw new Error('A challenge is required to score');
 const poses=result.poses,contacts=result.contacts,ballRadius=.023;
 if(!poses.length||poses.some(p=>!Number.isFinite(p.t)||['x','y','z'].some(k=>!Number.isFinite(p.p[k as keyof Vector]))))throw new Error('Invalid recorded trajectory');
 const endPosition=poses.at(-1)!.p,g=c.goal.center;
 // Distance from the *edge* of the usable disk, including vertical separation.
 const gap=Math.hypot(Math.max(0,Math.hypot(endPosition.x-g.x,endPosition.z-g.z)-(c.goal.radius-ballRadius)),Math.max(0,Math.abs(endPosition.y-(g.y+ballRadius))-.015));
 const proximityRange=clamp(distance(c.start.center,g)*.35,3,12);
 let firstVisit=Infinity;
 for(let i=1;i<poses.length;i++)if(entersGoal(poses[i-1].p,poses[i].p,g,c.goal.radius,ballRadius)){firstVisit=poses[i].t;break;}
 for(const hit of contacts)if(hit.surface===c.goal.surface&&Math.abs(hit.point.y-g.y)<.04&&Math.hypot(hit.point.x-g.x,hit.point.z-g.z)<=c.goal.radius)firstVisit=Math.min(firstVisit,hit.time);
 const goalVisited=result.success||Number.isFinite(firstVisit);
 const forfeit=['Recalled','Player left'].includes(result.reason);
 const routeOK=!c.requiredSurface||contacts.some(h=>h.qualifying&&h.surface===c.requiredSurface);
 const accuracy=forfeit||!routeOK?0:result.success?10000:goalVisited?7500:Math.round(5999*clamp(1-gap/proximityRange)**2);
 const seen=new Set<string>();let banks=0,lastTime=-Infinity,lastPoint:Vector|null=null;
 for(const hit of contacts){
  // One award per surface. Nearby joints/treads and rapid chatter aren't banks.
  const family=hit.surface.replace(/-(?:step|tread)-?\d+$/,'');
  if(!hit.qualifying||hit.speed<1||hit.time>firstVisit||seen.has(family)||hit.time-lastTime<.18||(lastPoint&&distance(hit.point,lastPoint)<.6))continue;
  seen.add(family);banks++;lastTime=hit.time;lastPoint=hit.point;if(banks===5)break;
 }
 const stylePercent=STYLE[banks],style=Math.round(accuracy*stylePercent);
 return {version:'accuracy-v3',outcome:forfeit?'forfeit':!routeOK?'route-missed':result.success?'perfect':goalVisited?'tagged':accuracy?'near':'miss',accuracy,style,styleBanks:banks,stylePercent,goalVisited,distance:gap,proximityRange,endPosition,total:accuracy+style};
}
