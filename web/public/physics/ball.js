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
 constructor(world,profile=ballProfile){this.world=world;this.profile=profile;this.stationTime=0;this.launch(v(),v(),v());}
 launch(position,velocity,spin){this.position=v(position.x,position.y,position.z);this.rotation=identity();this.velocity=velocity;this.spin=limit(spin,this.profile.maxSpin);this.sleeping=false;this.supported=false;this.supportContact=null;this.clock=0;this.restingTime=0;this.lastContact=-10;this.normal=v();this.surfaceVelocity=v();this.rolling=0;this.torsional=0;this.contacts=[];this.budgetExhaustions=0;}
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
  const worldTime=this.stationTime;this.stationTime+=dt;
  this.clock=f(this.clock+dt);
  if(this.sleeping&&!this.world.motion.sweep(this.position,v(),this.profile.radius+SKIN,worldTime,dt))return;
  this.sleeping=false;
  let position=this.position,rotation=this.rotation,remaining=dt;
  const supports=this.supportContact?[this.supportContact]:[];
  for(let contact=0;contact<12&&remaining>1e-7;contact++){
   const end=this.endVelocity(this.velocity,remaining),delta=mul(add(this.velocity,end),.5*remaining);
   let hit=this.world.overlap(position,this.profile.radius);if(hit)hit.time=0;else hit=this.sweep(position,delta,remaining);
   const moving=this.world.motion.sweep(position,delta,this.profile.radius,worldTime+dt-remaining,remaining);
   if(moving&&(!hit||moving.time<hit.time))hit=moving;
   if(!hit){position=add(position,delta);rotation=spinRotation(rotation,this.spin,remaining);this.velocity=end;remaining=0;break;}
   const {normal,point,surface,time}=hit;
   this.velocity=this.endVelocity(this.velocity,time);rotation=spinRotation(rotation,this.spin,time);position=add(point,mul(normal,this.profile.radius+SKIN));
   const vn=dot(sub(this.velocity,surface.velocity),normal);
   if(vn<0){
    const input=clamp((-vn-.12)/(.30-.12),0,1),weight=input*input*(3-2*input),incoming=this.velocity,incomingSpin=this.spin;
    const response=resolveContact(sub(incoming,surface.velocity),incomingSpin,normal,this.profile,weight*surface.bounce,surface.friction,weight*surface.grip,weight*surface.offset);
    this.velocity=add(response.velocity,surface.velocity);this.spin=response.spin;
    // Moving-surface queries use doubles internally. Serialize contact time at
    // the same Float32 boundary as the simulation clock and poses, so a last-bit
    // query difference cannot make an otherwise identical replay unverifiable.
    this.contacts.push({time:f(this.clock-remaining+time),point:{...point},normal:{...normal},surface:surface.id,speed:-vn,incoming,outgoing:this.velocity,incomingSpin,outgoingSpin:this.spin});
    this.lastContact=this.clock;this.normal=normal;this.surfaceVelocity=surface.velocity;this.rolling=surface.rolling;this.torsional=surface.torsional;
    if(dot(gravity,normal)<0)supports.push({normal,surface,time:this.clock});
   }
   remaining=f(remaining-Math.max(time,Math.min(remaining,dt*.002)));
  }
  if(remaining>1e-7)this.budgetExhaustions++;
  // A wall impulse must not erase the floor carrying the ball's weight. Keep
  // recent load-bearing contacts, but recheck proximity and separation every
  // step so a former floor cannot brake a rebound or a ball leaving an edge.
  this.supportContact=null;let load=0;
  for(let i=supports.length-1;i>=0;i--){
   const candidate=supports[i],{normal,surface,time}=candidate,weight=-dot(gravity,normal);
   if(weight<=load||this.clock-time>=dt*2.1||dot(sub(this.velocity,surface.velocity),normal)>.01)continue;
   const delta=mul(normal,-2*SKIN),support=this.world.sweep(position,delta,this.profile.radius),movingSupport=this.world.motion.probe(position,delta,this.profile.radius,this.stationTime);
   if(support&&dot(support.normal,normal)>.99||movingSupport&&dot(movingSupport.normal,normal)>.99){this.supportContact=candidate;load=weight;}
  }
  this.supported=!!this.supportContact;
  if(this.supported){
   const {normal,surface}=this.supportContact;
   const normalSpin=project(this.spin,normal),rollingSpin=sub(this.spin,normalSpin),inertia=this.profile.inertiaFactor*this.profile.mass*this.profile.radius**2,scale=this.profile.mass*load*this.profile.radius/inertia*dt;
   this.spin=add(towardZero(rollingSpin,surface.rolling*scale),towardZero(normalSpin,surface.torsional*scale));
   const relative=sub(this.velocity,surface.velocity),quiet=dot(surface.velocity,surface.velocity)<1e-8&&length(plane(relative,normal))<.025&&Math.abs(dot(relative,normal))<.10&&length(this.spin)<.75;
   this.restingTime=quiet?f(this.restingTime+dt):0;if(this.restingTime>.4){this.sleeping=true;this.velocity=this.spin=v();}
  }else this.restingTime=0;
  this.position=position;this.rotation=rotation;
 }
}
