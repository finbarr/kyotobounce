import {v,add,sub,mul,dot,length,unit,yaw,limit} from './math.js';
import {ballProfile} from './materials.js';
export class Walker{
 constructor(world,feet){this.world=world;this.place(feet);}
 place(feet){this.feet={...feet};this.lastSafe={...feet};this.grounded=false;this.falling=0;this.walked=0;this.movement=v();}
 move(input,heading,fast,dt){
  const previous=this.feet,speed=fast?4.2:1.4,direction=yaw(limit(v(input.x,0,input.z),1),heading);
  this.falling=this.grounded?-2:Math.max(-30,this.falling-9.81*dt);this.grounded=false;
  let delta=mul(add(mul(direction,speed),v(0,this.falling,0)),dt),position=this.feet;
  for(let i=0;i<6&&length(delta)>1e-7;i++){
   const hit=this.world.capsuleSweep(position,delta,.24,1.8,.025);
   if(!hit){position=add(position,delta);break;}
   const fraction=Math.max(0,hit.fraction-1e-5/Math.max(1e-9,length(delta)));
   position=add(position,mul(delta,fraction));delta=mul(delta,1-fraction);
   if(hit.normal.y>=Math.cos(48*Math.PI/180)){
    this.grounded=true;
    // Gravity establishes support; it must not become downhill walking input.
    delta.y=-(hit.normal.x*delta.x+hit.normal.z*delta.z)/hit.normal.y;
    continue;
   }
   // Steep walls slide horizontally rather than lifting the player up them.
   const normal=hit.normal.y>0&&hit.normal.y<Math.cos(48*Math.PI/180)?unit(v(hit.normal.x,0,hit.normal.z)):hit.normal;
   const approaching=dot(delta,normal);if(approaching<0)delta=sub(delta,mul(normal,approaching));else break;
  }
  this.feet=position;
  if(!this.grounded&&this.falling<=0){
   const snap=.24+speed*dt,hit=this.world.capsuleSweep(position,v(0,-snap,0),.24,1.8,.025);
   if(hit&&hit.normal.y>=Math.cos(48*Math.PI/180)){this.feet=add(position,v(0,-Math.max(0,snap*hit.fraction-1e-5),0));this.grounded=true;}
  }
  if(this.grounded){this.falling=-2;this.lastSafe={...this.feet};}
  if(this.feet.y<this.world.fallLimitY)this.place(this.lastSafe);
  const movement=sub(this.feet,previous);movement.y=0;this.movement=length(direction)>.001?mul(movement,1/dt):v();
  if(this.grounded&&length(direction)>.001)this.walked+=length(movement);
 }
 release(heading,pitch){
  const eye=add(this.feet,v(0,1.65,0)),delta=yaw(v(.22,-.15,.42),heading),radius=ballProfile.radius;
  const hit=this.world.sweep(eye,delta,radius+.006);
  const position=hit?add(eye,mul(unit(delta),Math.max(0,hit.distance-.012))):add(eye,delta);
  if(this.world.overlap(position,radius+.004))return null;
  const angle=pitch*Math.PI/180,direction=yaw(v(0,Math.sin(angle),Math.cos(angle)),heading);
  return this.world.sweep(position,mul(direction,.012),radius)?null:position;
 }
}
