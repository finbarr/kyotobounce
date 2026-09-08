export type Vector = {x:number;y:number;z:number};
export type Disk = {center:Vector;radius:number;surface:string};
export type Waypoint = Disk & {id:string;normal:Vector};
export type WaypointHit = {waypointId:string;time:number;point:Vector;normal:Vector;surface:string};
export const WAYPOINT_SCORING='waypoint-v1';
export const ACTIVE_SCORING=['combo-v5',WAYPOINT_SCORING];
export type Hint = {yaw:number;pitch:number;top:number;kick:number;holdMs:number;powerRange?:'precision'|'full';note:string;period?:number;releasePhase?:number};
export type Challenge = {id:string;revision:number;name:string;creator:string;layout:string;physics:string;throwModel?:string;scoring?:string;allowedInputs?:{chargeSeconds:number;power:[number,number];pitch:[number,number];top:[number,number];kick:[number,number]};start:Disk;goal:Disk|null;waypoints?:Waypoint[];hint?:Hint;order?:number;requiredSurface?:string};
// Recorded trajectories remain viewable across contact-model revisions.
export const RECORDED_PHYSICS=['kyoto-p3-1','kyoto-p3-2'];
export { THROW_MODEL } from './public/throw-power.js';
export const SCORING_VERSION='combo-v5';
export const CHARGE_SECONDS=2.8;
export const SUPPORTED_SCORING=['distinct-v1','accuracy-v2','accuracy-v3','combo-v4',SCORING_VERSION,WAYPOINT_SCORING];
export function withChallengeRules(challenge:Challenge):Challenge{
 return {...challenge,throwModel:challenge.throwModel||'precision-v1',scoring:challenge.scoring||'distinct-v1',allowedInputs:challenge.allowedInputs||{chargeSeconds:['combo-v4',SCORING_VERSION,WAYPOINT_SCORING].includes(challenge.scoring||'')?CHARGE_SECONDS:1.2,power:[0,1],pitch:[-65,80],top:[-200,200],kick:[-200,200]}};
}
export type Guest = {id:string;token:string;name:string};
export type NativeResult = {type:'result';attempt:string;id:string;reason:string;layout:string;physics:string;profile:string;challenge:Challenge|null;success:boolean;records?:{personalBest:boolean;courseBest:boolean};destinationReached?:boolean;waypointHits?:WaypointHit[];score:number;surfaces:number;impacts:number;duration:number;releaseTime:number;chargeTime:number;thrower:unknown;launchPosition:Vector;velocity:Vector;spin:Vector;poses:{t:number;p:Vector;q:{x:number;y:number;z:number;w:number}}[];contacts:{surface:string;label:string;point:Vector;speed:number;time:number;qualifying:boolean}[];scoreFrames?:{t:number;score:import('./scoring.ts').ScoreBreakdown}[];breakdown?:import('./scoring.ts').ScoreBreakdown};
