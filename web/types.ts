export type Vector = {x:number;y:number;z:number};
export type Disk = {center:Vector;radius:number;surface:string};
export type Hint = {yaw:number;pitch:number;top:number;kick:number;holdMs:number;note:string;period?:number;releasePhase?:number};
export type Challenge = {id:string;revision:number;name:string;creator:string;layout:string;physics:string;throwModel?:string;scoring?:string;allowedInputs?:{chargeSeconds:number;power:[number,number];pitch:[number,number];top:[number,number];kick:[number,number]};start:Disk;goal:Disk;hint?:Hint;order?:number;requiredSurface?:string};
// Recorded trajectories remain viewable across contact-model revisions.
export const RECORDED_PHYSICS=['kyoto-p3-1','kyoto-p3-2'];
export const THROW_MODEL='robot-v3';
export const SCORING_VERSION='combo-v4';
export const CHARGE_SECONDS=2.8;
export const SUPPORTED_SCORING=['distinct-v1','accuracy-v2','accuracy-v3',SCORING_VERSION];
export function withChallengeRules(challenge:Challenge):Challenge{
 return {...challenge,throwModel:challenge.throwModel||'precision-v1',scoring:challenge.scoring||'distinct-v1',allowedInputs:challenge.allowedInputs||{chargeSeconds:challenge.scoring===SCORING_VERSION?CHARGE_SECONDS:1.2,power:[0,1],pitch:[-65,80],top:[-200,200],kick:[-200,200]}};
}
export type Guest = {id:string;token:string;name:string};
export type NativeResult = {type:'result';attempt:string;id:string;reason:string;layout:string;physics:string;profile:string;challenge:Challenge|null;success:boolean;score:number;surfaces:number;impacts:number;duration:number;releaseTime:number;chargeTime:number;thrower:unknown;launchPosition:Vector;velocity:Vector;spin:Vector;poses:{t:number;p:Vector;q:{x:number;y:number;z:number;w:number}}[];contacts:{surface:string;label:string;point:Vector;speed:number;time:number;qualifying:boolean}[];scoreFrames?:{t:number;score:import('./scoring.ts').ScoreBreakdown}[];breakdown?:import('./scoring.ts').ScoreBreakdown};
