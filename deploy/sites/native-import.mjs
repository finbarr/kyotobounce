import {HttpError,insist,digest,sameHash} from '../../web/online/protocol.mjs';
import {requestGate} from '../../web/online/resource-policy.mjs';

// Temporary deployment-only importer. The allowlist comes from the operator's
// verified snapshot, compiled into the Worker, never from an HTTP caller.
// Each immutable payload must match that exact SHA-256 before it is parsed.
export function nativeImportFetch(service,manifest){
 insist(manifest?.format==='kyoto-native-import-1',500,'Invalid native import manifest');
 const allowed=new Map(manifest.batches.map(b=>[b.sha256,b])),gate=requestGate({concurrency:4});
 return async request=>{
  let release;
  try{
   release=gate();
   const url=new URL(request.url),hash=url.pathname.split('/').at(-1),entry=allowed.get(hash);
   insist(request.method==='POST'&&!url.search&&entry,404,'Import not found');
   const reader=request.body?.getReader();insist(reader,400,'Missing import');let length=0;const parts=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;insist(length<=entry.bytes&&length<=512*1024,413,'Import exceeds pinned size');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
   const bytes=Buffer.concat(parts);insist(length===entry.bytes&&sameHash(digest(bytes),hash),403,'Import does not match the pinned snapshot');
   const data=JSON.parse(bytes.toString('utf8'));
   await service.transaction(async tx=>{
    if(await tx.one('SELECT hash FROM verifier_native_imports WHERE hash=?',hash))return;
    if(entry.kind==='players'){
     const fresh=[];
     for(const player of data){const prior=await tx.one('SELECT credentialHash FROM verifier_players WHERE id=?',player.id);insist(!prior||sameHash(prior.credentialHash,player.credentialHash),409,'Native player identity conflicts');if(!prior)fresh.push(player);}
     await service.take(tx,null,{identities:fresh.length});
     for(const player of fresh)tx.write('INSERT INTO verifier_players (id,credentialHash,name,created,named) VALUES (?,?,?,?,?)',player.id,player.credentialHash,player.name,service.now(),player.named?1:0);
    }else if(entry.kind==='recording'){
     const prior=await tx.one('SELECT hash FROM verifier_recordings WHERE attempt=? AND sequence=?',entry.attempt,entry.sequence);
     insist(!prior||sameHash(prior.hash,hash),409,'Recorded replay conflicts');
     if(!prior){await service.take(tx,null,{inputBytes:length});tx.write('INSERT INTO verifier_recordings (attempt,sequence,hash,data,bytes) VALUES (?,?,?,?,?)',entry.attempt,entry.sequence,hash,bytes.toString('utf8'),length);}
    }else{
     insist(entry.kind==='attempt'&&data.id===entry.attempt&&data.provenance.backupSha256===manifest.backupSha256,500,'Invalid pinned attempt');
     insist(!await service.get(data.id,tx),409,'Native attempt already exists');await service.current(data,tx);
     insist(await tx.one('SELECT id FROM verifier_players WHERE id=?',data.owner),409,'Import the player first');
     const chunks=await tx.all('SELECT hash FROM verifier_recordings WHERE attempt=? ORDER BY sequence',data.id);
     insist(JSON.stringify(chunks.map(c=>c.hash))===JSON.stringify(data.recordings),409,'Import the complete recording first');
     await service.take(tx,data.owner,{jobs:1});service.save(tx,data);
     tx.write('INSERT INTO verifier_progress (owner,courseKey,courseId,revision) VALUES (?,?,?,?) ON CONFLICT(owner,courseKey) DO NOTHING',data.owner,data.courseKey,data.courseId,data.result.challenge.revision);
    }
    tx.write('INSERT INTO verifier_native_imports (hash) VALUES (?)',hash);
   });
   return Response.json({imported:hash});
  }catch(error){return Response.json({error:error instanceof HttpError?error.message:'Import unavailable'},{status:error instanceof HttpError?error.status:503});}finally{release?.();}
 };
}
