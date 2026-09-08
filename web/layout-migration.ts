import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Challenge,Hint} from './types.ts';
import {ACTIVE_SCORING,THROW_MODEL,RECORDED_PHYSICS} from './types.ts';
import type {Store} from './store.ts';
import type {PhysicsWorker} from './worker.ts';
export type StarterProof={id:string;revision:number;fromLayout:string;toLayout:string;physics:string;status:'pass';nativeRest:boolean;destinationReached:boolean;hint?:Hint;receipt:string};
export async function migrationInputs(layout:string){
 const text=await readFile(resolve(process.env.KYOTO_LAYOUT||'runtime/station-layout.json'),'utf8');
 if(createHash('sha256').update(text).digest('hex')!==layout)throw new Error('Worker layout differs from migration geometry');
 const data=JSON.parse(text),proofs=JSON.parse(await readFile(resolve(process.env.KYOTO_LAYOUT_PROOFS||'web/layout-proofs.json'),'utf8')).proofs;
 if(!Array.isArray(proofs))throw new Error('Invalid starter proof registry');
 const surfaces=new Set<string>();for(const key of ['boxes','beams','panels','flights','escalators'])for(const surface of data[key]||[])surfaces.add(surface.id);
 return {surfaces,proofs:proofs as StarterProof[]};
}
export async function migrateLayouts(store:Store,worker:Pick<PhysicsWorker,'send'|'request'>,layout:string,physics:string,surfaces:Set<string>,proofs:StarterProof[]=[]){
 if(!RECORDED_PHYSICS.includes(physics))throw new Error('Unknown target physics for layout migration');
 const report:{id:string;revision:number;status:string;reason?:string;targetRevision?:number}[]=[],id='layout-validation-'+randomUUID();worker.send({type:'join',id});
 try{for(const source of store.list()){
  if(source.layout===layout)continue;
  const previous=store.layoutMigration(source.id,source.revision,layout,physics);if(previous?.status==='migrated')continue;
  let proof:StarterProof|undefined;
  try{
   if(!ACTIVE_SCORING.includes(source.scoring||'')||source.throwModel!==THROW_MODEL)throw new Error('Archived rules require a separate rules revision');
   if(source.requiredSurface&&!surfaces.has(source.requiredSurface))throw new Error('Required route surface is absent from this station');
   await worker.request({type:'validate',id,start:source.start,goal:source.goal,waypoints:source.waypoints,scoring:source.scoring});
   if(source.creator==='station'){
    proof=proofs.find(p=>p.id===source.id&&p.revision===source.revision&&p.fromLayout===source.layout&&p.toLayout===layout&&p.physics===physics&&p.status==='pass'&&p.nativeRest===true&&p.destinationReached===true&&typeof p.receipt==='string'&&p.receipt.length>0);
    if(!proof)throw new Error('Starter awaits a matching-layout native proof shot and verified hint');
   }
   const candidate:Challenge={...source,layout,physics,revision:source.revision+1,hint:proof?.hint};
   const revision=store.appendLayoutRevision(source,candidate);report.push({id:source.id,revision:source.revision,status:'migrated',targetRevision:revision});
  }catch(error){const reason=error instanceof Error?error.message:String(error);store.recordLayoutFailure(source,layout,physics,reason);report.push({id:source.id,revision:source.revision,status:'archived',reason});}
 }}finally{worker.send({type:'leave',id});}
 return report;
}
