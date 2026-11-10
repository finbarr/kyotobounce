// Port of BallBody + BallContactModel. Collision queries supply geometry only;
// no second rigid-body solver is allowed to apply impulses to the ball.
import {v,add,sub,mul,dot,cross,length,unit,clamp,plane,project,limit,towardZero,identity,spinRotation} from './math.js';
import {ballProfile} from './materials.js';
export const STEP=Math.fround(1/180),SKIN=Math.fround(.0002);
const f=Math.fround,gravity=v(0,-9.81,0);
export function resolveContact(velocity,spin,normal,profile,restitution,friction,grip,offsetFraction=0){
 const vn=dot(velocity,normal);if(vn>=0)return {velocity,spin};
 const {mass,radius}=profile,inertia=f(f(profile.inertiaFactor*mass)*f(radius*radius)),arm=mul(normal,-radius);
 const slip=plane(add(velocity,cross(spin,arm)),normal),normalImpulse=f(-(1+clamp(restitution,0,1))*vn*mass);
 const demand=mul(slip,-(1+clamp(grip,0,1))/(1/mass+radius*radius/inertia)),tangentImpulse=limit(demand,Math.max(0,friction)*normalImpulse);
 velocity=add(velocity,mul(add(mul(normal,normalImpulse),tangentImpulse),1/mass));spin=add(spin,mul(cross(arm,tangentImpulse),1/inertia));
 if(offsetFraction>0){const s=length(slip),offset=radius*clamp(offsetFraction,0,.2)*s/Math.max(1e-9,Math.sqrt(s*s+vn*vn)),rolling=plane(spin,normal);spin=add(spin,mul(unit(rolling),-Math.min(inertia*length(rolling),offset*normalImpulse)/inertia));}
 return {velocity,spin,normalImpulse,tangentImpulse};
}
export class Ball{
 constructor(world,profile=ballProfile){this.world=world;this.profile=profile;this.launch(v(),v(),v());}
 launch(position,velocity,spin){this.position=v(position.x,position.y,position.z);this.rotation=identity();this.velocity=velocity;this.spin=limit(spin,this.profile.maxSpin);this.sleeping=false;this.supported=false;this.clock=0;this.restingTime=0;this.lastContact=-10;this.normal=v();this.surfaceVelocity=v();this.rolling=0;this.torsional=0;this.contacts=[];this.budgetExhaustions=0;}
 endVelocity(velocity,dt){const drag=.00055*(this.profile.radius/.025)**2/this.profile.mass;const accel=add(gravity,mul(velocity,-drag*length(velocity))),mid=add(velocity,mul(accel,dt*.5));return add(velocity,mul(add(gravity,mul(mid,-drag*length(mid))),dt));}
 sweep(position,displacement,dt){
  const first=this.world.sweep(position,displacement,this.profile.radius);if(!first)return null;
  first.time=f(dt*clamp(first.distance/length(displacement),0,1));if(!first.complex)return first;
  const drag=.00055*(this.profile.radius/.025)**2/this.profile.mass,maxSpeed=length(this.velocity)+length(gravity)*dt,sagitta=(length(gravity)+drag*maxSpeed**2)*dt*dt*.125,segments=Math.ceil(Math.sqrt(sagitta/.000001));
  if(segments<=1)return first;
  let start=position,from=0;
  for(let i=1;i<=segments;i++){
   const until=f(dt*i/segments),end=add(position,mul(add(this.velocity,this.endVelocity(this.velocity,until)),.5*until)),delta=sub(end,start),distance=length(delta);
   if(distance>1e-9){const hit=this.world.sweep(start,delta,this.profile.radius);if(hit){hit.time=f(from+(until-from)*clamp(hit.distance/distance,0,1));return hit;}}
   start=end;from=until;
  }
  return null;
 }
 step(dt=STEP){
  this.clock=f(this.clock+dt);if(this.sleeping)return;
  let position=this.position,rotation=this.rotation,remaining=dt;
  for(let contact=0;contact<12&&remaining>1e-7;contact++){
   const end=this.endVelocity(this.velocity,remaining),delta=mul(add(this.velocity,end),.5*remaining);
   let hit=this.world.overlap(position,this.profile.radius);if(hit)hit.time=0;else hit=this.sweep(position,delta,remaining);
   if(!hit){position=add(position,delta);rotation=spinRotation(rotation,this.spin,remaining);this.velocity=end;remaining=0;break;}
   const {normal,point,surface,time}=hit;
   this.velocity=this.endVelocity(this.velocity,time);rotation=spinRotation(rotation,this.spin,time);position=add(point,mul(normal,this.profile.radius+SKIN));
   const vn=dot(sub(this.velocity,surface.velocity),normal);
   if(vn<0){
    const input=clamp((-vn-.12)/(.30-.12),0,1),weight=input*input*(3-2*input),incoming=this.velocity,incomingSpin=this.spin;
    const response=resolveContact(sub(incoming,surface.velocity),incomingSpin,normal,this.profile,weight*surface.bounce,surface.friction,weight*surface.grip,weight*surface.offset);
    this.velocity=add(response.velocity,surface.velocity);this.spin=response.spin;
    this.contacts.push({time:this.clock-remaining+time,point:{...point},normal:{...normal},surface:surface.id,speed:-vn,incoming,outgoing:this.velocity,incomingSpin,outgoingSpin:this.spin});
    this.lastContact=this.clock;this.normal=normal;this.surfaceVelocity=surface.velocity;this.rolling=surface.rolling;this.torsional=surface.torsional;
   }
   remaining=f(remaining-Math.max(time,Math.min(remaining,dt*.002)));
  }
  if(remaining>1e-7)this.budgetExhaustions++;
  const load=Math.max(0,-dot(gravity,this.normal)),near=load>0&&this.clock-this.lastContact<dt*2.1&&dot(sub(this.velocity,this.surfaceVelocity),this.normal)<=.01;
  const support=near?this.world.sweep(position,mul(this.normal,-2*SKIN),this.profile.radius):null;
  this.supported=!!(support&&dot(support.normal,this.normal)>.99);
  if(this.supported){
   const normalSpin=project(this.spin,this.normal),rollingSpin=sub(this.spin,normalSpin),inertia=this.profile.inertiaFactor*this.profile.mass*this.profile.radius**2,scale=this.profile.mass*load*this.profile.radius/inertia*dt;
   this.spin=add(towardZero(rollingSpin,this.rolling*scale),towardZero(normalSpin,this.torsional*scale));
   const relative=sub(this.velocity,this.surfaceVelocity),quiet=dot(this.surfaceVelocity,this.surfaceVelocity)<1e-8&&length(plane(relative,this.normal))<.025&&Math.abs(dot(relative,this.normal))<.10&&length(this.spin)<.75;
   this.restingTime=quiet?f(this.restingTime+dt):0;if(this.restingTime>.4){this.sleeping=true;this.velocity=this.spin=v();}
  }else this.restingTime=0;
  this.position=position;this.rotation=rotation;
 }
}
