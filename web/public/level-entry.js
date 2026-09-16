// H and level entry share one aim, including bank shots whose first target is
// deliberately not on the launch line.
export function levelEntryAim(challenge){
 const h=challenge?.hint;
 if(h&&['yaw','pitch','top','kick'].every(k=>Number.isFinite(h[k])))return {...h,powerRange:h.powerRange==='full'?'full':'precision'};
 const start=challenge?.start?.center,target=(challenge?.waypoints?.[0]||challenge?.goal)?.center;
 if(!start||!target)return {yaw:180,pitch:12,top:0,kick:0,powerRange:'precision'};
 const dx=target.x-start.x,dz=target.z-start.z;
 return {yaw:Math.atan2(dx,dz)*180/Math.PI,pitch:Math.max(-20,Math.min(55,12+Math.atan2(target.y-start.y,Math.hypot(dx,dz))*180/Math.PI)),top:0,kick:0,powerRange:'precision'};
}
