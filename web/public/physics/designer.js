import {v,add,mul,dot,cross,length,unit,clamp} from './math.js';
import {ballProfile} from './materials.js';
import {capsuleOverlap} from './capsule.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
function floorAt(world,p){const hit=world.sweep(add(p,v(0,.1,0)),v(0,-.2,0),0);return hit?.normal.y>.995?hit:null;}
export function validateDisk(world,disk,start=false){
 if(!finite(disk?.center)||!Number.isFinite(disk.radius)||disk.radius<(start?.25:.1)||disk.radius>(start?3:2))throw Error('Circle radius or position is invalid.');
 const hit=floorAt(world,disk.center);
 if(!disk.surface||hit?.surface.id!==disk.surface||Math.abs(hit.point.y-disk.center.y)>.01)throw Error('The circle must sit on its selected floor.');
 for(let ring=1;ring<=3;ring++)for(let i=0;i<32;i++){
  const angle=i*Math.PI*2/32,direction=v(Math.cos(angle),0,Math.sin(angle)),p=add(disk.center,mul(direction,disk.radius*ring/3)),support=floorAt(world,p);
  if(support?.surface.id!==disk.surface||Math.abs(support.point.y-disk.center.y)>.01)throw Error('Keep the whole circle on one uninterrupted floor.');
  if(world.sweep(add(disk.center,v(0,start?.9:ballProfile.radius+.015,0)),mul(direction,disk.radius+.01),0))throw Error('The circle intersects a wall or obstacle.');
 }
 // Match the walking capsule's 1.8 m body, 24 cm radius and 2.5 cm skin
 // at the initial 3 cm spawn offset, including its full overhead clearance.
 if(start&&capsuleOverlap(world,add(disk.center,v(0,.005,0)),.265,1.85))throw Error('There is not enough room for the thrower.');
 return disk;
}
export function validateWaypoint(world,target){
 if(!finite(target?.center)||!finite(target.normal)||!Number.isFinite(target.radius)||target.radius<.1||target.radius>2||Math.abs(length(target.normal)-1)>.001||!target.surface)throw Error('Waypoint position, normal or radius is invalid.');
 const n=unit(target.normal),u=unit(cross(n,Math.abs(n.y)<.9?v(0,1,0):v(1,0,0))),w=cross(n,u);
 for(let ring=0;ring<=3;ring++)for(let i=0;i<(ring?32:1);i++){
  const angle=i*Math.PI*2/32,p=add(target.center,mul(add(mul(u,Math.cos(angle)),mul(w,Math.sin(angle))),target.radius*ring/3)),hit=world.sweep(add(p,mul(n,.05)),mul(n,-.1),0);
  if(hit?.surface.id!==target.surface||dot(hit.normal,n)<.995||distance(hit.point,p)>.01)throw Error('Keep the whole waypoint on one fixed surface face.');
  if(world.overlap(add(p,mul(n,ballProfile.radius+.003)),ballProfile.radius))throw Error('The waypoint face is blocked by an obstacle.');
 }
 return target;
}
export function validateCourse(world,c){
 if(c.scoring!=='waypoint-v4')throw Error('Use the current waypoint scoring rules.');
 validateDisk(world,c.start,true);if(c.goal)validateDisk(world,c.goal);
 if(!Array.isArray(c.waypoints)||c.waypoints.length>32||(!c.waypoints.length&&!c.goal))throw Error('Choose at least one target and at most 32 waypoints.');
 const ids=new Set();for(const w of c.waypoints){if(typeof w.id!=='string'||!w.id||w.id.length>64||ids.has(w.id))throw Error('Waypoint IDs must be unique.');ids.add(w.id);validateWaypoint(world,w);}return c;
}
export function placeDisk(world,{slot,origin,direction,radius},time=0){
 if(!['start','goal','waypoint'].includes(slot)||!finite(origin)||!finite(direction)||length(direction)<1e-9)throw Error('Choose a valid surface ray.');
 const delta=mul(unit(direction),250),hit=world.sweep(origin,delta,0),moving=world.motion.probe(origin,delta,0,time);
 if(!hit||moving&&moving.time*250<=hit.distance)throw Error('Choose a fixed surface; moving targets are not supported.');
 const disk={center:hit.point,normal:hit.normal,surface:hit.surface.id,radius};return slot==='waypoint'?validateWaypoint(world,disk):validateDisk(world,disk,slot==='start');
}
const angle=c=>Math.acos(clamp(dot(unit(c.incoming),unit(c.outgoing)),-1,1))*180/Math.PI;
export class DesignRecorder{
 constructor(world,thrower){this.world=world;this.thrower=thrower;this.contacts=[];this.path=[];this.routeLength=0;this.samples=0;this.stride=1;}
 pose(p){
  if(this.last&&distance(this.last,p)<=.3)return;
  if(this.last)this.routeLength+=distance(this.last,p);this.last={...p};
  if(this.samples++%this.stride===0)this.path.push({...p});
  if(this.path.length>2000){this.path=this.path.filter((_,i)=>i%2===0);this.stride*=2;}
 }
 contact(c){
  if(this.contacts.length>=512||length(c.incoming)<1||angle(c)<18&&Math.abs(dot(c.incoming,c.normal))<1)return;
  if(this.contacts.some(old=>old.surface===c.surface&&dot(old.normal,c.normal)>.995&&distance(old.point,c.point)<2))return;
  this.contacts.push(structuredClone(c));
 }
 finish(shot){
  const capture={duration:shot.ball.clock,path:[...this.path,{...shot.ball.position}],start:null,goal:null,waypoints:[],waypointTimes:[],error:''};
  try{
   if(!shot.ball.sleeping||shot.reason==='Recalled'||shot.ball.position.y<this.world.fallLimitY)throw Error('The design ball must come to rest inside the station.');
   const floor=floorAt(this.world,this.thrower.feet);if(!floor)throw Error('Throw from a fixed horizontal floor to create a start zone.');
   capture.start=validateDisk(this.world,{center:floor.point,normal:floor.normal,surface:floor.surface.id,radius:.25},true);
   const end=this.world.sweep(shot.ball.position,v(0,-ballProfile.radius-.004,0),0);
   if(end?.normal.y>.995)for(const radius of [.75,.5,.25,.1]){try{capture.goal=validateDisk(this.world,{center:end.point,normal:end.normal,surface:end.surface.id,radius});break;}catch{}}
   if(!capture.goal)capture.note='This landing is too cramped or uneven for a finish zone. The course scores its waypoint chain instead.';
   const candidates=this.contacts.slice().sort((a,b)=>(angle(b)+(b.normal.y<.5?90:0))-(angle(a)+(a.normal.y<.5?90:0))),targets=[],separation=clamp(this.routeLength/24,3,8);
   for(const c of candidates){
    if(targets.length>=8)break;
    if(capture.goal&&distance(c.point,capture.goal.center)<capture.goal.radius+1||targets.some(t=>distance(t.target.center,c.point)<separation||Math.abs(t.contact.time-c.time)<.45))continue;
    for(const radius of [.65,.4,.2,.1]){try{const target=validateWaypoint(this.world,{center:c.point,normal:c.normal,surface:c.surface,radius});targets.push({contact:c,target});break;}catch{}}
   }
   targets.sort((a,b)=>a.contact.time-b.contact.time);capture.waypoints=targets.map((t,i)=>({...t.target,id:'bank-'+(i+1)}));capture.waypointTimes=targets.map(t=>t.contact.time);
   if(!targets.length&&!capture.goal)throw Error('No useful banks or clear landing were found. Try a longer shot with a distinct rebound.');
  }catch(error){capture.error=error.message;}
  return capture;
 }
}
