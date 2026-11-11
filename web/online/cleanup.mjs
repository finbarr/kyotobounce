import {FieldPath,FieldValue} from '@google-cloud/firestore';

// Called by requests, never a background timer. One job and at most one
// bounded page of its input documents are reclaimed per call. A deleting
// marker fences concurrent uploads/claims and survives process interruption.
export async function cleanup(service){
 const {db,root,attempts,policy}=service,now=service.now(),cursorRef=root.collection('maintenance').doc('cursor');
 const expired=await attempts.where('expiresAt','<=',now).orderBy('expiresAt').limit(1).get();
 let candidate=expired.docs[0],scanned=false;
 if(!candidate){
  const cursor=(await cursorRef.get()).data()?.after;let query=attempts.orderBy(FieldPath.documentId());if(cursor)query=query.startAfter(cursor);
  const page=await query.limit(1).get();candidate=page.docs[0];scanned=true;
  if(!candidate){await cursorRef.set({after:null});return;}
 }
 await db.runTransaction(async tx=>{
  const ref=candidate.ref,job=(await tx.get(ref)).data();if(!job)return;
  let retired=false;
  try{await service.current(job,tx);}catch(error){if(![404,409].includes(error.status))throw error;retired=true;}
  const accepted=['verified','published'].includes(job.state),expired=!accepted&&job.expiresAt<=now;
  if(job.lease?.until>now||!retired&&!expired&&job.state!=='deleting'){
   if(accepted&&!retired&&job.expiresAt!==undefined)tx.update(ref,{expiresAt:FieldValue.delete()});
   if(scanned)tx.set(cursorRef,{after:ref.id});return;
  }
  const inputs=await tx.get(ref.collection('inputs').limit(policy.limits.cleanupChunks));
  const bytes=inputs.docs.reduce((sum,d)=>sum+(d.data().bytes||0),0),finished=inputs.empty;
  let retiredCourse;
  if(finished&&!service.catalog.has(job.courseId)){
   const courseRef=service.courses.doc(job.courseId),row=(await tx.get(courseRef)).data(),canonical=[...service.catalog.values()][0];
   if(row&&(!row.published||row.layout!==canonical.layout||row.physics!==canonical.physics||row.current?.scoring!==canonical.scoring)){
    const others=await tx.get(attempts.where('courseId','==',job.courseId).limit(2));if(others.docs.every(d=>d.id===job.id))retiredCourse=courseRef;
   }
  }
  await policy.take(tx,null,{jobs:finished?-1:0,inputBytes:-bytes});
  for(const doc of inputs.docs)tx.delete(doc.ref);
  if(finished){
   tx.delete(ref);if(retiredCourse)tx.delete(retiredCourse);
   if(retired)tx.delete(service.progressRef(job.owner,job.courseKey));
  }else tx.update(ref,{state:'deleting',expiresAt:0,lease:null,checkpoint:null,result:null,inputBytes:Math.max(0,(job.inputBytes||0)-bytes)});
  if(scanned)tx.set(cursorRef,{after:ref.id});
 });
}
