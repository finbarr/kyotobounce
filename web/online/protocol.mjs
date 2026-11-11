import {createHash,timingSafeEqual} from 'node:crypto';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export function insist(condition,status,message){if(!condition)throw new HttpError(status,message);}
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export function fields(value,names){insist(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&Object.keys(value).every(k=>names.includes(k)),400,'Missing or unsupported request fields');return value;}
export function playerName(value){insist(typeof value==='string'&&value.trim().length>0&&value.trim().length<=32&&!/[\u0000-\u001f\u007f]/.test(value),400,'Use a name of 1–32 characters');return value.trim();}
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function credential(header){
 insist(typeof header==='string'&&header.startsWith('Bearer '),401,'Authentication required');const token=header.slice(7),parts=token.split('.');
 insist(parts.length===2&&uuid(parts[0])&&/^[A-Za-z0-9_-]{43}$/.test(parts[1])&&Buffer.from(parts[1],'base64url').toString('base64url')===parts[1],401,'Invalid credential');
 return {id:parts[0],hash:digest(token)};
}
export const sameHash=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===64&&b.length===64&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const ranked=(a,b)=>b.score-a.score||a.duration-b.duration||a.accepted-b.accepted||a.attempt.localeCompare(b.attempt);
export const view=job=>({attempt:job.id,state:job.state,uploadedChunks:job.inputChunks,uploadedSteps:job.inputSteps,walkingSteps:job.walkingSteps||0,shotSteps:job.shotSteps||0,...(job.state==='verified'?{result:job.result}:{}),...(job.message?{message:job.message}:{})});
