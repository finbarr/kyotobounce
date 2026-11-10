import assert from 'node:assert/strict';
import {StaticWorld} from '../public/physics/static-world.js';
import {Walker} from '../public/physics/walker.js';
import {STEP} from '../public/physics/ball.js';
import {v,add,yaw,identity} from '../public/physics/math.js';

const box=(id,position,half)=>({id,position,half,kind:'box',material:'stone',rotation:identity(),mask:3});
function fixture(height,{heading=0,offset=v(),ceiling=false}={}){
 const shapes=[box('floor',v(0,-.5,0),v(5,.5,5)),box('step',v(0,height/2,2),v(2,height/2,2))];
 if(ceiling)shapes.push(box('ceiling',v(0,1.9,0),v(5,.05,5)));
 for(const s of shapes){s.position=add(offset,yaw(s.position,heading));const a=heading*Math.PI/360;s.rotation={x:0,y:Math.sin(a),z:0,w:Math.cos(a)};}
 const world=new StaticWorld({shapes,escalators:[],fallLimitY:offset.y-10});
 return {world,walker:new Walker(world,add(offset,yaw(v(0,.03,-1),heading)))};
}
const local=(p,offset,heading)=>yaw(v(p.x-offset.x,p.y-offset.y,p.z-offset.z),-heading);
let cases=0;
for(const offset of [v(),v(-147.3,49.1937,-23.8)])for(const heading of [0,37,90,180])for(const fast of [false,true])for(const height of [.05,.15,.22,.23,.4]){
 const {world,walker}=fixture(height,{heading,offset});
 for(let i=0;i<(fast?180:480);i++)walker.move({x:0,z:1},heading,fast,STEP);
 const p=local(walker.feet,offset,heading),name=JSON.stringify({height,heading,fast,offset});
 assert.ok(walker.grounded,name+' remains grounded');
 if(height<=.22){assert.ok(p.z>2,name+' climbs');assert.ok(Math.abs(p.y-height-.025)<.00004,name+' stands on the top');
  for(let i=0;i<(fast?180:480);i++)walker.move({x:0,z:-1},heading,fast,STEP);
  const back=local(walker.feet,offset,heading);assert.ok(back.z<-.8,name+' descends');assert.ok(Math.abs(back.y-.025)<.00004,name+' returns to floor');
 }else{assert.ok(p.z<-.2,name+' cannot climb a tall wall');assert.ok(Math.abs(p.y-.025)<.00004,name+' stays on floor');}
 world.free();cases++;
}
for(const fast of [false,true]){
 const {world,walker}=fixture(.22,{ceiling:true});
 for(let i=0;i<360;i++)walker.move({x:0,z:1},0,fast,STEP);
 assert.ok(walker.feet.z<-.2,'Low headroom prevents step-up');
 for(let i=0;i<180;i++)walker.move({x:0,z:-1},0,fast,STEP);
 assert.ok(walker.feet.z<-.8,'Backing away from a blocked step remains possible');world.free();
}
for(const x of [-.35,.35])for(const fast of [false,true]){
 const {world,walker}=fixture(.22);
 for(let i=0;i<(fast?150:450);i++)walker.move({x,z:1},0,fast,STEP);
 assert.ok(walker.grounded&&walker.feet.z>2&&walker.feet.y>.24,'An oblique approach climbs the step');world.free();
}
// Repeated risers require separate step decisions; the controller cannot jump
// to the whole staircase's top in one move.
{
 const shapes=[box('floor',v(0,-.5,0),v(5,.5,5))];
 for(let i=0;i<8;i++)shapes.push(box(`riser-${i}`,v(0,(i+1)*.15/2,i*.3+.15),v(1,(i+1)*.15/2,.15)));
 const world=new StaticWorld({shapes,escalators:[],fallLimitY:-10}),walker=new Walker(world,v(0,.03,-.5));
 for(let i=0;i<330;i++)walker.move({x:0,z:1},0,false,STEP);
 assert.ok(walker.grounded&&walker.feet.y>1.2&&walker.feet.z>2,'Consecutive risers climb to the top');
 for(let i=0;i<330;i++)walker.move({x:0,z:-1},0,false,STEP);
 assert.ok(walker.grounded&&walker.feet.y<.03&&walker.feet.z<-.4,'Consecutive risers descend to the floor');world.free();
}
// A real inclined face is not a succession of climbable rounded edges.
for(const angle of [40,60]){
 const t=angle*Math.PI/180,world=new StaticWorld({shapes:[box('floor',v(0,-.5,0),v(10,.5,10)),{
  ...box('slope',v(0,Math.sin(t)*2-.05,Math.cos(t)*2),v(2,.05,2)),rotation:{x:-Math.sin(t/2),y:0,z:0,w:Math.cos(t/2)}
 }],escalators:[],fallLimitY:-10}),walker=new Walker(world,v(0,.03,-1));
 for(let i=0;i<480;i++)walker.move({x:0,z:1},0,false,STEP);
 assert.ok(angle<48?walker.feet.y>1:walker.feet.y<.04,`${angle} degree slope respects the slope limit`);world.free();
}
// Falling beside a ledge must not grant an airborne step-up.
{
 const {world,walker}=fixture(.22);walker.place(v(0,.12,-.27));walker.falling=-1;
 walker.move({x:0,z:1},0,false,STEP);
 assert.ok(walker.feet.y<=.12,'No upward step while airborne');world.free();
}
console.log(`PASS browser walking: ${cases} step/height/direction/speed/coordinate cases, oblique approaches, consecutive risers, descents, headroom, backing away, slope limit and airborne ledges`);
