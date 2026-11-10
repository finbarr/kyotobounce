import {v,add,sub,mul,dot,length,unit,yaw,limit} from './math.js';
import {ballProfile} from './materials.js';
const radius=.24,height=1.8,skin=.025,stepHeight=.22,slopeLimit=Math.cos(48*Math.PI/180);
export class Walker{
 constructor(world,feet){this.world=world;this.place(feet);}
 place(feet){this.feet={...feet};this.lastSafe={...feet};this.grounded=false;this.falling=0;this.walked=0;this.movement=v();}
 stepUp(position,delta){
  const horizontal=v(delta.x,0,delta.z),distance=length(horizontal);if(distance<1e-7)return null;
  // Identify a reachable walkable top beyond the capsule's leading edge. A
  // rounded edge normal alone must never turn a steep slope into a staircase.
  const ahead=add(position,mul(unit(horizontal),radius+skin+distance+.005)),origin=add(ahead,v(0,stepHeight+.005,0));
  if(this.world.overlap(origin,.001,2))return null;
  const top=this.world.sweep(origin,v(0,-stepHeight-skin-.01,0),.001,2);
  if(!top||top.normal.y<slopeLimit)return null;
  const rise=top.point.y+skin-position.y;if(rise<.00001||rise>stepHeight+.00002)return null;
  const up=v(0,rise+.00002,0);
  if(this.world.capsuleSweep(position,up,radius,height,skin))return null;
  const raised=add(position,up);
  if(this.world.capsuleSweep(raised,horizontal,radius,height,skin))return null;
  const advanced=add(raised,horizontal),drop=rise+skin+.00002,down=this.world.capsuleSweep(advanced,v(0,-drop,0),radius,height,skin);
  if(!down||down.normal.y<=0||down.surface.id!==top.surface.id)return null;
  const landed=add(advanced,v(0,-Math.max(0,drop*down.fraction-1e-5),0));
  return landed.y>position.y+.000001?landed:null;
 }
 move(input,heading,fast,dt){
  const previous=this.feet,speed=fast?4.2:1.4,direction=yaw(limit(v(input.x,0,input.z),1),heading);
  const carry=this.grounded?this.world.motion.walkingVelocity(this.feet):v();
  const wasGrounded=this.grounded;
  this.falling=this.grounded?-2:Math.max(-30,this.falling-9.81*dt);this.grounded=false;
  let delta=mul(add(add(mul(direction,speed),carry),v(0,this.falling,0)),dt),position=this.feet;
  for(let i=0;i<6&&length(delta)>1e-7;i++){
   const hit=this.world.capsuleSweep(position,delta,radius,height,skin);
   if(!hit){position=add(position,delta);break;}
   const fraction=Math.max(0,hit.fraction-1e-5/Math.max(1e-9,length(delta)));
   position=add(position,mul(delta,fraction));delta=mul(delta,1-fraction);
   if(hit.normal.y>=slopeLimit){
    this.grounded=true;
    // Gravity establishes support; it must not become downhill walking input.
    delta.y=-(hit.normal.x*delta.x+hit.normal.z*delta.z)/hit.normal.y;
    continue;
   }
   if(wasGrounded||this.grounded){const step=this.stepUp(position,delta);if(step){position=step;this.grounded=true;break;}}
   // Prevent climbing a steep face, but keep its true normal when moving away:
   // flattening the rounded edge while descending traps the capsule in midair.
   const horizontalNormal=unit(v(hit.normal.x,0,hit.normal.z));
   const normal=hit.normal.y>0&&hit.normal.y<slopeLimit&&dot(delta,horizontalNormal)<0?horizontalNormal:hit.normal;
   const approaching=dot(delta,normal);if(approaching<0)delta=sub(delta,mul(normal,approaching));else break;
  }
  this.feet=position;
  if(!this.grounded&&this.falling<=0){
   const snap=.24+speed*dt,hit=this.world.capsuleSweep(position,v(0,-snap,0),radius,height,skin);
   if(hit&&hit.normal.y>=slopeLimit){this.feet=add(position,v(0,-Math.max(0,snap*hit.fraction-1e-5),0));this.grounded=true;}
  }
  if(this.grounded){this.falling=-2;this.lastSafe={...this.feet};}
  if(this.feet.y<this.world.fallLimitY)this.place(this.lastSafe);
  const movement=sub(this.feet,previous);movement.y=0;this.movement=length(direction)>.001?mul(movement,1/dt):v();
  if(this.grounded&&length(direction)>.001)this.walked+=length(movement);
 }
 release(heading,pitch,time=0){
  const eye=add(this.feet,v(0,1.65,0)),delta=yaw(v(.22,-.15,.42),heading),radius=ballProfile.radius;
  let hit=this.world.sweep(eye,delta,radius+.006);
  const moving=this.world.motion.probe(eye,delta,radius+.006,time);
  if(moving&&(!hit||moving.time*length(delta)<hit.distance))hit={distance:moving.time*length(delta)};
  const position=hit?add(eye,mul(unit(delta),Math.max(0,hit.distance-.012))):add(eye,delta);
  if(this.world.overlap(position,radius+.004)||this.world.motion.overlaps(position,radius+.004,time))return null;
  const angle=pitch*Math.PI/180,direction=yaw(v(0,Math.sin(angle),Math.cos(angle)),heading);
  const outgoing=mul(direction,.012);
  return this.world.sweep(position,outgoing,radius)||this.world.motion.probe(position,outgoing,radius,time)?null:position;
 }
}
