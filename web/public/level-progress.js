export function completedCourse(mode,result,selected){
 return mode==='play'&&result?.success===true&&!!selected&&result.challenge?.id===selected.id&&result.challenge?.revision===selected.revision;
}
export function nextCampaignCourse(challenges,selected){
 if(!selected?.campaign)return null;
 const campaign=challenges.filter(c=>c.campaign).sort((a,b)=>a.order-b.order),index=campaign.findIndex(c=>c.id===selected.id&&c.revision===selected.revision);
 return index<0?null:campaign[index+1]||null;
}
