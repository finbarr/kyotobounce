import {Walker} from '../public/physics/walker.js';
import {launchInput} from '../public/physics/shot.js';
import {STEP} from '../public/physics/ball.js';
import {add,v} from '../public/physics/math.js';

// Exercise production release placement and launch arithmetic in each engine;
// the replay hash fixtures otherwise receive a precomputed launch from Node.
export function campaignLaunches(world,catalog){
 return catalog.map(course=>{
  const aim={...course.hint,yaw:((course.hint.yaw+180)%360+360)%360-180,power:course.hint.holdMs/2800},walker=new Walker(world,add(course.start.center,v(0,.03,0)));
  for(let i=0;i<12;i++)walker.move({x:0,z:0},aim.yaw,false,STEP);
  return {id:course.id,feet:walker.feet,grounded:walker.grounded,launch:{...launchInput(walker.feet,aim),position:walker.release(aim.yaw,aim.pitch,0)}};
 });
}
