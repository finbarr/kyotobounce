import {HttpError} from './protocol.mjs';

const conflict=error=>String(error?.message)+' '+String(error?.cause?.message);
export class D1Storage{
 constructor(db){this.db=db;}
 session(){return this.db.withSession('first-primary');}
 async transaction(fn){
  for(let retry=0;retry<12;retry++){
   const session=this.session(),statements=[];
   const query=(sql,args=[])=>session.prepare(sql).bind(...args);
   const read={one:(sql,...args)=>query(sql,args).first(),all:async(sql,...args)=>(await query(sql,args).all()).results};
   const revision=(await read.one('SELECT revision FROM verifier_meta WHERE id=1'))?.revision||0;
   const tx={...read,write:(sql,...args)=>statements.push(query(sql,args))};
   let value;try{value=await fn(tx);}catch(error){
    if(((await read.one('SELECT revision FROM verifier_meta WHERE id=1'))?.revision||0)!==revision)continue;
    throw error;
   }
   // Read-only paths also fence their snapshot: an idempotent retry must not
   // return mixed state from several commits. This batch performs no writes.
   const guard=query('INSERT INTO verifier_conflict (id) SELECT 1 WHERE COALESCE((SELECT revision FROM verifier_meta WHERE id=1),0) != ?',[revision]);
   try{
    await session.batch([guard,...statements,...(statements.length?[query('INSERT INTO verifier_meta (id,revision) VALUES (1,1) ON CONFLICT(id) DO UPDATE SET revision=revision+1')]:[])]);
    return value;
   }catch(error){if(!conflict(error).includes('kyoto_concurrent_write'))throw error;}
  }
  throw new HttpError(503,'Online verification is busy. Your saved work will retry.',1);
 }
}
