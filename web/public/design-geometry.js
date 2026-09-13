// Stable comparison for an untouched, server-recorded course. UI-only fields
// and floor normals do not affect collision or the recorded solution.
export function designGeometry(c){
 const point=p=>[p.x,p.y,p.z],disk=d=>d?[point(d.center),d.radius,d.surface]:null;
 return JSON.stringify([c.scoring,disk(c.start),disk(c.goal),(c.waypoints||[]).map(w=>[w.id,disk(w),point(w.normal)])]);
}
