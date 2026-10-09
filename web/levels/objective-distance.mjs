// Arc length of the suggested flight up to the last required waypoint.
// Post-target rolling contributes to score, but not to the route length label.
export function objectiveDistance(result) {
  const targets=result.challenge?.waypoints||[];
  if(!targets.length)return null;
  const times=targets.map(w=>result.waypointHits.find(h=>h.waypointId===w.id)?.time);
  if(times.some(t=>!Number.isFinite(t)))return null;
  const seconds=Math.max(...times),poses=result.poses;
  if(!poses?.length||poses.at(-1).t<seconds)return null;
  let distance=0;
  for(let i=1;i<poses.length;i++){
    const a=poses[i-1],b=poses[i];
    if(a.t>=seconds)break;
    const fraction=b.t<=seconds?1:(seconds-a.t)/(b.t-a.t);
    distance+=Math.hypot(b.p.x-a.p.x,b.p.y-a.p.y,b.p.z-a.p.z)*fraction;
  }
  return {distance,seconds};
}
