// Presentation consumes authoritative score frames; it never computes a final score.
export function scoreAt(frames,time){
 if(!frames?.length||time<frames[0].t)return null;
 let low=0,high=frames.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(frames[mid].t<=time)low=mid;else high=mid-1;}
 return frames[low].score;
}
export function heatTier(score){
 if(!score||!['waypoint-v1','combo-v4','combo-v5'].includes(score.version))return 0;
 const earned=Number(score.total)||0;
 // Use earned total, never hypothetical landing potential or the NEXT multiplier.
 return earned>=10_000_000?3:earned>=1_000_000?2:earned>=100_000?1:0;
}
export function collectedIds(score){return new Set(score?.version==='waypoint-v1'?(score.waypointIds||[]):[]);}
